import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Application from "expo-application";

export type PaymentProvider = "razorpay" | "disabled";

const extra = Constants.expoConfig?.extra;
const configuredProvider = extra?.medvedaPaymentProvider;
const internalRazorpayTest =
  Application.applicationId === "in.medveda.razorpaytest" &&
  extra?.medvedaDistribution === "non-play-internal-test" &&
  extra?.medvedaBuildTarget === "staging" &&
  process.env.EXPO_PUBLIC_SUPABASE_URL === "https://nsmsqsogedzohwboripd.supabase.co";

// Only the distinct installed non-Play test package may opt Android into the
// retained checkout. Stale/OTA config cannot opt the Play package into it.
export const paymentProvider: PaymentProvider =
  configuredProvider === "razorpay" && (Platform.OS !== "android" || internalRazorpayTest)
    ? "razorpay" : "disabled";
