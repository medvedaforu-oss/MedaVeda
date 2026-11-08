import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import {
  addNote,
  deleteNote,
  getNotes,
  updateNote,
} from "../services/noteService";

import type { Note, NoteInput } from "../types/note";

export default function useNotes(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const scope = JSON.stringify([courseId, yearId]);
  const beginRequest = useRequestGuard(scope);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readState, setReadState] = useState({ scope, hasLoaded: false });

  const loadNotes = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getNotes({ courseId, yearId });
      if (!current()) return;
      setNotes(data);
      setReadState({ scope, hasLoaded: true });
      setError(null);
    } catch (err) {
      if (!current()) return;
      setReadState((previous) => ({ scope, hasLoaded: previous.scope === scope && previous.hasLoaded }));
      console.error(err);
      setError("Could not load notes. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, scope, beginRequest]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  async function createNote(data: NoteInput) {
    await addNote(data);
    await refreshAfterMutation();
  }

  async function editNote(id: string, data: NoteInput) {
    await updateNote(id, data);
    await refreshAfterMutation();
  }

  async function removeNote(id: string) {
    await deleteNote(id);
    await refreshAfterMutation();
  }

  async function refreshAfterMutation() {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getNotes(filters);
      if (!current()) return;
      setNotes(data);
      setReadState({ scope, hasLoaded: true });
      setError(null);
    } catch {
      if (!current()) return;
      setReadState((previous) => ({ scope, hasLoaded: previous.scope === scope && previous.hasLoaded }));
      setError("The note change succeeded, but the list could not refresh. Reload this page before retrying.");
    } finally {
      if (current()) setLoading(false);
    }
  }

  const hasLoaded = readState.scope === scope && readState.hasLoaded;
  return {
    notes: hasLoaded ? notes : [],
    hasLoaded,
    loading: loading || readState.scope !== scope,
    error: readState.scope === scope ? error : null,
    reload: refreshAfterMutation,
    createNote,
    editNote,
    removeNote,
  };
}
