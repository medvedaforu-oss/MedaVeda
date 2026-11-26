import PurchaseOwnershipStatus from "../../components/PurchaseOwnershipStatus";
import UnlockOptionsPanel from "../../components/UnlockOptionsPanel";
import { withRouteValidation } from "../../navigation/withRouteValidation";
import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";

import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";

import FeatureCard from "../../components/FeatureCard";
import usePurchases from "../../hooks/usePurchases";

import { recordChapterView } from "../../utils/recentActivity";
import { getCourseYear } from "../../services/courseState";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING, STUDY_LAYOUT } from "../../theme/spacing";

function ChapterDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const {
    chapterId,
    chapterTitle,
    subjectId,
    subjectTitle,
    yearId,
    yearTitle,
  } = route.params;

  const { isChapterOwned, refresh: refreshPurchases, loading: purchasesOwnershipLoading, error: purchasesOwnershipError } = usePurchases();

  // MedVeda 2.0: only PDF Notes is paid content - Video Lectures and
  // MCQ Quiz are always free, so "unlocked" here only ever gates the
  // Notes purchase panel below, not access to Videos/Quiz.
  const notesUnlocked = isChapterOwned({ id: chapterId, subjectId, yearId });



  // Powers the Home dashboard's "Continue Learning" / "Recently Viewed"
  // sections - purely local (AsyncStorage), no backend write involved.
  useEffect(() => {
    recordChapterView({
      chapterId,
      chapterTitle,
      subjectId,
      subjectTitle,
      yearId,
      yearTitle,
      courseId: getCourseYear().courseId,
    });
  }, [chapterId, chapterTitle, subjectId, subjectTitle, yearId, yearTitle]);

  useFocusEffect(
    useCallback(() => {
      refreshPurchases();
    }, [refreshPurchases])
  );

  function goTo(screen: string) {
    navigation.navigate(screen, {
      chapterId,
      chapterTitle,
      subjectId,
      subjectTitle,
      yearId,
      yearTitle,
      unlocked: notesUnlocked,
    });
  }

  return (
    <View style={styles.container}>
      <PurchaseOwnershipStatus loading={purchasesOwnershipLoading} error={purchasesOwnershipError} refresh={refreshPurchases} />
      <Text style={styles.title}>{chapterTitle}</Text>
      <Text style={styles.subtitle}>
        🎥 Videos & 📝 Quiz are always free · 📚 Notes{" "}
        {notesUnlocked ? "unlocked ✅" : "locked 🔒"}
      </Text>

      <FeatureCard
        title="PDF Notes"
        icon="📚"
        color={COLORS.success}
        onPress={() => goTo("Notes")}
      />

      <FeatureCard
        title="Video Lectures"
        icon="🎥"
        color={COLORS.info}
        onPress={() =>
          navigation.navigate("Videos", { subjectId, subjectTitle, yearId, yearTitle })
        }
      />

      <FeatureCard
        title="MCQ Quiz"
        icon="📝"
        color={COLORS.warning}
        onPress={() =>
          navigation.navigate("QuizTests", { subjectId, subjectTitle, yearId, yearTitle })
        }
      />

      {!notesUnlocked && Platform.OS === "android" && (
        <UnlockOptionsPanel title="Unlock PDF Notes" chapterId={chapterId} subjectId={subjectId} yearId={yearId}
          subjectTitle={subjectTitle} yearTitle={yearTitle} />
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

  subtitle: {
    fontSize: FONT.body,
    color: COLORS.subtitle,
    marginTop: 6,
    marginBottom: SPACING.xl,
  },

});

export default withRouteValidation(ChapterDetailsScreen, ["chapterId", "subjectId", "yearId"], [], false);
