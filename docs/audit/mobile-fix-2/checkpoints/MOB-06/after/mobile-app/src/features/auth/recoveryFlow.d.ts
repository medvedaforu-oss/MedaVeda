import type { SupabaseClient } from "@supabase/supabase-js";
export type RecoveryPhase = "idle" | "mfa" | "ready" | "blocked" | "expired" | "cleanup" | "done";
export type RecoveryState = { phase: RecoveryPhase; factors: { id: string; label: string }[] };
export type RecoveryTokens = { accessToken: string; refreshToken: string };
export type RecoveryFlow = {
  snapshot(): RecoveryState;
  dispose(): void;
  start(tokens: RecoveryTokens | null): Promise<RecoveryState>;
  verify(factorId: string, code: string): Promise<RecoveryState>;
  updatePassword(password: string): Promise<RecoveryState>;
  retryCleanup(): Promise<RecoveryState>;
};
export function createRecoveryFlow(auth: SupabaseClient["auth"]): RecoveryFlow;
export function recoveryError(code: string): Error & { code: string };
