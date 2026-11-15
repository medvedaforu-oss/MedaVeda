import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { COLORS } from "../theme/colors";
import { SPACING } from "../theme/spacing";

type Props = {
  message: string;
  onRetry?: () => void;
  busy?: boolean;
};

export default function ErrorState({
  message,
  onRetry,
  busy = false,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>
        ⚠️
      </Text>

      <Text style={styles.message} accessibilityLiveRegion="polite">
        {message}
      </Text>

      {onRetry && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => { if (!busy) onRetry(); }}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityState={{ disabled: busy, busy }}
        >
          <Text style={styles.buttonText}>
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 70,
    alignItems: "center",
  },

  icon: {
    fontSize: 55,
  },

  message: {
    marginTop: SPACING.md,
    fontSize: 18,
    color: COLORS.text,
    textAlign: "center",
  },

  button: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
    marginTop: 25,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
});