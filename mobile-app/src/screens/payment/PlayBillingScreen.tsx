import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { CommonActions, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  createPlayOrder,
  fetchMatchingPlayProduct,
  PlayBillingEvent,
  startPlayPurchase,
  subscribePlayBilling,
} from "../../services/playBillingService";
import { fetchOrderQuote } from "../../services/referralsService";
import { supabase } from "../../config/supabase";
import { paymentProvider } from "../../config/paymentProvider";
import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";
import type { RootStackParamList } from "../../types/navigation";

export default function PlayBillingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "PlayBilling">>();
  const { productId, productTitle } = route.params ?? {};
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [playPrice, setPlayPrice] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{ userId: string; offerToken: string; order: Awaited<ReturnType<typeof createPlayOrder>> } | null>(null);
  const started = useRef(false);
  const alive = useRef(true);
  const generation = useRef(0);
  const busy = useRef(false);
  const phase = useRef<"prepare" | "purchase">("prepare");
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (!working) return;
    const timer = setTimeout(() => {
      generation.current++;
      busy.current = false;
      setWorking(false);
      setPrepared(null);
      setPlayPrice(null);
      const purchasing = phase.current === "purchase";
      setRecovery(purchasing);
      setMessage(purchasing
        ? "Payment is still unconfirmed. Do not pay again. Check Google Play purchases to recover it."
        : "Checkout took too long to load. Check your connection and try again.");
    }, 30_000);
    return () => clearTimeout(timer);
  }, [working]);
  const settled = useRef(false);
  const currentOrderId = useRef<string | null>(null);

  useEffect(() => subscribePlayBilling((event: PlayBillingEvent) => {
    if (!alive.current || settled.current || event.attempt.internalOrderId !== currentOrderId.current) return;
    if (event.type === "success") {
      settled.current = true;
      navigation.dispatch(CommonActions.reset({
        index: 1,
        routes: [
          { name: "Home" },
          {
            name: "PaymentSuccess",
            params: {
              title: event.result.productTitle ?? productTitle,
              amount: event.result.amount,
              orderId: event.attempt.internalOrderId,
            },
          },
        ],
      }));
    } else if (event.type === "pending") {
      settled.current = true;
      navigation.dispatch(CommonActions.reset({
        index: 1,
        routes: [
          { name: "Home" },
          {
            name: "PaymentFailed",
            params: {
              title: productTitle,
              pending: true,
              provider: "play",
              internalOrderId: event.attempt.internalOrderId,
            },
          },
        ],
      }));
    } else if (event.type === "cancel") {
      busy.current = false;
      setWorking(false);
      setRecovery(false);
      setMessage("Payment cancelled. You can try again when ready.");
    } else if (event.type === "error") {
      busy.current = false;
      setWorking(false);
      setRecovery(true);
      setPrepared(null);
      setPlayPrice(null);
      setMessage(`${event.message} Check Google Play purchases before trying another payment.`);
    }
  }), [navigation, productId, productTitle]);

  const prepare = async () => {
    if (busy.current || Platform.OS !== "android") return;
    if (typeof productId !== "string" || !productId.trim()) {
      setMessage("This product link is invalid. Go back to the Store and choose the item again.");
      return;
    }
    if (paymentProvider !== "play") {
      setMessage("Google Play Billing is not enabled for this distribution.");
      return;
    }
    busy.current = true;
    phase.current = "prepare";
    const run = ++generation.current;
    const current = () => alive.current && generation.current === run;
    try {
      setWorking(true);
      setMessage(null);
      setRecovery(false);
      const { data: session } = await supabase.auth.getSession();
      if (!current()) return;
      const userId = session.session?.user.id;
      if (!userId) throw new Error("Please log in before purchasing.");
      // Both the quote and Play SKU are derived from server-side product data.
      // The quote's list price is compared with Play's live INR price.
      const quote = await fetchOrderQuote(productId, false);
      if (!current()) return;
      if (!quote.ok && quote.code === "already_owned") {
        setRecovery(true);
        setMessage("You already own this item. Open My Purchases to access it or check Google Play purchases.");
        return;
      }
      if (!quote.ok || !Number.isFinite(quote.listPrice)) {
        throw new Error("This product is no longer available.");
      }
      const order = await createPlayOrder(productId);
      if (!current()) return;
      if (!order.internalOrderId || !order.playSku || !order.purchaseOptionId) {
        throw new Error("Could not prepare Play payment.");
      }
      currentOrderId.current = order.internalOrderId;
      if (!Number.isFinite(order.amountInr) || Math.abs(order.amountInr - quote.listPrice) > 0.005) {
        throw new Error("The product price changed. Please try again.");
      }
      const offer = await fetchMatchingPlayProduct(order.playSku, order.amountInr);
      if (!current()) return;
      const latest = await supabase.auth.getSession();
      if (!current()) return;
      if (latest.data.session?.user.id !== userId) throw new Error("Account changed. Return to the Store and try again.");
      setPlayPrice(offer.formattedPrice);
      setPrepared({ userId, offerToken: offer.offerToken, order });
    } catch (error) {
      if (!current()) return;
      setPrepared(null);
      setPlayPrice(null);
      setMessage(error instanceof Error ? error.message : "Could not start Play payment.");
    } finally {
      if (current()) { busy.current = false; setWorking(false); }
    }
  };

  const pay = async () => {
    if (!prepared || busy.current || recovery) return;
    busy.current = true;
    phase.current = "purchase";
    const run = ++generation.current;
    const current = () => alive.current && generation.current === run;
    try {
      setWorking(true);
      setMessage(null);
      const { data } = await supabase.auth.getSession();
      if (!current()) return;
      const userId = data.session?.user.id;
      if (userId !== prepared.userId) throw new Error("Account changed. Return to the Store and try again.");
      if (!userId) throw new Error("Please log in before purchasing.");
      await startPlayPurchase({ userId, productId,
        productTitle: productTitle ?? "MedVeda purchase", ...prepared.order }, prepared.offerToken);
    } catch (error) {
      if (!current()) return;
      busy.current = false;
      setWorking(false);
      setRecovery(true);
      setPrepared(null);
      setPlayPrice(null);
      setMessage(error instanceof Error ? error.message : "Could not start Play payment.");
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void prepare();
    // Run once for this screen instance. Retry is an explicit button below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choose how to pay</Text>
      <Text style={styles.description}>
        Google Play will show the payment options available to you.
      </Text>
      {playPrice && <Text style={styles.price}>Google Play price: {playPrice}</Text>}
      {working && <ActivityIndicator color={COLORS.accent} size="large" style={styles.spinner} />}
      {message && <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text>}
      {recovery && <TouchableOpacity accessibilityRole="button" style={styles.button}
        onPress={() => navigation.navigate("MyPurchases")}>
        <Text style={styles.buttonText}>Check Google Play purchases</Text>
      </TouchableOpacity>}
      {!working && !recovery && (
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { void (prepared ? pay() : prepare()); }}>
          <Text style={styles.buttonText}>{prepared ? `Pay ${playPrice}` : message ? "Try again" : "Continue"}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: SPACING.xl,
  },
  title: { color: COLORS.text, fontSize: FONT.title, fontWeight: "700", textAlign: "center" },
  description: { color: COLORS.subtitle, fontSize: FONT.body, textAlign: "center", marginTop: SPACING.md },
  price: { color: COLORS.text, fontSize: FONT.title, fontWeight: "700", textAlign: "center", marginTop: SPACING.xl },
  spinner: { marginTop: SPACING.xl },
  error: { color: COLORS.error, fontSize: FONT.body, textAlign: "center", marginTop: SPACING.xl },
  button: { backgroundColor: COLORS.accent, padding: SPACING.md, borderRadius: 10, marginTop: SPACING.xl },
  buttonText: { color: COLORS.white, textAlign: "center", fontWeight: "700" },
});
