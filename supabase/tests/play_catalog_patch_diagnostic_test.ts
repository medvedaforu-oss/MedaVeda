import { strict as assert } from "node:assert";
import { GoogleApiError, googleRequest } from "../functions/_shared/googlePlay.ts";

function patchError(raw: unknown, secrets: readonly string[] = []) {
  return new GoogleApiError(403, "catalog.patch", "PERMISSION_DENIED", undefined, [], raw, secrets);
}
const badRequest = (fieldViolations: unknown) => ({
  "@type": "type.googleapis.com/google.rpc.BadRequest", fieldViolations,
});

Deno.test("PATCH 403 preserves version-validation messages and safe BadRequest fields", () => {
  // Synthetic validation text, not evidence that Google rejected this version.
  const message = "Unsupported regionsVersion.version '2022/02' for region IN and currency INR.";
  const violations = [
    { field: "regionsVersion.version", description: "Regional version 2022/02 is unsupported." },
    { field: "regions_version.version", description: "Use a compatible regions configuration." },
    { field: "oneTimeProduct.purchaseOptions[0].regionalPricingAndAvailabilityConfigs[0].price.currencyCode",
      description: "Currency INR does not match the regional configuration." },
  ];
  const error = patchError({ error: { code: 403, status: "PERMISSION_DENIED", message, details: [badRequest(violations)] } });
  const diagnostic = error.catalogPatchDiagnostic!;
  assert.deepEqual(diagnostic.message, { state: "preserved", text: message });
  assert.equal(diagnostic.googleStatus, "PERMISSION_DENIED");
  assert.equal(diagnostic.googleCode, 403);
  assert.deepEqual(diagnostic.badRequests, [{ fieldViolationCount: 3, fieldViolationsTruncated: false,
    fieldViolations: violations.map((entry) => ({ field: entry.field, fieldOmitted: false,
      description: { state: "preserved", text: entry.description } })) }]);
  assert.equal(error.retryable, false);
  assert.ok(!error.message.includes("2022/02")); // Queue persistence stays generic.
  assert.ok(!("raw" in error));
});

Deno.test("PATCH permission-denial projection and operation scope stay unchanged", () => {
  const message = "The caller does not have permission";
  const raw = { error: { code: 403, status: "PERMISSION_DENIED", message,
    errors: [{ reason: "insufficientPermissions", message: "Insufficient Permission" }],
    details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "IAM_PERMISSION_DENIED",
      domain: "googleapis.com", message, metadata: { service: "androidpublisher.googleapis.com" } }] } };
  const error = new GoogleApiError(403, "catalog.patch", "insufficientPermissions", undefined, raw.error.details, raw);
  assert.deepEqual(error.catalogPatchDiagnostic?.message, { state: "preserved", text: message });
  assert.deepEqual(error.catalogPatchDiagnostic?.legacyErrors, [{ reason: "insufficientPermissions",
    reasonOmitted: false, message: { state: "preserved", text: "Insufficient Permission" } }]);
  assert.deepEqual(error.catalogPatchDiagnostic?.detailMessages, [{ state: "preserved", text: message }]);
  assert.equal(error.details[0].reason, "IAM_PERMISSION_DENIED");
  assert.equal(error.reason, "insufficientPermissions");
  assert.equal(error.retryable, false);
  for (const operation of ["oauth.token", "purchase.get", "catalog.get", "catalog.activate"] as const) {
    const other = new GoogleApiError(403, operation, "PERMISSION_DENIED", undefined, [], raw);
    assert.equal(other.catalogPatchDiagnostic, undefined);
    assert.ok(!JSON.stringify(other).includes(message));
  }
});

Deno.test("PATCH malformed error containers and violations never expose raw values", () => {
  for (const raw of [null, true, 42, "RAW_RESPONSE_SENTINEL", [], { error: null }, { error: [] },
    { error: { message: { private_key: "SECRET_SENTINEL" }, errors: {}, details: "RAW_RESPONSE_SENTINEL" } }]) {
    const error = patchError(raw);
    assert.deepEqual(error.catalogPatchDiagnostic?.message, { state: "absent" });
    assert.deepEqual(error.catalogPatchDiagnostic?.badRequests, []);
    assert.ok(!JSON.stringify(error).includes("SENTINEL"));
  }
  const error = patchError({ error: { details: [null, true, [],
    badRequest("RAW_RESPONSE_SENTINEL"), badRequest([null, true, "SECRET_SENTINEL",
      { field: {}, description: ["SECRET_SENTINEL"] }]),
    { "@type": "type.googleapis.com/unknown.Type", fieldViolations: [{ field: "regionsVersion.version" }] }] } });
  assert.equal(error.catalogPatchDiagnostic?.badRequests.length, 2);
  assert.deepEqual(error.catalogPatchDiagnostic?.badRequests[0].fieldViolations, []);
  for (const violation of error.catalogPatchDiagnostic!.badRequests[1].fieldViolations) {
    assert.equal(violation.field, undefined);
    assert.deepEqual(violation.description, { state: "absent" });
  }
  assert.ok(!JSON.stringify(error).includes("SENTINEL"));
});

Deno.test("PATCH messages and field descriptions redact credentials before bounding output", () => {
  const known = "short-opaque-value";
  const privateKey = "-----BEGIN PRIVATE KEY-----\nSENSITIVE_PRIVATE_MATERIAL\n-----END PRIVATE KEY-----";
  const fixtures = [
    { text: `Unsupported regionsVersion 2022/02; caller ${known}`, forbidden: [known] },
    { text: 'Unsupported regionsVersion; short-\u200bopaque-value', forbidden: [known] },
    { text: 'Unsupported regionsVersion; Authorization: Bearer tiny-auth-value extra-header-value',
      forbidden: ["Authorization", "tiny-auth-value", "extra-header-value"] },
    { text: 'Unsupported regionsVersion; "Authorization": "Basic basic-auth-value"',
      forbidden: ["Authorization", "basic-auth-value"] },
    { text: 'Unsupported regionsVersion; Authorization: Bearer\nfolded-auth-value',
      forbidden: ["Authorization", "folded-auth-value"] },
    { text: 'Unsupported regionsVersion; Bearer bare-bearer-value', forbidden: ["bare-bearer-value"] },
    { text: 'Unsupported regionsVersion; access_token=opaque-access-value refreshToken="refresh value with spaces"',
      forbidden: ["opaque-access-value", "refresh value with spaces"] },
    { text: 'Unsupported regionsVersion; purchaseToken=short-purchase-value purchase_token: "second-purchase-value"',
      forbidden: ["short-purchase-value", "second-purchase-value"] },
    { text: 'Unsupported regionsVersion; client_secret="secret with spaces" password=short-password api_key=short-key assertion=short-assertion',
      forbidden: ["secret with spaces", "short-password", "short-key", "short-assertion"] },
    { text: `Unsupported regionsVersion; ${privateKey}`, forbidden: ["SENSITIVE_PRIVATE_MATERIAL", "PRIVATE KEY"] },
    { text: 'Unsupported regionsVersion; -----BEGIN PRIVATE KEY-----\nunclosed-private-material',
      forbidden: ["unclosed-private-material", "PRIVATE KEY"] },
    { text: 'Unsupported regionsVersion; ya29.opaque-google-token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature',
      forbidden: ["ya29.", "eyJhbGci", "signature"] },
    { text: 'Unsupported regionsVersion; https://example.invalid/?purchaseToken=url-purchase-value /tokens/path-purchase-value user@example.invalid',
      forbidden: ["example.invalid", "url-purchase-value", "path-purchase-value"] },
    { text: `Unsupported regionsVersion; ${"opaque".repeat(12)}`, forbidden: ["opaque"] },
    { text: `Unsupported regionsVersion; ${"word ".repeat(95)}${known}`, forbidden: [known, "short-opaque"] },
    { text: 'Unsupported regionsVersion; private_key="escaped\\nprivate\\nmaterial"',
      forbidden: ["escaped", "material"] },
  ];
  for (const { text, forbidden } of fixtures) {
    const error = patchError({ error: { message: text, errors: [{ message: text }],
      details: [badRequest([{ field: "regionsVersion.version", description: text,
        metadata: { raw: "RAW_BODY_SENTINEL" } }])] }, body: "RAW_BODY_SENTINEL" }, [known]);
    const diagnostic = error.catalogPatchDiagnostic!;
    assert.equal(diagnostic.message.state, "redacted");
    assert.ok(diagnostic.message.text?.startsWith("Unsupported regionsVersion"));
    assert.ok(diagnostic.message.text!.length <= 512);
    assert.deepEqual(diagnostic.badRequests[0].fieldViolations[0].description, diagnostic.message);
    const serialized = JSON.stringify({ ...error, message: error.message, stack: error.stack });
    for (const secret of [...forbidden, "RAW_BODY_SENTINEL"]) assert.ok(!serialized.includes(secret), "sensitive text escaped redaction");
    assert.equal(diagnostic.legacyErrors[0].message.state, "omitted");
  }
  // Structured secret values must also be masked when echoed without labels.
  const error = patchError({ error: { message: "Unsupported regionsVersion; abc123 def456 ghi789",
    details: [badRequest([{ field: "regionsVersion.version", description: "abc123 def456 ghi789" }])],
    metadata: { access_token: "abc123", nested: { purchaseToken: "def456", secret: "ghi789" } } } });
  for (const secret of ["abc123", "def456", "ghi789"]) assert.ok(!JSON.stringify(error).includes(secret));
  const invisibleSecret = patchError({ error: { message: "Unsupported regionsVersion; abc\u0000def",
    secret: "abc\u0000def" } });
  assert.deepEqual(invisibleSecret.catalogPatchDiagnostic?.message,
    { state: "redacted", text: "Unsupported regionsVersion; [redacted]" });
  for (const field of ["purchaseToken", "regionsVersion[opaque-token].version", "regionsVersion.version.secret-value",
    "Authorization: Bearer tiny", "/tokens/opaque-value", "regionsVersion.version\nsecret"]) {
    const violation = patchError({ error: { details: [badRequest([{ field, description: "Invalid field." }])] } })
      .catalogPatchDiagnostic!.badRequests[0].fieldViolations[0];
    assert.equal(violation.field, undefined);
    assert.equal(violation.fieldOmitted, true);
  }
});

Deno.test("PATCH diagnostic sizes are bounded and incomplete secret scans omit free text", () => {
  const message = "Regional configuration is unsupported. ".repeat(100);
  const raw = { error: { message, errors: Array(20).fill({ message: "Permission denied" }),
    details: Array(10).fill(badRequest(Array(10).fill({ field: "regionsVersion.version", description: message }))) } };
  // This exceeds the secret scan's budget: fail closed for all free text.
  assert.deepEqual(patchError(raw).catalogPatchDiagnostic?.message, { state: "omitted" });
  raw.error.details = [badRequest(Array(10).fill({ field: "regionsVersion.version", description: message })),
    ...Array(9).fill(badRequest([]))];
  const diagnostic = patchError(raw).catalogPatchDiagnostic!;
  assert.deepEqual(diagnostic.message, { state: "preserved", text: message.slice(0, 512), truncated: true });
  assert.equal(diagnostic.legacyErrors.length, 4);
  assert.equal(diagnostic.legacyErrorsTruncated, true);
  assert.equal(diagnostic.detailEntryCount, 10);
  assert.equal(diagnostic.detailsTruncated, true);
  assert.equal(diagnostic.badRequests.length, 8);
  assert.equal(diagnostic.badRequests[0].fieldViolationCount, 10);
  assert.equal(diagnostic.badRequests[0].fieldViolations.length, 4);
  assert.equal(diagnostic.badRequests[0].fieldViolationsTruncated, true);
  assert.equal(diagnostic.badRequests[0].fieldViolations[0].description.text?.length, 512);
  assert.deepEqual(patchError({ error: { message: "x".repeat(16_385) } }).catalogPatchDiagnostic?.message, { state: "omitted" });
  assert.deepEqual(patchError({ error: { message: "Invalid regional version.", secret: "\ud800" } })
    .catalogPatchDiagnostic?.message, { state: "omitted" });
  assert.deepEqual(patchError({ error: { message: "Invalid\nregionsVersion\u0000\u001b." } }).catalogPatchDiagnostic?.message,
    { state: "redacted", text: "Invalid regionsVersion." });
});

Deno.test("real PATCH parser masks request bearer/body secrets and handles malformed HTTP responses offline", async () => {
  const originalFetch = globalThis.fetch;
  const name = "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON";
  const previous = Deno.env.get(name);
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const bytes = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keys.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...bytes))}\n-----END PRIVATE KEY-----`;
  Deno.env.set(name, JSON.stringify({ client_email: "fixture@example.invalid", private_key: pem }));
  const token = "opaque-short-token";
  const purchaseToken = "short-purchase-secret";
  const message = `Unsupported regionsVersion 2022/02; ${token}; ${purchaseToken}`;
  let responseBody = JSON.stringify({ error: { code: 403, status: "PERMISSION_DENIED", message,
    details: [badRequest([{ field: "regionsVersion.version", description: message }])] } });
  let requests = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://oauth2.googleapis.com/token") return Response.json({ access_token: token, expires_in: 3600 });
    assert.equal(init?.method, "PATCH");
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${token}`);
    requests++;
    return new Response(responseBody, { status: 403 });
  };
  const capture = async () => {
    try {
      await googleRequest("PATCH", "/applications/in.medveda.app/onetimeproducts/fixture", { purchaseToken }, "catalog.patch");
      assert.fail("Expected denial");
    } catch (error) {
      assert.ok(error instanceof GoogleApiError);
      assert.equal(error.status, 403);
      assert.equal(error.retryable, false);
      const serialized = JSON.stringify({ ...error, message: error.message, stack: error.stack });
      for (const secret of [token, purchaseToken, pem, "RAW_BODY_SENTINEL"])
        assert.ok(!serialized.includes(secret), "request or response secret leaked");
      return error;
    }
  };
  try {
    const diagnostic = (await capture()).catalogPatchDiagnostic!;
    assert.deepEqual(diagnostic.message, { state: "redacted", text: "Unsupported regionsVersion 2022/02; [redacted]; [redacted]" });
    assert.deepEqual(diagnostic.badRequests[0].fieldViolations[0].description, diagnostic.message);
    for (responseBody of ["", "{broken", "<html>RAW_BODY_SENTINEL</html>"]) {
      const error = await capture();
      assert.equal(error.catalogPatchDiagnostic?.bodyFormat, "unavailable");
      assert.deepEqual(error.catalogPatchDiagnostic?.message, { state: "absent" });
    }
    assert.equal(requests, 4);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) Deno.env.delete(name);
    else Deno.env.set(name, previous);
  }
});
