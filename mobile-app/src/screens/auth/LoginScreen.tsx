import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import { loginSchema } from "../../validation/loginSchema";

import { createUserProfile, fetchUserProfile } from "../../services/usersService";
import { logDebug } from "../../utils/logger";
import { parseAuthIdentifier } from "../../features/auth/identity";
import { signInWithIdentifier } from "../../features/auth/authService";
import {
  clearLoginAttempts,
  formatRemainingTime,
  getLockStatus,
  recordFailedAttempt,
  type LockStatus,
} from "../../features/auth/loginLockout";

import { COLORS } from "../../theme/colors";
import { RADIUS } from "../../theme/radius";
import { SPACING } from "../../theme/spacing";
import { getCurrentUser } from "../../services/authState";
import { resolvePostLoginRoute } from "../../services/courseState";
import BrandLogo from "../../components/BrandLogo";

type FormData = { identifier: string; password: string };

const NOT_LOCKED: LockStatus = { locked: false, remainingMs: 0 };

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [hidePassword, setHidePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const [lockStatus, setLockStatus] = useState<LockStatus>(NOT_LOCKED);
  // Set on EVERY failed sign-in attempt (any cause, email or mobile) so the
  // neutral hint below never reveals whether an account exists.
  const [loginFailed, setLoginFailed] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const identifierValue = watch("identifier");

  // Re-check the lockout state (from SecureStore) whenever the identifier
  // changes, so switching between two accounts on a shared device - or
  // reopening the app while an account is still locked - reflects the
  // correct, persisted status immediately. Debounced so this isn't a
  // storage read on every keystroke.
  useEffect(() => {
    let cancelled = false;
    const parsed = parseAuthIdentifier((identifierValue ?? "").trim());
    if (!parsed) {
      setLockStatus(NOT_LOCKED);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const status = await getLockStatus(parsed.value);
        if (!cancelled) setLockStatus(status);
      } catch {
        // Submission retries the secure read and reports a recoverable failure.
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [identifierValue]);

  // Live countdown while locked, so "locked for 4m 59s" ticks down on
  // screen without the user needing to retry to find out it's expired.
  useEffect(() => {
    if (!lockStatus.locked) return;
    const interval = setInterval(() => {
      setLockStatus((prev) => {
        if (!prev.locked) return prev;
        const remainingMs = prev.remainingMs - 1000;
        return remainingMs <= 0 ? NOT_LOCKED : { locked: true, remainingMs };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockStatus.locked]);

  const onLogin = async (data: FormData) => {
    // Guard against double-submits (double-tap, slow network + repeat
    // tap) in addition to the button's own `disabled` state.
    if (submitting.current) return;
    setLoginFailed(false);

    const identifier = data.identifier.trim();
    const parsedIdentifier = parseAuthIdentifier(identifier);
    if (!parsedIdentifier) {
      setLoginFailed(true);
      Alert.alert("Login Failed", "Enter a valid email or mobile number");
      return;
    }
    const lockKey = parsedIdentifier.value;

    // Re-verify against persisted state right before attempting the
    // request - closes the gap where the debounced check above hasn't
    // run yet but the account is already locked.
    submitting.current = true;
    setLoading(true);
    try {
      const freshLock = await getLockStatus(lockKey);
      if (!alive.current) return;
      if (freshLock.locked) {
        setLockStatus(freshLock);
        setLoginFailed(true);
        Alert.alert("Account Temporarily Locked",
          `Too many failed attempts. Please try again in ${formatRemainingTime(freshLock.remainingMs)}.`);
        return;
      }
      const { data: authData, error } = await signInWithIdentifier(parsedIdentifier, data.password);
      if (!alive.current) return;
      const user = authData?.user;

      if (error || !user) {
        const rejection = error as { code?: string; status?: number; context?: { status?: number } } | null;
        const invalidCredentials = rejection?.code === "invalid_credentials" || rejection?.context?.status === 401;
        if (!invalidCredentials) throw new Error("Sign-in unavailable");
        const status = await recordFailedAttempt(lockKey);
        setLockStatus(status);
        logDebug("Login rejected");
        setLoginFailed(true);
        if (status.locked) {
          Alert.alert(
            "Account Temporarily Locked",
            `Too many failed attempts. Please try again in ${formatRemainingTime(status.remainingMs)}.`
          );
        } else {
          Alert.alert("Login Failed", "Invalid email/mobile number or password");
        }
        return;
      }

      await clearLoginAttempts(lockKey).catch(() => {});
      setLockStatus(NOT_LOCKED);
      logDebug("Login success");

      // Backfill a profile row for accounts that predate this feature.
      // Normally the DB trigger (see schema.sql) already creates one on
      // signup - this only kicks in for older/edge-case accounts. Never
      // overwrites an existing profile (e.g. a name the student already
      // customized).
      try {
        const existingProfile = await fetchUserProfile(user.id);
        if (!existingProfile) {
          await createUserProfile(user.id, {
            name: user.user_metadata?.name || user.email?.split("@")[0] || "Student",
            email: user.email || "",
          });
        }
      } catch (profileError) {
        logDebug("profile backfill failed:", profileError);
      }

      const destination = await resolvePostLoginRoute();
      if (alive.current && navigation.isFocused?.() !== false) {
        if (getCurrentUser()?.id !== user.id) throw new Error("Session changed during sign-in");
        navigation.replace(destination);
      }
    } catch (error: any) {
      // Unexpected/network errors are distinct from wrong credentials -
      // don't count them against the lockout counter, and don't imply
      // anything about whether the identifier or password was correct.
      if (!alive.current) return;
      logDebug("Login request failed");
      setLoginFailed(true);
      Alert.alert("Something Went Wrong", "Please check your connection and try again.");
    } finally {
      submitting.current = false;
      if (alive.current) setLoading(false);
    }
  };

  const isLocked = lockStatus.locked;
  const isButtonDisabled = loading || isLocked;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {
        paddingTop: Math.max(SPACING.xl, insets.top),
        paddingBottom: Math.max(SPACING.xl, insets.bottom),
      }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <BrandLogo size={80} style={styles.logo} accessibilityLabel="MedVeda logo" />

      <Text accessibilityRole="header" style={styles.title}>MedVeda</Text>

      <Text style={styles.subtitle}>
        Learn Ayurveda Anytime, Anywhere
      </Text>

      {/* Email or mobile number */}

      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            placeholder="Email or mobile number"
            accessibilityLabel="Email or mobile number"
            placeholderTextColor={COLORS.subtitle}
            style={styles.input}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
        )}
      />

      {errors.identifier && (
        <Text style={styles.error}>
          {errors.identifier.message}
        </Text>
      )}

      {/* Password */}

      <View style={styles.passwordContainer}>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Password"
              accessibilityLabel="Password"
              placeholderTextColor={COLORS.subtitle}
              style={styles.passwordInput}
              secureTextEntry={hidePassword}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!loading}
            />
          )}
        />

        <TouchableOpacity accessibilityRole="button"
            accessibilityLabel={hidePassword ? "Show password" : "Hide password"}
            style={styles.passwordToggle}
            onPress={() => setHidePassword(!hidePassword)}
          disabled={loading}
        >
          <Ionicons
            name={hidePassword ? "eye-off" : "eye"}
            size={22}
            color={COLORS.subtitle}
          />
        </TouchableOpacity>
      </View>

      {errors.password && (
        <Text style={styles.error}>
          {errors.password.message}
        </Text>
      )}

      {loginFailed && (
        <Text style={styles.loginHint}>
          Phone number not linked yet? Log in with your email.
        </Text>
      )}

      {/* Lockout notice */}

      {isLocked && (
        <Text style={styles.lockedNotice}>
          Too many failed attempts. Try again in {formatRemainingTime(lockStatus.remainingMs)}.
        </Text>
      )}

      {/* Forgot Password */}

      <TouchableOpacity accessibilityRole="button"
        style={styles.forgotLink}
        onPress={() => navigation.navigate("ForgotPassword")}
        disabled={loading}
      >
        <Text style={styles.forgot}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      {/* Login Button */}

      <TouchableOpacity accessibilityRole="button"
        accessibilityLabel={loading ? "Logging in" : undefined}
        accessibilityState={{ disabled: isButtonDisabled, busy: loading }}
        style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
        onPress={handleSubmit(onLogin)}
        disabled={isButtonDisabled}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.textOnPrimary} />
        ) : (
          <Text style={styles.buttonText}>
            {isLocked ? `Locked (${formatRemainingTime(lockStatus.remainingMs)})` : "Login"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Register */}

      <TouchableOpacity accessibilityRole="button"
        style={styles.secondaryAction}
        onPress={() => navigation.navigate("Register")}
        disabled={loading}
      >
        <Text style={styles.register}>
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: SPACING.lg,
    justifyContent: "center",
  },

  logo: {
    alignSelf: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginTop: SPACING.sm,
  },

  subtitle: {
    textAlign: "center",
    color: COLORS.subtitle,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },

  input: {
    minHeight: 48,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
  },

  passwordInput: {
    minHeight: 48,
    fontSize: 16,
    flex: 1,
    paddingVertical: SPACING.md,
    color: COLORS.text,
  },

  passwordToggle: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  error: {
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },

  loginHint: {
    color: COLORS.subtitle,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },

  lockedNotice: {
    color: COLORS.error,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },

  forgotLink: {
    minHeight: 48,
    justifyContent: "center",
    marginVertical: SPACING.sm,
  },

  forgot: {
    color: COLORS.accentLight,
    textAlign: "right",
  },

  button: {
    backgroundColor: COLORS.accent,
    minHeight: 48,
    padding: SPACING.md,
    justifyContent: "center",
    borderRadius: RADIUS.md,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: COLORS.textOnPrimary,
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },

  secondaryAction: {
    minHeight: 48,
    justifyContent: "center",
    marginTop: SPACING.sm,
  },

  register: {
    textAlign: "center",
    color: COLORS.subtitle,
    fontSize: 16,
  },
});
