import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../config/supabase";
import { getAuthEpoch, getCurrentUser, subscribeAuthUser } from "../services/authState";
import { logError } from "../utils/logger";

type Attempt = {
  id: string;
  percentage: number;
  created_at: string;
  test_id: string;
  test_title: string;
  score: number;
  total: number;
};
const EMPTY = { totalAttempts: 0, averagePercentage: 0, bestScore: 0, recentQuiz: [] as Attempt[], legacyAttempts: 0 };
const PAGE_SIZE = 250;
const MAX_SCANNED_ATTEMPTS = 5_000;

export default function useQuizStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const lifecycle = useRef({ mounted: false, request: 0 });

  const loadStats = useCallback(async () => {
    const request = ++lifecycle.current.request;
    const uid = getCurrentUser()?.id;
    const epoch = getAuthEpoch();
    const current = () => lifecycle.current.mounted && request === lifecycle.current.request &&
      epoch === getAuthEpoch() && uid === getCurrentUser()?.id;
    if (!current()) return;
    setLoading(true);
    setError(null);
    if (!uid) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }
    try {
      const { data: aggregate, error: aggregateError } = await supabase.rpc("get_my_verified_quiz_stats");
      if (!current()) return;
      if (!aggregateError) {
        if (!aggregate || !Number.isSafeInteger(aggregate.totalAttempts) || aggregate.totalAttempts < 0 ||
            !Number.isFinite(aggregate.averagePercentage) || !Number.isFinite(aggregate.bestScore) ||
            !Array.isArray(aggregate.recentQuiz) || aggregate.recentQuiz.length > 5) throw new Error("Invalid aggregate response");
        const legacy = await supabase.from("quiz_scores").select("id", { count: "exact", head: true }).eq("user_id", uid);
        if (!current()) return;
        if (legacy.error) throw legacy.error;
        setStats({ ...aggregate, legacyAttempts: legacy.count ?? 0 });
        return;
      }
      // Only an explicitly absent RPC permits the bounded compatibility path.
      if (!(["42883", "PGRST202"].includes(aggregateError.code) &&
          /get_my_verified_quiz_stats/.test(aggregateError.message ?? ""))) throw aggregateError;
      // IDs are immutable unique text keys. Freeze the upper key and use the
      // same owner/boundary for count and every page; never rely on API row caps.
      const { data: upperRows, error: upperError } = await supabase.from("verified_quiz_attempts")
        .select("id").eq("user_id", uid).order("id", { ascending: false }).limit(1);
      if (!current()) return;
      if (upperError) throw upperError;
      const upper = upperRows?.[0]?.id as string | undefined;
      const countAttempts = () => supabase.from("verified_quiz_attempts")
        .select("id", { count: "exact", head: true }).eq("user_id", uid).lte("id", upper!);
      const [verified, legacy] = await Promise.all([
        upper === undefined ? Promise.resolve({ count: 0, error: null }) : countAttempts(),
        supabase.from("quiz_scores").select("id", { count: "exact", head: true }).eq("user_id", uid),
      ]);
      if (!current()) return;
      if (verified.error) throw verified.error;
      if (legacy.error) throw legacy.error;
      const count = verified.count;
      if (count === null || !Number.isSafeInteger(count) || count < 0) throw new Error("Missing verified attempt count");
      // Keep exact lifetime semantics for supported histories; never publish
      // partial totals or perform an unbounded client scan. Server aggregation
      // is required above this bound.
      if (count > MAX_SCANNED_ATTEMPTS) throw new Error("Progress service upgrade pending. Retry after the server update.");
      let cursor: string | undefined;
      let total = 0;
      let sum = 0;
      let best = 0;
      let recent: Attempt[] = [];
      const seen = new Set<string>();
      while (total < count) {
        let query = supabase.from("verified_quiz_attempts")
          .select("id,percentage,created_at,test_id,test_title,score,total")
          .eq("user_id", uid).lte("id", upper!).order("id", { ascending: true }).limit(PAGE_SIZE);
        if (cursor !== undefined) query = query.gt("id", cursor);
        const { data, error: pageError } = await query;
        if (!current()) return;
        if (pageError) throw pageError;
        const rows = (data ?? []) as Attempt[];
        if (!rows.length) throw new Error("Incomplete verified attempt scan");
        for (const row of rows) {
          if (seen.has(row.id)) throw new Error("Repeated verified attempt cursor");
          seen.add(row.id);
          total++;
          sum += row.percentage;
          best = Math.max(best, row.percentage);
        }
        // Only the five latest rows are retained, with a deterministic tie break.
        recent = [...recent, ...rows].sort((a, b) => {
          const time = Date.parse(b.created_at) - Date.parse(a.created_at);
          return time || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
        }).slice(0, 5);
        const next = rows[rows.length - 1].id;
        if (next === cursor) throw new Error("Verified attempt cursor did not advance");
        cursor = next;
      }
      if (total !== count) throw new Error("Verified attempt population changed");
      if (upper !== undefined) {
        const check = await countAttempts();
        if (!current()) return;
        if (check.error) throw check.error;
        if (check.count !== count) throw new Error("Verified attempt population changed");
      }
      setStats({ totalAttempts: count, averagePercentage: count ? Math.round(sum / count) : 0,
        bestScore: best, recentQuiz: recent, legacyAttempts: legacy.count ?? 0 });
    } catch (err) {
      if (!current()) return;
      logError("useQuizStats: failed to load stats", err);
      setError("Could not load your progress. Pull down to try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const state = lifecycle.current;
    state.mounted = true;
    const onOwnerChange = () => {
      lifecycle.current.request++;
      setStats(EMPTY);
      void loadStats();
    };
    const unsubscribe = subscribeAuthUser(onOwnerChange);
    void loadStats();
    return () => {
      state.mounted = false;
      state.request++;
      unsubscribe();
    };
  }, [loadStats]);

  return { loading, ...stats, error, refresh: loadStats };
}
