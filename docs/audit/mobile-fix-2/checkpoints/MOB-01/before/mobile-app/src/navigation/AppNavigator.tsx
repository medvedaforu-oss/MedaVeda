// Imported first, before anything else, so Sentry is initialized as early
// as possible in the app's lifecycle and can catch errors thrown by any
// later import/render in this file.
import "../config/sentry";

import { NavigationContainer, DefaultTheme, useNavigationContainerRef, type ParamListBase } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import useNotificationRouting from "../hooks/useNotificationRouting";

import { getCurrentUser, subscribeAuthUser } from "../services/authState";
import { logError } from "../utils/logger";

import { COLORS } from "../theme/colors";
import {
  setupNotificationChannel,
  restoreStudyReminderOnLaunch,
} from "../services/studyReminderService";
import usePreventScreenshot from "../hooks/usePreventScreenshot";
import ErrorBoundary from "../components/ErrorBoundary";
import { getInitialDeepLinkUrl, subscribeDeepLinks } from "../features/auth/deepLinkStore";

import SplashScreen from "../screens/auth/SplashScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

import HomeScreen from "../screens/home/HomeScreen";
import SelectCourseYearScreen from "../screens/onboarding/SelectCourseYearScreen";

import { paymentProvider } from "../config/paymentProvider";

// Metro includes every literal module in the installed bundle. React Navigation
// evaluates these synchronous loaders only when a route is rendered, so native
// viewers and non-visible screens do not initialize during startup. Keeping the
// same component export preserves screen identity and the existing ErrorBoundary.
// Auth, recovery, Home, onboarding and Sentry retain their eager ordering.
declare const require: (path: string) => { default: import("react").ComponentType<any> };
const deferredScreens = {
  YearsScreen: () => require("../screens/years/YearsScreen").default,
  SubjectsScreen: () => require("../screens/subjects/SubjectsScreen").default,
  ChaptersScreen: () => require("../screens/chapters/ChaptersScreen").default,
  ChapterDetailsScreen: () => require("../screens/details/ChapterDetailsScreen").default,
  StoreScreen: () => require("../screens/store/StoreScreen").default,
  NotesScreen: () => require("../screens/notes/NotesScreen").default,
  VideosScreen: () => require("../screens/videos/VideosScreen").default,
  TestListScreen: () => require("../screens/quiz/TestListScreen").default,
  QuizScreen: () => require("../screens/quiz/QuizScreen").default,
  ProfileScreen: () => require("../screens/profile/ProfileScreen").default,
  EditProfileScreen: () => require("../screens/profile/EditProfileScreen").default,
  ReferralScreen: () => require("../screens/referral/ReferralScreen").default,
  ReferralTermsScreen: () => require("../screens/referral/ReferralTermsScreen").default,
  OrderSummaryScreen: () => require("../screens/payment/OrderSummaryScreen").default,
  ChangePasswordScreen: () => require("../screens/profile/ChangePasswordScreen").default,
  MyPurchasesScreen: () => require("../screens/purchases/MyPurchasesScreen").default,
  DownloadsScreen: () => require("../screens/downloads/DownloadsScreen").default,
  PdfViewerScreen: () => require("../screens/pdf/PdfViewerScreen").default,
  SearchScreen: () => require("../screens/search/SearchScreen").default,
  SettingsScreen: () => require("../screens/settings/SettingsScreen").default,
  StudyReminderScreen: () => require("../screens/reminder/StudyReminderScreen").default,
  NotificationsScreen: () => require("../screens/notifications/NotificationsScreen").default,
  NotificationPreferencesScreen: () => require("../screens/notifications/NotificationPreferencesScreen").default,
  PaymentSuccessScreen: () => require("../screens/payment/PaymentSuccessScreen").default,
  PaymentFailedScreen: () => require("../screens/payment/PaymentFailedScreen").default,
  PaymentCheckoutScreen: () => require("../screens/payment/PaymentCheckoutScreen").default,
  AboutScreen: () => require("../screens/about/AboutScreen").default,
  ContactScreen: () => require("../screens/contact/ContactScreen").default,
  PrivacyScreen: () => require("../screens/privacy/PrivacyScreen").default,
  TermsScreen: () => require("../screens/terms/TermsScreen").default,
};

const Stack = createNativeStackNavigator();

const studyOptions = (title: string) => ({
  headerShown: true,
  title,
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.text,
});

const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.card,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.accent,
  },
};

// ResetPassword IS live: Supabase's password-reset email links back to
// "medveda://reset-password" (see authService.PASSWORD_RESET_REDIRECT_URL).
//
// NOTE: the prefix below must match app.json's "scheme" field exactly
// ("medveda") or none of these deep links will open the app.
const linking = {
  prefixes: ["medveda://"],
  getInitialURL: getInitialDeepLinkUrl,
  subscribe: subscribeDeepLinks,
  config: {
    screens: {
      ResetPassword: "reset-password",
    },
  },
};

export default function AppNavigator() {
  const [ownerId, setOwnerId] = useState(() => getCurrentUser()?.id ?? null);
  useEffect(() => {
    const update = () => setOwnerId(getCurrentUser()?.id ?? null);
    const unsubscribe = subscribeAuthUser(update);
    update();
    return unsubscribe;
  }, []);
  const navigation = useNavigationContainerRef<ParamListBase>();
  const [navigationReady, setNavigationReady] = useState(false);
  const [route, setRoute] = useState<string>();
  useNotificationRouting(navigation, navigationReady, route);
  // Runs once per app launch: makes sure the Android notification channel
  // exists, and re-applies the daily reminder if it was left "on" (mainly
  // a safety net for Android dropping exact alarms after a device
  // reboot - the OS otherwise keeps firing the schedule on its own).
  useEffect(() => {
    void setupNotificationChannel().then(restoreStudyReminderOnLaunch)
      .catch(error => logError("Reminder restoration failed", error));
  }, []);

  // Blocks screenshots/screen recording for the whole app (paid Notes PDF
  // content is the reason, but it's applied globally, not just on the
  // PDF viewer - see hooks/usePreventScreenshot.ts for exact platform
  // behavior/limits).
  usePreventScreenshot();

  return (
    <ErrorBoundary>
      <NavigationContainer theme={navigationTheme} linking={linking} ref={navigation}
        onReady={() => { setNavigationReady(true); setRoute(navigation.getCurrentRoute()?.name); }}
        onStateChange={() => setRoute(navigation.getCurrentRoute()?.name)}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
        <Stack.Group navigationKey={ownerId ?? "signed-out"}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        {ownerId && <>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="SelectCourseYear"
          component={SelectCourseYearScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Years" getComponent={deferredScreens.YearsScreen} options={studyOptions("Choose year")} />
        <Stack.Screen name="Subjects" getComponent={deferredScreens.SubjectsScreen} options={studyOptions("Choose subject")} />
        <Stack.Screen name="Chapters" getComponent={deferredScreens.ChaptersScreen} options={studyOptions("Choose chapter")} />
        <Stack.Screen name="ChapterDetails" getComponent={deferredScreens.ChapterDetailsScreen} options={studyOptions("Study materials")} />
        <Stack.Screen name="Store" getComponent={deferredScreens.StoreScreen} />
        <Stack.Screen name="Notes" getComponent={deferredScreens.NotesScreen} options={studyOptions("Notes")} />
        <Stack.Screen name="Videos" getComponent={deferredScreens.VideosScreen} options={studyOptions("Free lectures")} />
        <Stack.Screen name="QuizTests" getComponent={deferredScreens.TestListScreen} options={studyOptions("Free MCQ tests")} />
        <Stack.Screen name="Quiz" getComponent={deferredScreens.QuizScreen} options={studyOptions("MCQ test")} />
        <Stack.Screen name="Profile" getComponent={deferredScreens.ProfileScreen} />
        <Stack.Screen name="EditProfile" getComponent={deferredScreens.EditProfileScreen} />
        <Stack.Screen name="Referral" getComponent={deferredScreens.ReferralScreen} />
        <Stack.Screen name="ReferralTerms" getComponent={deferredScreens.ReferralTermsScreen} />
        <Stack.Screen name="ChangePassword" getComponent={deferredScreens.ChangePasswordScreen} />
        <Stack.Screen name="MyPurchases" getComponent={deferredScreens.MyPurchasesScreen} />
        <Stack.Screen name="Downloads" getComponent={deferredScreens.DownloadsScreen} />
        <Stack.Screen name="PdfViewer" getComponent={deferredScreens.PdfViewerScreen} options={studyOptions("Note reader")} />
        <Stack.Screen name="Search" getComponent={deferredScreens.SearchScreen} />
        <Stack.Screen name="Settings" getComponent={deferredScreens.SettingsScreen} />
        <Stack.Screen name="StudyReminder" getComponent={deferredScreens.StudyReminderScreen} />
        <Stack.Screen name="Notifications" getComponent={deferredScreens.NotificationsScreen} />
        <Stack.Screen name="NotificationPreferences" getComponent={deferredScreens.NotificationPreferencesScreen} />
        <Stack.Screen name="PaymentSuccess" getComponent={deferredScreens.PaymentSuccessScreen} />
        <Stack.Screen name="PaymentFailed" getComponent={deferredScreens.PaymentFailedScreen} />
        {paymentProvider !== "disabled" && (
          <Stack.Screen name="OrderSummary" getComponent={deferredScreens.OrderSummaryScreen} />
        )}
        {paymentProvider !== "disabled" && (
          <Stack.Screen name="PaymentCheckout" getComponent={deferredScreens.PaymentCheckoutScreen} />
        )}
        <Stack.Screen name="About" getComponent={deferredScreens.AboutScreen} />
        <Stack.Screen name="Contact" getComponent={deferredScreens.ContactScreen} />
        <Stack.Screen name="Privacy" getComponent={deferredScreens.PrivacyScreen} />
        <Stack.Screen name="Terms" getComponent={deferredScreens.TermsScreen} />
        </>}
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
    </ErrorBoundary>
  );
}
