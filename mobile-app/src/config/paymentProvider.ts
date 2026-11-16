import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Application from "expo-application";

export type PaymentProvider = "play" | "razorpay" | "disabled";

const extra = Constants.expoConfig?.extra;
const configuredProvider = extra?.medvedaPaymentProvider;
// Standard Android builds use the live catalog and live Razorpay endpoints.
// The isolated test package below keeps its own credentials and entitlements.
export const isStandaloneRazorpayLiveBuild = Platform.OS === "android" &&
  Application.applicationId === "in.medveda.app" &&
  configuredProvider === "razorpay" &&
  extra?.medvedaBuildTarget === "production" &&
  process.env.EXPO_PUBLIC_SUPABASE_URL === "https://xbvenkfmesugrbjuufyw.supabase.co";
export const isNonplayTestBuild = Platform.OS === "android" &&
  Application.applicationId === "in.medveda.razorpaytest" &&
  extra?.medvedaDistribution === "non-play-internal-test" &&
  extra?.medvedaBuildTarget === "production-isolated-test" &&
  extra?.medvedaBuildProfile === "razorpay-internal-test" &&
  extra?.medvedaNonplayTestEnvironment === "production-isolated-razorpay-test-v1" &&
  process.env.EXPO_PUBLIC_SUPABASE_URL === "https://xbvenkfmesugrbjuufyw.supabase.co";

// Keep retired Play branches/types for historical code compatibility, but never
// initialize native Play Billing or offer it as a payment method.
export const playRestorationEnabled = false;
export const paymentProvider: PaymentProvider =
  configuredProvider === "razorpay" && (isNonplayTestBuild || isStandaloneRazorpayLiveBuild)
    ? "razorpay" : "disabled";
export const userChoiceBillingEnabled = false;
