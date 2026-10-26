import LoadError from "../../components/LoadError";
import useLoadResource from "../../hooks/useLoadResource";
import React, { useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";

import { useRoute, useNavigation } from "@react-navigation/native";

import YearCard from "../../components/YearCard";

import { fetchYears, Year } from "../../services/yearsService";
import useCourseYear from "../../hooks/useCourseYear";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";

const MODE_LABEL: Record<string, string> = {
  notes: "📚 Notes",
  videos: "🎥 Video Lectures",
  quiz: "📝 MCQ Test",
};

const MODE_SUBTITLE: Record<string, string> = {
  notes: "Select a year to browse notes",
  videos: "Select a year to browse videos",
  quiz: "Select a year to take an MCQ test",
};

export default function YearsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { mode } = route.params;


  const { ready, courseId } = useCourseYear();

  const load = useCallback(() => fetchYears(courseId), [courseId]);
  const { value: years, loading, error, retry } = useLoadResource<Year[]>(load, [], ready);

  // Browsing a year does not change the registered year in the profile.
  // RLS scopes catalogue visibility to the course; PDFs still need entitlement.


  return (
    <View style={styles.container}>
      <Text style={styles.modeLabel}>{MODE_LABEL[mode]}</Text>
      <Text style={styles.title}>Choose Academic Year</Text>
      <Text style={styles.subtitle}>{MODE_SUBTITLE[mode]}</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
      ) : error ? (
        <LoadError content="years" retry={retry} />
      ) : (
        <FlatList
          data={years}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: SPACING.md, paddingBottom: SPACING.xl }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <YearCard
              title={item.title}
              icon={item.icon}
              color={item.color}
              onPress={() =>
                navigation.navigate("Subjects", {
                  yearId: item.id,
                  yearTitle: item.title,
                  mode,
                })
              }
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No academic years added yet.</Text>
          }
          ListFooterComponent={
            years.length > 1 ? (
              <Text style={styles.hint}>
                Browse any year in your course. Paid notes require a purchase.
                Your profile year stays unchanged.
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingTop: 60,
  },
  modeLabel: {
    fontSize: FONT.small,
    fontWeight: "700",
    color: COLORS.accent,
    marginBottom: 4,
  },
  title: {
    fontSize: FONT.title,
    fontWeight: "bold",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT.body,
    color: COLORS.subtitle,
    marginTop: 4,
  },
  hint: {
    marginTop: SPACING.md,
    textAlign: "center",
    color: COLORS.subtitle,
    fontSize: FONT.small,
  },
  empty: {
    marginTop: 50,
    textAlign: "center",
    color: COLORS.subtitle,
    fontSize: 16,
  },
});
