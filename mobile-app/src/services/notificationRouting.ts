type Target = { screen: string; params?: Record<string, unknown> };
type Response = {
  notification: { request: { identifier: string; content: { data?: unknown } } };
};

const simpleScreens = new Set([
  "Home", "Notifications", "Store", "Search", "Profile", "Downloads", "MyPurchases",
  "Settings", "StudyReminder", "About", "Contact", "Privacy", "Terms",
]);
const fallback = (): Target => ({ screen: "Notifications" });
const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Notification data is untrusted. Never forward arbitrary navigation state,
 * URLs, quiz answers, ownership flags or payment parameters to a screen. */
export function notificationTarget(data: unknown): Target {
  if (!isRecord(data) || typeof data.screen !== "string") return fallback();
  const screen = data.screen;
  if (simpleScreens.has(screen)) return { screen };
  const p = isRecord(data.params) ? data.params : {};
  const fields: Record<string, string[]> = {
    Years: [],
    Subjects: ["yearId", "yearTitle"],
    Chapters: ["subjectId", "subjectTitle", "yearId", "yearTitle"],
    ChapterDetails: ["chapterId", "chapterTitle", "subjectId", "subjectTitle", "yearId", "yearTitle"],
    Videos: ["subjectId", "subjectTitle", "yearId", "yearTitle"],
    QuizTests: ["subjectId", "subjectTitle", "yearId", "yearTitle"],
  };
  if (!Object.hasOwn(fields, screen)) return fallback();
  const params: Record<string, unknown> = {};
  for (const key of fields[screen]) {
    const value = p[key];
    if (typeof value !== "string" || !value.trim() || value.length > 200) return fallback();
    params[key] = value;
  }
  if (screen === "Years" && p.mode === undefined) return fallback();
  if (["Years", "Subjects", "Chapters"].includes(screen) && p.mode !== undefined) {
    const allowedModes = screen === "Chapters" ? ["notes"] : ["notes", "videos", "quiz"];
    if (typeof p.mode !== "string" || !allowedModes.includes(p.mode)) return fallback();
    params.mode = p.mode;
  }
  return { screen, params };
}

/** Keeps the latest tapped target through login/onboarding in this process.
 * The OS retains a killed-app response until the listener reads it. */
export function createNotificationRouter(navigate: (target: Target) => void) {
  let pending: Target | null = null;
  let canNavigate = false;
  const seen = new Set<string>();
  function flush() {
    if (!canNavigate || !pending) return;
    const target = pending;
    pending = null;
    try { navigate(target); } catch { navigate({ screen: "Home" }); }
  }
  return {
    receive(response: Response) {
      const request = response?.notification?.request;
      if (!request || typeof request.identifier !== "string" || seen.has(request.identifier)) return;
      seen.add(request.identifier);
      if (seen.size > 64) seen.delete(seen.values().next().value!);
      pending = notificationTarget(request.content?.data);
      flush();
    },
    setReady(signedIn: boolean, route: string | undefined) {
      canNavigate = signedIn && !!route && ![
        "Splash", "Login", "Register", "ForgotPassword", "ResetPassword", "SelectCourseYear",
      ].includes(route);
      flush();
    },
  };
}
