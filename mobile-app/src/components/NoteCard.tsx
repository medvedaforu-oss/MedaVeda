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
  shareAction?: React.ReactNode;
  description?: string;
  onPress: () => void;
  locked?: boolean;
  free?: boolean;
  // Roadmap change 8 - Offline/Downloads. All optional and default to
  // "no download affordance at all", so every other NoteCard usage keeps
  // working unchanged if it doesn't pass these.
  downloaded?: boolean;
  downloading?: boolean;
  downloadProgress?: number; // 0-1, only meaningful while downloading
  onDownloadPress?: () => void;
  onRemoveDownloadPress?: () => void;
  // True while a signed URL is being resolved for this note (see
  // NotesScreen's resolvingNoteId) - shows a spinner instead of the icon
  // and disables the card so a slow network doesn't look unresponsive.
  opening?: boolean;
};

export default function NoteCard({
  title,
  shareAction,
  description,
  onPress,
  locked = false,
  free = false,
  downloaded = false,
  downloading = false,
  downloadProgress = 0,
  onDownloadPress,
  onRemoveDownloadPress,
  opening = false,
}: Props) {
  // Locked notes can't be downloaded at all - purchase first.
  const showDownloadAction = !locked && !!(onDownloadPress || onRemoveDownloadPress);
  const progressPct = Math.round(downloadProgress * 100);

  return (
    <View style={[styles.card, locked && styles.cardLocked]}>
    <TouchableOpacity
      style={styles.openButton}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${locked ? "Purchase required" : free ? "Free preview" : "Open PDF"}`}
      accessibilityState={{ disabled: opening, busy: opening }}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={opening}
    >
      <View style={styles.iconWrap}>
        {opening ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : (
          <Text style={styles.icon}>{locked ? "🔒" : free ? "🎁" : "📚"}</Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, locked && styles.titleLocked]}
          >
            {title}
          </Text>
          {free && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>

        {!!description?.trim() && (
          <Text style={styles.description}>{description.trim()}</Text>
        )}

        <Text style={styles.subtitle}>
          {locked
            ? "Premium content"
            : downloaded
            ? "Available offline"
            : free
            ? "Free preview"
            : "Tap to open"}
        </Text>
      </View>

    </TouchableOpacity>
      {shareAction}
      {showDownloadAction && (
        <TouchableOpacity
          style={[
            styles.downloadButton,
            downloaded && styles.downloadButtonDone,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${downloaded ? "Remove download" : "Download"}: ${title}`}
          accessibilityState={{ disabled: downloading, busy: downloading }}
          disabled={downloading}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={(e) => {
            // Don't also trigger the card's own onPress (open PDF).
            e.stopPropagation?.();
            if (downloaded) {
              onRemoveDownloadPress?.();
            } else if (!downloading) {
              onDownloadPress?.();
            }
          }}
        >
          {downloading ? (
            <>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.downloadLabel}>{progressPct}%</Text>
            </>
          ) : downloaded ? (
            <>
              <Text style={styles.downloadIcon}>🗑️</Text>
              <Text style={[styles.downloadLabel, styles.downloadLabelDone]}>
                Remove
              </Text>
            </>
          ) : (
            <Text style={styles.downloadLabel}>Download</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  openButton: { flex: 1, flexBasis: 180, minWidth: 0, flexDirection: "row", alignItems: "center", minHeight: 48 },

  card: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },

  cardLocked: {
    backgroundColor: COLORS.surfaceMuted,
    opacity: 0.85,
  },

  titleLocked: {
    color: COLORS.subtitle,
  },

  iconWrap: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },

  icon: {
    fontSize: 28,
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },

  title: {
    fontSize: FONT.body,
    color: COLORS.text,
    fontWeight: "600",
    flexShrink: 1,
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

  subtitle: {
    marginTop: SPACING.xs,
    color: COLORS.subtitle,
    fontSize: FONT.small,
  },

  description: {
    marginTop: SPACING.xs,
    color: COLORS.text,
    fontSize: FONT.small,
  },

  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginLeft: "auto",
    minHeight: 48,
    maxWidth: "100%",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
  },

  downloadButtonDone: {
    backgroundColor: COLORS.background,
  },

  downloadIcon: {
    fontSize: 14,
  },

  downloadLabel: {
    fontSize: FONT.small,
    fontWeight: "600",
    color: COLORS.accent,
  },

  downloadLabelDone: {
    color: COLORS.subtitle,
  },

});
