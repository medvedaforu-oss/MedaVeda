import { Sentry } from "../config/sentry";
import { logDebug } from "./logger";

// Exact URLs are development-only. Release breadcrumbs carry stage names only,
// never copied URLs, video titles, user identifiers, auth data or native error text.
export function traceVideo(stage: string, detail?: Record<string, unknown>): void {
  try {
    logDebug(`[video-open-v2] ${stage}`, detail ? JSON.stringify(detail) : "");
    Sentry.addBreadcrumb({ category: "video-open-v2", message: stage, level: "info" });
    if (stage === "open.failed" || stage === "parse.invalid" || stage === "fetch.failed") {
      Sentry.captureMessage(`video-open-v2: ${stage}`, "warning");
    }
  } catch {
    // Diagnostics must never prevent an external link from opening.
  }
}
