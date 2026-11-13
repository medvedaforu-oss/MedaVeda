import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import { resetPasswordSchema } from "../../validation/resetPasswordSchema";
import { createPasswordRecovery, parseRecoveryTokensFromUrl } from "../../features/auth/authService";
import { getLastDeepLinkUrl, clearLastDeepLinkUrl, getRecoveryLinkRevision, subscribeRecoveryLinks } from "../../features/auth/deepLinkStore";
import type { RecoveryState } from "../../features/auth/recoveryFlow";
import { COLORS } from "../../theme/colors";
import { RADIUS } from "../../theme/radius";
import { SPACING } from "../../theme/spacing";

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();

  const active = useRef<{ recovery: ReturnType<typeof createPasswordRecovery>; revision: number } | null>(null);
  const subscribe = useCallback((notify: () => void) => subscribeRecoveryLinks(() => {
    const session = active.current;
    // Retire continuations synchronously, before React renders the new link.
    if (session && getRecoveryLinkRevision() !== session.revision) {
      session.recovery.dispose();
      active.current = null;
    }
    notify();
  }), []);
  const revision = useSyncExternalStore(subscribe, getRecoveryLinkRevision);
  const [state, setState] = useState<RecoveryState>({ phase: "idle", factors: [] });
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const busy = useRef(false);

  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Hold the guard synchronously: React's saving state alone permits rapid double taps.
  const run = useCallback(async (work: () => Promise<RecoveryState>) => {
    const session = active.current;
    if (!session || busy.current) return;
    const current = () => active.current === session && getRecoveryLinkRevision() === session.revision;
    busy.current = true;
    setSaving(true);
    setMessage("");
    try {
      const next = await work();
      if (!current()) return;
      setState(next);
      if (next.phase === "mfa") {
        reset();
        setFactorId(next.factors[0]?.id ?? "");
      }
      if (next.phase === "cleanup" || next.phase === "done") {
        reset();
        clearLastDeepLinkUrl(session.revision);
      }
      if (next.phase === "done") {
        Alert.alert("Password Updated", "Your password has been reset. Please log in with your new password.", [
          { text: "OK", onPress: () => { if (current()) navigation.reset({ index: 0, routes: [{ name: "Login" }] }); } },
        ]);
      }
    } catch (error) {
      if (!current()) return;
      const next = session.recovery.snapshot();
      setState(next);
      // Only the controller's fixed, sanitized messages reach the UI. No auth payload logging.
      setMessage(error instanceof Error ? error.message : "Couldn't complete password recovery. Please try again.");
      if (["expired", "blocked", "cleanup"].includes(next.phase)) {
        reset();
        clearLastDeepLinkUrl(session.revision);
      }
    } finally {
      if (current()) {
        setCode("");
        busy.current = false;
        setSaving(false);
      }
    }
  }, [navigation, reset]);

  const start = useCallback(() => run(async () => {
    const session = active.current!;
    let tokens = null;
    try { const url = getLastDeepLinkUrl(); tokens = url ? parseRecoveryTokensFromUrl(url) : null; }
    catch { /* controller returns a sanitized expired-session error */ }
    const next = await session.recovery.start(tokens);
    if (active.current === session) clearLastDeepLinkUrl(session.revision);
    return next;
  }), [run]);

  useEffect(() => {
    const controller = createPasswordRecovery();
    const session = { recovery: controller, revision };
    active.current = session;
    busy.current = false;
    reset(); setCode(""); setMessage(""); setFactorId(""); setState(controller.snapshot());
    void start();
    return () => {
      if (active.current === session) active.current = null;
      controller.dispose();
    };
  }, [revision, reset, start]);

  const submit = ({ password }: ResetPasswordForm) => {
    if (state.phase !== "ready") return;
    return run(() => active.current!.recovery.updatePassword(password));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🔑</Text>

      <Text style={styles.title}>Reset Password</Text>

      <Text style={styles.subtitle}>
        {state.phase === "mfa" ? "Verify your enrolled authenticator to continue." :
          state.phase === "ready" ? "Enter a new password for your account." :
          state.phase === "cleanup" || state.phase === "done" ? "Your password has changed." :
          state.phase === "expired" || state.phase === "blocked" ? "Password recovery needs your attention." : "Checking your recovery session."}
      </Text>
      {!!message && <Text style={styles.error} accessibilityRole="alert">{message}</Text>}
      {saving && state.phase === "idle" && <ActivityIndicator color={COLORS.accent} />}
      {state.phase === "idle" && !saving && (
        <TouchableOpacity style={styles.button} onPress={start}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      )}
      {state.phase === "mfa" && <>
        {state.factors.map(factor => (
          <TouchableOpacity key={factor.id} disabled={saving} accessibilityRole="radio"
            accessibilityState={{ checked: factorId === factor.id }} onPress={() => setFactorId(factor.id)}>
            <Text style={styles.subtitle}>{factorId === factor.id ? "● " : "○ "}{factor.label}</Text>
          </TouchableOpacity>
        ))}
        <TextInput style={styles.input} placeholder="Six-digit authenticator code" placeholderTextColor={COLORS.subtitle}
          accessibilityLabel="Authenticator code" value={code} onChangeText={setCode} keyboardType="number-pad"
          textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} editable={!saving} secureTextEntry />
        <TouchableOpacity style={[styles.button, saving && styles.disabled]} disabled={saving}
          onPress={() => run(() => active.current!.recovery.verify(factorId, code.trim()))}>
          {saving ? <ActivityIndicator color={COLORS.textOnPrimary} /> : <Text style={styles.buttonText}>Verify code</Text>}
        </TouchableOpacity>
      </>}
      {(state.phase === "mfa" || state.phase === "blocked") && (
        <TouchableOpacity onPress={() => Linking.openURL("https://www.medveda.in/contact")}>
          <Text style={styles.link}>Can't access your enrolled factor? Contact support for account recovery.</Text>
        </TouchableOpacity>
      )}
      {state.phase === "cleanup" && (
        <TouchableOpacity style={[styles.button, saving && styles.disabled]} disabled={saving}
          onPress={() => run(() => active.current!.recovery.retryCleanup())}>
          <Text style={styles.buttonText}>{saving ? "Signing out…" : "Retry sign-out"}</Text>
        </TouchableOpacity>
      )}
      {state.phase === "ready" && <>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor={COLORS.subtitle}
              value={value}
              onChangeText={onChange}
              secureTextEntry
              editable={!saving}
            />
          )}
        />

        {errors.password && (
          <Text style={styles.error}>{errors.password.message}</Text>
        )}

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor={COLORS.subtitle}
              value={value}
              onChangeText={onChange}
              secureTextEntry
              editable={!saving}
            />
          )}
        />

        {errors.confirmPassword && (
          <Text style={styles.error}>{errors.confirmPassword.message}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, saving && styles.disabled]}
          disabled={saving}
          onPress={handleSubmit(submit)}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>

      </>}
      <TouchableOpacity disabled={saving} onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: COLORS.background,
  },

  logo: {
    textAlign: "center",
    fontSize: 60,
  },

  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: SPACING.sm,
  },

  subtitle: {
    color: COLORS.subtitle,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },

  input: {
    color: COLORS.text,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },

  error: {
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },

  button: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },

  disabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: COLORS.textOnPrimary,
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 17,
  },

  link: {
    color: COLORS.accentLight,
    textAlign: "center",
    marginTop: SPACING.lg,
  },
});