// These server opt-ins are deployment approvals, not proof of Play enrolment.
// The owner must verify Console package/India opt-in before setting them.
export function notesChoiceAllowed(req: Request, uid: string): boolean {
  const env = (key: string) => Deno.env.get(key);
  if (req.headers.get("x-medveda-application-id") !== "in.medveda.app" ||
      !req.headers.get("x-medveda-app-version") || env("PLAY_INDIA_UCB_ENROLLED") !== "true") return false;
  if (env("APP_ENV") === "staging") return env("ENABLE_PLAY_CHOICE_TEST") === "true" &&
    env("SUPABASE_URL") === "https://nsmsqsogedzohwboripd.supabase.co" &&
    (env("PLAY_CHOICE_TEST_USER_IDS") ?? "").split(",").map(x => x.trim()).includes(uid);
  return env("APP_ENV") === "production" && env("PLAY_CHOICE_TEST_ACCEPTED") === "true" &&
    env("ENABLE_PLAY_CHOICE_CHECKOUT") === "true";
}
