import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";

import { useNavigation } from "@react-navigation/native";

import { supabase } from "../../config/supabase";
import { getCurrentUser } from "../../services/authState";
import { changeMyPhone, fetchUserProfile, updateUserProfile } from "../../services/usersService";
import { normalizePhoneNumber } from "../../utils/phone";

import { COLORS } from "../../theme/colors";
import { RADIUS } from "../../theme/radius";
import { SPACING } from "../../theme/spacing";
import { logError } from "../../utils/logger";

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();

  const user = getCurrentUser();

  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [mobile, setMobile] = useState("");
  const [originalMobile, setOriginalMobile] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchUserProfile(user.id)
      .then((profile) => {
        if (profile) {
          if (profile.name) setName(profile.name);
          if (profile.mobile) {
            setMobile(profile.mobile);
            setOriginalMobile(profile.mobile);
          }
        }
      })
      .catch((err) => logError("Failed to load profile:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!user || submitting.current || getCurrentUser()?.id !== user.id) return;
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      Alert.alert("Invalid name", "Enter your full name.");
      return;
    }

    let normalizedMobile: string | undefined;
    if (mobile.trim()) {
      const candidate = normalizePhoneNumber(mobile);
      if (!candidate) {
        Alert.alert("Invalid mobile number", "Use international format with country code, for example +919876543210.");
        return;
      }
      normalizedMobile = candidate;
    }

    submitting.current = true;
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ data: { name: cleanName } });
      if (error) throw error;
      if (getCurrentUser()?.id !== user.id) return;
      await updateUserProfile(user.id, { name: cleanName });
      if (getCurrentUser()?.id !== user.id) return;

      // The number goes through its own rate-limited server call, and only when it changed.
      if (normalizedMobile && normalizedMobile !== originalMobile) {
        const result = await changeMyPhone(normalizedMobile);
        if (result !== "ok") {
          const messages = {
            invalid: "Use international format with country code, for example +919876543210.",
            rate_limited: "You have changed your number too many times today. Please try again tomorrow.",
            unavailable: "This mobile number can't be used. Please try a different number or contact support.",
          } as const;
          Alert.alert("Name saved, number not changed", messages[result]);
          return;
        }
        setOriginalMobile(normalizedMobile);
      }

      Alert.alert("Success", "Profile updated successfully.");

      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Unable to update profile.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="height">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <Text accessibilityRole="header" style={styles.title}>Edit Profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        accessibilityLabel="Enter your name"
        placeholderTextColor={COLORS.subtitle}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Mobile number (e.g. +919876543210)"
        accessibilityLabel="Mobile number (e.g. +919876543210)"
        placeholderTextColor={COLORS.subtitle}
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
      />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Save profile"
        accessibilityState={{ disabled: saving, busy: saving }}
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
        ) : (
          <Text style={styles.buttonText}>
            Save
          </Text>
        )}
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    maxWidth: 560,
    alignSelf: "center",
    padding: SPACING.lg,
    justifyContent: "center",
  },

  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xl,
    textAlign: "center",
  },

  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: RADIUS.md,
    minHeight: 48,
    padding: SPACING.md,
    fontSize: 16,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  button: {
    backgroundColor: COLORS.accent,
    minHeight: 48,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    justifyContent: "center",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
