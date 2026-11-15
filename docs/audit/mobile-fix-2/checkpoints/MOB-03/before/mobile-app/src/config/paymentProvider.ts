import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Application from "expo-application";

export type PaymentProvider = "play" | "razorpay" | "disabled";

const extra = Constants.expoConfig?.extra;
const configuredProvider = extra?.medvedaPaymentProvider;
// Read the native build identity only for this distribution. OTA extras alone
// cannot enable a production/Closed Testing binary, even with the same package.
const liveNative = extra?.medvedaDistribution === "non-play-live-testing"
  ? require("expo-updates") as typeof import("expo-updates") : null;
export const isStandaloneRazorpayLiveBuild = Platform.OS === "android" &&
  Application.applicationId === "in.medveda.app" &&
  extra?.medvedaDistribution === "non-play-live-testing" &&
  extra?.medvedaBuildTarget === "production" &&
  extra?.medvedaBuildProfile === "razorpay-live-testing" &&
  liveNative?.channel === "razorpay-live-testing" &&
  liveNative?.runtimeVersion === `${Constants.expoConfig?.version}-razorpay-live-testing` &&
  process.env.EXPO_PUBLIC_SUPABASE_URL === "https://xbvenkfmesugrbjuufyw.supabase.co";
export const isNonplayTestBuild = Platform.OS === "android" &&
  Application.applicationId === "in.medveda.razorpaytest" &&
  extra?.medvedaDistribution === "non-play-internal-test" &&
  extra?.medvedaBuildTarget === "production-isolated-test" &&
  extra?.medvedaBuildProfile === "razorpay-internal-test" &&
  extra?.medvedaNonplayTestEnvironment === "production-isolated-razorpay-test-v1" &&
  process.env.EXPO_PUBLIC_SUPABASE_URL === "https://xbvenkfmesugrbjuufyw.supabase.co";

// Only the isolated test package or dedicated native live-testing build may
// opt Android into checkout. Stale/OTA extras cannot enable a Play binary.
// Keep historical receipt restoration independent of permission to start sales.
export const playRestorationEnabled = configuredProvider === "play" &&
  Platform.OS === "android" && Application.applicationId === "in.medveda.app";
const approvedUserChoice = extra?.medvedaIndiaUcbEnrolled === true &&
  (extra?.medvedaUcbTestAccepted === true ||
    (extra?.medvedaDistribution === "play-alpha-validation" &&
     process.env.EXPO_PUBLIC_SUPABASE_URL === "https://nsmsqsogedzohwboripd.supabase.co"));
export const paymentProvider: PaymentProvider =
  playRestorationEnabled && approvedUserChoice
    ? "play" : configuredProvider === "razorpay" && (Platform.OS !== "android" || isNonplayTestBuild || isStandaloneRazorpayLiveBuild)
    ? "razorpay" : "disabled";

// Separate build-time approval gates. Defaults and all existing Play profiles
// remain off until programme enrolment AND authorised Alpha acceptance exist.
export const userChoiceBillingEnabled = paymentProvider === "play" &&
  approvedUserChoice;
