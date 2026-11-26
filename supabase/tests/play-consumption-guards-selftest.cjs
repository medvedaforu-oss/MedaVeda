// F04: execute every current consumption entrypoint with synthetic DB/Google ports.
const assert = require('node:assert/strict');
const { load } = require('../../mobile-app/scripts/ui-harness.cjs');
const owner = '00000000-0000-0000-0000-000000000001';
const id = '00000000-0000-0000-0000-000000000010';
const token = 'synthetic-guard-token';
const validation = load('supabase/functions/_shared/playPurchaseValidation.ts', {});
async function run(file, opts = {}) {
  let handler, consumed = 0, marked = 0, proofCalls = 0;
  const order = { id, user_id: owner, product_id: 'notes', provider: 'play', status: 'paid',
    play_sku: 'sku', purchase_token: token, play_purchase_option_id: opts.legacy ? null : 'buy', amount: 49,
    external_transaction_token: null, external_choice_bound_order_id: null, play_consumption_status: 'failed' };
  let reads = 0;
  const db = {
    from(table) { return { select() { return this; }, eq() { return this; }, neq() { return this; }, in() { return this; },
      update(changes) { if (changes.play_consumption_status === 'consumed') marked++; return this; },
      async maybeSingle() { if (table === 'orders') return { data: { ...order, ...(reads++ ? opts.identity : {}) }, error: null };
        return { data: table === 'products' ? { title: 'Notes' } : null, error: null }; },
      then(resolve) { resolve({ data: [], error: null }); } }; },
    async rpc(name, args) {
      if (name === 'play_entitlement_committed') { proofCalls++; assert.equal(args.p_order_id, id); assert.equal(args.p_token, token);
        return { data: opts.proof ?? false, error: opts.proofError ? { code: 'fixture' } : null }; }
      if (name === 'play_duplicate_recorded') return { data: opts.duplicateProof === true, error: null };
      if (name === 'settle_play_purchase') return { data: { ok: true, amount: 49, duplicate: !!opts.duplicate }, error: null };
      if (name === 'claim_payment_jobs') assert.equal(args.p_limit, 1, 'legacy consumption claims one bounded concurrency wave');
      if (name.startsWith('claim_')) return { data: [{ order_id: id, target_id: id, lease_id: 'lease' }], error: null };
      if (name.startsWith('finish_')) return { data: args.p_success ? 'done' : 'pending', error: null };
      return { data: null, error: null };
    },
  };
  const google = { GoogleApiError: class extends Error {}, sha256Hex: async x => `hash:${x}`,
    getProductPurchase: async () => ({ purchaseState: 0, consumptionState: opts.alreadyConsumed ? 1 : 0, refundableQuantity: 1,
      regionCode: 'IN', quantity: 1, productId: opts.wrongSku ? 'wrong' : 'sku', purchaseToken: token, purchaseTimeMillis: String(Date.now() - 1000),
      obfuscatedExternalAccountId: opts.wrongOwner ? 'wrong' : `hash:${owner}`, obfuscatedExternalProfileId: `hash:${id}` }),
    getProductPurchaseV2: async () => ({ testPurchaseContext: {}, regionCode: 'IN',
      purchaseStateContext: { purchaseState: 'PURCHASED' }, purchaseCompletionTime: new Date(Date.now() - 1000).toISOString(),
      obfuscatedExternalAccountId: `hash:${owner}`, obfuscatedExternalProfileId: `hash:${id}`,
      productLineItem: [{ productId: 'sku', productOfferDetails: { purchaseOptionId: opts.wrongOption ? 'wrong' : 'buy',
        refundableQuantity: 1, quantity: 1, consumptionState: opts.alreadyConsumed ? 'CONSUMPTION_STATE_CONSUMED' : 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED' } }] }),
    consumeProductPurchase: async () => { consumed++; },
  };
  const mocks = {
    '../_shared/supabaseAdmin.ts': { supabaseAdmin: db, getUserFromAuthHeader: async () => ({ id: owner }) },
    '../_shared/cors.ts': { handleOptions: () => null, jsonResponse: (body, status = 200) => Response.json(body, { status }) },
    '../_shared/googlePlay.ts': google, '../_shared/playPurchaseValidation.ts': validation,
    '../_shared/rateLimit.ts': { withinLimit: async () => true },
    '../_shared/ucbAlert.ts': { alertUcb: async () => {} },
    '../_shared/externalReporting.ts': {}, '../_shared/settle.ts': {}, '../_shared/notesChoiceAuthorization.ts': {}, '../_shared/razorpay.ts': {},
    '../_shared/paymentQueue.ts': { WORK_BATCH_SIZE: 20, WORK_CONCURRENCY: 1, runBounded: async (rows, _n, work) => { for (const row of rows) await work(row); } },
    '../_shared/paymentQueueFix3.ts': { WORK_BATCH_SIZE: 20, WORK_CONCURRENCY: 1, createInvocationBudget: () => ({}), hasJobBudget: () => true,
      runBounded: async (rows, _n, work) => { for (const row of rows) await work(row); return { deferred: 0 }; } },
  };
  const env = { PLAY_STANDALONE_TEST_ENABLED: 'true', PLAY_STANDALONE_TEST_USER_IDS: owner,
    PLAY_PAYMENT_CRON_SECRET: 'x'.repeat(32), UCB_REPORT_CRON_SECRET: 'x'.repeat(32) };
  load(file, mocks, { Deno: { serve: fn => { handler = fn; }, env: { get: key => env[key] } }, console: { error() {} } });
  const response = await handler(new Request('https://fixture.invalid', { method: 'POST',
    headers: { 'x-play-payment-cron-secret': 'x'.repeat(32), 'x-ucb-cron-secret': 'x'.repeat(32) },
    body: JSON.stringify({ phase: 'consume', purchaseToken: token, productId: 'notes', internalOrderId: id }) }));
  return { consumed, marked, proofCalls, status: response.status, body: await response.json() };
}
(async () => {
  for (const file of ['verify-play-purchase/index.ts', 'verify-standalone-play-purchase/index.ts',
    'play-payment-worker/index.ts', 'report-external-transaction/index.ts', 'report-external-transaction/index.fix3.ts']) {
    const path = `supabase/functions/${file}`;
    for (const options of [{}, { alreadyConsumed: true }, { proofError: true }, { proof: 'true' }]) {
      const r = await run(path, options); assert.equal(r.consumed, 0, `${file}: no authoritative proof`);
      assert.equal(r.marked, 0, `${file}: cannot mark consumed without proof`);
      assert.ok(r.proofCalls > 0, `${file}: commitment lookup required`);
    }
    const valid = await run(path, { proof: true });
    assert.equal(valid.consumed, 1, `${file}: committed valid receipt recovers`);
    const wrong = await run(path, { proof: true, wrongOption: true });
    assert.equal(wrong.consumed, 0, `${file}: option mismatch cannot consume`);
    if (!file.startsWith('verify-standalone')) {
      const legacy = await run(path, { proof: true, legacy: true }); assert.equal(legacy.consumed, 1, `${file}: valid legacy receipt`);
      for (const bad of [{ wrongSku: true }, { wrongOwner: true }]) {
        const rejected = await run(path, { proof: true, legacy: true, ...bad }); assert.equal(rejected.consumed, 0, `${file}: legacy identity mismatch`);
      }
      const missing = await run(path, { legacy: true }); assert.equal(missing.consumed, 0);
    }
    for (const identity of [{ user_id: 'foreign' }, { product_id: 'foreign' }, { purchase_token: 'foreign-token' },
      { play_sku: 'foreign' }, { play_purchase_option_id: 'foreign' }]) {
      if (file.startsWith('verify-')) {
        const changed = await run(path, { proof: true, identity }); assert.equal(changed.consumed, 0, `${file}: committed identity mismatch`);
      }
    }
    console.log(`PASS ${file}: missing/inconsistent proof and option mismatch never consume; valid payment recovers`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
