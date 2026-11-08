import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";

import {
  addCourse,
  deleteCourse,
  getCourses,
  setCourseActive,
  updateCourse,
} from "../services/courseService";

import type { Course, CourseInput } from "../types/course";

export default function useCourses() {
  const beginRequest = useRequestGuard("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async (afterMutation = false) => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getCourses();
      if (!current()) return;
      setCourses(data);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError(afterMutation ? "Saved, but the list could not refresh. Please retry." : "Could not load courses. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [beginRequest]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  async function createCourse(data: CourseInput & { id?: string }) {
    await addCourse(data);
    await loadCourses(true);
  }

  async function editCourse(id: string, data: CourseInput) {
    await updateCourse(id, data);
    await loadCourses(true);
  }

  async function toggleCourseActive(id: string, active: boolean) {
    await setCourseActive(id, active);
    await loadCourses(true);
  }

  async function removeCourse(id: string) {
    await deleteCourse(id);
    await loadCourses(true);
  }

  return {
    courses,
    loading,
    error,
    reload: loadCourses,
    createCourse,
    editCourse,
    toggleCourseActive,
    removeCourse,
  };
}
