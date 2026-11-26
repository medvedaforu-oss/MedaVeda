import LookupStatus from "../components/LookupStatus";
import { useState } from "react";

import useCourses from "../hooks/useCourses";
import CoursePicker from "../components/CoursePicker";

import useYears from "../hooks/useYears";

import YearTable from "../components/YearTable";
import YearFormModal from "../components/YearFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import Button from "../components/Button";

import type { Year, YearInput } from "../types/year";

export default function Years() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");

  const { years, loading, error, reload, createYear, editYear, removeYear } =
    useYears({ courseId: courseFilter || undefined });

  const lookupsReady = !coursesLoading && !coursesError;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Year | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Year | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(year: Year) {
    setEditing(year);
    setFormOpen(true);
  }

  async function handleSubmit(data: YearInput) {
    if (editing) {
      await editYear(editing.id, data);
    } else {
      await createYear(data);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await removeYear(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete year.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <LookupStatus label="courses" loading={coursesLoading} error={coursesError} onRetry={reloadCourses} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Academic Years
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the academic years students can browse.
          </p>
        </div>

        <Button className="min-h-11 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700" onClick={openCreate}>+ New Year</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48 [&_select]:min-h-11">
          <CoursePicker
            courses={courses}
            value={courseFilter}
            onChange={setCourseFilter}
            label=""
            placeholder="All Courses"
          />
        </div>
      </div>

      {loading && <p role="status" className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">Loading...</p>}

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{error}</p><button type="button" className="mt-1 min-h-11 rounded px-2 font-medium underline focus-visible:outline-2 focus-visible:outline-red-700" onClick={() => { void reload(); }}>Retry</button></div>}

      {!loading && !error && (
        <YearTable
          years={years}
          onEdit={openEdit}
          onDelete={(target) => { setDeleteError(null); setDeleteTarget(target); }}
        />
      )}

      <YearFormModal
        lookupsReady={lookupsReady}
        open={formOpen}
        courses={courses}
        initialData={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      {deleteError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{deleteError}</p>}
      <ConfirmDialog
        open={!!deleteTarget}
        error={deleteError}
        title="Delete Year?"
        message={`"${deleteTarget?.title}" will be permanently deleted. This action cannot be undone.`}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
