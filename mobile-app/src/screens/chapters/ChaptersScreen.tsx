import PurchaseOwnershipStatus from "../../components/PurchaseOwnershipStatus";
import { withRouteValidation } from "../../navigation/withRouteValidation";
import LoadError from "../../components/LoadError";
import useLoadResource from "../../hooks/useLoadResource";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";

import ChapterCard from "../../components/ChapterCard";
import SearchBar from "../../components/SearchBar";

import { fetchChaptersBySubject, Chapter } from "../../services/chaptersService";
import usePurchases from "../../hooks/usePurchases";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING, STUDY_LAYOUT } from "../../theme/spacing";

function ChaptersScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { subjectId, subjectTitle, yearId, yearTitle, mode } = route.params;

  const load = useCallback((onFallback: () => void) => fetchChaptersBySubject(subjectId, onFallback), [subjectId]);
  const { value: chapters, loading, error, retry } = useLoadResource<Chapter[]>(load, []);

  const [search, setSearch] = useState("");

  const { isChapterOwned, refresh: refreshPurchases, loading: purchasesOwnershipLoading, error: purchasesOwnershipError } = usePurchases();



  // Ownership can change after a purchase completes in the browser.
  useFocusEffect(
    useCallback(() => {
      refreshPurchases();
    }, [refreshPurchases])
  );

  const filteredData = chapters.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const MODE_LABEL: Record<string, string> = {
    notes: "📚 Notes",
  };

  // Video/MCQ shortcuts never reach this screen anymore (they branch off
  // at Subjects, straight to Videos/QuizTests) - this only ever handles
  // the "notes" shortcut or general browsing (mode undefined).
  const openChapter = useCallback((item: Chapter) => {
    if (mode === "notes") {
      navigation.navigate("Notes", {
        chapterId: item.id,
        chapterTitle: item.title,
        subjectId,
        subjectTitle,
        yearId,
        yearTitle,
        unlocked: isChapterOwned({ id: item.id, subjectId, yearId }),
      });
      return;
    }

    navigation.navigate("ChapterDetails", {
      chapterId: item.id,
      chapterTitle: item.title,
      subjectId,
      subjectTitle,
      yearId,
      yearTitle,
    });
  }, [mode, navigation, subjectId, subjectTitle, yearId, yearTitle, isChapterOwned]);

  const renderChapter = useCallback(({ item }: { item: Chapter; index: number }) => (
    <ChapterCard
      title={item.title}
      unlocked={isChapterOwned({
        id: item.id,
        subjectId,
        yearId,
      })}
      onPress={() => openChapter(item)}
    />
  ), [isChapterOwned, subjectId, yearId, openChapter]);

  return (
    <View style={styles.container}>
      <PurchaseOwnershipStatus loading={purchasesOwnershipLoading} error={purchasesOwnershipError} refresh={refreshPurchases} />
      {mode && <Text style={styles.modeLabel}>{MODE_LABEL[mode]}</Text>}
      <Text style={styles.title}>{subjectTitle}</Text>
      <Text style={styles.subtitle}>Chapters</Text>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search Chapter..."
      />

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.accent}
          style={{ marginTop: SPACING.xl }}
        />
      ) : error && chapters.length === 0 ? (
        <LoadError content="chapters" retry={retry} />
      ) : (
        <>
          {error && <LoadError content="chapters" retry={retry} />}
          <FlatList refreshing={loading} onRefresh={retry} initialNumToRender={6} windowSize={7} maxToRenderPerBatch={6}
            data={filteredData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingTop: SPACING.sm, paddingBottom: SPACING.xl }}
            showsVerticalScrollIndicator={false}
            renderItem={renderChapter}
            ListEmptyComponent={
              <Text style={styles.empty}>🔍 No Chapters Found</Text>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    ...STUDY_LAYOUT,
  },
  title: {
    fontSize: FONT.title,
    fontWeight: "bold",
    color: COLORS.text,
  },
  modeLabel: {
    fontSize: FONT.small,
    fontWeight: "700",
    color: COLORS.accent,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT.body,
    color: COLORS.subtitle,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  empty: {
    marginTop: SPACING.xl,
    textAlign: "center",
    color: COLORS.subtitle,
    fontSize: 16,
  },
});

export default withRouteValidation(ChaptersScreen, ["subjectId", "yearId"], ["notes"], false);
