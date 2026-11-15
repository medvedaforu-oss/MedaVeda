// Candidate overlay for paymentQueue.ts. No hard wall-clock guarantee is claimed:
// in-flight work keeps its lease and must be separately qualified on staging.
export const WORK_BATCH_SIZE = 40;
export const WORK_CONCURRENCY = 8;
export const INVOCATION_BUDGET_MS = 80_000;
export const JOB_START_RESERVE_MS = 45_000;
export type InvocationBudget = { deadline: number; minRemainingMs: number; now: () => number };
export function createInvocationBudget(now: () => number = Date.now): InvocationBudget {
  return { deadline: now() + INVOCATION_BUDGET_MS, minRemainingMs: JOB_START_RESERVE_MS, now };
}
export function hasJobBudget(budget: InvocationBudget): boolean {
  return budget.deadline - budget.now() >= budget.minRemainingMs;
}
export function estimateDrainSeconds(backlog: number): number {
  // Conservative one concurrency wave per minute; metrics must reflect deferral.
  return Math.ceil(Math.max(0, backlog) / WORK_CONCURRENCY) * 60;
}
export async function runBounded<T>(items: readonly T[], concurrency: number,
  work: (item: T) => Promise<void>, budget = createInvocationBudget()): Promise<{ started: number; deferred: number }> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) throw new Error("Invalid concurrency");
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(items.length, concurrency) }, async () => {
    while (cursor < items.length && hasJobBudget(budget)) {
      const item = items[cursor++];
      await work(item);
    }
  }));
  return { started: cursor, deferred: items.length - cursor };
}
