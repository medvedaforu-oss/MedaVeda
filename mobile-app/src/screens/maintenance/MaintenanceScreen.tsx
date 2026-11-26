import React from "react";
import { View, Text, StyleSheet } from "react-native";
import CustomButton from "../../components/CustomButton";
import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";

export default function MaintenanceScreen({ checking, retry }: {
  checking: boolean;
  retry: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Down for maintenance
      </Text>
      <Text style={styles.message}>MedVeda will be back soon. Please try again shortly.</Text>
      <View style={styles.button}>
        <CustomButton title="Retry" onPress={retry} disabled={checking} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: SPACING.lg, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontWeight: "bold", color: COLORS.text, textAlign: "center" },
  button: { width: "100%", maxWidth: 440, alignSelf: "center", marginTop: SPACING.sm },
  message: { fontSize: 16, lineHeight: 24, maxWidth: 440, alignSelf: "center", color: COLORS.subtitle, textAlign: "center", marginTop: SPACING.md },
});
