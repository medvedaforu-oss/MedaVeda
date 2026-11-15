import { createNonplayTestHandlers } from "../../../../supabase/functions/_shared/nonplayTestHandlers.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

const valid: Record<string, string | undefined> = {
  SUPABASE_URL: "https://xbvenkfmesugrbjuufyw.supabase.co",
  NONPLAY_TEST_ENVIRONMENT: "production-isolated-razorpay-test-v1",
  NONPLAY_TEST_CHECKOUT_ENABLED: "true",
  NONPLAY_TEST_RAZORPAY_KEY_ID: "rzp_test_fixture",
  NONPLAY_TEST_RAZORPAY_KEY_SECRET: "fixture_key_secret_1234567890",
  NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET: "fixture_webhook_secret_12345678901234567890",
  NONPLAY_TEST_USER_IDS: "d9510000-0000-4000-8000-000000000001",
  NONPLAY_TEST_PRODUCT_IDS: "npt_product_d9510000-0000-4000-8000-000000000010",
};
const configurations = [
  { NONPLAY_TEST_CHECKOUT_ENABLED: undefined },
  { NONPLAY_TEST_CHECKOUT_ENABLED: "false" },
  { NONPLAY_TEST_ENVIRONMENT: "production" },
  { SUPABASE_URL: "https://other.invalid" },
  { NONPLAY_TEST_RAZORPAY_KEY_ID: "rzp_live_fixture" },
  { NONPLAY_TEST_RAZORPAY_KEY_SECRET: "" },
  { NONPLAY_TEST_RAZORPAY_WEBHOOK_SECRET: "" },
];
let sideEffects = 0;
function forbidden(): never {
  sideEffects++;
  throw new Error("OFF request reached Auth/database/provider");
}
let checks = 0;
for (const patch of configurations) {
  const configuration = { ...valid, ...patch };
  const handlers = createNonplayTestHandlers({
    db: new Proxy({}, { get: forbidden }) as SupabaseClient,
    authenticate: async () => forbidden(),
    env: (name) => configuration[name],
    fetcher: async () => forbidden(),
  });
  for (const [route, handler] of Object.entries(handlers)) {
    const response = await handler(new Request("https://local.invalid/" + route, {
      method: "POST",
      body: "{}",
    }));
    if (response.status !== 403 || sideEffects !== 0) {
      throw new Error("Fail-closed test failed: " + route);
    }
    checks++;
  }
}
console.log(`PASS ${checks} actual-handler OFF/missing/invalid checks across five endpoints; Auth/DB/provider calls=${sideEffects}`);
