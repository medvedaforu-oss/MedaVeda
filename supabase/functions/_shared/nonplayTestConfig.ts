export const NONPLAY_TEST_ENVIRONMENT = "production-isolated-razorpay-test-v1";
export const NONPLAY_TEST_URL = "https://xbvenkfmesugrbjuufyw.supabase.co";
export const NONPLAY_TEST_PACKAGE = "in.medveda.razorpaytest";
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TEST_PRODUCT = /^npt_product_[0-9a-f-]{36}$/;
export type TestConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  users: Set<string>;
  products: Set<string>;
};
export type EnvReader = (key: string) => string | undefined;

// Deliberately never read APP_ENV, ALLOW_TEST_MODE or any live RAZORPAY_* key.
export function testConfig(env: EnvReader): TestConfig {
  const keyId = env("NONPLAY_TEST_RAZORPAY_KEY_ID") ?? "";
  const keySecret = env("NONPLAY_TEST_RAZORPAY_KEY_SECRET") ?? "";
  const webhookSecret = env("NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET") ?? "";
  const list = (name: string, pattern: RegExp) => {
    const values = (env(name) ?? "").split(",").map((s) => s.trim()).filter(
      Boolean,
    );
    if (
      !values.length || values.length > 100 ||
      values.some((v) => !pattern.test(v))
    ) throw new Error("Test configuration unavailable");
    return new Set(values);
  };
  if (
    env("SUPABASE_URL") !== NONPLAY_TEST_URL ||
    env("NONPLAY_TEST_ENVIRONMENT") !== NONPLAY_TEST_ENVIRONMENT ||
    env("NONPLAY_TEST_CHECKOUT_ENABLED") !== "true" ||
    !/^rzp_test_[A-Za-z0-9]+$/.test(keyId) ||
    keySecret.length < 16 || webhookSecret.length < 32 ||
    keySecret === webhookSecret ||
    /\s/.test(keySecret + webhookSecret) ||
    /REPLACE|placeholder/i.test(keySecret + webhookSecret)
  ) {
    throw new Error("Test configuration unavailable");
  }
  return {
    keyId,
    keySecret,
    webhookSecret,
    users: list("NONPLAY_TEST_USER_IDS", UUID),
    products: list("NONPLAY_TEST_PRODUCT_IDS", TEST_PRODUCT),
  };
}

// These headers are routing hints, not device attestation. Real authorization is
// verified Auth + protected app_metadata + DB AND server allowlists on every read/write.
export function testClientAllowed(req: Request): boolean {
  return req.headers.get("x-medveda-application-id") === NONPLAY_TEST_PACKAGE &&
    req.headers.get("x-medveda-build-profile") === "razorpay-internal-test" &&
    req.headers.get("x-medveda-test-environment") ===
      NONPLAY_TEST_ENVIRONMENT &&
    /^\d+\.\d+\.\d+$/.test(req.headers.get("x-medveda-app-version") ?? "");
}
