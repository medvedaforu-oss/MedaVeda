import LookupStatus from "../components/LookupStatus";
import { useMemo, useState } from "react";
import useCourses from "../hooks/useCourses";
import CoursePicker from "../components/CoursePicker";

import useQuiz from "../hooks/useQuiz";
import useYears from "../hooks/useYears";
import useSubjects from "../hooks/useSubjects";

import QuizHeader from "../components/QuizHeader";
import QuizTable from "../components/QuizTable";
import QuizFormModal from "../components/QuizFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import SearchBar from "../components/SearchBar";

import type { QuizTest, QuizTestInput } from "../types/quiz";

export default function Quiz() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");

  const { tests, loading, hasLoaded, error, reload, createTest, editTest, removeTest } = useQuiz({ courseId: courseFilter || undefined });

  const { years, loading: yearsLoading, error: yearsError, reload: reloadYears } = useYears();
  const { subjects, loading: subjectsLoading, error: subjectsError, reload: reloadSubjects } = useSubjects();

  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const lookupsReady = !coursesLoading && !coursesError && !yearsLoading && !yearsError && !subjectsLoading && !subjectsError;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuizTest | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<QuizTest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const subjectsForFilter = useMemo(
    () => (courseFilter ? subjects.filter((s) => s.courseId === courseFilter) : subjects),
    [subjects, courseFilter]
  );

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchesSearch = t.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesSubject = !subjectId || t.subjectId === subjectId;

      return matchesSearch && matchesSubject;
    });
  }, [tests, search, subjectId]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(test: QuizTest) {
    setEditing(test);
    setFormOpen(true);
  }

  async function handleSubmit(data: QuizTestInput) {
    if (editing) {
      await editTest(editing.id, data);
    } else {
      await createTest(data);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await removeTest(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete quiz test.");
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
      {loading && <p role="status" className="mb-4 text-sm text-gray-500">Refreshing...</p>}
      <QuizHeader onAdd={openCreate} />

      {lookupsReady && subjects.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Create at least one Subject first before adding a Quiz Test.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48 [&_select]:min-h-11">
          <CoursePicker
            courses={courses}
            value={courseFilter}
            onChange={(id) => {
              setCourseFilter(id);
              setSubjectId("");
            }}
            label=""
            placeholder="All Courses"
          />
        </div>

        <div className="w-full min-w-0 sm:w-auto [&_input]:min-h-11 [&_input]:text-sm [&_input]:focus-visible:ring-1 [&_input]:focus-visible:ring-green-600">
          <SearchBar value={search} onChange={setSearch} placeholder="Search quiz tests..." />
        </div>

        <select aria-label="Filter by subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 sm:w-auto sm:min-w-44"
        >
          <option value="">All Subjects</option>
          {subjectsForFilter.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.title}
            </option>
          ))}
        </select>
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{error}</p><button type="button" className="mt-1 min-h-11 rounded px-2 font-medium underline focus-visible:outline-2 focus-visible:outline-red-700" onClick={() => { void reload(); }}>Retry</button></div>}
      {deleteError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{deleteError}</p>}

      {filteredTests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center">
          <h2 className="text-base font-semibold text-gray-800">
            No Tests Found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Try changing your filters.
          </p>
        </div>
      ) : (
        <QuizTable
          tests={filteredTests}
          subjects={subjects}
          years={years}
          onEdit={openEdit}
          onDelete={(target) => { setDeleteError(null); setDeleteTarget(target); }}
        />
      )}

      <QuizFormModal
        lookupsReady={lookupsReady}
        open={formOpen}
        courses={courses}
        years={years}
        subjects={subjects}
        initialData={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        error={deleteError}
        title="Delete Quiz Test?"
        message="This test and all of its questions will be permanently deleted. This action cannot be undone."
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
