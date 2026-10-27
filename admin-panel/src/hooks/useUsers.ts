import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import { getUsers, setUserBlocked } from "../services/userService";

import type { AppUser } from "../types/user";

export default function useUsers(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getUsers({ courseId, yearId });
      if (!current()) return;
      setUsers(data);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError("Could not load users. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function toggleBlocked(id: string, blocked: boolean) {
    await setUserBlocked(id, blocked);
    await loadUsers();
  }

  return {
    users,
    loading,
    error,
    reload: loadUsers,
    toggleBlocked,
  };
}
