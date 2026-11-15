import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";

import { COLORS } from "../theme/colors";
import { SPACING } from "../theme/spacing";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function CustomButton({
  title,
  onPress,
  disabled = false,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    minHeight: 55,
    minWidth: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.lg,
  },

  buttonDisabled: {
    backgroundColor: COLORS.primaryDark,
  },

  text: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "600",
  },
});