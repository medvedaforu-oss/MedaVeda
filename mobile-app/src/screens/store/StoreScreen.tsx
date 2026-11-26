import PurchaseOwnershipStatus from "../../components/PurchaseOwnershipStatus";
import { paymentProvider } from "../../config/paymentProvider";
import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import ProductPosterCard from "../../components/ProductPosterCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import useStoreCatalog from "../../hooks/useStoreCatalog";
import type { YearBlock } from "../../services/storeCatalogService";
import BottomNav from "../../components/BottomNav";

import type { Product } from "../../services/productsService";
import type { Year } from "../../services/yearsService";
import type { Subject } from "../../services/subjectsService";
import usePurchases from "../../hooks/usePurchases";
import usePurchase from "../../hooks/usePurchase";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";
import { RADIUS } from "../../theme/radius";

// Store is grouped by Year - each Year gets its own horizontal row of
// poster cards, one per Subject (with its own Notes price + owned state).
// Tapping a Subject card drops into that Subject's Chapters, same place
// SubjectsScreen sends you for browsing notes, so chapter-level buying
// still works exactly as before. The Year's own "Full Year Notes" pack is
// buyable from the pill next to the Year title.
export default function StoreScreen() {
  const navigation = useNavigation<any>();
  const { blocks, loading, status, error, refresh } = useStoreCatalog();

  const { isOwned, refresh: refreshPurchases, loading: purchasesOwnershipLoading, error: purchasesOwnershipError } = usePurchases();
  const { buy, purchasing } = usePurchase();

  useFocusEffect(
    useCallback(() => {
      refreshPurchases();
    }, [refreshPurchases])
  );

  const handleBuy = useCallback((product: Product | null) => {
    if (paymentProvider === "disabled" || !product || isOwned(product)) return;
    buy(product);
  }, [buy, isOwned]);

  const openSubject = useCallback((subject: Subject, year: Year) => {
    navigation.navigate("Chapters", {
      subjectId: subject.id,
      subjectTitle: subject.title,
      yearId: year.id,
      yearTitle: year.title,
    });
  }, [navigation]);

  const renderYearBlock = useCallback(({ item: block, index: yearIndex }: { item: YearBlock; index: number }) => {
    const yearOwned = block.yearProduct ? isOwned(block.yearProduct) : false;

    return (
      <View style={styles.yearBlock}>
        <SectionHeader title={block.year.title} />

        {block.yearProduct && (
          <TouchableOpacity
            style={[
              styles.fullYearPill,
              yearOwned && styles.fullYearPillOwned,
            ]}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel={`${block.year.title}. ${yearOwned ? "Full Year Notes Owned" : paymentProvider === "disabled" ? "New purchases unavailable" : `Review Full Year Notes purchase, ₹${block.yearProduct.price}`}`}
            accessibilityState={{ disabled: yearOwned || purchasing || paymentProvider === "disabled", busy: purchasing }}
            onPress={() => handleBuy(block.yearProduct)}
            disabled={yearOwned || purchasing || paymentProvider === "disabled"}
          >
            <Text style={[styles.fullYearPillText, yearOwned && styles.fullYearPillOwnedText]}>
              {yearOwned
                ? "✓ Full Year Notes Owned"
                : paymentProvider === "disabled" ? "New purchases unavailable" : `Buy Full Year Notes · ₹${block.yearProduct.price}`}
            </Text>
          </TouchableOpacity>
        )}

        {block.subjects.length === 0 ? (
          <Text style={styles.nestedEmptyText}>
            No subjects in this year yet.
          </Text>
        ) : (
          <SubjectPosters block={block} yearIndex={yearIndex} isOwned={isOwned} handleBuy={handleBuy} openSubject={openSubject} purchasing={purchasing} />
        )}
      </View>
    );
  }, [isOwned, handleBuy, openSubject, purchasing]);

  return (
    <View style={styles.screen}>
      <PurchaseOwnershipStatus loading={purchasesOwnershipLoading} error={purchasesOwnershipError} refresh={refreshPurchases} />
      <View style={styles.container}>
        <Text style={styles.title}>Notes</Text>
        <Text style={styles.subtitle}>{paymentProvider === "disabled" ? "New purchases are unavailable in this app version. Previously purchased Notes remain accessible through your account." : "Buy a Year, a Subject, or just one Chapter"}</Text>

        {error && <ErrorState message={blocks.length ? `${error} Showing previously loaded Notes; catalog may be out of date.` : error} onRetry={refresh} busy={loading} />}
        {loading && blocks.length === 0 ? (
          <View>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.nestedEmptyText}>{status === "retrying" ? "Retrying Notes…" : "Loading Notes…"}</Text>
          </View>
        ) : (blocks.length > 0 || status === "empty") ? (
          <FlatList initialNumToRender={3} windowSize={7} maxToRenderPerBatch={3}
            data={blocks}
            refreshing={loading}
            onRefresh={refresh}
            ListHeaderComponent={loading ? <Text style={styles.nestedEmptyText}>Refreshing Notes… Previously loaded catalog may be out of date.</Text> : null}
            keyExtractor={(block) => block.year.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: SPACING.xl }}
            renderItem={renderYearBlock}
            ListEmptyComponent={<EmptyState title="🔍 No Academic Years Found" />}
          />
        ) : null}
      </View>
      
      <BottomNav active="Store" />

      {purchasing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      )}
    </View>
  );
}


function SubjectPosters({ block, yearIndex, isOwned, handleBuy, openSubject, purchasing }: {
  block: YearBlock; yearIndex: number; isOwned: (product: Product) => boolean;
  handleBuy: (product: Product | null) => void; openSubject: (subject: Subject, year: Year) => void; purchasing: boolean;
}) {
  const renderSubject = useCallback(({ item: subject, index }: { item: Subject; index: number }) => {
    const subjectProduct = block.subjectProducts[subject.id] ?? null;
    const owned = subjectProduct ? isOwned(subjectProduct) : false;

    return (
      <ProductPosterCard
        title={subject.title}
        caption="Full Subject Notes"
        price={subjectProduct?.price ?? 0}
        originalPrice={subjectProduct?.originalPrice}
        owned={owned}
        colorIndex={yearIndex + index}
        icon="📖"
        onPress={() => openSubject(subject, block.year)}
        onBuyPress={
          subjectProduct && Platform.OS === "android" ? () => handleBuy(subjectProduct) : undefined
        }
        buying={purchasing}
      />
    );
  }, [block, yearIndex, isOwned, handleBuy, openSubject, purchasing]);
  return (<FlatList initialNumToRender={3} windowSize={5} maxToRenderPerBatch={3}
    data={block.subjects}
    keyExtractor={(s) => s.id}
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingBottom: SPACING.sm }}
    renderItem={renderSubject}
  />);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.screen,
    paddingVertical: 16,
    paddingTop: 60,
  },
  title: {
    fontSize: FONT.title,
    fontWeight: "bold",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT.body,
    color: COLORS.subtitle,
    marginTop: 6,
    marginBottom: SPACING.lg,
  },
  yearBlock: {
    marginBottom: SPACING.lg,
  },
  fullYearPill: {
    minHeight: 48,
    minWidth: 48,
    maxWidth: "100%",
    justifyContent: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: SPACING.md,
  },
  fullYearPillOwned: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  fullYearPillOwnedText: { color: COLORS.text },
  fullYearPillText: {
    color: COLORS.background,
    fontWeight: "700",
    fontSize: FONT.small,
  },
  nestedEmptyText: {
    fontSize: FONT.small,
    color: COLORS.subtitle,
    marginBottom: SPACING.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
