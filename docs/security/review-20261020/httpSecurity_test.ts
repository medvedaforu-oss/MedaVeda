import { secureEndpoint } from "./proposed-httpSecurity.ts";
function assert(value: unknown, label: string) { if (!value) throw new Error(label); }
Deno.test("origin allowlist, native calls and private response headers", async () => {
  let called = 0;
  const fn = secureEndpoint(() => {
    called++;
    return new Response("{}", { headers: { "Access-Control-Allow-Origin": "*" } });
  }, { origins: ["https://www.medveda.in"] });
  const denied = await fn(new Request("https://local.test", { headers: { Origin: "https://evil.invalid" } }));
  assert(denied.status === 403 && called === 0, "foreign origin must fail before handler");
  const permitted = await fn(new Request("https://local.test", { headers: { Origin: "https://www.medveda.in" } }));
  assert(permitted.headers.get("Access-Control-Allow-Origin") === "https://www.medveda.in", "exact origin");
  assert(permitted.headers.get("Cache-Control") === "no-store", "no-store");
  assert(permitted.headers.get("X-Frame-Options") === "DENY", "frame denial");
  const native = await fn(new Request("https://local.test"));
  assert(native.status === 200 && !native.headers.has("Access-Control-Allow-Origin"), "native without CORS");
});
Deno.test("stream limit and JSON object validation", async () => {
  const fn = secureEndpoint(() => new Response("{}"), { maxBodyBytes: 16 });
  for (const body of ["null", "[]", '"x"', "bad json"]) {
    const result = await fn(new Request("https://local.test", {
      method: "POST", headers: { "Content-Type": "application/json" }, body,
    }));
    assert(result.status === 400, `reject ${body}`);
  }
  const result = await fn(new Request("https://local.test", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: '{"payload":"too large"}',
  }));
  assert(result.status === 413, "body must be bounded");
});
Deno.test("webhook body bytes are unchanged", async () => {
  const body = '{ "event": "payment.captured" }\n';
  const fn = secureEndpoint(async (request) => {
    assert(await request.text() === body, "raw signed body changed");
    return new Response("{}");
  }, { jsonObject: false, maxBodyBytes: 256 * 1024 });
  const result = await fn(new Request("https://local.test", {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  }));
  assert(result.status === 200, "webhook must reach signature verifier");
});
