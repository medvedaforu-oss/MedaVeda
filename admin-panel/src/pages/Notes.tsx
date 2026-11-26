import LookupStatus from "../components/LookupStatus";
import { useMemo, useState } from "react";
import useCourses from "../hooks/useCourses";
import CoursePicker from "../components/CoursePicker";

import useNotes from "../hooks/useNotes";
import useYears from "../hooks/useYears";
import useSubjects from "../hooks/useSubjects";
import useChapters from "../hooks/useChapters";

import NotesHeader from "../components/NotesHeader";
import NotesTable from "../components/NotesTable";
import NoteFormModal from "../components/NoteFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import SearchBar from "../components/SearchBar";

import type { Note, NoteInput } from "../types/note";
import { saveNoteWithUpload } from "../services/noteService";

export default function Notes() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");

  const { notes, loading, hasLoaded, error, reload, refreshAfterMutation, createNote, editNote, removeNote } =
    useNotes({ courseId: courseFilter || undefined });

  const { years, loading: yearsLoading, error: yearsError, reload: reloadYears } = useYears();
  const { subjects, loading: subjectsLoading, error: subjectsError, reload: reloadSubjects } = useSubjects();
  const { chapters, loading: chaptersLoading, error: chaptersError, reload: reloadChapters } = useChapters();

  const [search, setSearch] = useState("");
  const [chapterId, setChapterId] = useState("");

  const lookupsReady = !coursesLoading && !coursesError && !yearsLoading && !yearsError && !subjectsLoading && !subjectsError && !chaptersLoading && !chaptersError;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const chaptersForFilter = useMemo(
    () => (courseFilter ? chapters.filter((c) => c.courseId === courseFilter) : chapters),
    [chapters, courseFilter]
  );

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = note.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesChapter = !chapterId || note.chapterId === chapterId;

      return matchesSearch && matchesChapter;
    });
  }, [notes, search, chapterId]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setFormOpen(true);
  }

  async function handleSubmit(data: NoteInput, uploadRequestId?: string) {
    if (uploadRequestId) {
      await saveNoteWithUpload(data, uploadRequestId, editing?.id);
      await refreshAfterMutation();
      return;
    }
    if (editing) {
      await editNote(editing.id, data);
    } else {
      await createNote(data);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await removeNote(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete note.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading && !hasLoaded) {
    return (
      <p role="status" className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
        Loading...
      </p>
    );
  }

  return (
    <>
      <LookupStatus label="courses" loading={coursesLoading} error={coursesError} onRetry={reloadCourses} />
      <LookupStatus label="years" loading={yearsLoading} error={yearsError} onRetry={reloadYears} />
      <LookupStatus label="subjects" loading={subjectsLoading} error={subjectsError} onRetry={reloadSubjects} />
      <LookupStatus label="chapters" loading={chaptersLoading} error={chaptersError} onRetry={reloadChapters} />
      {loading && <p role="status" className="mb-4 text-sm text-gray-500">Refreshing...</p>}
      <NotesHeader onAdd={openCreate} />

      {lookupsReady && chapters.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Create at least one Chapter first before adding Notes.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48 [&_select]:min-h-11">
          <CoursePicker
            courses={courses}
            value={courseFilter}
            onChange={(id) => {
              setCourseFilter(id);
              setChapterId("");
            }}
            label=""
            placeholder="All Courses"
          />
        </div>

        <div className="w-full min-w-0 sm:w-auto [&_input]:min-h-11 [&_input]:text-sm [&_input]:focus-visible:ring-1 [&_input]:focus-visible:ring-green-600">
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <select aria-label="Filter by chapter"
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
          className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 sm:w-auto sm:min-w-44"
        >
          <option value="">All Chapters</option>
          {chaptersForFilter.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.title}
            </option>
          ))}
        </select>
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{error}</p><button type="button" className="mt-1 min-h-11 rounded px-2 font-medium underline focus-visible:outline-2 focus-visible:outline-red-700" onClick={() => { void reload(); }}>Retry</button></div>}
      {deleteError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{deleteError}</p>}

      {filteredNotes.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center">
          <h2 className="text-base font-semibold text-gray-800">
            No Notes Found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Try changing your filters.
          </p>
        </div>
      ) : (
        <NotesTable
          notes={filteredNotes}
          chapters={chapters}
          onEdit={openEdit}
          onDelete={(target) => { setDeleteError(null); setDeleteTarget(target); }}
        />
      )}

      <NoteFormModal
        lookupsReady={lookupsReady}
        open={formOpen}
        courses={courses}
        years={years}
        subjects={subjects}
        chapters={chapters}
        initialData={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        error={deleteError}
        title="Delete Note?"
        message={`"${deleteTarget?.title}" will be permanently deleted. This action cannot be undone.`}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
