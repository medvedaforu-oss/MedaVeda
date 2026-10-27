import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import {
  addSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
} from "../services/subjectService";

import type { Subject, SubjectInput } from "../types/subject";

export default function useSubjects(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getSubjects({ courseId, yearId });
      if (!current()) return;
      setSubjects(data);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError("Could not load subjects. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  async function createSubject(data: SubjectInput) {
    await addSubject(data);
    await loadSubjects();
  }

  async function editSubject(id: string, data: SubjectInput) {
    await updateSubject(id, data);
    await loadSubjects();
  }

  async function removeSubject(id: string) {
    await deleteSubject(id);
    await loadSubjects();
  }

  return {
    subjects,
    loading,
    error,
    reload: loadSubjects,
    createSubject,
    editSubject,
    removeSubject,
  };
}
