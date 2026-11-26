const assert = require('node:assert/strict');
const { load } = require('../../mobile-app/scripts/ui-harness.cjs');

const root = 'supabase/functions';
const userId = '00000000-0000-0000-0000-000000000001';
const orderId = '00000000-0000-0000-0000-000000000010';
const token = 'license-test-token-12345';
const productId = 'notes-product';
const initialOrder = { id: orderId, user_id: userId, product_id: productId, provider: 'play',
  play_sku: 'notes_49', play_purchase_option_id: 'buy', amount: 49, status: 'created',
  purchase_token: null, external_transaction_token: null, external_choice_bound_order_id: null };
const validation = load('supabase/functions/_shared/playPurchaseValidation.ts', {});

async function run(options = {}) {
  let handler, reads = 0, mutations = 0, consumed = 0, proofCalls = 0, googleCalls = 0;
  const events = [];
  const committedOrder = { ...initialOrder, status: 'paid', purchase_token: token, ...options.orderOverride };
  const admin = {
    from(table) {
      let update = false;
      return {
        select() { return this; }, eq() { return this; }, neq() { return this; },
        update() { update = true; mutations++; return this; },
        async maybeSingle() {
          if (table === 'products') return { data: { title: 'Notes' }, error: null };
          assert.equal(table, 'orders');
          reads++;
          if (reads === 1) return { data: options.alreadyConsumed ? { ...initialOrder, status: 'paid', purchase_token: token } : { ...initialOrder }, error: null };
          events.push('identity');
          if (options.orderThrows) throw new Error('lookup unavailable');
          return { data: options.orderMissing ? null : committedOrder,
            error: options.orderError ? { code: 'unavailable' } : null };
        },
        then(resolve) { assert.ok(update); resolve({ data: null, error: null }); },
      };
    },
    async rpc(name, args) {
      if (name === 'settle_play_purchase') {
        assert.equal(args.p_user_id, userId); assert.equal(args.p_order_id, orderId);
        assert.equal(args.p_product_id, productId); assert.equal(args.p_purchase_token, token);
        events.push('settle');
        return { data: { ok: true, duplicate: options.duplicate ?? false, amount: 49 }, error: null };
      }
      if (name === 'play_duplicate_recorded') {
        if (options.proofThrows) throw new Error('proof unavailable');
        assert.equal(args.p_order_id, orderId); assert.equal(args.p_token, token);
        return { data: Object.hasOwn(options, 'duplicateProof') ? options.duplicateProof : true,
          error: options.proofError ? { code: 'fixture' } : null };
      }
      assert.equal(name, 'play_entitlement_committed');
      assert.equal(args.p_order_id, orderId); assert.equal(args.p_token, token);
      proofCalls++; events.push('proof');
      if (options.proofThrows) throw new Error('proof unavailable');
      return { data: Object.hasOwn(options, 'proof') ? options.proof : true,
        error: options.proofError ? { code: 'unavailable' } : null };
    },
  };
  const mocks = {
    '../_shared/cors.ts': { handleOptions: () => null,
      jsonResponse: (body, status = 200) => Response.json(body, { status }) },
    '../_shared/supabaseAdmin.ts': { getUserFromAuthHeader: async () => options.noAuth ? null : { id: userId }, supabaseAdmin: admin },
    '../_shared/newOrderGate.ts': { newOrdersEnabled: async () => true },
    '../_shared/rateLimit.ts': { withinLimit: async () => true },
    '../_shared/googlePlay.ts': {
      GoogleApiError: class extends Error {}, sha256Hex: async value => `hash:${value}`,
      getProductPurchaseV2: async () => {
        googleCalls++;
        return { testPurchaseContext: options.noTestMarker ? undefined : {},
          purchaseStateContext: { purchaseState: 'PURCHASED' }, regionCode: 'IN',
          purchaseCompletionTime: new Date(Date.now() - 1000).toISOString(),
          obfuscatedExternalAccountId: `hash:${userId}`, obfuscatedExternalProfileId: `hash:${orderId}`,
          productLineItem: [{ productId: 'notes_49', productOfferDetails: {
            purchaseOptionId: 'buy', quantity: 1, refundableQuantity: 1,
            consumptionState: options.alreadyConsumed ? 'CONSUMPTION_STATE_CONSUMED' : 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED' } }] };
      },
      consumeProductPurchase: async (sku, value) => {
        assert.equal(sku, 'notes_49'); assert.equal(value, token);
        consumed++; events.push('consume');
        if (options.consumeThrows) throw new Error('Google unavailable');
      },
    },
    '../_shared/playPurchaseValidation.ts': validation,
  };
  const env = { PLAY_STANDALONE_TEST_ENABLED: 'true', PLAY_STANDALONE_TEST_USER_IDS: userId, ...options.env };
  load(`${root}/${options.endpoint ?? 'verify-standalone-play-purchase'}/index.ts`, mocks,
    { Deno: { serve: fn => { handler = fn; }, env: { get: key => env[key] } }, Response,
      console: { error() {} } });
  const response = await handler(new Request('https://fixture.invalid', { method: 'POST',
    body: JSON.stringify({ purchaseToken: token, productId, internalOrderId: orderId }) }));
  return { status: response.status, body: await response.json(), consumed, proofCalls, reads, mutations, googleCalls, events };
}

(async () => {
  let count = 0;
  async function check(name, options, expectedStatus, expectedConsumption) {
    const result = await run(options);
    assert.equal(result.status, expectedStatus, name);
    assert.equal(result.consumed, expectedConsumption, `${name}: consumption`);
    if (expectedConsumption) {
      assert.equal(result.proofCalls, 1, `${name}: authoritative proof required`);
      assert.ok(result.events.indexOf('proof') < result.events.indexOf('consume'));
      assert.ok(result.events.indexOf('identity') >= 0 && result.events.indexOf('identity') < result.events.indexOf('consume'));
    } else if (expectedStatus === 503) {
      assert.equal(result.mutations, 0, `${name}: preserve pending consumption state`);
      assert.ok(result.body.pending === true || /retry/i.test(result.body.error));
    }
    if (options.noAuth || options.env) {
      assert.equal(result.reads, 0, `${name}: no order access`);
      assert.equal(result.proofCalls, 0, `${name}: no entitlement lookup`);
      assert.equal(result.googleCalls, 0, `${name}: no provider access`);
      assert.equal(result.mutations, 0, `${name}: no writes`);
    }
    if (options.alreadyConsumed && !options.duplicate && expectedStatus === 200) {
      assert.equal(result.proofCalls, 1);
      assert.ok(result.events.includes('identity'));
      assert.equal(result.mutations, 1, `${name}: only mark consumed after proof`);
    }
    count++; console.log(`PASS ${name}`);
  }
  await check('duplicate settlement without committed entitlement', { duplicate: true, duplicateProof: false }, 503, 0);
  await check('normal settlement with committed entitlement', {}, 200, 1);
  await check('verified duplicate disposition is terminal without consumption or entitlement', { duplicate: true }, 200, 0);
  for (const duplicate of [false, true]) {
    for (const proof of [false, null, 'true', 1, { committed: true }]) {
      await check(`${duplicate ? 'duplicate' : 'normal'} settlement rejects inconclusive proof ${JSON.stringify(proof)}`,
        { duplicate, ...(duplicate ? { duplicateProof: proof } : { proof }) }, 503, 0);
    }
    await check(`proof RPC error duplicate=${duplicate}`, { duplicate, proofError: true }, 503, 0);
    await check(`proof RPC exception duplicate=${duplicate}`, { duplicate, proofThrows: true }, 503, 0);
  }
  for (const [key, value] of Object.entries({ id: 'foreign-order', user_id: 'foreign-user',
    product_id: 'foreign-product', purchase_token: 'foreign-token', status: 'created', provider: 'razorpay',
    play_sku: 'foreign-sku', play_purchase_option_id: 'foreign-option', amount: 99,
    external_transaction_token: 'foreign-external-token', external_choice_bound_order_id: 'foreign-external-order' })) {
    await check(`mismatched committed order ${key}`, { duplicate: true, orderOverride: { [key]: value } }, 503, 0);
  }
  for (const option of ['orderMissing', 'orderError', 'orderThrows']) {
    await check(`identity lookup ${option}`, { duplicate: true, [option]: true }, 503, 0);
  }
  await check('consumption outage remains recoverable', { consumeThrows: true }, 200, 1);
  await check('already consumed purchase requires proof before recording success', { alreadyConsumed: true }, 200, 0);
  await check('already consumed purchase without proof preserves pending state', { alreadyConsumed: true, proof: false }, 503, 0);
  await check('already consumed duplicate without proof preserves pending state', { alreadyConsumed: true, duplicate: true, duplicateProof: false }, 503, 0);
  await check('Google license test marker required', { noTestMarker: true }, 403, 0);
  for (const endpoint of ['create-standalone-play-order', 'verify-standalone-play-purchase']) {
    await check(`${endpoint} requires authentication`, { endpoint, noAuth: true }, 401, 0);
    for (const flag of [undefined, 'false', 'TRUE', '1']) {
      await check(`${endpoint} disabled for flag=${flag}`, { endpoint, env: { PLAY_STANDALONE_TEST_ENABLED: flag } }, 403, 0);
    }
    await check(`${endpoint} requires allowlisted authenticated UUID`,
      { endpoint, env: { PLAY_STANDALONE_TEST_USER_IDS: '00000000-0000-0000-0000-000000000002' } }, 403, 0);
  }
  console.log(`PASS ${count} focused standalone billing regression cases`);
})().catch(error => { console.error(error); process.exitCode = 1; });
