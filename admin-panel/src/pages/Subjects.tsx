import LookupStatus from "../components/LookupStatus";
import { useMemo, useState } from "react";
import useCourses from "../hooks/useCourses";
import CoursePicker from "../components/CoursePicker";

import useSubjects from "../hooks/useSubjects";
import useYears from "../hooks/useYears";

import SubjectTable from "../components/SubjectTable";
import SubjectFormModal from "../components/SubjectFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import Button from "../components/Button";

import type { Subject, SubjectInput } from "../types/subject";

export default function Subjects() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");

  const { subjects, loading, error, reload, createSubject, editSubject, removeSubject } =
    useSubjects({ courseId: courseFilter || undefined });

  const { years, loading: yearsLoading, error: yearsError, reload: reloadYears } = useYears();

  const [yearFilter, setYearFilter] = useState("");

  const lookupsReady = !coursesLoading && !coursesError && !yearsLoading && !yearsError;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const yearsForFilter = useMemo(
    () => (courseFilter ? years.filter((y) => y.courseId === courseFilter) : years),
    [years, courseFilter]
  );

  const filteredSubjects = useMemo(() => {
    if (!yearFilter) return subjects;
    return subjects.filter((s) => s.yearId === yearFilter);
  }, [subjects, yearFilter]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setFormOpen(true);
  }

  async function handleSubmit(data: SubjectInput) {
    if (editing) {
      await editSubject(editing.id, data);
    } else {
      await createSubject(data);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await removeSubject(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete subject.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <LookupStatus label="courses" loading={coursesLoading} error={coursesError} onRetry={reloadCourses} />
      <LookupStatus label="years" loading={yearsLoading} error={yearsError} onRetry={reloadYears} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Subjects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Each Subject belongs to one Year.
          </p>
        </div>

        <Button className="min-h-11 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700" onClick={openCreate} disabled={yearsLoading || years.length === 0}>
          + New Subject
        </Button>
      </div>

      {lookupsReady && years.length === 0 && !yearsLoading && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Create at least one Year in "Academic Years" first.
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
            }}
            label=""
            placeholder="All Courses"
          />
        </div>

        <select aria-label="Filter by year"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 sm:w-auto sm:min-w-44"
        >
          <option value="">All Years</option>
          {yearsForFilter.map((year) => (
            <option key={year.id} value={year.id}>
              {year.title}
            </option>
          ))}
        </select>
      </div>

      {loading && <p role="status" className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">Loading...</p>}

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{error}</p><button type="button" className="mt-1 min-h-11 rounded px-2 font-medium underline focus-visible:outline-2 focus-visible:outline-red-700" onClick={() => { void reload(); }}>Retry</button></div>}

      {!loading && !error && (
        <SubjectTable
          subjects={filteredSubjects}
          years={years}
          onEdit={openEdit}
          onDelete={(target) => { setDeleteError(null); setDeleteTarget(target); }}
        />
      )}

      <SubjectFormModal
        lookupsReady={lookupsReady}
        open={formOpen}
        courses={courses}
        years={years}
        initialData={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      {deleteError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{deleteError}</p>}
      <ConfirmDialog
        open={!!deleteTarget}
        error={deleteError}
        title="Delete Subject?"
        message={`"${deleteTarget?.title}" will be permanently deleted. This action cannot be undone.`}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
