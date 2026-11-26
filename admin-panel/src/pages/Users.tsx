import LookupStatus from "../components/LookupStatus";
import { useMemo, useState } from "react";
import useCourses from "../hooks/useCourses";
import CoursePicker from "../components/CoursePicker";

import useUsers from "../hooks/useUsers";

import UsersTable from "../components/UsersTable";
import SearchBar from "../components/SearchBar";
import ConfirmDialog from "../components/ConfirmDialog";

import type { AppUser } from "../types/user";

export default function Users() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");

  const { users, loading, hasLoaded, error, reload, toggleBlocked } = useUsers({ courseId: courseFilter || undefined });

  const [search, setSearch] = useState("");

  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const term = search.toLowerCase();
      return (
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phone?.toLowerCase().includes(term)
      );
    });
  }, [users, search]);

  async function confirmToggle() {
    if (!pendingUser) return;
    try {
      setSaving(true);
      setActionError(null);
      await toggleBlocked(pendingUser.id, !pendingUser.blocked);
      setPendingUser(null);
    } catch (err) {
      console.error("Could not update this user:", err);
      setActionError(err instanceof Error ? err.message : "Could not update this user. Please try again.");
    } finally {
      setSaving(false);
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
    <div>
      <LookupStatus label="courses" loading={coursesLoading} error={coursesError} onRetry={reloadCourses} />
      {loading && <p role="status" className="mb-4 text-sm text-gray-500">Refreshing...</p>}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-800">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Students registered on the MedVeda app.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-48 [&_select]:min-h-11">
          <CoursePicker
            courses={courses}
            value={courseFilter}
            onChange={(id) => {
              setCourseFilter(id);
            }}
            label=""
            placeholder="All Courses"
          />
        </div>

        <div className="w-full min-w-0 sm:w-auto [&_input]:min-h-11 [&_input]:text-sm [&_input]:focus-visible:ring-1 [&_input]:focus-visible:ring-green-600">
          <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        </div>
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{error}</p><button type="button" className="mt-1 min-h-11 rounded px-2 font-medium underline focus-visible:outline-2 focus-visible:outline-red-700" onClick={() => { void reload(); }}>Retry</button></div>}

      {filteredUsers.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center">
          <h2 className="text-base font-semibold text-gray-800">No Users Found</h2>
          <p className="mt-2 text-sm text-gray-500">Try a different search.</p>
        </div>
      ) : (
        <UsersTable users={filteredUsers} onToggleBlock={(user) => { setActionError(null); setPendingUser(user); }} />
      )}

      <ConfirmDialog
        open={!!pendingUser}
        title={pendingUser?.blocked ? "Unblock User?" : "Block User?"}
        message={
          pendingUser
            ? pendingUser.blocked
              ? `"${pendingUser.name || pendingUser.email}" will regain access to the app.`
              : `"${pendingUser.name || pendingUser.email}" will lose access to the app immediately.`
            : ""
        }
        error={actionError}
        loading={saving}
        confirmLabel={pendingUser?.blocked ? "Unblock" : "Block"}
        loadingLabel={pendingUser?.blocked ? "Unblocking..." : "Blocking..."}
        onCancel={() => setPendingUser(null)}
        onConfirm={confirmToggle}
      />
    </div>
  );
}
