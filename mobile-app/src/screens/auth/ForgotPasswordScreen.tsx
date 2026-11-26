import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { forgotPasswordSchema } from "../../validation/forgotPasswordSchema";
import { parseAuthIdentifier } from "../../features/auth/identity";
import { requestPasswordReset } from "../../features/auth/authService";
import { COLORS } from "../../theme/colors";
import { RADIUS } from "../../theme/radius";
import { SPACING } from "../../theme/spacing";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<{ identifier: string }>({ resolver: yupResolver(forgotPasswordSchema), defaultValues: { identifier: "" } });
  const submit = async ({ identifier: text }: { identifier: string }) => {
    const identifier = parseAuthIdentifier(text);
    if (!identifier) return;
    setLoading(true);
    try { await requestPasswordReset(identifier); }
    catch {
      // A transport rejection must not escape the submit handler. Keep the
      // same account-neutral response used for returned delivery errors.
    } finally {
      // Same response for both a missing profile and a delivery failure.
      setLoading(false);
      Alert.alert("Check your email", "If an account matches these details, a password reset email has been sent.");
    }
  };
  return <KeyboardAvoidingView style={styles.container} behavior="height">
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
<Text accessibilityRole="header" style={styles.title}>Forgot Password?</Text>
    <Text style={styles.subtitle}>Enter your email or mobile number. We will send a reset email to the linked verified email account.</Text>
    <Controller control={control} name="identifier" render={({ field: { onChange, value } }) => <TextInput accessibilityLabel="Email or mobile number" style={styles.input} placeholder="Email or Mobile Number" placeholderTextColor={COLORS.subtitle} value={value} onChangeText={onChange} autoCapitalize="none" editable={!loading} />} />
    {errors.identifier && <Text accessibilityRole="alert" style={styles.error}>{errors.identifier.message}</Text>}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send reset email" accessibilityState={{ disabled: loading, busy: loading }} style={[styles.button, loading && styles.disabled]} disabled={loading} onPress={handleSubmit(submit)}>{loading ? <ActivityIndicator color={COLORS.textOnPrimary} /> : <Text style={styles.buttonText}>Send Reset Email</Text>}</TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" style={styles.linkButton} onPress={() => navigation.navigate("Login")}><Text style={styles.link}>Back to Login</Text></TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, width: "100%", maxWidth: 480, alignSelf: "center", justifyContent: "center", padding: SPACING.lg },
  title: { color: COLORS.text, fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: SPACING.sm },
  subtitle: { color: COLORS.subtitle, fontSize: 16, lineHeight: 24, textAlign: "center", marginBottom: SPACING.lg },
  input: { minHeight: 48, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md },
  error: { color: COLORS.error, marginTop: SPACING.xs },
  button: { minHeight: 48, justifyContent: "center", backgroundColor: COLORS.accent, padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.lg },
  disabled: { opacity: 0.6 },
  buttonText: { color: COLORS.textOnPrimary, fontWeight: "bold", textAlign: "center", fontSize: 16 },
  linkButton: { minHeight: 48, justifyContent: "center", marginTop: SPACING.sm },
  link: { color: COLORS.accentLight, textAlign: "center", fontSize: 16 },
});
