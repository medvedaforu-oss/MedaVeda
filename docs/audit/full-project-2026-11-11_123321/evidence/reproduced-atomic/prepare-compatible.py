"""Build a separate local-review upgrade; never deploys or edits reviewed releases."""
from pathlib import Path
import json,shutil,hashlib,re,tarfile,io
R=Path(__file__).resolve().parents[4]; B=R/'supabase/releases/phase-b-20261111'; C=R/'supabase/releases/phase-c-20261111'; O=R/'supabase/releases/b-to-c-compatible-20261111'
O.mkdir(exist_ok=True);cm=json.loads((C/'manifest.json').read_text());bm=json.loads((B/'manifest.json').read_text())
names=['verify-payment','razorpay-webhook','report-external-transaction'];sources=set()
for n in names:sources.update(cm['functions'][n]['sources'])
for p in sources:
 dest=O/p;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(C/p,dest)
for p in bm['candidates']['B3']['sources']:
 dest=O/p
 if not dest.exists():dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(B/p,dest)
for name in ['deno.json','deno.lock']:shutil.copyfile(C/name,O/name)
(O/'config.toml').write_text((B/'config.toml').read_text()+'\n[functions.report-external-transaction]\nverify_jwt = false\n')
p=O/'functions/_shared/settle.ts';s=p.read_text()
s=s.replace('  const { data: order, error: orderError } = await supabaseAdmin.from("orders")\n    .select("id,amount,tax_pre_amount,external_transaction_token")', '  const outcomeStatus = String((data as { status?: string } | null)?.status ?? "unknown");\n  if (["unknown", "unknown_payment"].includes(outcomeStatus))\n    return { ok: false, status: 503, reason: "reversal settlement pending" };\n  const { data: order, error: orderError } = await supabaseAdmin.from("orders")\n    .select("id,amount,tax_pre_amount,external_transaction_token")',1)
s=s.replace('  if (outcome === "lost") {','  const outcomeStatus = String((data as { status?: string } | null)?.status ?? "unknown");\n  if (["unknown", "unknown_payment"].includes(outcomeStatus))\n    return { ok: false, status: 503, reason: "dispute settlement pending" };\n  if (outcome === "lost") {',1)
p.write_text(s)
p=O/'functions/razorpay-webhook/index.ts';s=p.read_text();start=s.index('    // Permanent rejections (unknown order, mismatch)');end=s.index('      return response(204);',start)
s=s[:start]+'''    // Preserve Phase B retry behavior: acknowledge only durable dispositions.
    if (result.status === 409 && ["payment captured; refund queued", "payment already refunded", "payment reversed"].includes(result.reason))
'''+s[end:];p.write_text(s)
h=lambda b:hashlib.sha256(b).hexdigest()
manifest={'status':'LOCAL REVIEW ONLY. Requires final A+C schema. No deployment or activation authorized.','project':'xbvenkfmesugrbjuufyw','derivation':'Reviewed Phase C B1/B2/reporting-worker closure plus Phase B B3; preserves Phase B unknown-reversal and unresolved-capture retry rules.','functions':{}}
for n in names+['create-order']:
 paths=cm['functions'][n]['sources'].keys() if n in names else bm['candidates']['B3']['sources'].keys()
 hashes={p:h((O/p).read_bytes()) for p in sorted(paths)}
 archive='artifacts/'+n+'-source.tar';(O/'artifacts').mkdir(exist_ok=True)
 with tarfile.open(O/archive,'w') as tar:
  for p in list(hashes)+['config.toml','deno.json','deno.lock']:
   arc='supabase/'+p if p!='config.toml' else 'supabase/config.toml'
   data=((f'[functions.{n}]\nverify_jwt = '+('true' if n=='create-order' else 'false')+'\n').encode() if p=='config.toml' else (O/p).read_bytes());i=tarfile.TarInfo(arc);i.size=len(data);i.mode=0o644;tar.addfile(i,io.BytesIO(data))
 manifest['functions'][n]={'verify_jwt':n=='create-order','sources':hashes,'closure_sha256':h(''.join(f'{v}  {k}\n' for k,v in hashes.items()).encode()),'archive':archive,'archive_sha256':h((O/archive).read_bytes())}
(O/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(O/'README.md').write_text('''# B-to-C compatible upgrade candidate

Local review only. Do not deploy or activate payments. Requires baseline+A and atomic C1–C4 with strong final MV003. B1/B2 and the reporting worker derive from reviewed Phase C sources, restoring Phase B unknown refund/dispute rejection and unresolved capture retry behavior. B3 entrypoint remains the exact reviewed Phase B website handler; its shared provider helper is the additive Phase C version.

All import closures, source hashes, JWT settings and source archives are pinned in manifest.json. This does not change either reviewed release. These handlers are incompatible with baseline+A alone because they use C authorization, inbox and reporting contracts. Keep financial ingress drained across C commit and delivery of this separately approved upgrade. New choice routes remain gated off; reporting/worker delivery and schedules need separate approval.
''')
(O/'checksums.sha256').write_text(''.join(f'{h(p.read_bytes())}  {p.relative_to(R)}\n' for p in sorted(O.rglob('*')) if p.is_file() and p.name!='checksums.sha256'))
print('Prepared four isolated source archives; no deployment')
