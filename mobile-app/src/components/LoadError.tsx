import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import useNetworkStatus from "../hooks/useNetworkStatus";
import { COLORS } from "../theme/colors";
import { SPACING } from "../theme/spacing";

export default function LoadError({ content, retry }: { content: string; retry: () => void }) {
  const online = useNetworkStatus();
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.message}>
        {online ? `Could not load ${content}. Please try again.` : `You're offline. Connect to the internet and retry loading ${content}.`}
      </Text>
      <TouchableOpacity onPress={retry} accessibilityRole="button" style={styles.button}>
        <Text style={styles.label}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, alignItems: "center" },
  message: { color: COLORS.subtitle, textAlign: "center", marginBottom: SPACING.md },
  button: { backgroundColor: COLORS.accent, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 8 },
  label: { color: COLORS.white, fontWeight: "700" },
});
