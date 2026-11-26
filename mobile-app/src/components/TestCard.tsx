import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { COLORS } from "../theme/colors";
import { FONT } from "../theme/fonts";
import { SPACING } from "../theme/spacing";
import { RADIUS } from "../theme/radius";
import { SHADOW } from "../theme/shadows";

type Props = {
  title: string;
  questionCount: number;
  onPress: () => void;
  // Compatibility only: MCQs are always free, regardless of legacy props.
  locked?: boolean;
  free?: boolean;
  // OFFLINE MODE - all optional, default to "no download affordance",
  // same pattern as NoteCard so both feel consistent to the student.
  downloaded?: boolean;
  saving?: boolean; // true while the JSON write is in flight (near-instant, but still worth a spinner)
  onDownloadPress?: () => void;
  onRemoveDownloadPress?: () => void;
};

export default function TestCard({
  title,
  questionCount,
  onPress,
  downloaded = false,
  saving = false,
  onDownloadPress,
  onRemoveDownloadPress,
}: Props) {
  const showDownloadAction = !!(onDownloadPress || onRemoveDownloadPress);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.icon}>📝</Text>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {title}
          </Text>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>FREE</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          {downloaded
            ? `${questionCount} Questions - Available Offline`
            : `${questionCount} Questions - Tap to Start Test`}
        </Text>
      </View>

      {showDownloadAction && (
        <TouchableOpacity
          style={styles.downloadButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={(e) => {
            e.stopPropagation?.();
            if (downloaded) {
              onRemoveDownloadPress?.();
            } else if (!saving) {
              onDownloadPress?.();
            }
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Text style={styles.downloadIcon}>{downloaded ? "🗑️" : "⬇️"}</Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 68,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },

  icon: {
    fontSize: 30,
    marginRight: SPACING.sm,
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    alignItems: "center",
  },

  freeBadge: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  freeBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
  },

  title: {
    flexShrink: 1,
    fontSize: FONT.body,
    color: COLORS.text,
    fontWeight: "600",
  },

  subtitle: {
    marginTop: SPACING.xs,
    color: COLORS.subtitle,
    fontSize: FONT.small,
  },

  downloadButton: {
    width: 48,
    height: 48,
    borderRadius: 20,
    marginLeft: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceMuted,
  },

  downloadIcon: {
    fontSize: 18,
  },
});
