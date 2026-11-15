import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, BackHandler, Linking, Alert, Platform, AppState } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useFocusEffect, useNavigation, useRoute, CommonActions } from "@react-navigation/native";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";
import { buildCheckoutHtml } from "./checkoutHtmlTemplate";
import { getCurrentUser } from "../../services/authState";
import { verifyPayment, recoverPaymentWithRetry } from "../../services/paymentService";
import { markOrderStatus } from "../../services/ordersService";
import { CHECKOUT_ORIGIN_WHITELIST, isAllowedCheckoutWebUrl } from "./checkoutNavigation";
import { paymentProvider, userChoiceBillingEnabled, isNonplayTestBuild } from "../../config/paymentProvider";

// Replaces the old "open the hosted checkout page in the external
// browser" flow (Linking.openURL). Supabase Edge Functions don't serve
// real HTML/JS on this project's default *.supabase.co domain (only with
// a paid custom domain) - GET responses with Content-Type: text/html get
// silently rewritten to text/plain and any <script> is blocked from
// running. That's the actual cause of "Buy Now opens a page but tapping
// Pay does nothing": the checkout page's script never executed, so the
// Razorpay modal never opened.
//
// Fix: the app now builds the checkout HTML itself (checkoutHtmlTemplate)
// and hands it straight to a WebView via source={source} - the
// Razorpay checkout.js script comes from Razorpay's own CDN, not from
// Supabase, so none of the above applies. create-order only ever returns JSON
// (see supabase/functions/create-order/index.ts).
// App-link schemes Razorpay Checkout may open for UPI / wallet apps.
const ALLOWED_APP_SCHEMES = new Set([
  "upi", "tez", "gpay", "phonepe", "paytmmp", "paytm", "bhim", "credpay", "amazonpay", "mobikwik", "whatsapp",
]);

export default function PaymentCheckoutScreen() {
  // Defense in depth if a stale route or future caller bypasses navigator guards.
  if (paymentProvider !== "razorpay" && !userChoiceBillingEnabled) {
    return <View style={styles.center}><Text style={styles.errorText}>New purchases are unavailable in this app version.</Text></View>;
  }
  return <RazorpayCheckoutScreen />;
}

function RazorpayCheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    keyId,
    isLiveMode,
    razorpayOrderId,
    amountPaise,
    productTitle,
    internalOrderId,
    verifyUrl,
    prefillName,
    prefillEmail,
    timeoutSeconds,
  } = route.params ?? {};

  const recoveryOwner = useRef(getCurrentUser()?.id);
  const [verifying, setVerifying] = useState(false);
  const callbackNonce = useMemo(() => Array.from(crypto.getRandomValues(new Uint8Array(16)),
    byte => byte.toString(16).padStart(2, "0")).join(""), []);
  // Guards against processing the *same* WebView message twice (e.g. a
  // dismiss event arriving right after a handler event) - separate from
  // settledRef below, which only becomes true once we've actually reached
  // a terminal outcome (navigated to Success/Failed, or gone back).
  const messageHandledRef = useRef(false);
  // True only once this screen has truly finished (navigated away). Left
  // false while a verify/recovery attempt is merely in flight, so the
  // AppState-based recovery check (below) can still kick in and retry via
  // Razorpay's own records if that in-flight attempt gets dropped - e.g.
  // by Android suspending the network mid-request while backgrounded for
  // a UPI app switch, which is exactly the scenario this exists for.
  const settledRef = useRef(false);

  const missingParams =
    typeof keyId !== "string" || !/^rzp_(test|live)_[a-zA-Z0-9]+$/.test(keyId) ||
    typeof razorpayOrderId !== "string" || !/^order_[a-zA-Z0-9_]+$/.test(razorpayOrderId) ||
    !Number.isSafeInteger(amountPaise) || amountPaise < 100 ||
    typeof internalOrderId !== "string" || !internalOrderId ||
    typeof verifyUrl !== "string" ||
    verifyUrl !== `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""}/functions/v1/${isNonplayTestBuild ? "verify-payment-nonplay-test" : "verify-payment"}` ||
    (isNonplayTestBuild && (isLiveMode !== false || !keyId.startsWith("rzp_test_")));

  const resetTo = useCallback((screenName: string, params?: Record<string, unknown>) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: "Home" }, { name: screenName, params }],
      })
    );
  }, [navigation]);

  const goToFailed = useCallback(
    (reason?: string) => {
      if (internalOrderId) {
        markOrderStatus(internalOrderId, "failed").catch(() => {});
      }
      resetTo("PaymentFailed", { title: productTitle, reason });
    },
    [internalOrderId, productTitle, resetTo]
  );

  // ROOT CAUSE OF "payment succeeds, backend verifies, purchase unlocks,
  // but the app still shows a failure": recoverPaymentWithRetry only keeps
  // trying for ~24s total. Real-world UPI captures (PhonePe/GPay - the
  // student entering their UPI PIN, their bank confirming, Razorpay's
  // autocapture running) routinely take longer than that once you count
  // the time the app spent backgrounded during the app-switch itself. When
  // that 24s window runs out, the payment is NOT actually failed - it's
  // still in flight - but the old code called goToFailed() unconditionally,
  // which (a) permanently marked the order "failed" and (b) sent the
  // student to a dead-end screen with zero further checking. Meanwhile the
  // payment goes on to genuinely capture moments later and the webhook
  // grants the purchase server-side - the app just never finds out, because
  // nothing was left polling.
  //
  // Fix: this ambiguous "verify call failed AND recovery couldn't confirm
  // in time" case is no longer treated as a hard failure. It's routed to
  // PaymentFailedScreen with `pending: true` (+ verifyUrl/internalOrderId),
  // which now keeps polling verify-payment's recovery path in the
  // background and auto-redirects to PaymentSuccess the moment the payment
  // actually confirms - instead of stranding the student on a screen that
  // will never update itself. The order is also NOT marked "failed" here,
  // since it may well still succeed.
  const goToPending = useCallback(
    (paymentId?: string, authMessage?: string) => {
      resetTo("PaymentFailed", {
        title: productTitle,
        pending: true,
        verifyUrl,
        internalOrderId,
        paymentId,
        authRequired: !!authMessage,
        reason: authMessage,
      });
    },
    [productTitle, verifyUrl, internalOrderId, resetTo]
  );

  async function handleMessage(event: WebViewMessageEvent) {
    if (messageHandledRef.current || settledRef.current || missingParams ||
        event.nativeEvent.url !== "about:blank") return;

    let message: any;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (!message || typeof message !== "object" || Array.isArray(message) ||
        message.callbackNonce !== callbackNonce) return;
    if (message.type === "success") {
      if (message.razorpay_order_id !== razorpayOrderId ||
          typeof message.razorpay_payment_id !== "string" || !/^pay_[a-zA-Z0-9]+$/.test(message.razorpay_payment_id) ||
          typeof message.razorpay_signature !== "string" || !/^[a-f0-9]{64}$/i.test(message.razorpay_signature)) return;
      messageHandledRef.current = true;
      setVerifying(true);
      try {
        const result = await verifyPayment(verifyUrl, {
          internalOrderId,
          razorpay_order_id: message.razorpay_order_id,
          razorpay_payment_id: message.razorpay_payment_id,
          razorpay_signature: message.razorpay_signature,
        });

        // Resume recovery may have confirmed this order while verification
        // was in flight. A late callback must not replace that destination.
        if (settledRef.current || getCurrentUser()?.id !== recoveryOwner.current) return;
        if (result.success) {
          settledRef.current = true;
          resetTo("PaymentSuccess", {
            title: productTitle,
            amount: result.amount,
            orderId: internalOrderId,
          });
        } else if (result.pending === false) {
          settledRef.current = true;
          goToFailed(result.message || "Payment verification failed.");
        } else {
          // A structured unconfirmed response (including older servers without
          // a verdict) is ambiguous, just like a dropped network response.
          const recovered = await runRecoveryCheck();
          if (!recovered) {
            settledRef.current = true;
            goToPending(message.razorpay_payment_id);
          }
        }
      } catch {
        if (settledRef.current) return;
        // The payment may well have succeeded on Razorpay's side even if
        // this network call failed (dropped mid-request, timed out, etc).
        // Don't mark this settled and don't send the student to a dead
        // end yet - leave settledRef false so the AppState recovery check
        // (and another WebView message, if one still comes) can still
        // resolve this via Razorpay's own records. Just let
        // messageHandledRef stop us from re-running this same branch for
        // a duplicate "success" message.
        setVerifying(true);
        const recovered = await runRecoveryCheck();
        if (!recovered) {
          settledRef.current = true;
          goToPending(message.razorpay_payment_id);
        }
      } finally {
        if (!settledRef.current) setVerifying(false);
      }
      return;
    }

    if (message.type === "failed") {
      messageHandledRef.current = true;
      settledRef.current = true;
      goToFailed(message.reason || "Payment failed.");
      return;
    }

    if (message.type === "cancelled") {
      messageHandledRef.current = true;
      settledRef.current = true;
      if (internalOrderId) {
        markOrderStatus(internalOrderId, isNonplayTestBuild ? "cancelled" : "failed").catch(() => {});
      }
      navigation.goBack();
    }
  }

  // RECOVERY: covers the case where Checkout's success callback never made
  // it out of the WebView at all - most commonly Android killing the
  // WebView's renderer process while the app was backgrounded for a UPI
  // app switch (PhonePe/GPay). The student's payment can genuinely go
  // through on Razorpay's side even though this screen never heard about
  // it (stuck on "Verifying payment..." / a WebView crash page forever).
  // Runs whenever: (a) the app comes back to the foreground while this
  // screen is open and unsettled, or (b) the WebView's renderer process
  // itself crashes. Safe to call even when nothing was actually paid yet -
  // it just comes back { success: false } and this screen keeps waiting.
  // BUG FIX ("app still shows Confirming Your Payment even though the
  // payment/verification/unlock all succeeded on the backend"): this used
  // to be `const recovering = useRef(false)`, and the very first line of
  // this function was `if (settledRef.current || recovering.current)
  // return false;`. That `false` is indistinguishable, to a caller, from
  // "recovery checked and confirmed the payment did NOT go through" - but
  // it fires just as easily when a check is simply already in flight.
  //
  // On a real UPI payment (PhonePe/GPay) that's exactly what happens: the
  // AppState "active" listener below fires the instant the app is
  // foregrounded again and starts a recovery check (~24s of retries) -
  // and around the same moment, the WebView (also just resumed) can
  // independently deliver Checkout's delayed success postMessage, which
  // goes through handleMessage's verifyPayment() call above. If THAT call
  // fails (dropped mid-request - the exact same resume window is when the
  // network is most likely to hiccup, per the comment on verifyPayment()
  // in paymentService.ts), its catch block calls runRecoveryCheck() a
  // second time. With the old guard, this second call saw
  // recovering.current already true (from the AppState-triggered check
  // that was still mid-retry) and returned false immediately - not
  // because the payment was unconfirmed, but purely because another check
  // happened to be running. handleMessage's catch treats any `false` as
  // "give up", so it called goToPending() right then - sending the
  // student to the pending/"Confirming Your Payment" screen instead of
  // waiting the few remaining seconds for the AppState-triggered check
  // (which - per the verified backend facts - was about to come back
  // successful anyway).
  //
  // Fix: track the in-flight recovery as a Promise instead of a boolean.
  // A concurrent caller now awaits and returns THAT SAME promise's real
  // result instead of a hardcoded false, so every caller (AppState
  // resume, the WebView's own success message, onRenderProcessGone) ends
  // up seeing the one true outcome instead of racing each other.
  const recoveryInFlightRef = useRef<Promise<boolean> | null>(null);
  const runRecoveryCheck = useCallback(async (): Promise<boolean> => {
    if (settledRef.current) return false;
    if (!verifyUrl || !internalOrderId) return false;
    if (recoveryInFlightRef.current) return recoveryInFlightRef.current;

    const check = (async (): Promise<boolean> => {
      setVerifying(true);
      try {
        const result = await recoverPaymentWithRetry(verifyUrl, internalOrderId);
        if (settledRef.current) return true;
        if (result.authRequired || getCurrentUser()?.id !== recoveryOwner.current) {
          settledRef.current = true;
          goToPending(undefined, result.message || "Sign in to the account used for this payment, then check My Purchases. Do not pay again.");
          return true;
        }
        if (result.success) {
          settledRef.current = true;
          resetTo("PaymentSuccess", {
            title: productTitle,
            amount: result.amount,
            orderId: internalOrderId,
          });
          return true;
        }
        // Not paid yet (or still processing on Razorpay's side) - say
        // nothing and let the student keep watching; the next resume or
        // retry will check again.
        return false;
      } catch {
        // Transient network hiccup while checking - stay quiet, next resume
        // or retry will check again.
        return false;
      } finally {
        recoveryInFlightRef.current = null;
        if (!settledRef.current) setVerifying(false);
      }
    })();

    recoveryInFlightRef.current = check;
    return check;
  }, [verifyUrl, internalOrderId, productTitle, resetTo, goToPending]);

  useEffect(() => {
    settledRef.current = false;
    return () => { settledRef.current = true; };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") runRecoveryCheck();
    });
    return () => sub.remove();
  }, [runRecoveryCheck]);

  // Android-only: fires when the WebView's own renderer process is killed
  // by the OS (typically under memory pressure right after the app was
  // backgrounded for a UPI app switch) - shows as a native "Something went
  // wrong" page with no way for our postMessage-based success callback to
  // ever arrive. Treat it the same as an app-resume: check with Razorpay
  // directly instead of leaving the student stuck on a dead WebView.
  const handleRenderProcessGone = useCallback(() => {
    void runRecoveryCheck().then(recovered => {
      if (!recovered && !settledRef.current) {
        settledRef.current = true;
        goToPending();
      }
    });
  }, [runRecoveryCheck, goToPending]);

  // Hardware back button during an in-flight payment shouldn't leave a
  // half-finished order and a confusing state - treat it the same as the
  // Razorpay modal being dismissed.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (settledRef.current || verifying) return true; // swallow while verifying
        settledRef.current = true;
        if (internalOrderId) {
          markOrderStatus(internalOrderId, "failed").catch(() => {});
        }
        navigation.goBack();
        return true;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [internalOrderId, verifying])
  );

  // BUG FIX ("UPI options don't do anything when tapped"): Razorpay's UPI
  // block (see checkoutHtmlTemplate.ts) is enabled and does render PhonePe /
  // Google Pay / Paytm / other installed UPI apps - but selecting one makes
  // checkout.js try to navigate the WebView itself to a deep link. A WebView
  // has no way to "load" those - they aren't http(s) pages - so without
  // interception the navigation just silently fails and the UPI app never
  // opens.
  //
  // BUG FIX #2 (previous version of this fix): Android's UPI choice comes as
  // a Chrome-style "intent://...#Intent;scheme=upi;package=...;
  // S.browser_fallback_url=...;end" URL. The earlier version of this
  // handler extracted S.browser_fallback_url and opened THAT directly -
  // but Razorpay includes a browser_fallback_url on almost every intent
  // URL regardless of whether the app is installed, so this always sent
  // the student to the Play Store listing instead of actually opening the
  // installed app. Every UPI app tap looked "broken" even when e.g. PhonePe
  // was already installed.
  //
  // Fix: strip the Chrome intent:// wrapper and rebuild a plain "upi://"
  // URI (the standard scheme every UPI app registers as a handler for).
  // Try that first via Linking.canOpenURL/openURL - if and only if no app
  // can handle it, THEN fall back to S.browser_fallback_url (Play Store).
  // Only these app-link schemes are ever handed to the OS from the checkout page, and the
  // Play Store fallback is only followed when it really is a Play Store link. Anything else
  // (sms:, tel:, file:, javascript:, an arbitrary https fallback...) is blocked, so a
  // tampered/compromised checkout page cannot launch other apps or arbitrary sites.
  const handleShouldStartLoad = useCallback((request: { url: string }) => {
    const url = request.url;
    if (settledRef.current || missingParams) return false;
    if (isAllowedCheckoutWebUrl(url)) return true;
    if (/^(https?:|about:)/i.test(url)) return false;

    const scheme = (url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1] ?? "").toLowerCase();
    const notInstalled = () =>
      Alert.alert(
        "App not found",
        "The selected UPI app isn't installed on this device. Please choose another payment method."
      );

    if (Platform.OS === "android" && scheme === "intent") {
      // "intent://pay?pa=...&pn=...#Intent;scheme=upi;package=...;end"
      // -> "upi://pay?pa=...&pn=..."
      const intentScheme = url.match(/#Intent;(?:[^#]*;)?scheme=([a-z0-9+.-]+);/i)?.[1]?.toLowerCase();
      if (intentScheme !== "upi") return false;
      const upiPart = url.replace(/^intent:\/\//i, "").split("#Intent")[0];
      const directUpiUrl = `upi://${upiPart}`;
      const fallbackMatch = url.match(/S\.browser_fallback_url=([^;]+)/);
      let fallbackUrl: string | null = null;
      if (fallbackMatch) {
        try {
          const candidate = decodeURIComponent(fallbackMatch[1]);
          const parsed = new URL(candidate);
          const isPlayStore =
            parsed.protocol === "https:" &&
            (parsed.hostname === "play.google.com" || parsed.hostname === "market.android.com");
          fallbackUrl = isPlayStore ? candidate : null;
        } catch {
          fallbackUrl = null;
        }
      }

      Linking.canOpenURL(directUpiUrl)
        .then((supported) => {
          if (supported) return Linking.openURL(directUpiUrl);
          if (fallbackUrl) return Linking.openURL(fallbackUrl);
          throw new Error("No handler for UPI URL and no fallback available.");
        })
        .catch(notInstalled);

      return false;
    }

    // Direct UPI / wallet app links only.
    if (ALLOWED_APP_SCHEMES.has(scheme)) {
      Linking.openURL(url).catch(notInstalled);
    }
    return false;
  }, [missingParams]);

  const html = useMemo(() => missingParams ? "" : buildCheckoutHtml({
    callbackNonce, keyId, razorpayOrderId, timeoutSeconds, amountPaise,
    productTitle: productTitle || "MedVeda purchase", prefillName, prefillEmail,
  }), [missingParams, callbackNonce, keyId, razorpayOrderId, timeoutSeconds, amountPaise, productTitle, prefillName, prefillEmail]);
  const source = useMemo(() => ({ html }), [html]);

  if (missingParams) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not open the payment page. Please try again.</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* isLiveMode comes from the create-order Edge Function (server-derived from
          which RAZORPAY_KEY_ID is actually deployed) - shown so nobody
          mistakes a test-mode purchase for a real one, and so a stray test
          deployment in production is immediately obvious instead of silent.
          Renders nothing once the backend is confirmed on a live key. */}
      {isLiveMode === false && (
        <View style={[styles.testModeBanner, { pointerEvents: "none" }]}>
          <Text style={styles.testModeBannerText}>TEST MODE — no real payment will be made</Text>
        </View>
      )}
      <WebView
        source={source}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onRenderProcessGone={handleRenderProcessGone}
        onContentProcessDidTerminate={handleRenderProcessGone}
        onError={handleRenderProcessGone}
        onOpenWindow={({ nativeEvent }) => { handleShouldStartLoad({ url: nativeEvent.targetUrl }); }}
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        mixedContentMode="never"
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.accent} size="large" />
          </View>
        )}
        originWhitelist={CHECKOUT_ORIGIN_WHITELIST}
        javaScriptEnabled
        domStorageEnabled
      />
      {verifying && (
        <View style={styles.overlay}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.overlayText}>Verifying payment...</Text>
          <Text style={styles.overlaySubText}>
            Keep this screen open while we check. Delayed payments will show an order reference.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  testModeBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#E2703D",
    paddingVertical: 6,
    alignItems: "center",
    zIndex: 999,
    elevation: 999,
  },
  testModeBannerText: {
    color: "#100C0A",
    fontSize: 12,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.text,
    fontSize: FONT.body,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(16, 12, 10, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayText: {
    color: COLORS.text,
    fontSize: FONT.body,
    marginTop: SPACING.md,
  },
  overlaySubText: {
    color: COLORS.subtitle,
    fontSize: FONT.small,
    marginTop: SPACING.xs,
    opacity: 0.8,
    textAlign: "center",
    paddingHorizontal: SPACING.lg,
  },
});
