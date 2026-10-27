import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from "react-native";

import { COLORS } from "../theme/colors";
import { RADIUS } from "../theme/radius";
import { SHADOW } from "../theme/shadows";
import { FONT } from "../theme/fonts";
import { SPACING } from "../theme/spacing";

type Props = {
  title: string;
  onPress: () => void;
  onPressIn?: () => void;
  // Legacy caller compatibility: videos stay free even when this is supplied.
  locked?: boolean;
};

export default function VideoCard({
  title,
  onPress,
  onPressIn,
}: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${title}`}
      onPressIn={onPressIn}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.iconBadge}>
        <Text style={styles.icon}>🎥</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {title}
        </Text>

        <Text style={styles.subtitle}>
          Tap to Watch Video
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },


  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.info}26`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },


  icon: {
    fontSize: 22,
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: FONT.body,
    fontWeight: "bold",
    color: COLORS.text,
  },


  subtitle: {
    marginTop: SPACING.xs,
    color: COLORS.subtitle,
    fontSize: FONT.small,
  },
});
