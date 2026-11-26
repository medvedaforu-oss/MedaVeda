import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, AppState } from "react-native";

import { useRoute, useNavigation, useFocusEffect, CommonActions } from "@react-navigation/native";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";
import { RADIUS } from "../../theme/radius";
import { SHADOW } from "../../theme/shadows";
import { getCurrentUser } from "../../services/authState";
import { recoverPayment } from "../../services/paymentService";

// Reached via normal in-app navigation - either from
// PaymentCheckoutScreen (Razorpay reported a failure, or verify-payment
// rejected the payment) or from usePurchase.ts (checkout couldn't be
// started at all). Used to be reached via a medveda://payment-failed
// deep link from an external browser page; see PaymentSuccessScreen.tsx
// for why that page never actually worked.
//
// PENDING/CONFIRMING MODE: when PaymentCheckoutScreen couldn't get a
// definite verdict in time (verify-payment call dropped, e.g. from the
// WebView being backgrounded for a UPI app switch, and the ~24s recovery
// window ran out before Razorpay's autocapture actually finished), it
// routes here with `pending: true` instead of a hard failure - the
// payment genuinely might still be going through, so this screen keeps
// checking in the background (on an interval, and every time the app
// comes back to the foreground) and auto-redirects to PaymentSuccess the
// instant verify-payment's recovery path confirms it. This is what stops
// "payment actually succeeded, webhook granted it, but the app still
// shows a failure" - the old code gave up after 24s with no way to ever
// find out it was wrong.
const POLL_INTERVAL_MS = 8000;
const MAX_POLL_MINUTES = 10;

export default function PaymentFailedScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { title, reason, pending, verifyUrl, internalOrderId, paymentId, provider, authRequired } = route.params ?? {};

  const recoveryOwner = useRef(getCurrentUser()?.id);
  const authPaused = useRef(!!authRequired);
  const [authMessage, setAuthMessage] = useState<string | null>(authRequired ? reason : null);
  const [terminalReason, setTerminalReason] = useState<string | null>(null);
  const stillConfirming = !!pending && !terminalReason;
  const resolvedRef = useRef(false);
  const pollCountRef = useRef(0);
  const focused = useRef(false);
  const focusGeneration = useRef(0);
  const checking = useRef(false);
  const statusReason = terminalReason ?? reason;

  function goTo(screenName: string) {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: "Home" }, { name: screenName }],
      })
    );
  }

  const checkStatus = useCallback(async () => {
    if (authPaused.current || !focused.current || checking.current || resolvedRef.current || !pending || !internalOrderId ||
        (provider === "play" || !verifyUrl)) return;
    // Give up quietly after MAX_POLL_MINUTES - the student can still see
    // it unlock on its own via My Purchases, or reach out to support with
    // the Payment ID shown below.
    if (pollCountRef.current * (POLL_INTERVAL_MS / 1000) > MAX_POLL_MINUTES * 60) return;
    pollCountRef.current += 1;
    checking.current = true;
    const run = focusGeneration.current;
    try {
      if (getCurrentUser()?.id !== recoveryOwner.current) {
        authPaused.current = true;
        setAuthMessage("Sign in to the account used for this payment, then check My Purchases. Do not pay again.");
        return;
      }
      const result = await recoverPayment(verifyUrl, internalOrderId, recoveryOwner.current);
      if (!focused.current || resolvedRef.current || run !== focusGeneration.current) return;
      if (("authRequired" in result && result.authRequired) || getCurrentUser()?.id !== recoveryOwner.current) {
        authPaused.current = true;
        setAuthMessage(result.message || "Sign in to the account used for this payment, then check My Purchases. Do not pay again.");
        return;
      }
      if (!result.success && result.pending === false) {
        resolvedRef.current = true;
        setTerminalReason(result.message || "This payment could not unlock the Notes. Contact support before paying again.");
        return;
      }
      if (result.success) {
        resolvedRef.current = true;
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: "Home" },
              {
                name: "PaymentSuccess",
                params: { title, amount: result.amount, orderId: internalOrderId },
              },
            ],
          })
        );
      }
    } catch {
      // Transient - the next interval tick or app-resume will try again.
    } finally { checking.current = false; }
  }, [pending, verifyUrl, internalOrderId, title, navigation, provider]);

  // Poll on an interval while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (!pending || provider === "play") return () => { focused.current = false; };
      void checkStatus();
      const interval = setInterval(checkStatus, POLL_INTERVAL_MS);
      return () => { focused.current = false; focusGeneration.current++; clearInterval(interval); };
    }, [pending, provider, checkStatus])
  );

  // Also re-check immediately whenever the app comes back to the
  // foreground (e.g. student switched away and back), rather than waiting
  // for the next interval tick.
  useEffect(() => {
    if (!pending || provider === "play") return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkStatus();
    });
    return () => sub.remove();
  }, [pending, provider, checkStatus]);

  // Earlier Play orders remain visible in server history. Never initialize
  // native Billing or retry a historical Play payment through Razorpay.
  if (provider === "play") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Earlier Google Play payment</Text>
        <Text style={styles.subtitle}>
          Google Play Billing is retired in this app. Check My Purchases or contact support about this earlier payment. Do not pay again.
        </Text>
        <View style={styles.reasonCard}>
          <Text style={styles.reasonText}>
            {title || "Earlier purchase"}
            {internalOrderId ? ` Order ID: ${internalOrderId}` : ""}
            {paymentId ? ` Payment ID: ${paymentId}` : ""}
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => goTo("MyPurchases")}>
          <Text style={styles.primaryButtonText}>Check My Purchases</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => goTo("Contact")}>
          <Text style={styles.secondaryButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (stillConfirming) {
    return (
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: `${COLORS.warning}1F` }]}>
          <Text style={styles.icon}>⏳</Text>
        </View>

        <Text style={styles.title}>{authMessage ? "Sign in to Check Payment" : "Confirming Your Payment"}</Text>
        <Text style={styles.subtitle}>
          {title
            ? `We're still confirming your payment for "${title}". Notes will unlock after the server confirms your purchase and Notes access.`
            : "We're still confirming your payment. Notes will unlock after the server confirms your purchase and Notes access."}
        </Text>

        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>Details</Text>
          <Text style={styles.reasonText}>
            {authMessage || "Payment may have succeeded but verification could not be confirmed yet"}
            {paymentId ? `. Payment ID: ${paymentId}` : "."}
            {internalOrderId ? ` Order ID: ${internalOrderId}` : ""}
          </Text>
        </View>

        <Text style={styles.note}>
          No need to pay again. Check My Purchases in a few minutes. If it is
          still locked after {MAX_POLL_MINUTES} minutes, contact support with
          the order or payment ID above.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => {
            resolvedRef.current = true;
            goTo("MyPurchases");
          }}
        >
          <Text style={styles.primaryButtonText}>Check My Purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.85}
          onPress={() => {
            resolvedRef.current = true;
            goTo("Contact");
          }}
        >
          <Text style={styles.secondaryButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>❌</Text>
      </View>

      <Text style={styles.title}>{terminalReason ? "Payment update" : "Payment Failed"}</Text>
      <Text style={styles.subtitle}>
        {terminalReason ? "This payment has not unlocked the Notes. See the details below." : title
          ? `Your payment for "${title}" could not be completed.`
          : "Your payment could not be completed."}
      </Text>

      {statusReason && (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>Reason</Text>
          <Text style={styles.reasonText}>{statusReason}</Text>
        </View>
      )}

      <Text style={styles.note}>
        {terminalReason ? "Check the payment or refund status with support before paying again."
          : "If money was deducted, check My Purchases or contact support before paying again."}
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.85}
        onPress={() => goTo(terminalReason ? "MyPurchases" : "Store")}
      >
        <Text style={styles.primaryButtonText}>{terminalReason ? "My Purchases" : "Try Again"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        activeOpacity={0.85}
        onPress={() => goTo("Contact")}
      >
        <Text style={styles.secondaryButtonText}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },

  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.error}1F`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },

  icon: {
    fontSize: 52,
  },

  title: {
    fontSize: FONT.heading,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  subtitle: {
    fontSize: FONT.body,
    color: COLORS.subtitle,
    textAlign: "center",
    marginTop: SPACING.sm,
  },

  reasonCard: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOW.card,
  },

  reasonLabel: {
    fontSize: FONT.small,
    color: COLORS.subtitle,
    marginBottom: 4,
  },

  reasonText: {
    fontSize: FONT.small,
    color: COLORS.text,
    fontWeight: "600",
  },

  note: {
    fontSize: FONT.tiny,
    color: COLORS.subtitle,
    textAlign: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    lineHeight: 18,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginBottom: SPACING.md,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT.body,
    fontWeight: "700",
  },

  secondaryButton: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: COLORS.text,
    fontSize: FONT.body,
    fontWeight: "700",
  },
});
