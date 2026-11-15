// POST /functions/v1/send-push-notification      (admin only)
// Header: Authorization: Bearer <admin's access token>
//
// verify_jwt is OFF in config.toml on purpose: the admin panel calls this from a
// browser, and a gateway-level 401 carries no CORS headers (the browser would
// report it as a CORS failure). Authentication is done here instead: the caller's
// JWT is verified with Supabase Auth and the resulting user id must be in
// public.admins (same rule as public.am_i_admin()).
//
// Body: { title, body, type?, data?: { screen?: string, params?: object } }
//   1. inserts a row into `notifications` (in-app notification centre), then
//   2. sends the push through Expo to the matching device tokens.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { aalFromAuthHeader, getUserFromAuthHeader, supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { withinLimit } from "../_shared/rateLimit.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/;
const TYPES = new Set(["announcement", "new_notes", "new_video", "quiz", "offer", "app_update", "exam_reminder", "payment_success"]);
const MAX_TITLE = 100;
const MAX_BODY = 500;
const MAX_DATA_BYTES = 1024;
const PAGE = 1000;

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let reserved: { adminId: string; requestId: string } | null = null;
  async function finish(body: Record<string, unknown>, httpStatus = 200, status = "completed"): Promise<Response> {
    if (reserved) {
      const { error } = await supabaseAdmin.from("notification_requests").update({ status, result: { httpStatus, body } })
        .eq("admin_id", reserved.adminId).eq("request_id", reserved.requestId);
      // The initial durable result remains unknown if publication fails. Never resend.
      if (error) return jsonResponse({ success: false, code: "unknown_outcome", unknown: 1,
        note: "Push provider outcome unknown - check the feed before retrying." });
    }
    return jsonResponse(body, httpStatus);
  }
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) return jsonResponse({ error: "Invalid or expired session" }, 401);

    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (adminErr) {
      console.error("send-push-notification: admin lookup failed", adminErr.code);
      return jsonResponse({ error: "Something went wrong." }, 500);
    }
    if (!adminRow) return jsonResponse({ error: "Admin access required" }, 403);

    // Same rule as am_i_admin(): once the owner switches admin MFA on, a password-only (aal1) session is not enough.
    const { data: mfa, error: mfaErr } = await supabaseAdmin.from("admin_settings").select("require_mfa").eq("id", true).maybeSingle();
    if (mfaErr || !mfa || typeof mfa.require_mfa !== "boolean") return jsonResponse({ error: "Something went wrong." }, 500);   // fail closed
    if (mfa?.require_mfa && aalFromAuthHeader(req) !== "aal2") {
      return jsonResponse({ error: "Multi-factor authentication required" }, 403);
    }

    if (!(await withinLimit(`push-send:${user.id}`, 10, 3600))) {
      return jsonResponse({ error: "Too many notifications sent recently. Try again later." }, 429);
    }

    const input = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!input || typeof input !== "object") return jsonResponse({ error: "Invalid request body" }, 400);

    const title = typeof input.title === "string" ? input.title.trim() : "";
    const body = typeof input.body === "string" ? input.body.trim() : "";
    if (!title || title.length > MAX_TITLE) return jsonResponse({ error: `title is required (max ${MAX_TITLE} characters)` }, 400);
    if (!body || body.length > MAX_BODY) return jsonResponse({ error: `body is required (max ${MAX_BODY} characters)` }, 400);

    const type = input.type === undefined || input.type === null ? "app_update" : input.type;
    if (typeof type !== "string" || !TYPES.has(type)) return jsonResponse({ error: "Unknown notification type" }, 400);

    // The notification feed has broadcast-only RLS. Refuse targeting before
    // persisting content or reading tokens until recipient-scoped storage exists.
    if (Object.prototype.hasOwnProperty.call(input, "targetUserIds")) {
      return jsonResponse({ error: "Targeted notifications are not supported" }, 400);
    }

    let data: Record<string, unknown> = {};
    if (input.data !== undefined && input.data !== null) {
      if (typeof input.data !== "object" || Array.isArray(input.data)) return jsonResponse({ error: "data must be an object" }, 400);
      const raw = input.data as Record<string, unknown>;
      if (raw.screen !== undefined && (typeof raw.screen !== "string" || raw.screen.length > 64)) {
        return jsonResponse({ error: "data.screen must be a short string" }, 400);
      }
      if (new TextEncoder().encode(JSON.stringify(raw)).length > MAX_DATA_BYTES) {
        return jsonResponse({ error: "data is too large" }, 400);
      }
      data = raw;
    }

    const requestId = typeof input.requestId === "string" ? input.requestId : "";
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId))
      return jsonResponse({ error: "A UUID requestId is required." }, 400);
    const { data: reservation, error: reserveError } = await supabaseAdmin.rpc("reserve_notification_request", {
      p_admin_id: user.id, p_request_id: requestId, p_payload: { title, body, type, data },
    });
    if (reserveError || !reservation) return jsonResponse({ error: "Could not reserve notification. No push was sent." }, 503);
    if (!reservation.reserved) return jsonResponse(reservation.result.body, reservation.result.httpStatus);
    reserved = { adminId: user.id, requestId };
    // Feed already persisted atomically with the reservation. Never insert again.
    // Collect device tokens page by page (PostgREST returns at most 1000 rows per request).
    const tokens: string[] = [];
    for (let from = 0; ; from += PAGE) {
      const query = supabaseAdmin.from("push_tokens").select("expo_push_token").order("expo_push_token").range(from, from + PAGE - 1);
      const { data: rows, error } = await query;
      if (error) {
        console.error("send-push-notification: token query failed", error.code);
        return finish({ success: false, code: "enumeration_failed", unknown: 0, note: "Notification saved. Token enumeration failed; no push was sent. Check the feed before composing a new send." }, 200, "enumeration_failed");
      }
      for (const r of rows ?? []) {
        if (typeof r.expo_push_token === "string" && EXPO_TOKEN.test(r.expo_push_token)) tokens.push(r.expo_push_token);
      }
      if (!rows || rows.length < PAGE) break;
    }

    if (tokens.length === 0) return finish({ success: true, pushed: 0, note: "No registered devices matched." });

    // Expo accepts up to 100 messages per request.
    let sent = 0;
    let failed = 0;
    let unknown = 0;
    const errors: Record<string, number> = {};
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      let res: Response;
      try {
      res = await fetch(EXPO_PUSH_URL, {
        signal: AbortSignal.timeout(15_000),
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(chunk.map((to) => ({ to, title, body, data, sound: "default" }))),
      });
      } catch {
        // A timeout can occur after acceptance. Preserve prior batch accounting;
        // do not automatically retry and duplicate already accepted messages.
        failed += chunk.length;
        unknown += chunk.length;
        errors.PushOutcomeUnknown = (errors.PushOutcomeUnknown ?? 0) + chunk.length;
        continue;
      }
      const payload = res.ok ? await res.json().catch(() => null) : null;
      const tickets = Array.isArray(payload?.data) ? payload.data : [];
      if (!res.ok || tickets.length !== chunk.length) {
        failed += chunk.length;
        unknown += chunk.length;
        errors.PushOutcomeUnknown = (errors.PushOutcomeUnknown ?? 0) + chunk.length;
        continue;
      }
      const deadTokens: string[] = [];
      for (let index = 0; index < chunk.length; index++) {
        const ticket = tickets[index];
        if (res.ok && tickets.length === chunk.length && ticket?.status === "ok" && typeof ticket.id === "string" && ticket.id.trim().length > 0) {
          sent++;
        } else {
          failed++;
          const code = ticket?.details?.error;
          const known = ["DeviceNotRegistered", "MessageTooBig", "MessageRateExceeded", "MismatchSenderId", "InvalidCredentials"];
          const reason = typeof code === "string" && known.includes(code) ? code : "PushServiceRejected";
          errors[reason] = (errors[reason] ?? 0) + 1;
          if (tickets.length === chunk.length && code === "DeviceNotRegistered") deadTokens.push(chunk[index]);
        }
      }
      if (deadTokens.length) {
        const { error } = await supabaseAdmin.from("push_tokens").delete().in("expo_push_token", deadTokens);
        if (error) console.error("send-push-notification: dead token cleanup failed", error.code);
      }
    }

    return finish({ success: unknown === 0, code: unknown ? "unknown_outcome" : "completed", pushed: sent, failed, unknown, errors, note: unknown ? "Push provider outcome unknown - check the feed before retrying." : "Accepted push tickets only; device delivery requires receipt/device evidence." }, 200, unknown ? "unknown_outcome" : "completed");
  } catch (err) {
    console.error("send-push-notification: unhandled error", String(err));
    if (reserved) return finish({ success: false, code: "unknown_outcome", unknown: 1, note: "Push provider outcome unknown - check the feed before retrying." }, 200, "unknown_outcome");
    return jsonResponse({ error: "Something went wrong." }, 500);
  }
});
