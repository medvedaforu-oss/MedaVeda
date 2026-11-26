// Real catalog service + table against a local-only PostgREST transport.
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const { load, jsx } = require('../../mobile-app/scripts/ui-harness.cjs');
const requests = [];
let responseRevision=7;
const statuses = ['ready','pending','running','failed','stale','catalog_inactive','tier_inactive','not_billable_notes','free','unsupported_price'];
const client = createClient('https://example.invalid', 'local-test-key', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async (url, options) => {
    requests.push({url:String(url),method:options.method});
    return new Response(JSON.stringify(statuses.map((status, i) => ({product_id:`p${i}`,product_revision:responseRevision,billing_status:status,
      last_error: status==='failed' ? '403 PERMISSION_DENIED private_key=TOP_SECRET Bearer TOKEN' :
        status==='unsupported_price' ? 'Google Play India paid prices must be INR 4.00 to INR 84,000.00 with at most two decimal places. private_key=TOP_SECRET Bearer TOKEN' : null,
      last_synced_at:null}))), {status:200,headers:{'content-type':'application/json'}});
  }},
});
(async () => {
  const filters = load('admin-panel/src/utils/filters.ts', {});
  const service = load('admin-panel/src/services/playBillingSyncService.ts', {
    '../config/supabase':{supabase:client},'../utils/filters':filters,
  });
  const billing = await service.getBillingStatuses();
  assert.equal(requests.length,1); assert.equal(requests[0].method,'GET');
  assert.match(requests[0].url,/admin_play_billing_status/);
  assert.match(decodeURIComponent(requests[0].url),/product_revision/);
  assert.equal(billing.p0.productRevision,7);
  const Table=load('admin-panel/src/components/ProductTable.tsx',{'react/jsx-runtime':jsx}).default;
  const products=statuses.map((_,i)=>({id:`p${i}`,revision:7,title:`Product ${i}`,scope:'chapter',productType:'notes',price:49,active:true}));
  const tree=JSON.stringify(Table({products,billing,onEdit(){},onDelete(){}}));
  for(const label of ['Ready','Pending','Syncing','Failed','Stale','Unpublished','Inactive Play option','Not billable Notes','Free','Unsupported Play price']) assert.ok(tree.includes(label),label);
  assert.equal(billing.p9.status,'unsupported_price');
  assert.match(billing.p9.message,/INR 4.00 to INR 84,000.00/);
  assert.match(tree,/permission|access denied/i);
  assert.doesNotMatch(tree,/TOP_SECRET|TOKEN|private_key|Bearer/);
  assert.doesNotMatch(JSON.stringify(billing),/TOP_SECRET|TOKEN|private_key|Bearer/);
  const unknown=JSON.stringify(Table({products,billing:{},onEdit(){},onDelete(){}}));
  assert.match(unknown,/Not checked/);
  for (const revision of [6,8,undefined]) {
    const mismatched=JSON.stringify(Table({products:products.map(p=>({...p,revision})),billing,onEdit(){},onDelete(){}}));
    assert.doesNotMatch(mismatched,/\"Ready\"/,'mismatched revision displayed Ready');
  }
  for (const revision of [undefined,null,0,-1,1.5,'7']) {
    responseRevision=revision;
    await assert.rejects(()=>service.getBillingStatuses(),/revision unavailable/);
  }
  console.log('PASS catalog readiness: read-only transport, ten states, unsupported price, revision matching and sanitized failure summary');
})().catch(error=>{console.error(error);process.exitCode=1;});
