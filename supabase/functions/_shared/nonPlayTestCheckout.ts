// Headers are routing hints, never proof of distribution. Only allowlisted,
// authenticated synthetic users in the exact isolated project can use this.
// This endpoint cannot be enabled by an OTA update or a client-supplied flag.
export function allowNonPlayTestCheckout(req: Request, userId: string): boolean {
  const env = (key: string) => Deno.env.get(key);
  const users = (env("NONPLAY_TEST_USER_IDS") ?? "").split(",").map(id => id.trim()).filter(Boolean);
  return env("SUPABASE_URL") === "https://nsmsqsogedzohwboripd.supabase.co"
    && env("APP_ENV") === "staging"
    && env("ENABLE_NONPLAY_TEST_CHECKOUT") === "true"
    && (env("RAZORPAY_KEY_ID") ?? "").startsWith("rzp_test_")
    && !!env("RAZORPAY_KEY_SECRET")
    && users.includes(userId)
    && req.headers.get("x-medveda-application-id") === "in.medveda.razorpaytest"
    && /^\d+\.\d+\.\d+$/.test(req.headers.get("x-medveda-app-version") ?? "");
}
