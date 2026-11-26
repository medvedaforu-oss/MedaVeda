import { paymentProvider } from "../config/paymentProvider";
import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

import { COLORS } from "../theme/colors";
import { FONT } from "../theme/fonts";
import { SPACING } from "../theme/spacing";
import { RADIUS } from "../theme/radius";
import { SHADOW } from "../theme/shadows";

const CARD_WIDTH = 140;

type Props = {
  title: string;
  /** Small caption under the cover, e.g. "1st Year" or "Full Subject Notes" */
  caption?: string;
  price: number;
  /** Struck-through MRP - only rendered when higher than `price` */
  originalPrice?: number;
  owned?: boolean;
  /** Emoji shown on the placeholder cover (defaults to a book) */
  icon?: string;
  /** Index used to pick a color from COLORS.yearAccents for the cover */
  colorIndex?: number;
  /** Tapping the card (cover/title/anywhere outside the Buy button) opens the content itself. */
  onPress: () => void;
  /**
   * Tapping the Buy button starts checkout instead of opening the
   * content. Only rendered (and price shown) when a product exists to
   * buy and it isn't already owned. A sibling of the content button
   * so both actions can receive accessibility focus independently.
   */
  onBuyPress?: () => void;
  buying?: boolean;
};

export default function ProductPosterCard({
  title,
  caption,
  price,
  originalPrice,
  owned,
  icon = "📘",
  colorIndex = 0,
  onPress,
  onBuyPress,
  buying = false,
}: Props) {
  const coverColor =
    COLORS.yearAccents[colorIndex % COLORS.yearAccents.length];
  const purchasesUnavailable = paymentProvider === "disabled";
  const showDiscount = !!originalPrice && originalPrice > price;
  const discountPercent = showDiscount
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Open ${title}${caption ? `, ${caption}` : ""}${owned ? ", Owned" : ""}`}
        accessibilityState={{ disabled: false }}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={[styles.cover, { backgroundColor: coverColor }]}>
          <Text style={styles.coverIcon}>{icon}</Text>

          {owned && (
            <View style={styles.ownedBadge}>
              <Text style={styles.ownedBadgeText}>✓ Owned</Text>
            </View>
          )}
        </View>

        {!!caption && (
          <Text style={styles.caption}>
            {caption}
          </Text>
        )}

        <Text style={styles.title}>
          {title}
        </Text>

        {!owned && !!onBuyPress && !purchasesUnavailable && (
          <View style={styles.priceBlock}>
            <Text style={styles.price}>₹{price}</Text>

            {showDiscount && (
              <View style={styles.mrpRow}>
                <Text style={styles.mrpLabel}>M.R.P: </Text>
                <Text style={styles.mrpValue}>₹{originalPrice}</Text>
              </View>
            )}

            {showDiscount && (
              <Text style={styles.discountText}>({discountPercent}% off)</Text>
            )}
          </View>
        )}

      </TouchableOpacity>

      {!owned && !!onBuyPress && (
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => { if (!buying && !purchasesUnavailable) onBuyPress(); }}
          accessibilityRole="button"
          accessibilityLabel={purchasesUnavailable ? `${title}. Purchases unavailable` : buying ? `${title}. Purchase in progress` : `Review purchase: ${title}, ₹${price}`}
          accessibilityState={{ disabled: buying || purchasesUnavailable, busy: buying }}
          activeOpacity={1}
          disabled={buying || purchasesUnavailable}
        >
          <Text style={styles.buyButtonText}>
            {purchasesUnavailable ? "Purchases unavailable" : buying ? "Please wait…" : "Buy Now"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: SPACING.sm,
  },
  cover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.35,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  coverIcon: {
    fontSize: 40,
  },
  ownedBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.sm,
    paddingVertical: 4,
    alignItems: "center",
  },
  ownedBadgeText: {
    color: COLORS.background,
    fontWeight: "700",
    fontSize: FONT.tiny,
  },
  caption: {
    marginTop: 8,
    fontSize: FONT.tiny,
    color: COLORS.subtitle,
  },
  title: {
    marginTop: 2,
    fontSize: FONT.small,
    fontWeight: "700",
    color: COLORS.text,
    minHeight: 36,
  },
  priceBlock: {
    marginTop: 6,
  },
  price: {
    fontSize: FONT.heading,
    fontWeight: "800",
    color: COLORS.accentLight,
  },
  mrpRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    marginTop: 2,
  },
  mrpLabel: {
    fontSize: FONT.tiny,
    color: COLORS.subtitle,
  },
  mrpValue: {
    fontSize: FONT.tiny,
    color: COLORS.subtitle,
    textDecorationLine: "line-through",
  },
  discountText: {
    fontSize: FONT.tiny,
    fontWeight: "700",
    color: COLORS.success,
    marginTop: 1,
  },
  buyButton: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 10,
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buyButtonText: {
    color: COLORS.background,
    fontWeight: "700",
    fontSize: FONT.small,
    textAlign: "center",
  },
});
