// Actual isolated provider validation and HMAC; synthetic HTTP only, no network.
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { load } = require('./ui-harness.cjs');
const environment = 'production-isolated-razorpay-test-v1';
const providerModule = load('supabase/functions/_shared/nonplayTestProvider.ts', {
  './nonplayTestConfig.ts': { NONPLAY_TEST_ENVIRONMENT: environment },
}, { crypto: webcrypto, Uint8Array, btoa });

(async () => {
  const config = { keyId: 'rzp_test_fixture', keySecret: 'synthetic-test-secret' };
  const order = {
    id: '11111111-1111-4111-8111-111111111111', user_id: 'synthetic-owner',
    product_id: 'npt_product_22222222-2222-4222-8222-222222222222',
    amount_paise: 4900, key_id: config.keyId, razorpay_order_id: 'order_fixture',
  };
  const remote = {
    id: order.razorpay_order_id, amount: 4900, currency: 'INR', status: 'paid',
    receipt: `npt_${order.id}`, notes: {
      environment, user_id: order.user_id, product_id: order.product_id, order_id: order.id,
    },
  };
  let payment = {
    id: 'pay_fixture', order_id: remote.id, amount: 4900, currency: 'INR',
    status: 'captured', captured: true, created_at: 1800000000,
  };
  const provider = providerModule.testProvider(config, async (url) => {
    assert.equal(url, 'https://api.razorpay.com/v1/payments/pay_fixture');
    return Response.json(payment);
  });
  assert.equal(provider.validateOrder(remote, order).id, remote.id);
  for (const patch of [
    { amount: 100 }, { currency: 'USD' }, { id: 'order_other' }, { receipt: 'npt_other' },
    ...Object.entries({ environment: 'live', user_id: 'other-owner', product_id: 'other-product', order_id: 'other-order' })
      .map(([key, value]) => ({ notes: { ...remote.notes, [key]: value } })),
  ]) {
    assert.throws(() => provider.validateOrder({ ...remote, ...patch }, order), /snapshot/);
  }
  assert.throws(() => provider.validateOrder(remote, { ...order, key_id: 'rzp_live_fixture' }), /snapshot/);
  console.log('PASS isolated provider order rejects wrong amount/currency/product/account/order/environment/key binding');

  const validPayment = { ...payment };
  assert.equal((await provider.payment('pay_fixture', order)).captured, true);
  for (const patch of [
    { amount: 100 }, { currency: 'USD' }, { order_id: 'order_other' },
    { id: 'pay_other' }, { captured: false }, { created_at: 0 },
  ]) {
    payment = { ...validPayment, ...patch };
    await assert.rejects(provider.payment('pay_fixture', order), /snapshot/);
  }
  console.log('PASS isolated provider rejects mismatched payment facts and false capture');

  const input = `${remote.id}|pay_fixture`;
  const signature = await providerModule.testHmac(config.keySecret, input);
  assert.equal(await providerModule.testSignature(config.keySecret, input, signature), true);
  for (const forged of ['0'.repeat(64), 'invalid', 'a'.repeat(63)]) {
    assert.equal(await providerModule.testSignature(config.keySecret, input, forged), false);
  }
  assert.equal(await providerModule.testSignature(config.keySecret, 'order_other|pay_fixture', signature), false);
  console.log('PASS isolated signature verification rejects forged, malformed and replayed-to-another-order signatures');
})().catch(error => { console.error(error); process.exitCode = 1; });
