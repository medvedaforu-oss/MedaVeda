"""Offline narrow compatibility extraction. Never overwrites broad implementations."""
from pathlib import Path
import re,difflib
r=Path('.');base=r/'supabase/releases/phase-b-20261111';f=base/'functions';e=r/'docs/audit/evidence/phase-b-20261111'
def put(name,text):
 p=f/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
for name in ['cors.ts','supabaseAdmin.ts','rateLimit.ts','ucbAlert.ts']:
 put('_shared/'+name,(r/'supabase/functions/_shared'/name).read_text())
s=(r/'supabase/functions/_shared/razorpay.ts').read_text()
# Exclude unused financial write/reconciliation exports from this closure.
a=s.index('// The stable request marker');b=s.index('export type RazorpayDispute',a);s=s[:a]+s[b:]
a=s.index('// Receipt search');b=s.index('function hexToBytes',a);s=s[:a]+s[b:]
put('_shared/razorpay.ts',s)
s=(r/'supabase/functions/_shared/settle.ts').read_text()
s=s.replace('import { reportExternalOrder, reportExternalRefundEvent } from "./externalReporting.ts";\n','')
# Remove choice authorization only; retain exact MV003 proof, pre/post checks,
# historical skip, compensation, provider validation and baseline SQL settlement.
a=s.index('    if (order?.external_transaction_token &&');b=s.index('    // 4. Atomic',a);s=s[:a]+s[b:]
a=s.index('      if (order.external_transaction_token) {');b=s.index('      return { ok: false',a);s=s[:a]+s[b:]
a=s.index('  if (order.external_transaction_token) {');b=s.index('  return { ok: true, orderId:',a);s=s[:a]+s[b:]
# Production has no blocks_entitlement. A1 checks pending reversal facts and
# durable purchase state instead. Preserve authenticated inbox and SQL outcomes.
a=s.index('  const { error: factError }');b=s.index('  const { data, error }',a);s=s[:a]+s[b:]
a=s.index('  const { data: order, error: orderError }');b=s.index('  const outcome = String',a);s=s[:a]+s[b:]
a=s.index('  if (outcome) {',s.index('export async function settleDispute'));b=s.index('  if (!outcome)',a);s=s[:a]+s[b:]
a=s.index('  if (outcome === "lost") {');b=s.index('  const applied = String',a);s=s[:a]+s[b:]
# Unknown payment is unresolved; do not acknowledge and lose out-of-order reversal.
s=s.replace('  if (params.eventId && outcome !== "unknown_payment") {','  if (["unknown", "unknown_payment"].includes(outcome))\n    return { ok: false, status: 503, reason: "refund settlement pending" };\n  if (params.eventId) {')
s=s.replace('  if (params.eventId && applied !== "unknown_payment") {','  if (["unknown", "unknown_payment"].includes(applied))\n    return { ok: false, status: 503, reason: "dispute settlement pending" };\n  if (params.eventId) {')
put('_shared/settle.ts',s)
s=(r/'supabase/functions/verify-payment/index.ts').read_text().replace(', external_transaction_token','');put('verify-payment/index.ts',s)
s=(r/'supabase/functions/razorpay-webhook/index.ts').read_text()
s=s.replace('import { reportNotesChoiceAuthorization } from "../_shared/notesChoiceAuthorization.ts";\n','')
a=s.index('  if (event.event === "payment.authorized") {');b=s.index('  // Acknowledge unrelated',a);s=s[:a]+s[b:]
# A 400/404 settlement refusal is not a durably handled capture.
s=s.replace('if (result.status === 404 || result.status === 400\n        || (result.status === 409 && ["payment captured; refund queued", "payment already refunded", "payment reversed"].includes(result.reason)))','if (result.status === 409 && ["payment captured; refund queued", "payment already refunded", "payment reversed"].includes(result.reason))')
s=s.replace('// Permanent rejections (unknown order, mismatch) are acknowledged so Razorpay\n    // stops retrying; they are logged for manual review. Transient failures\n    // (5xx-class, not-yet-captured) return non-2xx so Razorpay retries.','// Only durable compensation/reversal outcomes are acknowledged. Unresolved\n    // capture mismatches and transient settlement failures require retry/review.')
put('razorpay-webhook/index.ts',s)
s=Path('/tmp/medveda-phase-b-deployed/create-order/functions/create-order/index.ts').read_text()
s=s.replace('.update({ status: "failed" }).eq("id", orderId);','.update({ status: "failed" }).eq("id", orderId).eq("status", "created");')
s=s.replace('// Release any wallet hold / discount reserved for this attempt.','// A late failure may release only an unpaid created attempt.')
s=s.replace('    const body = (await req.json().catch(() => ({}))) as { productId?: unknown; useWallet?: unknown };','''    // Retain the Android routing boundary without importing future choice routes.
    if (req.headers.has("x-medveda-app-version"))
      return jsonResponse({ error: "Android purchases use Google Play Billing. Please update the app.",
        code: "play_billing_required" }, 403);
    const input: unknown = await req.json().catch(() => null);
    if (!input || typeof input !== "object" || Array.isArray(input))
      return jsonResponse({ error: "Invalid checkout request." }, 400);
    const body = input as { productId?: unknown; useWallet?: unknown; ucbOrderId?: unknown };
    if (body.ucbOrderId)
      return jsonResponse({ error: "Play billing choice checkout is disabled." }, 403);''')
put('create-order/index.ts',s)
(base/'config.toml').write_text('''# Isolated candidate settings only; never use the broad workspace config.
[functions.create-order]
verify_jwt = true
[functions.verify-payment]
verify_jwt = false
[functions.razorpay-webhook]
verify_jwt = false
''')
for name in ['_shared/settle.ts','verify-payment/index.ts','razorpay-webhook/index.ts','create-order/index.ts']:
 original=(r/'supabase/functions'/name).read_text() if name!='create-order/index.ts' else Path('/tmp/medveda-phase-b-deployed/create-order/functions/create-order/index.ts').read_text()
 (e/(name.replace('/','_')+'.diff')).write_text(''.join(difflib.unified_diff(original.splitlines(True),(f/name).read_text().splitlines(True),fromfile='reviewed/'+name,tofile='candidate/'+name)))
print('PASS isolated candidate extraction; no broad source overwritten')
