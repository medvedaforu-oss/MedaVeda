import LookupStatus from "../components/LookupStatus";
import { useMemo, useState } from "react";
import useCourses from "../hooks/useCourses";
import CoursePicker from "../components/CoursePicker";

import useChapters from "../hooks/useChapters";
import useYears from "../hooks/useYears";
import useSubjects from "../hooks/useSubjects";

import ChapterTable from "../components/ChapterTable";
import ChapterFormModal from "../components/ChapterFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import Button from "../components/Button";

import type { Chapter, ChapterInput } from "../types/chapter";

export default function Chapters() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");

  const {
    chapters,
    loading,
    error,
    reload,
    createChapter,
    editChapter,
    removeChapter,
  } = useChapters({ courseId: courseFilter || undefined });

  const { years, loading: yearsLoading, error: yearsError, reload: reloadYears } = useYears();
  const { subjects, loading: subjectsLoading, error: subjectsError, reload: reloadSubjects } = useSubjects();

  const [yearFilter, setYearFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const lookupsReady = !coursesLoading && !coursesError && !yearsLoading && !yearsError && !subjectsLoading && !subjectsError;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Chapter | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const yearsForFilter = useMemo(
    () => (courseFilter ? years.filter((y) => y.courseId === courseFilter) : years),
    [years, courseFilter]
  );

  const subjectsInYearFilter = useMemo(
    () =>
      yearFilter
        ? subjects.filter((s) => s.yearId === yearFilter)
        : courseFilter
          ? subjects.filter((s) => s.courseId === courseFilter)
          : subjects,
    [subjects, yearFilter, courseFilter]
  );

  const filteredChapters = useMemo(() => {
    return chapters.filter((c) => {
      if (yearFilter && c.yearId !== yearFilter) return false;
      if (subjectFilter && c.subjectId !== subjectFilter) return false;
      return true;
    });
  }, [chapters, yearFilter, subjectFilter]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(chapter: Chapter) {
    setEditing(chapter);
    setFormOpen(true);
  }

  async function handleSubmit(data: ChapterInput) {
    if (editing) {
      await editChapter(editing.id, data);
    } else {
      await createChapter(data);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await removeChapter(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete chapter.");
    } finally {
      setDeleting(false);
    }
  }

  const canCreate = !yearsLoading && !subjectsLoading && years.length > 0 && subjects.length > 0;

  return (
    <div>
      <LookupStatus label="courses" loading={coursesLoading} error={coursesError} onRetry={reloadCourses} />
      <LookupStatus label="years" loading={yearsLoading} error={yearsError} onRetry={reloadYears} />
      <LookupStatus label="subjects" loading={subjectsLoading} error={subjectsError} onRetry={reloadSubjects} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Chapters</h1>
          <p className="mt-1 text-sm text-gray-500">
            Each Chapter belongs to one Subject. Notes and Videos are
            added inside a Chapter.
          </p>
        </div>

        <Button className="min-h-11 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700" onClick={openCreate} disabled={!canCreate}>
          + New Chapter
        </Button>
      </div>

      {lookupsReady && !yearsLoading && years.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Create at least one Year first.
        </p>
      )}

      {lookupsReady && !subjectsLoading && years.length > 0 && subjects.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Create at least one Subject first.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48 [&_select]:min-h-11">
          <CoursePicker
            courses={courses}
            value={courseFilter}
            onChange={(id) => {
              setCourseFilter(id);
              setYearFilter("");
              setSubjectFilter("");
            }}
            label=""
            placeholder="All Courses"
          />
        </div>

        <select aria-label="Filter by year"
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setSubjectFilter("");
          }}
          className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 sm:w-auto sm:min-w-44"
        >
          <option value="">All Years</option>
          {yearsForFilter.map((year) => (
            <option key={year.id} value={year.id}>
              {year.title}
            </option>
          ))}
        </select>

        <select aria-label="Filter by subject"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 sm:w-auto sm:min-w-44"
        >
          <option value="">All Subjects</option>
          {subjectsInYearFilter.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.title}
            </option>
          ))}
        </select>
      </div>

      {loading && <p role="status" className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">Loading...</p>}

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{error}</p><button type="button" className="mt-1 min-h-11 rounded px-2 font-medium underline focus-visible:outline-2 focus-visible:outline-red-700" onClick={() => { void reload(); }}>Retry</button></div>}

      {!loading && !error && (
        <ChapterTable
          chapters={filteredChapters}
          subjects={subjects}
          years={years}
          onEdit={openEdit}
          onDelete={(target) => { setDeleteError(null); setDeleteTarget(target); }}
        />
      )}

      <ChapterFormModal
        lookupsReady={lookupsReady}
        open={formOpen}
        courses={courses}
        years={years}
        subjects={subjects}
        initialData={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      {deleteError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{deleteError}</p>}
      <ConfirmDialog
        open={!!deleteTarget}
        error={deleteError}
        title="Delete Chapter?"
        message={`"${deleteTarget?.title}" and its notes/videos links will be affected. This action cannot be undone.`}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
