import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import CustomButton from '../../components/CustomButton';
import { getAuthEpoch, getCurrentUser, subscribeAuthUser } from '../../services/authState';
import { createPlayOrder, fetchMatchingPlayProduct, startPlayPurchase, subscribePlayBilling } from '../../services/playBillingService';
import { COLORS } from '../../theme/colors';

type Quote = Awaited<ReturnType<typeof createPlayOrder>> & { offerToken: string; formattedPrice: string };

export default function PlayOrderSummaryScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<any>();
  const { productId, productTitle } = params ?? {};
  const epoch = useRef(getAuthEpoch());
  const owner = useRef(getCurrentUser()?.id);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [unresolved, setUnresolved] = useState(false);
  const current = useCallback(() => mounted.current && getAuthEpoch() === epoch.current &&
    getCurrentUser()?.id === owner.current, []);

  const load = useCallback(async () => {
    if (!current() || !productId || inFlight.current) return;
    inFlight.current = true;
    setLoading(true); setMessage(''); setQuote(null);
    try {
      const order = await createPlayOrder(productId, owner.current);
      if (!current()) return;
      const item = await fetchMatchingPlayProduct(order.playSku, order.amountInr);
      if (current()) setQuote({ ...order, ...item });
    } catch (error) {
      if (current()) setMessage(error instanceof Error ? error.message : 'Could not load Google Play checkout.');
    } finally {
      inFlight.current = false;
      if (current()) setLoading(false);
    }
  }, [current, productId]);

  useEffect(() => {
    mounted.current = true;
    const auth = subscribeAuthUser(() => {
      if (!current() && mounted.current) {
        setQuote(null); setBusy(false); setLoading(false); setUnresolved(true);
        setMessage('The signed-in account changed. Check My Purchases using the account that started this purchase.');
      }
    });
    const unsubscribe = subscribePlayBilling(event => {
      if (!current() || event.attempt.productId !== productId || event.attempt.userId !== owner.current) return;
      setBusy(false);
      if (event.type === 'success') {
        setUnresolved(true);
        setMessage('Purchase verified. Open My Purchases to access your content.');
      } else if (event.type === 'cancel') {
        setUnresolved(false); setMessage('Purchase cancelled.');
      } else {
        setUnresolved(true);
        setMessage(event.type === 'pending' ? 'Purchase is pending confirmation. Check My Purchases before paying again.' : event.message);
      }
    });
    void load();
    return () => { mounted.current = false; auth(); unsubscribe(); };
  }, [current, load, productId]);

  const pay = async () => {
    if (!quote || busy || unresolved || inFlight.current || !current() || !navigation.isFocused()) return;
    inFlight.current = true; setBusy(true); setMessage('');
    try {
      await startPlayPurchase({ userId: owner.current!, productId, productTitle: productTitle || 'MedVeda Notes',
        internalOrderId: quote.internalOrderId, playSku: quote.playSku }, quote.offerToken,
        () => current() && navigation.isFocused());
      // Native dispatch completion is not proof of payment. Only the listener's
      // verified server response can report success.
    } catch (error) {
      if (current()) {
        setBusy(false);
        setMessage(error instanceof Error ? error.message : 'Could not start Google Play checkout.');
      }
    } finally { inFlight.current = false; }
  };

  return <View style={styles.container}>
    <Text style={styles.title}>{productTitle || 'MedVeda Notes'}</Text>
    {loading ? <ActivityIndicator color={COLORS.accent} /> : <>
      {quote && <Text style={styles.text}>Google Play · {quote.formattedPrice}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
      <CustomButton title={busy ? 'Awaiting Google Play…' : quote ? `Pay ${quote.formattedPrice}` : 'Try again'}
        disabled={busy || unresolved} onPress={quote ? pay : load} />
    </>}
    <CustomButton title="My Purchases / Restore" onPress={() => navigation.navigate('MyPurchases')} />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24, paddingTop: 72, gap: 20 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  text: { color: COLORS.text, fontSize: 16 },
});
