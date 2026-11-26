import LookupStatus from "../components/LookupStatus";
import { useMemo, useState } from "react";
import useCourses from "../hooks/useCourses";
import CoursePicker from "../components/CoursePicker";

import useVideos from "../hooks/useVideos";
import useYears from "../hooks/useYears";
import useSubjects from "../hooks/useSubjects";

import VideosHeader from "../components/VideosHeader";
import VideosTable from "../components/VideosTable";
import VideoFormModal from "../components/VideoFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import SearchBar from "../components/SearchBar";

import type { Video, VideoInput } from "../types/video";

export default function Videos() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");

  const { videos, loading, hasLoaded, error, reload, createVideo, editVideo, removeVideo } =
    useVideos({ courseId: courseFilter || undefined });

  const { years, loading: yearsLoading, error: yearsError, reload: reloadYears } = useYears();
  const { subjects, loading: subjectsLoading, error: subjectsError, reload: reloadSubjects } = useSubjects();

  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const lookupsReady = !coursesLoading && !coursesError && !yearsLoading && !yearsError && !subjectsLoading && !subjectsError;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const subjectsForFilter = useMemo(
    () => (courseFilter ? subjects.filter((s) => s.courseId === courseFilter) : subjects),
    [subjects, courseFilter]
  );

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesSearch = video.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesSubject = !subjectId || video.subjectId === subjectId;

      return matchesSearch && matchesSubject;
    });
  }, [videos, search, subjectId]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(video: Video) {
    setEditing(video);
    setFormOpen(true);
  }

  async function handleSubmit(data: VideoInput) {
    if (editing) {
      await editVideo(editing.id, data);
    } else {
      await createVideo(data);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await removeVideo(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete video.");
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
      <VideosHeader onAdd={openCreate} />

      {lookupsReady && subjects.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Create at least one Subject first before adding Videos.
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
          <SearchBar value={search} onChange={setSearch} placeholder="Search videos..." />
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

      {filteredVideos.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center">
          <h2 className="text-base font-semibold text-gray-800">
            No Videos Found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Try changing your filters.
          </p>
        </div>
      ) : (
        <VideosTable
          videos={filteredVideos}
          subjects={subjects}
          onEdit={openEdit}
          onDelete={(target) => { setDeleteError(null); setDeleteTarget(target); }}
        />
      )}

      <VideoFormModal
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
        title="Delete Video?"
        message={`"${deleteTarget?.title}" will be permanently deleted. This action cannot be undone.`}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
