import { withRouteValidation } from "../../navigation/withRouteValidation";
import LoadError from "../../components/LoadError";
import useLoadResource from "../../hooks/useLoadResource";
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";

import { useFocusEffect, useRoute, useNavigation } from "@react-navigation/native";

import TestCard from "../../components/TestCard";
import EmptyState from "../../components/EmptyState";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING, STUDY_LAYOUT } from "../../theme/spacing";

import { fetchQuizTestsBySubject, QuizTest } from "../../services/quizService";
import useDownloads from "../../hooks/useDownloads";

// MedVeda 2.0: Quiz Tests are always free for every student, for the
// whole Subject - only PDF Notes are paid (and chapter-scoped) content.
// No purchase check, no lock icons, no Unlock panel here.
//
// OFFLINE MODE: a Test's playable questions are already in this list
// response (no separate fetch when opening one), so "downloading" a
// test is just persisting that JSON locally - see saveQuiz in
// useDownloads. This also means the list itself still renders from the
// last successful fetch even if a later refresh fails offline.
function TestListScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { subjectId, subjectTitle, yearId, yearTitle } = route.params;

  const load = useCallback(() => fetchQuizTestsBySubject(subjectId), [subjectId]);
  const { value: tests, loading, error, retry } = useLoadResource<QuizTest[]>(load, []);

  const [savingId, setSavingId] = useState<string | null>(null);

  const { isDownloaded, saveQuiz, remove: removeDownload, refresh } = useDownloads();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );



  function handleTestPress(item: QuizTest) {
    navigation.navigate("Quiz", {
      subjectId,
      subjectTitle,
      yearId,
      yearTitle,
      test: item,
    });
  }

  async function handleDownloadPress(item: QuizTest) {
    setSavingId(item.id);
    try {
      await saveQuiz({
        id: item.id,
        title: item.title,
        subjectId,
        subjectTitle,
        yearId,
        yearTitle,
        quizData: item,
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{subjectTitle}</Text>
      <Text style={styles.subtitle}>MCQ Tests - Free</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginVertical: SPACING.lg }} />
      ) : error ? (
        <LoadError content="tests" retry={retry} />
      ) : (
        <FlatList refreshing={loading} onRefresh={retry}
          data={tests}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SPACING.xl }}
          renderItem={({ item }) => (
            <TestCard
              title={item.title}
              questionCount={item.questions?.length ?? 0}
              locked={false}
              free={true}
              onPress={() => handleTestPress(item)}
              downloaded={isDownloaded(item.id)}
              saving={savingId === item.id}
              onDownloadPress={() => handleDownloadPress(item)}
              onRemoveDownloadPress={() => removeDownload(item.id)}
            />
          )}
          ListEmptyComponent={<EmptyState title="🔍 No Tests Found" />}
        />
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
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
});

export default withRouteValidation(TestListScreen, ["subjectId"], [], false);
