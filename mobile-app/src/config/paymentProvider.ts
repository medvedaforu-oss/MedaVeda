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
  extra?.medvedaDistribution !== "google-play-testing" &&
  extra?.medvedaBuildTarget === "production" &&
  process.env.EXPO_PUBLIC_SUPABASE_URL === "https://xbvenkfmesugrbjuufyw.supabase.co";
export const isNonplayTestBuild = Platform.OS === "android" &&
  Application.applicationId === "in.medveda.razorpaytest" &&
  extra?.medvedaDistribution === "non-play-internal-test" &&
  extra?.medvedaBuildTarget === "production-isolated-test" &&
  extra?.medvedaBuildProfile === "razorpay-internal-test" &&
  extra?.medvedaNonplayTestEnvironment === "production-isolated-razorpay-test-v1" &&
  process.env.EXPO_PUBLIC_SUPABASE_URL === "https://xbvenkfmesugrbjuufyw.supabase.co";

// Build metadata selects UI only. The server independently authorizes every order.
export const isPlayTestingBuild = Platform.OS === "android" &&
  Application.applicationId === "in.medveda.app" &&
  configuredProvider === "play" &&
  extra?.medvedaDistribution === "google-play-testing" &&
  extra?.medvedaBuildTarget === "play-testing" &&
  extra?.medvedaBuildProfile === "play-billing-testing" &&
  process.env.EXPO_PUBLIC_SUPABASE_URL === "https://xbvenkfmesugrbjuufyw.supabase.co";
export const playRestorationEnabled = isPlayTestingBuild;
export const paymentProvider: PaymentProvider = isPlayTestingBuild ? "play" :
  configuredProvider === "razorpay" && (isNonplayTestBuild || isStandaloneRazorpayLiveBuild)
    ? "razorpay" : "disabled";
export const userChoiceBillingEnabled = false;
