// Transactional quiz-attempt outbox. No other entity is enqueued in this app.
import NetInfo from "@react-native-community/netinfo";
import { getDb, OFFLINE_DB_SUPPORTED } from "../config/database";
import { supabase } from "../config/supabase";
import { SyncEntityType, SyncQueueItem } from "../types/offline";
import { logDebug } from "../utils/logger";
import { getCurrentUser, getAuthEpoch } from "./authState";

let syncInProgress = false;
// Timing is deliberately in memory: restarts retry retained durable failures.
const retryAfter = new Map<string, number>();
const RETRY_BASE_MS = 30_000;
const RETRY_CAP_MS = 30 * 60_000;
let unsubscribeNetInfo: (() => void) | null = null;
let safetyInterval: ReturnType<typeof setInterval> | null = null;

// Returns null if the row's payload isn't valid JSON (e.g. the app was
// killed mid-write, or on-disk corruption) - never throws, so one bad
// row can't take down the whole drainQueue() pass.
function rowToQueueItem(row: any): SyncQueueItem | null {
  try {
    return {
      queueId: row.queue_id,
      entityType: row.entity_type,
      operation: row.operation,
      payload: JSON.parse(row.payload),
      createdAt: row.created_at,
      attemptCount: row.attempt_count,
      lastError: row.last_error,
      syncedAt: row.synced_at,
    };
  } catch {
    return null;
  }
}

/** Enqueue inside the same SQLite transaction as the local write. Does not drain. */
export function enqueueForSync(
  entityType: SyncEntityType,
  operation: "upsert" | "delete",
  payload: Record<string, unknown>
): void {
  if (!OFFLINE_DB_SUPPORTED) return;
  if (entityType !== "quiz_attempt" || operation !== "upsert") throw new Error("Only quiz attempts may be enqueued");
  const db = getDb();
  const queueId = `${entityType}_${payload.id ?? Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.runSync(
    `INSERT INTO sync_queue (queue_id, entity_type, operation, payload, created_at, attempt_count, synced_at)
     VALUES (?,?,?,?,?,0,NULL);`,
    [queueId, entityType, operation, JSON.stringify(payload), Date.now()]
  );
}

/** For standalone writes; transactional callers enqueue then drain after commit. */
export function queueForSync(
  entityType: SyncEntityType,
  operation: "upsert" | "delete",
  payload: Record<string, unknown>
): void {
  enqueueForSync(entityType, operation, payload);
  void drainQueue();
}

function getPendingItems(currentUserId: string): SyncQueueItem[] {
  const db = getDb();
  const rows = db.getAllSync(
    `SELECT * FROM sync_queue WHERE synced_at IS NULL
       AND json_valid(payload)
       AND json_extract(payload, '$.user_id') = ?
     ORDER BY created_at ASC;`,
    [currentUserId]
  ) as any[];

  const items: SyncQueueItem[] = [];
  const now = Date.now();
  const pendingIds = new Set(rows.map((row) => row.queue_id));
  for (const [queueId, until] of retryAfter) {
    if (until <= now || !pendingIds.has(queueId)) retryAfter.delete(queueId);
  }
  // Select eligible rows BEFORE imposing the batch size, so a poison prefix
  // cannot repeatedly hide later quiz attempts or bookmarks.
  for (const row of rows) {
    if ((retryAfter.get(row.queue_id) ?? 0) > now) continue;
    const item = rowToQueueItem(row);
    if (item) {
      if (item.payload?.user_id === currentUserId && currentUserId) items.push(item);
      if (items.length === 50) break;
    } else {
      // Retain corrupt rows for explicit repair; never report them as synced.
      logDebug(`sync_queue row ${row?.queue_id} has corrupt payload JSON`);
      markFailed(row.queue_id, "Invalid JSON payload; repair required");
    }
  }
  return items;
}

function markSynced(queueId: string): void {
  retryAfter.delete(queueId);
  const db = getDb();
  db.runSync(`UPDATE sync_queue SET synced_at = ? WHERE queue_id = ?;`, [Date.now(), queueId]);
}

function markFailed(queueId: string, error: string): void {
  const db = getDb();
  db.runSync(
    `UPDATE sync_queue SET attempt_count = attempt_count + 1, last_error = ? WHERE queue_id = ?;`,
    [error, queueId]
  );
}

function markQuizLocal(attemptId: string, status: "legacy" | "verified" | "stale" | "rejected", score?: number, total?: number): void {
  const db = getDb();
  if (status === "verified" && score !== undefined && total !== undefined) {
    db.runSync(
      `UPDATE quiz_attempts_local SET score = ?, total_questions = ?, synced = 1, verification_status = ? WHERE attempt_id = ?;`,
      [score, total, status, attemptId]
    );
  } else {
    db.runSync(`UPDATE quiz_attempts_local SET verification_status = ? WHERE attempt_id = ?;`, [status, attemptId]);
  }
}

async function syncOne(item: SyncQueueItem, current: () => boolean, bearer: string): Promise<void> {
  if (!getCurrentUser()?.id || item.payload.user_id !== getCurrentUser()?.id) {
    throw new Error("Outbox account changed; original owner must sign in");
  }
  if (item.operation !== "upsert" && item.operation !== "delete") throw new Error("Unsupported outbox operation");
  if (item.entityType === "quiz_attempt") {
    const payload = item.payload;
    const attemptId = typeof payload.attempt_id === "string" ? payload.attempt_id :
      typeof payload.id === "string" ? payload.id : "";
    // Old queued writes only carry a client score. Keep their local history,
    // but never promote them into the server-verified result table.
    if (!Array.isArray(payload.answers) || typeof payload.question_revision !== "number") {
      if (attemptId) markQuizLocal(attemptId, "legacy");
      return;
    }
    if (!attemptId) return;
    if (payload.user_id !== getCurrentUser()?.id) {
      // Another account can sign back in later and submit its own attempt.
      // Never discard or relabel that account's local practice result.
      throw new Error("Quiz account changed; retry when the original account signs in");
    }
    if (!current()) throw new Error("Outbox account changed before dispatch");
    const { data, error } = await supabase.rpc("submit_quiz_attempt", {
      p_attempt_id: attemptId,
      p_test_id: payload.test_id,
      p_question_revision: payload.question_revision,
      p_answers: payload.answers,
    }).setHeader("Authorization", `Bearer ${bearer}`);
    if (!current()) throw new Error("Outbox account changed during verification");
    if (error) {
      if (["22023", "23505", "42501"].includes(error.code)) {
        markQuizLocal(attemptId, "rejected");
        return;
      }
      throw error;
    }
    if (data?.status === "stale") {
      markQuizLocal(attemptId, "stale");
      return;
    }
    if (data?.status !== "verified" || !Number.isInteger(data.score) || !Number.isInteger(data.total)) {
      throw new Error("Quiz verification returned an invalid result");
    }
    markQuizLocal(attemptId, "verified", data.score, data.total);
    return;
  }

  throw new Error("Unsupported legacy outbox entity; repair required");
}

/** Drains as much of the outbox as possible. Safe to call repeatedly/concurrently. */
export async function drainQueue(): Promise<void> {
  if (syncInProgress) return;
  // Acquire before the first await: startup, NetInfo and outbox writes may overlap.
  syncInProgress = true;
  try {
    const owner = getCurrentUser()?.id;
    const epoch = typeof getAuthEpoch === "function" ? getAuthEpoch() : 0;
    const current = () => getCurrentUser()?.id === owner && (typeof getAuthEpoch !== "function" || getAuthEpoch() === epoch);
    if (!owner) return;
    const net = await NetInfo.fetch();
    if (!current() || !net.isConnected || !net.isInternetReachable) return;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (!current() || sessionError || sessionData.session?.user.id !== owner) return;
    const bearer = sessionData.session.access_token;
    if (!bearer) return;
    const pending = getPendingItems(owner);
    for (const item of pending) {
      try {
        if (!current()) return;
        await syncOne(item, current, bearer);
        if (!current()) return;
        markSynced(item.queueId);
      } catch (err: any) {
        const delay = Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** Math.min(20, Math.max(0, item.attemptCount)));
        retryAfter.set(item.queueId, Date.now() + delay);
        markFailed(item.queueId, err?.message ?? "Unknown sync error");
        // Failures remain pending with their error and attempt count for retry/repair.
      }
    }
  } catch (error) {
    // Background callers do not await this promise. Keep queued rows for retry.
    logDebug("Could not drain sync queue", error);
  } finally {
    syncInProgress = false;
  }
}

export function getPendingSyncCount(): number {
  if (!OFFLINE_DB_SUPPORTED) return 0;
  const db = getDb();
  const row = db.getFirstSync(
    `SELECT COUNT(*) as cnt FROM sync_queue WHERE synced_at IS NULL;`
  ) as any;
  return row?.cnt ?? 0;
}

/** Call once at app startup (after initDatabase). */
export function startSyncEngine(): void {
  if (!OFFLINE_DB_SUPPORTED) return;
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      drainQueue();
    }
  });

  // Safety net: some devices throttle background NetInfo events, so also
  // sweep every 2 minutes while the app is foregrounded.
  if (safetyInterval) clearInterval(safetyInterval);
  safetyInterval = setInterval(drainQueue, 2 * 60 * 1000);

  drainQueue(); // attempt immediately in case we launched already online
}

export function stopSyncEngine(): void {
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = null;
  if (safetyInterval) clearInterval(safetyInterval);
  safetyInterval = null;
}
