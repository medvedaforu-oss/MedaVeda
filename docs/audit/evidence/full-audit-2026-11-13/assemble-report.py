"""Assemble the read-only audit from reviewed evidence, preserving finding details."""
import collections,json,pathlib,re
OUT=pathlib.Path(__file__).resolve().parent;ROOT=OUT.parents[3]
def read(name):return (OUT/name).read_text()
mobile=read('mobile-review.md');backend=read('backend-review.md');admin=read('admin-web-review.md');own=read('root-review.md')
def section(text,title):
    m=re.search(r'^## '+re.escape(title)+r'\s*$',text,re.M)
    if not m:return ''
    rest=text[m.end():];end=re.search(r'^## ',rest,re.M)
    return rest[:end.start()].strip() if end else rest.strip()
def findings(text,prefixes):
    headings=list(re.finditer(r'^#{2,3} ((?:MOB|BACK|ADM|WEB|CFG|QA)-\d+) — (Critical|High|Medium|Low|Info)([^\n]*)$',text,re.M))
    result=[]
    for h in headings:
        ident,sev,tail=h.group(1,2,3)
        if ident.split('-')[0] not in prefixes or ('acceptance gate' in tail):continue
        start=h.start();nexthead=re.search(r'^#{1,3} ',text[h.end():],re.M)
        end=h.end()+nexthead.start() if nexthead else len(text)
        title=tail.split(' — ',1)[-1].strip(' —')
        result.append(dict(id=ident,severity=sev,title=title,details=text[start:end].strip()))
    return result
rows=findings(mobile,{'MOB'})+findings(backend,{'BACK'})+findings(admin,{'ADM','WEB'})+findings(own,{'CFG','QA'})
unique={r['id']:r for r in rows};rows=list(unique.values())
locations={
'MOB-01':'mobile-app/src/navigation/AppNavigator.tsx:147','MOB-02':'mobile-app/src/utils/downloadManager.ts:220','MOB-03':'mobile-app/src/config/paymentProvider.ts:32','MOB-04':'mobile-app/src/screens/payment/OrderSummaryScreen.tsx:206','MOB-05':'mobile-app/App.tsx:61','MOB-06':'mobile-app/src/screens/auth/ResetPasswordScreen.tsx:41','MOB-07':'mobile-app/app.config.js:53','MOB-08':'mobile-app/src/services/studyReminderService.ts:66','MOB-09':'mobile-app/src/services/quizAttempts.ts:31','MOB-10':'mobile-app/src/services/pushNotifications.ts:128','MOB-11':'mobile-app/src/utils/downloadManager.ts:328','MOB-12':'mobile-app/src/config/secureSessionStorage.ts:93','MOB-13':'mobile-app/src/services/authState.ts:45','MOB-14':'mobile-app/src/services/syncEngine.ts:81','MOB-15':'mobile-app/src/services/searchService.ts:250','MOB-16':'mobile-app/src/components/ProgressRing.tsx:55','MOB-17':'mobile-app/src/hooks/useQuizStats.ts:38','MOB-18':'mobile-app/src/screens/payment/OrderSummaryScreen.tsx:76','MOB-19':'mobile-app/src/hooks/useNetworkStatus.ts:9','MOB-20':'mobile-app/src/screens/auth/ResetPasswordScreen.tsx:122',
'ADM-01':'admin-panel/src/components/ProductFormModal.tsx:465','ADM-02':'admin-panel/src/components/CourseFormModal.tsx:95','ADM-03':'admin-panel/src/pages/Notifications.tsx:11','ADM-04':'admin-panel/src/services/playBillingSyncService.ts:15','ADM-05':'admin-panel/src/hooks/useNotes.ts:87','ADM-06':'admin-panel/src/pages/Referrals.tsx:376','ADM-07':'admin-panel/src/hooks/useReferrals.ts:28','ADM-08':'admin-panel/src/utils/filters.ts:21','ADM-09':'admin-panel/src/services/referralService.ts:28',
'WEB-01':'reset-password.html:122','WEB-02':'reset-password.html:143','WEB-03':'website/_src/pages/index.html:52','WEB-04':'privacy.html:49',
'BACK-01':'supabase/migrations/20261109100000_billing_settlement_recovery.sql:120','BACK-02':'backend-deployed-razorpay-webhook.json:1 → functions/_shared/settle.ts:102','BACK-03':'supabase/play_payment_cron_setup.sql:22','BACK-04':'supabase/functions/create-order-play-choice/index.ts:1','BACK-05':'backend-deployed-send-push-notification.json:1 → functions/send-push-notification/index.ts:87','BACK-06':'supabase/migrations/20261001100000_admin_mfa_aal2.sql:29','BACK-07':'supabase/functions/create-play-order/index.ts:12 (source fix; live bundle differs)','BACK-08':'supabase/migrations/20261020103000_first_purchase_identity_retention.sql:15','BACK-09':'supabase/functions/_shared/paymentQueue.ts:1','BACK-10':'supabase/migrations/20261020104000_course_wide_content_browsing.sql:35','BACK-11':'supabase/migrations/20260925110000_phase2_wallet_ledger.sql:190','BACK-12':'supabase/migrations/20260925120000_phase2_orders_pricing_and_settlement.sql:285','BACK-13':'supabase/migrations/20260927130000_batch3b_antifarming.sql:698','BACK-14':'supabase/checks/ucb_postdeploy_checks.sql:49','BACK-15':'supabase/migrations/20260930100000_medium_db_hardening.sql:138','BACK-16':'backend-deployed-verify-payment.json:1 → functions/verify-payment/index.ts:58','BACK-17':'supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1985',
'CFG-01':'mobile-app/package.json:26','CFG-02':'mobile-app/package.json:48; tooling/package.json:9','QA-01':'supabase/tests/mv003-entitlement-selftest.cjs:108'}
for r in rows:
    r['file_line']=locations.get(r['id'],'See detailed evidence')
    r['area']=dict(MOB='Mobile',BACK='Backend/payments',ADM='Admin',WEB='Website',CFG='Build/dependencies',QA='Verification')[r['id'].split('-')[0]]
    r['status']='Previously fixed - REGRESSED' if r['id'] in {'MOB-01','MOB-04','MOB-18'} else 'Confirmed'
order={'Critical':0,'High':1,'Medium':2,'Low':3,'Info':4};rows.sort(key=lambda r:(order[r['severity']],r['id']))
counts=collections.Counter(r['severity'] for r in rows)
countline='; '.join(f'{s}: {counts[s]}' for s in order)
table=['| ID | Severity | Area | File:Line | Title | Status |','|---|---|---|---|---|---|']
for r in rows:table.append('| '+ ' | '.join([r['id'],r['severity'],r['area'],'`'+r['file_line']+'`',r['title'],r['status']])+' |')
(OUT/'findings.json').write_text(json.dumps(rows,indent=2)+'\n')

prior=[
('V1','Previously fixed - verified','YouTube normalization/direct open/fallback retained; exact failed live row/device remains unverified.'),
('V2','Previously fixed - verified','Videos error/retry, subject lifetime and memoized filters retained.'),
('A1','Previously fixed - verified','Deep-link initial storage ordering retained; separate route lifetime regression MOB-01.'),
('A2','Previously fixed - verified','Forgot-reset request rejection handled with neutral response.'),
('O1','Previously fixed - verified','Sync guard acquired before connectivity await.'),
('O2','Previously fixed - verified','Outer drain rejection caught; background calls do not escape.'),
('P1','Previously fixed - verified','One preference read per fetched notification batch.'),
('A3','Previously fixed - verified','Supabase signOut returned error checked; separate push rollback defect MOB-10.'),
('N1','Previously fixed - verified','Successful/signaled logout resets registration marker.'),
('C1','Superseded product decision','MCQs and videos remain free; paid-MCQ proposal withdrawn.'),
('C2','Confirmed scope','Free catalog remains auth/course/publication scoped by design; not a PDF entitlement bypass.'),
('A4','Confirmed','Build-specific schemes still mismatch recovery routing: MOB-07.'),
('A5','Confirmed','Second link cannot replace mounted recovery state: MOB-06.'),
('A6','Confirmed','Reset keyboard-safe scrolling/support rejection gap remains: MOB-20.'),
('A7','Previously fixed - verified','Splash catches destination failure and has Retry; old fixed delay removed.'),
('S1','Previously fixed - verified','Search cache owner+course scope and stale completion rejection present.'),
('S2','Previously fixed - verified','Search sources use keyset pages and explicit maximum; quiz stats distinct MOB-17.'),
('N2','Previously fixed - verified','Cold/live push response hook is called; allowlist/dedup/auth routing present.'),
('O3','Confirmed, latent','Non-quiz outbox owner/retry semantics retained: MOB-14; no current non-quiz enqueue caller found.'),
('O4','Confirmed, latent','Non-atomic progress read/upsert retained: MOB-14.'),
('U1','Confirmed','Unknown reachability coerced false: MOB-19.'),
('P2','Previously fixed - verified','Request coalescing added for repeated Home years/notification reads; no device speed claim.'),
('P3','Confirmed low polish','Original large logo assets retained; no measured performance impact established.'),
('T1','Confirmed low polish','any/stale Firestore comments remain; no active Firestore data client found.'),
('F01','Previously fixed - verified','Play product reads bounded by 15-second deadline.'),
('F02','Previously fixed - verified','Session/order/receipt reads bounded; restoration availability regressed separately MOB-03.'),
('F03','Previously fixed - REGRESSED','Removed PlayBillingScreen watchdog not preserved in OrderSummary: MOB-04.'),
('F04','Previously fixed - verified','Malformed content route guard retained before mounting content.'),
('F05','Previously fixed - verified','Six content lists retain pull-to-refresh.'),
('F06','Previously fixed - verified','Admin scoped newest-request/lifetime guard retained.'),
('F07','Previously fixed - verified','Admin identity/AAL generation prevents stale authorization restoration.'),
('F08','Previously fixed - verified','PDF generation/owner/foreground invalidation retained; encryption remains separate B03.'),
('F09','Previously fixed - verified','Download action rejection boundary retained.'),
('F10','Previously fixed - verified','Login synchronous guard and secure read inside catch boundary retained.'),
('F11','Previously fixed - verified','Listed admin content/account retry actions retained; truthful Retry gaps ADM-05/06.'),
('F12','Previously fixed - verified','Quiz runtime shape checks retained; verified score authority retained.'),
('F13','Previously fixed - verified','Auth bootstrap yields to events/current-owner enforcement retained; offline claim race MOB-13.'),
('F14','Previously fixed - verified','Notes focus/account/tap guards and blur/refocus generation retained.'),
('F15','Source verified; deployed absent','Both local Play handlers reject null/primitive bodies; live bundles remain old: BACK-07.'),
('F16','Previously fixed - verified','Note sibling actions/labels/roles retained; real TalkBack/font acceptance pending.'),
('F17','Previously fixed - REGRESSED','Focused/coalesced status polling retained, already-owned action lost: MOB-18.'),
('F18','Previously fixed - verified','Profile auth-update errors, nonblank name, submit/owner guard retained.'),
('B01','Unverified provider root cause','No live Play API call; catalog/helper comparison recorded; exact 403 check in section 7.'),
('B02','Confirmed open gate','Play jobs inactive/UCB worker missing: BACK-03.'),
('B03','Confirmed, partial improvement','License timestamps moved to SecureStore; PDF bytes remain plaintext/dormant vault: MOB-02.'),
('B04','Confirmed open gate','180-day function exists; named retention schedule absent: BACK-08.'),
('B05','Source/live boundaries inspected','RLS/ACL/migration drift verified directly; refund/publication deployment gaps remain BACK-01/04.'),
('B06','Confirmed open gate','Mandatory MFA disabled, live sender lacks corresponding guard: BACK-06.'),
('B07','Unverified','Full DB/Auth/Storage restore drill not performed.'),
('B08','Unverified','Final signed AAB/Store/device acceptance not performed; R8 now enabled in source.'),
('B09','Partially verified','Canonical website/status/headers verified; SMTP/delivery/allowlist/deletion end-to-end unverified.'),
('B10','Unverified','Sentry operational symbolication/alerts and actual EAS injection not verified.'),
('B11','Previously fixed - verified','Notification routing source/current local regressions present.'),
('B12','Previously fixed - verified','Content list error/retry source/current local regressions present.'),
('B13','Previously fixed - verified','Pinned Deno dependencies/frozen lock and current 26-entry checks pass.'),
('B14','Confirmed investigation gate','Diagnostics retained with Auth/admin/AAL2; retire only after authorized investigation closure.'),
('B15','Confirmed boundary limitation','Client/header distribution hints are not platform attestation; current server/deployment gates reviewed.'),
('D01','Previously fixed - verified','Diagnostic retirement comments and independent admin/AAL2 controls retained.'),
('P01','Superseded distribution invariant','Original blanket Android-never-Razorpay assertion superseded by explicit isolated/live/UCB lanes; standard Play sales disabled.'),
('L01','Confirmed low polish','StaggerItem lacks explicit animation stop on cleanup; Skeleton does clean its loop.'),
]
prior_table=['| Historical ID | Status | Current verification |','|---|---|---|']+['| '+' | '.join(row)+' |' for row in prior]

check_names=[('mobile-tsc','Mobile tsc --noEmit'),('admin-tsc','Admin application tsc --noEmit'),('admin-node-tsc','Admin tooling tsc --noEmit'),('eslint','ESLint'),('expo-doctor','Expo Doctor'),('expo-dependencies','Expo dependency compatibility'),('expo-public-config','Expo public config evaluation'),('expo-prebuild-config','Expo prebuild config evaluation'),('eas-config','EAS production Android config validation'),('mobile-npm-audit','npm audit: mobile'),('admin-npm-audit','npm audit: admin'),('tooling-npm-audit','npm audit: lint tooling'),('password-tests','Password-recovery npm script'),('admin-tests','Admin npm test'),('secret-scan','Tracked secret scanner'),('website-links','Website link validation'),('deno-check','26 Edge/worker typecheck entries'),('deno-unit','Expanded Deno unit tests'),('database-local-final','Full SQL/webhook/concurrency suite'),('db-run-mv003-local.py','Supplemental historical MV003 wrapper'),('db-run-phase-b-local.py','Supplemental historical Phase B wrapper'),('db-run-phase-c-local.py','Supplemental historical Phase C wrapper'),('db-run-remaining-audit-local.py','Publication migration repeatability/authority'),('vault-final-run-host-tests.py','Native vault foundation host tests'),('vault-final-phase1b-run-tests.py','Native vault Phase1B host tests'),('vault-final-acquisition-run-tests.py','Native vault acquisition host tests'),('vault-final-content-run-tests.py','Native vault content host tests')]
checks=['| Check | Exit | Result | Raw output |','|---|---|---|---|']
notes={'expo-doctor':'20/21; SDK patch mismatch','expo-dependencies':'4 SDK patch mismatches','mobile-npm-audit':'4 moderate; 0 high/critical','admin-npm-audit':'0 vulnerabilities','tooling-npm-audit':'9 moderate; 0 high/critical','deno-unit':'46 passed, 0 failed','database-local-final':'ALL SUITES PASSED'}
for name,label in check_names:
    d=json.loads(read(name+'.result.json'));note=notes.get(name,'PASS' if d['exit']==0 else 'FAIL — see QA-01 / raw output')
    checks.append(f'| {label} | {d["exit"]} | {note} | [{name}.log](evidence/full-audit-2026-11-13/{name}.log) |')

mob_details=section(mobile,'Findings and proposed diffs (NOT applied)')
adm_details=section(admin,'Confirmed findings (source evidence; proposed patches ONLY)')
back_ids=sorted([r for r in rows if r['id'].startswith('BACK-')],key=lambda r:int(r['id'].split('-')[1]))
back_details='\n\n'.join(r['details'] for r in back_ids)
rpc=section(backend,'Production function EXECUTE matrix')
schema=section(backend,'Financial mutation schema cross-check') or section(backend,'Schema/code compatibility cross-check')
edge=section(backend,'Deployed JWT and entrypoint inventory')
edge+='\n\n'+section(backend,'Retrieved deployed bundle vs canonical file hashes')
replacements={'REVIEWED':str(json.loads(read('coverage.json'))['reviewedFiles']),'COUNTS':'**'+str(len(rows))+' current findings — '+countline+'.**','COUNTS_INLINE':countline,'FINDINGS_TABLE':'\n'.join(table),'MOBILE_DETAILS':mob_details,'BACKEND_DETAILS':back_details,'ADMIN_WEB_DETAILS':adm_details,'ROOT_DETAILS':'\n\n'.join(r['details'] for r in rows if r['id'].startswith(('CFG-','QA-'))),'SCHEMA_CHECK':schema,'EFFECTIVE_MATRIX':section(backend,'Effective production role × operation matrix'),'RPC_MATRIX':rpc,'PRIOR_TABLE':'\n'.join(prior_table),'CHECKS_TABLE':'\n'.join(checks),'EDGE_TABLE':edge}
body=read('report-body.md').replace('signed URL (180s)','signed URL (120s)')
for key,value in replacements.items():body=body.replace('{{'+key+'}}',value)
assert not re.search(r'\{\{[A-Z_]+\}\}',body),'Unexpanded report marker'
target=ROOT/'docs/audit/MEDVEDA_FULL_AUDIT_2026-11-13.md';target.write_text(body)
summary=dict(findings=len(rows),counts={s:counts[s] for s in order},reviewed=int(replacements['REVIEWED']),historicalRows=len(prior),report=str(target.relative_to(ROOT)))
(OUT/'report-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
