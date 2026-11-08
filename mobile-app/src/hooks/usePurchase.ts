import { useNavigation } from "@react-navigation/native";
import { Alert, Platform } from "react-native";

import { Product } from "../services/productsService";
import { paymentProvider } from "../config/paymentProvider";

export default function usePurchase() {
  // Kept so existing callers (`purchasing` spinners) still compile; starting a
  // payment now happens on the summary screen.
  const purchasing = false;
  const navigation = useNavigation<any>();

  // Opens the order summary (price, friend discount, optional referral balance).
  // The order itself is only created when the student taps Pay there, so
  // nothing is reserved or discounted by merely looking at the summary.
  function buy(product: Product) {
    if (Platform.OS !== "android") return;
    if (paymentProvider === "disabled") {
      Alert.alert("Purchases unavailable", "New purchases are unavailable in this app version. Previously purchased Notes remain accessible through your account.");
      return;
    }
    navigation.navigate("OrderSummary", {
      productId: product.id,
      productTitle: product.title,
    });
  }

  return { buy, purchasing };
}
