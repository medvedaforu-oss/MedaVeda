import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import { getUsers, setUserBlocked } from "../services/userService";

import type { AppUser } from "../types/user";

export default function useUsers(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const scope = JSON.stringify([courseId, yearId]);
  const beginRequest = useRequestGuard(scope);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readState, setReadState] = useState({ scope, hasLoaded: false });

  const loadUsers = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getUsers({ courseId, yearId });
      if (!current()) return;
      setUsers(data);
      setReadState({ scope, hasLoaded: true });
      setError(null);
    } catch (err) {
      if (!current()) return;
      setReadState((previous) => ({ scope, hasLoaded: previous.scope === scope && previous.hasLoaded }));
      console.error(err);
      setError("Could not load users. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, scope, beginRequest]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function toggleBlocked(id: string, blocked: boolean) {
    await setUserBlocked(id, blocked);
    await loadUsers();
  }

  const hasLoaded = readState.scope === scope && readState.hasLoaded;
  return {
    users: hasLoaded ? users : [],
    hasLoaded,
    loading: loading || readState.scope !== scope,
    error: readState.scope === scope ? error : null,
    reload: loadUsers,
    toggleBlocked,
  };
}
