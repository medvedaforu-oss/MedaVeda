import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Switch, ActivityIndicator, Alert,
  Platform, Modal, Pressable,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import CustomButton from "../../components/CustomButton";
import ErrorState from "../../components/ErrorState";

import {
  fetchOrderQuote,
  fetchReferralSettings,
  formatRupees,
  walletProductsText,
  OrderQuote,
  ReferralSettings,
} from "../../services/referralsService";
import { purchaseProduct } from "../../services/paymentService";
import { paymentProvider, userChoiceBillingEnabled } from "../../config/paymentProvider";

import { attachExternalToken, createPlayOrder, fetchMatchingPlayProduct, resumeAlternativeChoice,
  finishAlternativeChoice, saveAlternativeContext, startPlayPurchase, subscribePlayBilling, type PlayAttempt } from "../../services/playBillingService";
import { supabase } from "../../config/supabase";
import { INDIA_ADMINISTRATIVE_AREAS } from "../../services/indiaBillingStates";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { RADIUS } from "../../theme/radius";
import { SPACING } from "../../theme/spacing";
import { logError } from "../../utils/logger";

// Shown between "Buy" and Razorpay. Every number here comes from the server
// (quote_my_order); the client sends no amounts. The wallet toggle is only
// rendered when the program is enabled (referral_settings), the server says
// this product is wallet-eligible and there is a balance to use.
export default function OrderSummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { productId, productTitle } = route.params ?? {};

  const [useWallet, setUseWallet] = useState(false);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  // Read fresh every time this screen opens (no cache), so an admin change is
  // picked up on the next order. Null (not loaded / failed) is treated as off.
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [buyerState, setBuyerState] = useState("");
  const [selectingState, setSelectingState] = useState(false);
  const [alternative, setAlternative] = useState<PlayAttempt | null>(null);
  const currentAttempt = useRef<PlayAttempt | null>(null);
  const alternativeInFlight = useRef(false);
  const navigated = useRef(false);
  const currentQuote = useRef(quote);
  const currentWallet = useRef(useWallet);
  const currentState = useRef(buyerState);
  currentQuote.current = quote;
  currentWallet.current = useWallet;
  currentState.current = buyerState;
  const requestId = useRef(0);
  const paymentInFlight = useRef(false);
  const quoteReady = useRef(false);

  const loadQuote = useCallback(
    async (wallet: boolean) => {
      const id = ++requestId.current;
      quoteReady.current = false;
      setQuote(null);
      try {
        setLoading(true);
        setError(null);
        const q = await fetchOrderQuote(productId, wallet);
        if (id !== requestId.current || navigated.current) return; // a newer request superseded this one
        if (!q.ok) {
          setError("This product is no longer available.");
          return;
        }
        setQuote(q);
        quoteReady.current = true;
      } catch (err) {
        if (id !== requestId.current || navigated.current) return;
        logError("quote failed:", err);
        setError("Could not load the price. Please try again.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    navigated.current = false;
    return () => { navigated.current = true; };
  }, []);

  useEffect(() => {
    loadQuote(false);
  }, [loadQuote]);

  useEffect(() => {
    fetchReferralSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  const onToggleWallet = (next: boolean) => {
    setUseWallet(next);
    loadQuote(next);
  };

  const openAlternative = useCallback(async (attempt: PlayAttempt) => {
    if (alternativeInFlight.current || navigated.current) return;
    alternativeInFlight.current = true;
    setAlternative(attempt);
    setPaying(true);
    paymentInFlight.current = true;
    const assertOwner = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id !== attempt.userId || navigated.current)
        throw new Error("The signed-in account changed. Check My Purchases before retrying.");
    };
    try {
      await assertOwner();
      if (!currentState.current || !currentQuote.current) throw new Error("Select your Indian billing state and review the price.");
      await saveAlternativeContext(attempt, currentState.current, currentWallet.current);
      await assertOwner();
      await attachExternalToken(attempt, attempt.externalTransactionToken!);
      await assertOwner();
      const checkoutData = await purchaseProduct(productId, currentWallet.current, attempt.internalOrderId, currentState.current);
      await assertOwner();
      if (checkoutData.amountPaise !== Math.round(currentQuote.current!.amount * 100)) {
        // Keep the server's reserved order/price for explicit reconfirmation.
        // A new quote could include/exclude this order's own wallet reservation.
        setQuote(q => q && checkoutData.breakdown ? { ...q, ...checkoutData.breakdown } : q);
        Alert.alert("Price updated", "Review the updated price and tap Pay again.");
        return;
      }
      await finishAlternativeChoice(attempt).catch(() => {});
      await assertOwner();
      if (navigated.current) return;
      navigated.current = true;
      navigation.replace("PaymentCheckout", checkoutData);
    } catch (err: any) {
      Alert.alert("Could Not Start Payment", err?.message || "Please try again.");
    } finally {
      alternativeInFlight.current = false;
      paymentInFlight.current = false;
      setPaying(false);
    }
  }, [navigation, productId]);

  useEffect(() => {
    if (paymentProvider !== "play") return;
    let active = true;
    void resumeAlternativeChoice(productId).then(attempt => {
      if (active && attempt) {
        currentAttempt.current = attempt;
        setAlternative(attempt);
        setBuyerState(attempt.choiceContext?.buyerState ?? "");
        setUseWallet(attempt.choiceContext?.useWallet ?? false);
        void loadQuote(attempt.choiceContext?.useWallet ?? false);
      }
    }).catch(() => {});
    const unsubscribe = subscribePlayBilling(event => {
      if (!active || navigated.current || event.attempt.internalOrderId !== currentAttempt.current?.internalOrderId) return;
      if (event.type === "alternative") { void openAlternative(event.attempt); return; }
      paymentInFlight.current = false;
      setPaying(false);
      if (event.type === "success") {
        navigated.current = true;
        navigation.replace("PaymentSuccess", { orderId: event.attempt.internalOrderId,
          title: productTitle, amount: event.result.amount });
      } else if (event.type === "pending") {
        navigated.current = true;
        navigation.replace("PaymentFailed", { title: productTitle, pending: true,
          provider: "play", internalOrderId: event.attempt.internalOrderId });
      } else if (event.type === "error") Alert.alert("Payment update", event.message);
    });
    return () => { active = false; unsubscribe(); };
  }, [navigation, openAlternative, productId, productTitle, loadQuote]);

  const pay = async () => {
    if (paymentInFlight.current || !quoteReady.current || paying || loading || !quote) return;
    if (Platform.OS !== "android" || paymentProvider === "disabled") {
      Alert.alert("Checkout unavailable", "Start checkout from a note on Android.");
      return;
    }
    paymentInFlight.current = true;
    try {
      setPaying(true);
      if (paymentProvider === "play") {
        if (alternative) { await openAlternative(alternative); return; }
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) throw new Error("Please log in before purchasing.");
        const order = await createPlayOrder(productId, uid);
        if (Math.round(order.amountInr * 100) !== Math.round(quote.listPrice * 100)) {
          throw new Error("The product price changed. Review it and try again.");
        }
        const offer = await fetchMatchingPlayProduct(order.playSku, order.amountInr);
        const attempt = { ...order, userId: uid, productId, productTitle,
          choiceContext: { buyerState, useWallet } };
        currentAttempt.current = attempt;
        await startPlayPurchase(attempt, offer.offerToken);
        // Native listeners own the outcome, including cancellation and pending.
        return;
      }
      // Same flag the server just quoted for; the server recomputes everything.
      const checkoutData = await purchaseProduct(productId, useWallet);
      if (checkoutData.amountPaise !== Math.round(quote.amount * 100)) {
        Alert.alert("Price updated", "The total changed. Review the updated price before paying.");
        await loadQuote(useWallet);
        return;
      }
      if (navigated.current) return;
      navigated.current = true;
      navigation.replace("PaymentCheckout", checkoutData);
    } catch (err: any) {
      paymentInFlight.current = false;
      setPaying(false);
      currentAttempt.current = null;
      Alert.alert("Could Not Start Payment", err?.message || "Please try again.");
      loadQuote(useWallet); // balance / discount may have changed
    } finally {
      if (paymentProvider !== "play" || alternative || !currentAttempt.current) {
        paymentInFlight.current = false;
        setPaying(false);
      }
    }
  };

  if (!productId || Platform.OS !== "android" || paymentProvider === "disabled") {
    return (
      <View style={styles.container}>
        <ErrorState message="Start checkout from a note on Android." onRetry={() => navigation.goBack()} />
      </View>
    );
  }

  if (error && !quote) {
    return (
      <View style={styles.container}>
        <ErrorState message={error} onRetry={() => loadQuote(useWallet)} />
      </View>
    );
  }

  // Program switched off (or settings unreadable): no wallet toggle at all.
  const showWallet = (paymentProvider === "razorpay" || userChoiceBillingEnabled) && !!settings?.enabled && !!quote?.walletEligible && (quote?.walletAvailable ?? 0) > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Order summary</Text>
        <Text style={styles.product} numberOfLines={2}>
          {productTitle}
        </Text>

        {!quote ? (
          <ActivityIndicator style={{ marginTop: SPACING.xl }} color={COLORS.accent} />
        ) : (
          <>
            {paymentProvider === "play" && <Text style={styles.product}>Google Play: {formatRupees(quote.listPrice)}{userChoiceBillingEnabled ? ` · Razorpay: ${formatRupees(quote.amount)}. Referral discounts and balance apply to Razorpay only` : ""}. Google Play confirms the available payment options.</Text>}
            {userChoiceBillingEnabled && <Pressable disabled={paying || (!!alternative && !!buyerState)} onPress={() => setSelectingState(true)} accessibilityRole="button">
              <Text style={styles.product}>Billing state for Razorpay in India: {buyerState || "Select state (required for Razorpay)"}</Text>
            </Pressable>}
            {alternative && <Text style={styles.product}>Retrying your saved Razorpay choice. Keep the same referral balance selection and billing state.</Text>}
            {showWallet && (
              <View style={styles.walletRow}>
                <View style={{ flex: 1, paddingRight: SPACING.md }}>
                  <Text style={styles.walletTitle}>
                    Use referral balance ({formatRupees(quote.walletAvailable)} available)
                  </Text>
                  <Text style={styles.walletNote}>
                    {walletProductsText(settings?.walletProductTypes)} purchases only · up to{" "}
                    {formatRupees(quote.walletMaxUsable)} on this order
                  </Text>
                </View>
                <Switch
                  value={useWallet}
                  onValueChange={onToggleWallet}
                  disabled={paying || !!alternative}
                  trackColor={{ true: COLORS.accent, false: COLORS.border }}
                  thumbColor={COLORS.white}
                />
              </View>
            )}

            <View style={[styles.card, loading && { opacity: 0.6 }]}>
              <Line label="Price" value={formatRupees(quote.listPrice)} />
              {(paymentProvider === "razorpay" || userChoiceBillingEnabled) && quote.referralDiscount > 0 && (
                <Line label="Friend discount" value={`− ${formatRupees(quote.referralDiscount)}`} positive />
              )}
              {useWallet && quote.walletAmount > 0 && (
                <Line label="Referral balance used" value={`− ${formatRupees(quote.walletAmount)}`} positive />
              )}
              <View style={styles.divider} />
              <Line label={userChoiceBillingEnabled ? "Amount via Razorpay" : "Amount payable"} value={formatRupees(paymentProvider === "play" && !userChoiceBillingEnabled ? quote.listPrice : quote.amount)} bold />
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {alternative && !paying && <CustomButton title="Choose payment again" onPress={async () => {
          await finishAlternativeChoice(alternative);
          setAlternative(null);
          currentAttempt.current = null;
          void loadQuote(useWallet);
        }} />}
        <CustomButton
          title={paying ? "Please wait…" : paymentProvider === "play" && !alternative ? "Continue to payment" : quote ? `Pay ${formatRupees(quote.amount)}` : "Pay"}
          onPress={pay}
          disabled={!quote || loading || paying}
        />
      </View>
      <Modal visible={selectingState} onRequestClose={() => setSelectingState(false)} animationType="slide">
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Indian billing state</Text>
          {INDIA_ADMINISTRATIVE_AREAS.map(state => <Pressable key={state} onPress={() => { setBuyerState(state); setSelectingState(false); }}>
            <Text style={styles.product}>{state}</Text>
          </Pressable>)}
          <CustomButton title="Cancel" onPress={() => setSelectingState(false)} />
        </ScrollView>
      </Modal>
    </View>
  );
}

function Line({ label, value, positive, bold }: { label: string; value: string; positive?: boolean; bold?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.lineValue, positive && { color: COLORS.success }, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  title: { fontSize: FONT.title, fontWeight: "bold", color: COLORS.text },
  product: { color: COLORS.subtitle, fontSize: FONT.body, marginTop: 4, marginBottom: SPACING.lg },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  walletTitle: { color: COLORS.text, fontSize: FONT.body, fontWeight: "600" },
  walletNote: { color: COLORS.subtitle, fontSize: FONT.small, marginTop: 2 },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  lineLabel: { color: COLORS.subtitle, fontSize: FONT.body },
  lineValue: { color: COLORS.text, fontSize: FONT.body },
  bold: { color: COLORS.text, fontWeight: "700", fontSize: FONT.body + 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  footer: { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
});
