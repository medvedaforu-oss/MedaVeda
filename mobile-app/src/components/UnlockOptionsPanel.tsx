import { paymentProvider } from "../config/paymentProvider";
import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from "react-native";

import useBuyOptions from "../hooks/useBuyOptions";
import usePurchase from "../hooks/usePurchase";

import { COLORS } from "../theme/colors";
import { FONT } from "../theme/fonts";
import { SPACING } from "../theme/spacing";
import { RADIUS } from "../theme/radius";
import { SHADOW } from "../theme/shadows";

type Props = {
  title?: string;
  chapterId: string;
  subjectId: string;
  yearId: string;
  subjectTitle?: string;
  yearTitle?: string;
};

const SCOPE_LABEL: Record<string, string> = {
  chapter: "This Chapter",
  subject: "Full Subject",
  year: "Full Year",
  bundle: "Multi-Year Bundle",
};

// Shown on Notes/Videos/Quiz screens for a locked chapter, so a purchase
// can be completed right there instead of having to go back to the
// ChapterDetails hub screen (which has the same options, for the flow
// that still goes through it).
export default function UnlockOptionsPanel({
  title = "🔒 Unlock Options",
  chapterId,
  subjectId,
  yearId,
  subjectTitle,
  yearTitle,
}: Props) {
  const { options, status, loading, error, refresh } = useBuyOptions(chapterId, subjectId, yearId, Platform.OS === "android");
  const { buy, purchasing } = usePurchase();

  function scopeLabel(scope: string) {
    if (scope === "subject" && subjectTitle) return `Full Subject: ${subjectTitle}`;
    if (scope === "year" && yearTitle) return `Full Year: ${yearTitle}`;
    return SCOPE_LABEL[scope] ?? scope;
  }

  if (Platform.OS !== "android") return null;

  const actionDisabled = paymentProvider === "disabled" || loading || status !== "success" || purchasing;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {paymentProvider === "disabled" && <Text style={styles.empty}>New purchases are unavailable in this app version. Previously purchased Notes remain accessible through your account.</Text>}

      {(status === "error" || status === "retrying") && (
        <View accessibilityRole={status === "error" ? "alert" : undefined} style={styles.status}>
          <Text style={styles.empty} accessibilityLiveRegion="polite">
            {error ?? "Retrying purchase options…"}{options.length > 0 ? " Previously loaded options may be out of date." : ""}
          </Text>
          <TouchableOpacity onPress={() => { void refresh(); }} disabled={loading}
            accessibilityState={{ disabled: loading, busy: loading }} accessibilityRole="button"
            accessibilityLabel="Retry loading purchase options" style={styles.retry}>
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading && (
        <View accessible accessibilityLabel={status === "retrying" ? "Retrying purchase options" : "Loading purchase options"} accessibilityState={{ busy: true }}>
          <ActivityIndicator size="small" color={COLORS.accent} style={{ marginVertical: SPACING.md }} />
        </View>
      )}
      {status === "empty" && <Text style={styles.empty}>No purchase options set up for this chapter yet.</Text>}
      {options.length > 0 && (
        options.map((product) => (
          <View key={product.id} style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{product.title}</Text>
              <Text style={styles.cardScope}>{scopeLabel(product.scope)}</Text>
            </View>

            <TouchableOpacity
              style={styles.priceAction}
              accessibilityRole="button"
              accessibilityLabel={paymentProvider === "disabled"
                ? `${product.title}, ${scopeLabel(product.scope)}. New purchases unavailable`
                : `${product.title}, ${scopeLabel(product.scope)}, ₹${product.price}${loading || status !== "success" ? ". Purchase options not current" : purchasing ? ". Purchase in progress" : ". Review purchase"}`}
              accessibilityState={{ disabled: actionDisabled, busy: loading || purchasing }}
              disabled={actionDisabled}
              activeOpacity={1}
              onPress={() => { if (!actionDisabled) buy(product); }}
            >
              <Text style={styles.price}>
                {paymentProvider === "disabled" ? "Unavailable" : `₹${product.price}`}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {purchasing && (
        <View accessible accessibilityLabel="Opening purchase" accessibilityState={{ busy: true }} style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SPACING.lg,
  },
  title: {
    fontSize: FONT.subHeading,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  status: { marginVertical: SPACING.md },
  retry: { minHeight: 48, minWidth: 48, justifyContent: "center", alignSelf: "flex-start", padding: SPACING.md, marginVertical: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md },
  retryLabel: { color: COLORS.white, fontWeight: "700" },
  empty: {
    color: COLORS.subtitle,
    fontSize: FONT.body,
  },
  card: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  cardContent: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 0,
    paddingRight: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT.body,
    fontWeight: "700",
    color: COLORS.text,
  },
  cardScope: {
    fontSize: FONT.small,
    color: COLORS.subtitle,
    marginTop: 2,
  },
  priceAction: {
    minHeight: 48,
    minWidth: 48,
    maxWidth: "100%",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: SPACING.sm,
    borderRadius: 30,
  },
  price: {
    fontSize: FONT.body,
    fontWeight: "700",
    color: COLORS.background,
    textAlign: "center",
    flexShrink: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
