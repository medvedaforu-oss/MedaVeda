import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import OptionCard from "../../components/OptionCard";
import CustomButton from "../../components/CustomButton";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";

import { fetchCourses, Course } from "../../services/coursesService";
import { fetchYears, Year } from "../../services/yearsService";
import { getCourseYear, saveCourseYear } from "../../services/courseState";
import useCourseYear from "../../hooks/useCourseYear";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";
import { logError } from "../../utils/logger";

// Step 1: pick a course. Step 2: pick a year of that course. Shown as the
// post-login gate (onboarding, no way back until both are chosen) and from
// Profile to change them later.
export default function SelectCourseYearScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mode: "onboarding" | "change" = route.params?.mode ?? "onboarding";

  const current = useCourseYear();

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  const [courseId, setCourseId] = useState<string | null>(null);

  const [years, setYears] = useState<Year[]>([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [yearsError, setYearsError] = useState<string | null>(null);
  const yearsRequestId = useRef(0);

  const [yearId, setYearId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadCourses = useCallback(() => {
    setCoursesLoading(true);
    setCoursesError(null);
    fetchCourses()
      .then(setCourses)
      .catch((err) => {
        logError("Failed to load courses:", err);
        setCoursesError("Could not load courses. Please check your connection.");
      })
      .finally(() => setCoursesLoading(false));
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Preselect only a CONFIRMED choice: a profile that already has a year (Edit
  // Profile / "change" mode). A profile with a course but no year - the backfill
  // for existing students, or the temporary 'bams' signup default - starts
  // empty, so the student must explicitly tap a course and then a year.
  useEffect(() => {
    if (current.ready && courseId === null && current.courseId && current.yearId) {
      setCourseId(current.courseId);
      setYearId(current.yearId);
    }
  }, [current.ready, current.courseId, current.yearId, courseId]);

  const loadYears = useCallback((forCourseId: string) => {
    const requestId = ++yearsRequestId.current;
    setYearsLoading(true);
    setYearsError(null);
    fetchYears(forCourseId)
      .then((loadedYears) => {
        if (requestId === yearsRequestId.current) setYears(loadedYears);
      })
      .catch((err) => {
        if (requestId !== yearsRequestId.current) return;
        logError("Failed to load years:", err);
        setYearsError("Could not load years. Please try again.");
      })
      .finally(() => {
        if (requestId === yearsRequestId.current) setYearsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (courseId) loadYears(courseId);
    else setYears([]);
    return () => { yearsRequestId.current += 1; };
  }, [courseId, loadYears]);

  const pickCourse = (id: string) => {
    if (id === courseId) return;
    yearsRequestId.current++;
    setCourseId(id);
    setYears([]);
    setYearId(null); // a year always belongs to exactly one course
    setSaveError(null);
  };

  const performSave = async () => {
    if (!courseId || !yearId) return;
    try {
      setSaving(true);
      setSaveError(null);
      await saveCourseYear(courseId, yearId);
      if (mode === "change") navigation.goBack();
      else navigation.replace("Home");
    } catch (err: any) {
      logError("Failed to save course/year:", err);
      setSaveError(err?.message || "Could not save your course and year. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    const previousCourseId = getCourseYear().courseId;
    if (mode === "change" && previousCourseId && previousCourseId !== courseId) {
      Alert.alert(
        "Change course?",
        "Switching course clears your Continue Learning and recent searches on this device. Your purchases and downloaded files are kept.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Change", onPress: performSave },
        ]
      );
      return;
    }
    performSave();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === "change" ? "Change Course & Year" : "Choose Your Course"}
      </Text>
      <Text style={styles.subtitle}>
        {mode === "change"
          ? "Your Home, Notes, Videos and Tests will show this course and year."
          : "Pick your course and year so we can show you the right content."}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.stepLabel}>1. Course</Text>
        {coursesLoading ? (
          <ActivityIndicator color={COLORS.accent} style={styles.loader} />
        ) : coursesError ? (
          <ErrorState message={coursesError} onRetry={loadCourses} />
        ) : courses.length === 0 ? (
          <EmptyState title="No courses available yet." />
        ) : (
          courses.map((course) => (
            <OptionCard
              key={course.id}
              title={`${course.icon ? course.icon + "  " : ""}${course.name}`}
              isCorrect={course.id === courseId}
              disabled={saving}
              onPress={() => pickCourse(course.id)}
            />
          ))
        )}

        {courseId && (
          <>
            <Text style={[styles.stepLabel, { marginTop: SPACING.lg }]}>2. Year</Text>
            {yearsLoading ? (
              <ActivityIndicator color={COLORS.accent} style={styles.loader} />
            ) : yearsError ? (
              <ErrorState message={yearsError} onRetry={() => loadYears(courseId)} />
            ) : years.length === 0 ? (
              <EmptyState title="No years added for this course yet." />
            ) : (
              years.map((year) => (
                <OptionCard
                  key={year.id}
                  title={`${year.icon ? year.icon + "  " : ""}${year.title}`}
                  isCorrect={year.id === yearId}
                  disabled={saving}
                  onPress={() => { setYearId(year.id); setSaveError(null); }}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {saving ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : (
          <>
            {saveError && (
              <Text accessibilityRole="alert" style={styles.saveError}>{saveError}</Text>
            )}
            <CustomButton
              title={saveError ? "Try Again" : mode === "change" ? "Save" : "Continue"}
              onPress={handleContinue}
              disabled={!courseId || !yearId}
            />
          </>
        )}
        {mode === "change" && !saving && (
          <Text style={styles.cancel} onPress={() => navigation.goBack()}>
            Cancel
          </Text>
        )}
      </View>
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
  title: {
    fontSize: FONT.title,
    fontWeight: "bold",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT.body,
    color: COLORS.subtitle,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  content: {
    paddingBottom: SPACING.lg,
  },
  stepLabel: {
    fontSize: FONT.small,
    fontWeight: "700",
    color: COLORS.accent,
    marginBottom: SPACING.sm,
  },
  loader: {
    marginVertical: SPACING.lg,
  },
  footer: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  saveError: {
    color: COLORS.error,
    fontSize: FONT.body,
    marginBottom: SPACING.sm,
  },
  cancel: {
    textAlign: "center",
    color: COLORS.subtitle,
    fontSize: FONT.body,
    marginTop: SPACING.md,
  },
});
