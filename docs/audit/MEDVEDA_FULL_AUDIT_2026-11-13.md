# MedVeda full repository audit — 13 November 2026

## 1. Executive summary

**NO-GO for the intended paid/UCB Google Play release.** Current production build profiles deliberately disable new purchases; the requested two-provider experience is not an enabled production feature. Independently, paid offline PDFs remain plaintext, importing a recovery session can evict the reset screen, historical Play restoration is disabled with new sales, and deployed backend code trails reviewed refund, recovery-authentication and notification protections. Production metadata confirms missing/inactive payment recovery jobs, an absent identity-retention schedule and disabled mandatory admin MFA. These are release blockers even though TypeScript, lint, the full-current-schema SQL/webhook/concurrency suite and native vault host tests pass. This is an evidence-based source/configuration review, not certification of an installed binary, real payment, email delivery or Play Console enrollment.

### Scope, identity and evidence boundary

Audit target: current working tree at Git HEAD `54c33cb`, including the extensive pre-existing tracked and untracked changes. Application code, existing configuration, migration files and dependencies were not edited; only this report and audit evidence were added. Source hashes were compared after review: **no non-documentation file changed since the audit inventory**. No branch, commit, deployment, production data mutation, real charge/refund, email, push or account deletion was performed.

**Reviewed files: 645 unique files**, listed in [reviewed-files.txt](evidence/full-audit-2026-11-13/reviewed-files.txt). Coverage includes all **220 mobile source files**, **122 admin source files including CSS**, **61 backend TS/JS files**, **all 78 canonical migrations**, app/build/plugins/native vault runtime, website sources/generated pages, legacy pages and relevant operational scripts. [coverage.json](evidence/full-audit-2026-11-13/coverage.json) shows zero missing code files in the four principal source trees. The wider automated text inventory covers 5,257 files; these are **not** counted as 5,257 manually reviewed files.

Every distinct migration body/DDL/policy/grant was reviewed in migration order. One consolidated September migration contains exact repeated spans: [the SQL ledger](evidence/full-audit-2026-11-13/sql-sept19-24-reviewed.txt) records original/folded ranges and hashes; all differences were read. The 17 generated website pages were checked byte-for-byte against the fully reviewed generator/templates; repeated generated layouts were reviewed through that composition, not claimed as 17 independent line-by-line readings. Historical `supabase/releases`, old audit logs, dependency internals and binary artifacts were not each re-audited as independent current runtime modules. Current canonical code and retrieved active Edge bundles were compared separately. Tests were executed as described below; not every test helper was independently audited as production code.

Both requested earlier reports were read first from history because they were removed from the current tree:

- `5460921:docs/audit/MEDVEDA_AUDIT_FIX_1_20261026.md`.
- `8a6161f^:docs/audit/MEDVEDA_BUGFIX_FINAL_2026-10-27.md` — the historical filename contains hyphens; the requested `...20261027.md` path does not exist.

Scope corrections verified from code: there is no `grantPurchase.ts`; grants run through `_shared/settle.ts` and privileged SQL settlement RPCs. React Query is not installed or used; current caching uses service/module state and hooks. Email-OTP helpers exist with `shouldCreateUser:false`, but there is no active screen/route calling them in this checkout. The active hosted auth/legal domain is `www.medveda.in`; the older `medveda-website.vercel.app` URLs returned 404 during this audit.

Production reads used connected Supabase tools for schema, RLS, grants, function definitions, buckets, migration/function deployment metadata and selected configuration/job metadata. No student records, tokens, credentials, payment rows or secret-bearing cron commands were selected. Effective rules are confirmed; actual affected-user counts and provider/Console state remain unverified. Exact live evidence is retained in `backend-*.json`.

## 2. Findings sorted by severity

**53 current findings — Critical: 0; High: 11; Medium: 34; Low: 8; Info: 0.**

Counts cover distinct current findings. The historical fixed-item verification in section 6 and manual acceptance checks in section 7 are separate; duplicate gates are not counted twice. Conditional findings explicitly state their required build, scale, expiry configuration or storage-attacker assumptions. “Confirmed” can mean a demonstrated source rule or deployed metadata discrepancy; it does not imply a live exploit was attempted.

| ID | Severity | Area | File:Line | Title | Status |
|---|---|---|---|---|---|
| BACK-01 | High | Backend/payments | `supabase/migrations/20261109100000_billing_settlement_recovery.sql:120` | Deployed refund markers can disagree with PDF authority | Confirmed |
| BACK-02 | High | Backend/payments | `backend-deployed-razorpay-webhook.json:1 → functions/_shared/settle.ts:102` | Live reversal webhook ACKs unlinked outcomes without inbox | Confirmed |
| BACK-03 | High | Backend/payments | `supabase/play_payment_cron_setup.sql:22` | Financial recovery workers are inactive or missing | Confirmed |
| BACK-04 | High | Backend/payments | `supabase/functions/create-order-play-choice/index.ts:1` | Current UCB route cannot run against deployed functions | Confirmed |
| BACK-05 | High | Backend/payments | `backend-deployed-send-push-notification.json:1 → functions/send-push-notification/index.ts:87` | Deployed targeting leaks message text into public broadcast feed | Confirmed |
| BACK-06 | High | Backend/payments | `supabase/migrations/20261001100000_admin_mfa_aal2.sql:29` | Admin MFA remains an unclosed deployment gate | Confirmed |
| MOB-01 | High | Mobile | `mobile-app/src/navigation/AppNavigator.tsx:147` | Recovery imports its session and removes its own screen | Previously fixed - REGRESSED |
| MOB-02 | High | Mobile | `mobile-app/src/utils/downloadManager.ts:220` | Paid PDFs remain plaintext; dormant vault does not close B03 | Confirmed |
| MOB-03 | High | Mobile | `mobile-app/src/config/paymentProvider.ts:32` | Disabling new Play sales disables historical receipt restoration | Confirmed |
| MOB-04 | High | Mobile | `mobile-app/src/screens/payment/OrderSummaryScreen.tsx:206` | Lost native callback again leaves checkout spinning | Previously fixed - REGRESSED |
| WEB-01 | High | Website | `reset-password.html:122` | legacy password-reset DOM XSS | Confirmed |
| ADM-01 | Medium | Admin | `admin-panel/src/components/ProductFormModal.tsx:465` | clearing product MRP does not clear the stored discount | Confirmed |
| ADM-02 | Medium | Admin | `admin-panel/src/components/CourseFormModal.tsx:95` | four content forms can be closed during save, allowing a stale completion to close another editor | Confirmed |
| ADM-03 | Medium | Admin | `admin-panel/src/pages/Notifications.tsx:11` | global notification sends are not idempotent | Confirmed |
| ADM-04 | Medium | Admin | `admin-panel/src/services/playBillingSyncService.ts:15` | billing status is truncated while product list is fully paginated | Confirmed |
| ADM-07 | Medium | Admin | `admin-panel/src/hooks/useReferrals.ts:28` | referral filter reload silently destroys unsaved settings | Confirmed |
| ADM-08 | Medium | Admin | `admin-panel/src/utils/filters.ts:21` | offset pagination is unstable under concurrent inserts/deletes | Confirmed |
| ADM-09 | Medium | Admin | `admin-panel/src/services/referralService.ts:28` | referral settings UPDATE can report success after writing zero rows | Confirmed |
| BACK-07 | Medium | Backend/payments | `supabase/functions/create-play-order/index.ts:12 (source fix; live bundle differs)` | F15 malformed JSON fix only exists locally | Confirmed |
| BACK-08 | Medium | Backend/payments | `supabase/migrations/20261020103000_first_purchase_identity_retention.sql:15` | Fixed identity retention has no observed scheduler | Confirmed |
| BACK-09 | Medium | Backend/payments | `supabase/functions/_shared/paymentQueue.ts:1` | Queue batch budget counts one provider call per job | Confirmed |
| BACK-10 | Medium | Backend/payments | `supabase/migrations/20261020104000_course_wide_content_browsing.sql:35` | Blocked students can read free video URLs through table API | Confirmed |
| BACK-11 | Medium | Backend/payments | `supabase/migrations/20260925110000_phase2_wallet_ledger.sql:190` | Expiring spent credits consume future wallet balance again | Confirmed |
| BACK-12 | Medium | Backend/payments | `supabase/migrations/20260925120000_phase2_orders_pricing_and_settlement.sql:285` | Flag resolution reports success even if no row was resolved | Confirmed |
| BACK-13 | Medium | Backend/payments | `supabase/migrations/20260927130000_batch3b_antifarming.sql:698` | Manual hold can expire a reward before first availability | Confirmed |
| BACK-15 | Medium | Backend/payments | `supabase/migrations/20260930100000_medium_db_hardening.sql:138` | Eleventh new device fails before push registration can evict old token | Confirmed |
| BACK-16 | Medium | Backend/payments | `backend-deployed-verify-payment.json:1 → functions/verify-payment/index.ts:58` | Deployed recovery accepts another owner's order UUID without login | Confirmed |
| CFG-01 | Medium | Build/dependencies | `mobile-app/package.json:26` | Required Expo SDK patch compatibility check fails | Confirmed |
| CFG-02 | Medium | Build/dependencies | `mobile-app/package.json:48; tooling/package.json:9` | Mobile and lint toolchains contain published dependency advisories | Confirmed |
| MOB-05 | Medium | Mobile | `mobile-app/App.tsx:61` | Notification Swipeable lacks the required gesture root | Confirmed |
| MOB-06 | Medium | Mobile | `mobile-app/src/screens/auth/ResetPasswordScreen.tsx:41` | Fresh link cannot replace an already-mounted recovery controller | Confirmed |
| MOB-07 | Medium | Mobile | `mobile-app/app.config.js:53` | Recovery scheme differs from navigator/store | Confirmed |
| MOB-08 | Medium | Mobile | `mobile-app/src/services/studyReminderService.ts:66` | Category mutes affect feed, not foreground push presentation | Confirmed |
| MOB-09 | Medium | Mobile | `mobile-app/src/services/quizAttempts.ts:31` | Quiz result and outbox insert are not transactional | Confirmed |
| MOB-10 | Medium | Mobile | `mobile-app/src/services/pushNotifications.ts:128` | Failed logout suppresses push retries for the rest of process | Confirmed |
| MOB-11 | Medium | Mobile | `mobile-app/src/utils/downloadManager.ts:328` | Canceling paused transfer abandons partial plaintext file | Confirmed |
| MOB-12 | Medium | Mobile | `mobile-app/src/config/secureSessionStorage.ts:93` | Session envelope is encrypted but unauthenticated | Confirmed |
| MOB-13 | Medium | Mobile | `mobile-app/src/services/authState.ts:45` | Delayed offline owner claim can overwrite newer account marker | Confirmed |
| MOB-14 | Medium | Mobile | `mobile-app/src/services/syncEngine.ts:81` | Non-quiz outbox rows discarded; progress may regress | Confirmed |
| MOB-17 | Medium | Mobile | `mobile-app/src/hooks/useQuizStats.ts:38` | Statistics use capped rows as lifetime totals | Confirmed |
| MOB-18 | Medium | Mobile | `mobile-app/src/screens/payment/OrderSummaryScreen.tsx:76` | Already-owned recovery action regressed | Previously fixed - REGRESSED |
| MOB-20 | Medium | Mobile | `mobile-app/src/screens/auth/ResetPasswordScreen.tsx:122` | Reset lacks keyboard-safe scrolling | Confirmed |
| WEB-02 | Medium | Website | `reset-password.html:143` | legacy recovery links retain credentials and target a retired scheme | Confirmed |
| WEB-03 | Medium | Website | `website/_src/pages/index.html:52` | conflicting purchase instructions on the current site | Confirmed |
| WEB-04 | Medium | Website | `privacy.html:49` | legacy privacy promises contradict current disclosure | Confirmed |
| ADM-05 | Low | Admin | `admin-panel/src/hooks/useNotes.ts:87` | Retry falsely reports a successful mutation | Confirmed |
| ADM-06 | Low | Admin | `admin-panel/src/pages/Referrals.tsx:376` | Referrals and Review Flags errors have no Retry action | Confirmed |
| BACK-14 | Low | Backend/payments | `supabase/checks/ucb_postdeploy_checks.sql:49` | Old UCB readiness check rejects generated catalog SKUs | Confirmed |
| BACK-17 | Low | Backend/payments | `supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1985` | Legacy self-delete RPC bypasses Edge deletion rate limits | Confirmed |
| MOB-15 | Low | Mobile | `mobile-app/src/services/searchService.ts:250` | Search mislabels free previews and incomplete downloads | Confirmed |
| MOB-16 | Low | Mobile | `mobile-app/src/components/ProgressRing.tsx:55` | Percentage ring paints half/full, not percentage | Confirmed |
| MOB-19 | Low | Mobile | `mobile-app/src/hooks/useNetworkStatus.ts:9` | Unknown reachability displayed offline | Confirmed |
| QA-01 | Low | Verification | `supabase/tests/mv003-entitlement-selftest.cjs:108` | Historical payment harnesses do not match current helper migration dependencies | Confirmed |

## 3. Detailed findings and proposed changes

All diffs below are **proposals, not applied changes**. Small patches are concrete code proposals. Larger native encryption, wallet allocation, idempotency and aggregation changes specify contracts that require implementation and tests during Phase 2; the named proposed interfaces/RPCs are not falsely represented as already existing or paste-ready fixes. Deployment diffs describe the reviewed source/configuration replacement, not authorization to deploy.

### Mobile application

### MOB-01 — High — Recovery imports its session and removes its own screen

Evidence: mobile-app/src/navigation/AppNavigator.tsx:147 `<Stack.Group navigationKey={ownerId ?? "signed-out"}>` contains ResetPassword at :152. features/auth/recoveryFlow.js:87 calls `auth.setSession(...)`; services/authState.ts:19 updates current user/notifies navigator. ResetPassword keeps tokens/controller only in local ref/state (:41–42) and clears raw link after start (:108–110).

Failure: signed-out reset imports user → owner key changes → reset route/controller removed. A→B account recovery also changes key. Warm reset then falls through Splash to Home when the original launch URL was unrelated; cold-start recovery can re-enter Reset from its original URL, with token/controller loss depending on asynchronous ordering. Installed dependency @react-navigation/core/src/useNavigationBuilder.tsx:623 identifies route key changes; @react-navigation/routers/src/StackRouter.tsx:270 filters changed routes and falls back to Splash if none remain. Deterministic source-level route transition; mounted native reproduction UNVERIFIED. It can strand password/MFA recovery, not a demonstrated password/MFA bypass.

```diff
- <Stack.Group navigationKey={ownerId ?? "signed-out"}> ... auth and protected routes ...
+ <Stack.Group navigationKey="auth-recovery"> ... Splash/Login/Register/ForgotPassword/ResetPassword ... </Stack.Group>
+ <Stack.Group navigationKey={ownerId ?? "signed-out"}> ... protected account routes ... </Stack.Group>
```

Validate real mounted NavigationContainer+Stack for signed-out and A→B cold/warm recovery; controller must survive setSession, MFA and cleanup while protected routes still reset.

### MOB-02 — High — Paid PDFs remain plaintext; dormant vault does not close B03

Evidence: utils/downloadManager.ts:207 chooses documentDirectory `.pdf`; :220 constructs `new FileSystem.DownloadResumable(sourceUrl,fileUri,...)`; :226 downloads directly to it. PdfViewerScreen.native.tsx renders react-native-pdf using URI/cache:false, never vault. modules/medveda-offline-vault/android/.../MedvedaOfflineVaultModule.kt:17 returns contentEnabled=false/nativeAccepted=false; JS bridge exposes only capabilities/invalidate.

Failure: completed and interrupted paid transfers persist readable bytes. UI ownership checks/secure licenses do not encrypt files or certify native temporary-cache cleanup. Native GCM/container/journal/HTTPS/private workspace code is real but harness-only. Physical extraction/cache behavior UNVERIFIED. B03 license timestamp component is improved; PDF encryption/migration/device acceptance stays open.

```diff
- new FileSystem.DownloadResumable(signedUrl,persistentPdfUri,...)
+ nativeAuthorizedVault.acquire(noteId) // native authenticated permit; ciphertext-only persistent writes
- <Pdf source={{uri:persistentPdfUri,cache:false}} />
+ <NativeAuthorizedNoteView noteId={noteId} /> // ticket-bound native lease
```

Design proposal only: requires authenticated native server permit/license contract, owner binding, durable legacy cleanup/re-download protocol, current seven-day/rollback policy, Android/Swift/build/device acceptance. Do not activate dormant code or encrypt only after download.

### MOB-03 — High — Disabling new Play sales disables historical receipt restoration

Evidence: config/paymentProvider.ts:32 `playRestorationEnabled = configuredProvider === "play" && ...`. eas.json production/internal profiles set provider disabled; app.config.js:30 requires this. MyPurchasesScreen.tsx:73 is sole restorePlayPurchases caller and checks that flag.

Failure: previously paid, unconsumed Play receipt lost to process death cannot be recovered in the current production distribution. Already-granted purchases still read normally. Actual unsettled receipts/provider behavior UNVERIFIED.

```diff
- const playRestorationEnabled = configuredProvider === "play" && nativePlayIdentity;
+ const playRestorationEnabled = nativePlayIdentity && supportsHistoricalPlayReceipts;
- playRestorationEnabled && approvedUserChoice ? "play" : ...
+ configuredProvider === "play" && playRestorationEnabled && approvedUserChoice ? "play" : ...
```

Build support/restoration must be independent of permission to start sales. Verify disabled production still cannot launch checkout and can restore synthetic historical owned receipt.

### MOB-04 — High in enabled UCB builds — Lost native callback again leaves checkout spinning

Evidence: OrderSummaryScreen.tsx:206 awaits startPlayPurchase then returns; finally :227 retains paying=true when Play has currentAttempt. No watchdog exists. playBillingService.ts requestPurchase deadline only lasts until its native promise settles. Removed PlayBillingScreen previously had F03 30-second UI recovery.

Failure: native promise resolves but listener event is lost → indefinite disabled Please wait. Current standard disabled distribution cannot enter this path; UCB-enabled builds can. Device event loss occurrence UNVERIFIED.

```diff
+ useEffect(() => {
+   if (!paying || !currentAttempt.current) return;
+   const timer=setTimeout(() => showPendingRecovery(currentAttempt.current),30000);
+   return () => clearTimeout(timer);
+ },[paying,attemptId]);
```

Recovery must be focus/account-bound, keep native listeners for late success and offer status/MyPurchases, never replacement payment while uncertain.

### MOB-05 — Medium — Notification Swipeable lacks the required gesture root

Evidence: components/NotificationRow.tsx:58 renders Swipeable; NotificationsScreen supplies archive handler for every row. App.tsx:61 root SafeAreaProvider, then navigation; no GestureHandlerRootView/HOC in App/index/src. Installed gesture-handler/src/handlers/createHandler.tsx:446 throws in development without root context and warns gestures will not recognize. Native-stack/screens do not supply that root.

Failure: populated Notifications throws to ErrorBoundary in native development; release swipe lacks required native root. Device behavior UNVERIFIED.

```diff
+ import {GestureHandlerRootView} from "react-native-gesture-handler";
- <SafeAreaProvider>...</SafeAreaProvider>
+ <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider>...</SafeAreaProvider></GestureHandlerRootView>
```

Validate populated notification archive on actual release/development Android, including nested native screens.

### MOB-06 — Medium — Fresh link cannot replace an already-mounted recovery controller

Evidence: ResetPasswordScreen.tsx:41 captures raw URL once; :42 creates controller once; effect :114 depends on stable start. deepLinkStore subscribes/store warm URL but has no screen revision subscription.

Failure: second reset link on same mounted expired/blocked/ready route keeps old controller/tokens/account and does not start fresh recovery. Earlier A5 remains.

```diff
- const resetUrl=useRef(getLastDeepLinkUrl()); const [recovery]=useState(createPasswordRecovery);
+ const revision=useRecoveryLinkRevision();
+ return <RecoverySession key={revision} url={getLastDeepLinkUrl()} />;
```

Invalidate old asynchronous continuation and serialize imports/cleanup so it cannot clear a newer link. MFA lifecycle regression required.

### MOB-07 — Medium staging — Recovery scheme differs from navigator/store

Evidence: app.config.js staging sets medveda-staging; isolated build sets medveda-razorpay-test. AppNavigator linking prefixes only medveda://; deepLinkStore.ts:9 retains only medveda://reset-password; authService uses production HTTPS bridge. Alpha staging also gets staging scheme.

Failure: test/staging reset cannot target its application; production bridge may open production app instead. Earlier A4 remains. Actual deployed bridge/allowlist/native manifest UNVERIFIED.

```diff
- prefixes:["medveda://"]
+ prefixes:[`${validatedBuildRecoveryScheme}://`]
- url?.startsWith("medveda://reset-password")
+ matchesExactRecoveryRoute(url,validatedBuildRecoveryScheme)
```

Coordinate matching build-specific HTTPS bridge/allowlist. Preserve production identifiers.

### MOB-08 — Medium — Category mutes affect feed, not foreground push presentation

Evidence: notificationPreferences persists local flags; notificationsService.ts:77 filters fetched rows. studyReminderService.ts:66 handler passes only identifier/data into broadcast/dedup gate and returns banner/list/sound=true. Gate has no preference lookup; push registration sends token/platform only.

Failure: muted Offer disappears from feed yet incoming broadcast Offer still displays/sounds in foreground. OS background notifications cannot be suppressed by later JS filtering. Backend delivery selection is parent cross-check; actual delivery UNVERIFIED.

```diff
- const present=shouldPresent(identifier,data);
+ const present=shouldPresent(identifier,data) && await isCategoryEnabled(validatedCategory(data));
```

Background support needs persisted/enforced sender preferences or wording limited to feed. This client proposal alone cannot promise background mute.

### MOB-09 — Medium — Quiz result and outbox insert are not transactional

Evidence: services/quizAttempts.ts:31 commits quiz_attempts_local; :48 separately calls queueForSync which commits sync_queue. No enclosing transaction or startup reconstruction of missing queue rows.

Failure: process death/disk failure between inserts leaves unverified local result with no queued submission, permanently pending after reconnect. Device process-death reproduction UNVERIFIED; separate SQLite autocommit statements establish gap.

```diff
- insertLocalAttempt(); queueForSync("quiz_attempt","upsert",payload);
+ db.withTransactionSync(() => { insertLocalAttempt(); insertOutboxWithoutDrain(db,payload); });
+ void drainQueue();
```

Inject failure between statements and observe both durable rows or neither; start drain only after commit.

### MOB-10 — Medium — Failed logout suppresses push retries for the rest of process

Evidence: pushNotifications.ts:128 unregister increments generation and sets loggingOut=true; setPushNotificationUser resets only on owner-ID change (:45–48). authState.ts:67 correctly throws returned signOut error and retains same owner. Registration and foreground/token listeners skip loggingOut.

Failure: token deletion succeeds then auth signout fails → still-signed-in account stops receiving pushes and registration retries remain disabled until actual owner change/restart.

```diff
- if (error) throw error;
+ if (error) { resumePushForUnchangedOwner(initiatingUserId); throw error; }
```

Rollback must be owner/generation-aware, reset registration marker and re-register without reviving another account token.

### MOB-11 — Medium — Canceling paused transfer abandons partial plaintext file

Evidence: downloadManager.ts:278 removes active handle when paused; :284 saves partial fileUri only in resume state. local_uri is set only on completed transfer. cancelDownload at :328 deletes resume state before removeDownload, which deletes only existing.localUri at :339.

Failure: Pause→Cancel on initial download removes row and last partial path reference, leaves partial PDF in document storage. Startup recovers row statuses only, never orphan notes. Source path deterministic; device filesystem measurement UNVERIFIED.

```diff
+ const saved=await readValidatedResumeState(id);
+ if (saved?.fileUri) await deleteOwnedPartialFile(saved.fileUri);
  await AsyncStorage.removeItem(RESUME_STATE_PREFIX+id);
  await removeDownload(id);
```

Serialize pause publication/cancel so late pause cannot recreate state. Strictly validate own directory and retain retryable cleanup record until deletion succeeds.

### MOB-12 — Medium hardening — Session envelope is encrypted but unauthenticated

Evidence: config/secureSessionStorage.ts:93 AES-CTR decrypts without tag/MAC; envelope validates only version/generation/hex. Write :104–109 uses a fresh random key per publication: no demonstrated key/counter reuse.

Threat model/failure: actor able to modify AsyncStorage ciphertext can perform controlled known-plaintext same-length changes; storage tampering is not cryptographically rejected. This does not forge server JWTs or demonstrate server authorization bypass. Keystore confidentiality/publication safeguards remain intact.

```diff
- {version:2,generation,ciphertext:AES_CTR(key,plaintext)}
+ {version:3,generation,nonce,ciphertext,tag:AEAD(key,plaintext,storageKeyAndGeneration)}
```

Use verified supported native authenticated storage primitive; preserve legacy migration, immutable generation publication and serialized reads/writes. No crypto dependency chosen/installed.

### MOB-13 — Medium — Delayed offline owner claim can overwrite newer account marker

Evidence: authState.ts:45 claimOfflineStorage reads owner, awaits purge and writes initiating user ID without checking currentUser/generation; bootstrap/event callers launch it asynchronously (:136/:151). Signout marker cleanup also happens after async purge.

Failure: claim A resumes after B login, writes A marker or purges B transfers. OfflineNoteAccess denies mismatched markers correctly, so this is availability/data-loss risk, not established paid access leakage.

```diff
+ const epoch=offlineClaimGeneration;
  const owner=await AsyncStorage.getItem(OFFLINE_OWNER_KEY);
+ if (!sameCurrentOwner(user.id,epoch)) return;
  ... serialized owner cleanup ...
+ if (!sameCurrentOwner(user.id,epoch)) return;
  await AsyncStorage.setItem(OFFLINE_OWNER_KEY,user.id);
```

Use serialized owner claims plus synchronous epoch invalidation across A→B→A; gate new transfer admission until ownership established; prevent late signout marker removal deleting newer claim.

### MOB-14 — Medium latent retained O3/O4 — Non-quiz outbox rows discarded; progress may regress

Evidence: syncEngine.ts:81 owner predicate exempts non-quiz entities; :220 marks them synced after fifth failure. Progress read at :179 ignores returned error, then compares/upserts separately. Only quiz_attempt currently has a production queueForSync caller, so non-quiz paths are dormant/legacy risks, not demonstrated active-feature impact.

Failure if such rows exist/feature activated: B account drains A rows; retries mark failed writes successful. Concurrent devices can read 10 then write 80/30, regressing progress. No RLS bypass established.

```diff
- entity_type <> 'quiz_attempt' OR ... owner check ...
+ ... owner check for every entity; malformed row explicit dead letter ...
- if (attemptCount+1>=5) markSynced(queueId);
+ retain failed/pending with backoff and explicit retry
- read server progress; upsert payload;
+ authorized server atomic max-progress operation
```

RPC/schema change is proposal only. Validate operations/deletes and account generation before activation.

### MOB-15 — Low — Search mislabels free previews and incomplete downloads

Evidence: searchService.ts:250 note enrichment omits isFreePreview and free; Free filter requires free||owned. SearchResultRow locks note with owned=false. useGlobalSearch.ts:55 downloadedIds includes every row/status.

Failure: unpurchased free preview hidden by Free/showing lock; paused/failed downloads appear under Downloaded Only/offline badge.

```diff
- new Set(downloads.map(d=>d.id))
+ new Set(downloads.filter(d=>d.status==="completed" && d.localUri).map(d=>d.id))
- return {...r,owned,downloaded};
+ return {...r,owned,free:r.data.isFreePreview===true,downloaded};
- const locked=result.type==="note" && result.owned===false;
+ const locked=result.type==="note" && !result.owned && !result.free;
```

### MOB-16 — Low — Percentage ring paints half/full, not percentage

Evidence: ProgressRing.tsx:55–68 always paints full uniformly colored circle inside right half mask, rotated about its center. Circular symmetry makes rotation invisible. Above 50%, same left-half structure appears at :72–86. StudentProfileCard uses it.

Failure: 0/10/40% all render right half; 60/90/100% full ring, while numeric label changes. Mathematical source defect; screenshot/device rasterization UNVERIFIED.

```diff
- rotate an entire filled circular View inside each half-mask
+ rotate a colored semicircle with complementary fixed masks about full-disc center
```

Alternative reviewed vector primitive; verify 0/1/25/50/51/75/100 percent. Avoid new native dependency solely for decoration.

### MOB-17 — Medium conditional scale — Statistics use capped rows as lifetime totals

Evidence: useQuizStats.ts:38 selects verified attempts without count/paging/range, then :52 treats rows.length as total and computes average/best from returned rows. Actual Data API cap is UNVERIFIED; code handles no finite cap.

Failure above configured cap: total stops, older best/mean excluded while UI says Verified Attempts/Best Score. Search paging fix does not cover this path.

```diff
- select("*").eq("user_id",uid).order(...); aggregate returned rows
+ fetch authorized aggregate {count,averagePercentage,bestPercentage} plus latest five
```

Or stable cursor paging; exact count alone does not fix mean/best. Server aggregate requires separate review.

### MOB-18 — Medium enabled checkout — Already-owned recovery action regressed

Evidence: OrderSummaryScreen.tsx:76 maps all !q.ok to unavailable; error at :242 offers Retry only. OrderQuote has code but screen never handles already_owned. Earlier F17 action was in removed PlayBillingScreen.

Failure: stale Buy after ownership changed receives already_owned and offers unavailable/retry instead of MyPurchases. Server still prevents duplicate grant/charge; no double-charge claimed.

```diff
+ if (!q.ok && q.code==="already_owned") {setAlreadyOwned(true);return;}
+ if (alreadyOwned) return <OwnedNotice onOpenPurchases={...}/>;
```

Exact response code confirmed in `supabase/migrations/20260928110000_referral_off_blocks_wallet.sql:60` and later wallet-reservation definition; deployed parity remains unverified. Preserve disabled production guards.

### MOB-19 — Low retained U1 — Unknown reachability displayed offline

Evidence: useNetworkStatus.ts:9 Boolean(isConnected && isInternetReachable) coerces null reachability false. Search/Downloads/LoadError display offline. Sync retains pending rows awaiting true reachability.

```diff
- Boolean(state.isConnected && state.isInternetReachable)
+ state.isConnected===true && state.isInternetReachable!==false
```

Or model unknown separately. Native connectivity transitions UNVERIFIED.

### MOB-20 — Medium layout risk retained A6 — Reset lacks keyboard-safe scrolling

Evidence: ResetPasswordScreen.tsx:122 centered View wraps fields/actions without ScrollView/KeyboardAvoidingView. Support onPress calls Linking.openURL without rejection catch. Login/Register now scroll; reset does not.

Failure risk: small-height/landscape/large-font keyboard can leave fields/submit outside visible viewport without scroll. Actual layout/device reproduction UNVERIFIED. Support link rejection unhandled source-confirmed.

```diff
- <View style={styles.container}>...</View>
+ <KeyboardAvoidingView ...><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={...}>...</ScrollView></KeyboardAvoidingView>
- onPress={()=>Linking.openURL(supportUrl)}
+ onPress={()=>void Linking.openURL(supportUrl).catch(showSupportFallback)}
```

### Supabase, payments and deployed state

### BACK-01 — High — Deployed refund markers can disagree with PDF authority

Locations: `supabase/migrations/20261109100000_billing_settlement_recovery.sql:120` (live settlement definition), `supabase/migrations/20261020110000_admin_url_mfa.sql:23` (live note helper), pending fix `supabase/migrations/20261112104610_audit_batch1_refund_revocation.sql:167` and `:216`. Observed live function definitions in `backend-live-sensitive-rpcs.json`; pending migration absent from `backend-migrations.json`.

```sql
-- live settlement reversal path:
if v_reason is not null then
  update public.orders set status=case when v_reversal then 'refunded' else 'paid' end ...;
  update public.payment_captures set status=case when v_reversal then 'reversed' else 'compensation_pending' end ...;
-- live paid-PDF predicate:
where p.user_id = p_user and p.status = 'success'
```

Root cause: terminal payment/capture state and purchase revocation are separate in the deployed function. The paid-PDF predicate ignores order/capture disposition. A historical missed reversal or reversal-only marker can preserve `purchases.status='success'`. Actual affected production rows were not selected. Existing local fix is forward-only and service-role-only.

```diff
 if v_reason is not null then
+  if v_reversal then
+    perform public.reverse_payment(payment_id, classified_refund_or_chargeback, restore_wallet_only_for_refund);
+  end if;
 -- update terminal order and capture in same transaction
 ... paid-PDF purchase predicate ...
+and not exists(select 1 from orders o left join payment_captures pc
+  on pc.payment_id=o.razorpay_payment_id where o.id=p.order_id
+  and (o.status='refunded' or pc.status in ('reversed','compensated')))
```

Manual acceptance: in disposable staging, existing success purchase → full refund/lost dispute before/after capture; paid URL denied immediately after committed reversal; duplicate deliveries do not double restore wallet/reward; partial refund/won dispute retain correct access.

### BACK-02 — High — Live reversal webhook ACKs unlinked outcomes without inbox

Locations: deployed `functions/_shared/settle.ts:102` and `:137`, deployed `functions/razorpay-webhook/index.ts:147`, `:167`, `:205`; current correction `supabase/functions/razorpay-webhook/index.ts:153` and `supabase/functions/_shared/settle.ts:218`.

```ts
// deployed helper accepts every RPC return, including unknown_payment:
return { ok: true, outcome: String(data?.status ?? 'unknown') };
// deployed capture handler also ACKs missing/mismatched local evidence:
if (result.status === 404 || result.status === 400) return response(204);
```

Root cause: provider redelivery is stopped even when no reversal has been linked/applied. No live `record_provider_event` call exists in the retrieved bundle. A reversal delivered before capture linkage is acknowledged; subsequent capture cannot consult a durable earlier reversal fact. A capture with missing/mismatched local evidence can also be discarded. No actual production event loss is claimed.

```diff
+await recordVerifiedProviderInbox(rawBodyHash, eventId, providerIdentity);
 const result = await handle_payment_refund(...);
-return {ok:true,outcome:String(result.status)};
+if (!acceptedReversalOutcomes.has(result.status)) return retryable503;
+await markOnlyThisInboxEventApplied(eventId);
-if (result.status === 404 || result.status === 400) return response(204);
+return response(500); // keep delivery/reconciliation retryable
```

Manual acceptance: deliver refund/lost-dispute before capture linkage, crash after inbox commit, retry after provider outage, unknown provider states and duplicate event ID with conflicting hash.

### BACK-03 — High — Financial recovery workers are inactive or missing

Locations: `supabase/play_payment_cron_setup.sql:22`, `supabase/ucb_cron_setup.sql:29`, `supabase/functions/report-external-transaction/index.ts:85`; observed `backend-live-security-metadata.json:1` cron projection and `backend-edge-functions.json:1`.

```json
{"jobname":"play-consume","active":false}
{"jobname":"play-reconcile","active":false}
{"jobname":"play-voids","active":false}
{"jobname":"play-catalog-sync","active":false}
```

No `ucb-*` jobs and no `report-external-transaction` deployment exist in retrieved inventories. SQL can enqueue `payment_compensations`; its automatic provider-refund loop is in the missing worker. A successful capture that cannot grant may remain pending without its intended compensation processor. Play refund/void and consumption recovery lack scheduled execution. An external scheduler was not inspected, so this does not prove that no out-of-repository automation exists.

```diff
 -- after provider permissions, staging acceptance and owner approval:
+deploy exact reviewed recovery worker bundles with current SQL dependencies
+schedule approved consume/reconcile/void/report/refund/compensation/event phases
+monitor oldest deadline, parked/error count, cursor lag and actual completion
```

Manual check: name/schedule/active and last-success metadata only, no secret-bearing cron commands; test dropped callbacks/consumption response/voids/compensation in licensed staging. Do not simply enable jobs before provider/catalog qualification.

### BACK-04 — High — Current UCB route cannot run against deployed functions

Locations: `supabase/functions/create-order-play-choice/index.ts:1`, `supabase/functions/attach-external-token/index.ts:1`, `supabase/functions/report-external-transaction/index.ts:1`, `supabase/functions/_shared/createOrderHandler.ts:39`, live inventory `backend-edge-functions.json:1`.

```ts
// current dedicated route:
import { handleNotesChoiceOrder } from '../_shared/notesChoiceOrder.ts';
Deno.serve(handleNotesChoiceOrder);
```

The three required routes are missing from the live list; live `create-order` is an older monolithic implementation with no current UCB/platform gate. Current native UCB attach/choice/report requests cannot be completed by that deployment. Missing isolated test routes are an additional default-off lane gap, not evidence that production billing depends on them.

```diff
-deploy a subset of order/verification files from different source revisions
+deploy qualified choice + attach + verification + webhook + reporting bundle
+verify enrolled India/package/user gates and migration dependencies together
```

Manual acceptance: licensed India Play tester chooses each billing option, cancellation/restore/late capture/refund, one grant, Google reporting reconciliation and exact package/track. Header hints alone are not device attestation.

### BACK-05 — High — Deployed targeting leaks message text into public broadcast feed

Locations: deployed `functions/send-push-notification/index.ts:63` and `:87`; current guard `supabase/functions/send-push-notification/index.ts:69`; policy `notifications_public_read_active` in `backend-policies.json:1`.

```ts
// deployed:
if (input.targetUserIds !== undefined && input.targetUserIds !== null) targets = ...;
await supabaseAdmin.from('notifications').insert({title,body,type,active:true});
// only device-token query is recipient-filtered
```

Root cause: targeted push and broadcast feed share unscoped persistence. `notifications_public_read_active` permits active rows; anon has SELECT. A targeted account/payment message can become visible to every reader. No private notification contents were queried.

```diff
+if (Object.prototype.hasOwnProperty.call(input,'targetUserIds'))
+  return jsonResponse({error:'Targeted notifications are not supported'},400);
 await insertBroadcastNotification(...);
```

Alternatively design recipient storage/RLS first, then support targeting. Existing current-source guard is the concrete minimal proposal. Acceptance: targeting rejected before DB/token operations; anon/student only see intended broadcasts.

### BACK-06 — High — Admin MFA remains an unclosed deployment gate

Locations: `supabase/migrations/20261001100000_admin_mfa_aal2.sql:29`, current `supabase/functions/send-push-notification/index.ts:46`, deployed sender `functions/send-push-notification/index.ts:37`; observed admin settings in `backend-live-security-metadata.json:1`.

```sql
-- observed live configuration
require_mfa = false
-- am_i_admin uses configured flag:
and (not admin_mfa_required() or auth.jwt()->>'aal'='aal2')
```

Deployed sender checks admin membership but never the flag/AAL. Password-only administrator sessions retain configured DB authority; enabling the DB flag alone would still leave old service-role sender without its matching guard. This is a missing mandatory-MFA release gate, not a claim that an enabled DB policy is bypassed by RLS.

```diff
+load admin_settings fail closed
+if require_mfa && sameVerifiedTokenAal !== 'aal2': deny403
+qualify all administrator factor enrollment/recovery
+owner-approved set_admin_mfa_required(true)
```

Acceptance: no locked-out administrators; AAL1 denied and AAL2 succeeds across direct Data API, RPCs, signed content URL, upload and push functions.

### BACK-07 — Medium — F15 malformed JSON fix only exists locally

Locations: deployed `functions/create-play-order/index.ts:10`, deployed `functions/verify-play-purchase/index.ts:13`; current `supabase/functions/create-play-order/index.ts:12`, `supabase/functions/verify-play-purchase/index.ts:13`.

```ts
// deployed accepts parse result without runtime shape validation
const body = await req.json().catch(()=>({})) as {productId?:unknown};
const productId = typeof body.productId === 'string' ? body.productId : '';
```

`null` is valid JSON and property access throws; parsing success does not make it an object. In Play verification this executes before its try/catch. Earlier report F15 claimed source-only fix and correctly left deployment pending; this audit confirms that pending state remains.

```diff
-const body = await req.json().catch(()=>({})) as Body;
+const input:unknown = await req.json().catch(()=>null);
+if (!input || typeof input!=='object' || Array.isArray(input)) return badRequest400;
+const body = input as Body;
```

Acceptance: unauthenticated rejected before body work; authenticated null/array/string/number/invalid JSON → stable 400 with no provider/order call. No live payment endpoint was invoked.

### BACK-08 — Medium — Fixed identity retention has no observed scheduler

Location: `supabase/migrations/20261020103000_first_purchase_identity_retention.sql:15` and `:36`; observed cron metadata `backend-live-security-metadata.json:1`.

```sql
delete from first_purchase_identities
where first_purchase_at < now() - interval '180 days';
-- cron.schedule(...) is intentionally only a prepared comment
```

The function and service-only grant exist; named scheduler does not. Analytics/payment-session jobs do not clean first-purchase identities. Actual overdue records were not counted. An external scheduler was not inspected.

```diff
+approve documented cutoff/cadence and legal wording
+configure only the specifically approved retention schedule
+monitor last successful purge, overdue count and alerts
```

Acceptance: disposable seeded rows at cutoff boundaries, preserved current rows, measured lag, no secrets/PII in telemetry; production scheduling remains a separate owner decision.

### BACK-09 — Medium — Queue batch budget counts one provider call per job

Locations: `supabase/functions/_shared/paymentQueue.ts:1`, `supabase/functions/_shared/settle.ts:28` and `:37`, `supabase/functions/report-external-transaction/index.ts:212`, `supabase/ucb_cron_setup.sql:38`.

```ts
// asserted 90-second request bound:
// ceil(40/8)*15 = 75 seconds
export const WORK_BATCH_SIZE=40, WORK_CONCURRENCY=8;
// capture settlement serially does:
await fetchPayment(paymentId);
await fetchRazorpayOrder(orderId);
```

Both requests independently allow 15 seconds; before DB/reporting, five waves of 8 jobs can require 150 seconds. Compensation/report/refund paths add more serial calls. Client cron HTTP timeout is 90 seconds, leases 3 minutes. A client timeout does not prove the platform kills the worker immediately, but it invalidates the claimed bounded response and makes retry/drain estimates optimistic.

```diff
+define invocation deadline and remaining-budget check
+budget batch size using complete path serial calls, DB and reporting overhead
+stop claiming/defer unstarted jobs before deadline; preserve lease fencing
+exercise slow successful multi-call provider responses and timeout/retry overlap
```

### BACK-10 — Medium — Blocked students can read free video URLs through table API

Locations: `supabase/migrations/20261020104000_course_wide_content_browsing.sql:35`–`:48`, live `videos_public_read_active` policy in `backend-policies.json:1`, current `supabase/functions/get-video-url/index.ts:35`.

```sql
-- effective has_content_access own-course branch:
select 1 from profiles pr
where pr.id=auth.uid() and pr.course_id=p_course_id
-- videos policy exposes youtube_url when this returns true:
active=true AND has_content_access(course_id,year_id)
```

The service URL helper requires a nonblocked profile, while direct table SELECT does not. A still-valid JWT for a blocked user can read published own-course video URLs by Data API. Mobile uses direct video reads, so logout enforcement in UI is insufficient as server authority. This does not grant private paid PDF bytes, and does not imply free content needs payment.

```diff
 -- existing admin branch unchanged
+student branches require exists(select 1 from profiles pr
+ where pr.id=auth.uid() and not coalesce(pr.blocked,false))
```

Apply to every student branch, including purchase-based cross-course access; review product decision whether blocking should suppress browsing vs only payment/PDF. Acceptance: synthetic blocked JWT direct SELECT videos/content and public-question RPC denied, owner/unblocked/admin behavior unchanged.

## BACK-11 — Medium — Expiring spent credits consume future wallet balance again

Current definitions: `supabase/migrations/20260925110000_phase2_wallet_ledger.sql:190` wallet_balance_of (sole definition), particularly :199–201:

```sql
sum(amount) filter (where entry_type='credit' and status='available'
  and (expires_at is null or expires_at>now()))
- sum(amount) filter (where entry_type in ('debit','reversal') and status='available')
```

`20260926130000_batch1_hygiene.sql:180–182` wallet_ledger_no_overdraw repeats the same arithmetic; this trigger also has no later replacement. Service-only balance helper is called by authenticated get_my_wallet and service pricing/settlement.

Root cause: credits expire out of the positive sum, but debits that already spent those credits stay forever in the negative sum. No debit-to-credit allocation or remainder accounting exists. Synthetic sequence: credit100→spend100→that credit expires→new nonexpired credit100. Expected new balance100; current helper returns greatest(0,100−100)=0. Trigger then refuses spending the valid new credit as overdraw. Reversed expiring credits have the same double-deduction shape. This is under-crediting/loss of spendability, not overdraw or demonstrated theft. Requires an expiring credit policy; live credit_expiry_days and affected balances are UNVERIFIED in this sub-review. Parent requested synthetic PG17 reproduction; no production mutation needed.

Proposed diff/design, not applied:

```diff
- activeCreditSum - allTimeDebitAndReversalSum
+ sum(activeCreditRemaindersAfterDeterministicConsumptionAndReversalAllocation)
```

Make display, pricing, reservation validation and no-overdraw trigger share one authoritative per-credit allocation computation. Preserve immutable ledger/history and existing idempotency. Do not fix by dropping all historical debits or subtracting expired original face value again; only unspent remainders should expire. Requires reviewed allocation/replay/migration policy, tests before/after expiry with partial spend, reversal, refund restoration, concurrent checkout and new credits.

## BACK-12 — Medium — Flag resolution reports success even if no row was resolved

Current sole definition `20260925120000_phase2_orders_pricing_and_settlement.sql:274`, lines :285–289:

```sql
update public.order_review_flags ... where id=p_flag_id and resolved_at is null;
perform set_config('app.trusted_order_write','false',true);
if not found then raise exception 'Flag not found or already resolved'; end if;
```

Root cause: PERFORM set_config returns one row and overwrites PL/pgSQL FOUND=true after the UPDATE. Nonexistent/already-resolved ID always passes the intended missing-row check. Admin authorization remains enforced; this is false mutation confirmation and operational review integrity, not unauthorized resolution. No later replacement (backend confirmed).

Proposed precise diff:

```diff
+ declare v_rows integer;
  update public.order_review_flags ... where id=p_flag_id and resolved_at is null;
+ get diagnostics v_rows = row_count;
  perform set_config('app.trusted_order_write','false',true);
- if not found then raise exception 'Flag not found or already resolved'; end if;
+ if v_rows=0 then raise exception 'Flag not found or already resolved'; end if;
```

Synthetic local tests: authorized admin resolves one flag once; repeat/nonexistent must return controlled failure, original audit actor/timestamp unchanged. AAL1/unauthorized denied by final am_i_admin policy.

## BACK-13 — Medium conditional expiry policy — Manual hold can expire a reward before first availability

Current release definition `20260927130000_batch3b_antifarming.sql:698` (last definition). It leaves a shared-network reward pending while an unresolved flag exists (:739–744), then changes only status to available (:734). Wallet append-only trigger fixes available_at/expires_at immutable at `20260925110000_phase2_wallet_ledger.sql:82–83`; status change stamps status_changed_at.

Earning side `20260927130000_batch3b_antifarming.sql:682–686` sets expires_at to earning-time + hold-days + credit-expiry-days. Later Razorpay legacy body still uses this formula (`20261104100000_razorpay_snapshot_discount_retry.sql:399–402`); backend confirms final Play credit creation also retains it. Therefore this is not merely superseded September code.

Root cause: scheduled release time is treated as actual first availability even though dispute/shared-network holds postpone release. If configured expiry is7 days and review lasts14 after nominal release, reward appears pending/held, is approved, becomes status available and is immediately excluded by expires_at<=now. Mobile ReferralTermsScreen says expiry after it becomes available; the held credit was never spendable. Expiry configuration/live affected records and exact intended product policy UNVERIFIED. Current defaults permit null/no expiry; no claim of observed customer loss.

Proposed diff/design if policy is expiry after actual availability:

```diff
- effectiveExpiry = original expires_at
+ effectiveExpiry = actual status_changed_at + captured(expiryDuration)
```

Derive captured duration from original expires_at−available_at where valid, or store a reviewed duration snapshot for future rows. Centralize effective expiry in balance, no-overdraw, reversal and read UI; do not silently mutate immutable historical columns or use changing current settings retroactively. Alternatively explicitly approve/disclose expiry while held. Test approval just before/after original expiry, dispute hold/win, canceled reward, settings changes and refund.

### BACK-14 — Low — Old UCB readiness check rejects generated catalog SKUs

Locations: `supabase/checks/ucb_postdeploy_checks.sql:48`–`:49`; generation `supabase/migrations/20261016100000_play_catalog_sync.sql:100`.

```sql
-- readiness script:
play_sku ~ '^notes_[0-9]+$'
-- current generated SKU:
'notes_' || replace(price::numeric(10,2)::text,'.','_') || '_v_' || uuid_without_dashes
```

The script says every row must pass, but cannot recognize current generated/verified price tiers. It can block valid release qualification or encourage manual legacy seeding (now explicitly retired).

```diff
-exists(select 1 from play_price_tiers where price_inr>0 and play_sku~'^notes_[0-9]+$')
+exists(select 1 from play_price_tiers t join play_price_sync s
+ on s.candidate_sku=t.play_sku where t.price_inr>0 and t.active
+ and t.verified_at>now()-interval '24 hours' and s.status='ready'
+ and t.currency_code='INR' and t.region_code='IN')
```

Manual check remains provider read-back; SQL readiness alone cannot establish Google permissions, active BUY offer or real purchase success.

## BACK-15 — Medium — Eleventh new device fails before push registration can evict old token

Sole current definitions `20260930100000_medium_db_hardening.sql:135` push_tokens_cap and :157 register_push_token. BEFORE INSERT trigger at :138–141:

```sql
if current_setting('role',true) in ('anon','authenticated')
  and not exists (... expo_push_token=new.expo_push_token)
  and (select count(*) ... user_id=new.user_id)>=10
then raise exception 'Too many registered devices'; end if;
```

RPC :172 inserts/upserts first; only afterwards :178 deletes rows outside newest10. SECURITY DEFINER changes current_user but current_setting('role') remains authenticated, so trigger applies to authenticated RPC callers.

Root cause: intended keep-newest10 cleanup is unreachable for the eleventh brand-new token; BEFORE INSERT raises before cleanup. Transferring an already-existing token takes a different branch and can reach cleanup, but does not fix a new device. Mobile registration catches error and returns null, no user-facing device-management action. No later override (global scan/backend confirmation). Actual count/device registration UNVERIFIED.

Proposed diff/design:

```diff
+ serialize register_push_token by user advisory lock
+ in trusted RPC, remove only oldest owned excess token(s) before inserting brand-new token
  insert ... on conflict ...;
  keep newest10 deterministically (timestamp,id)
```

Retain trigger cap for direct writes, account-bound takeover, rate limiting and rollback atomicity. Decide whether product intends hard10 refusal or automatic oldest eviction; if refusal is deliberate, provide device-management/error UI and remove misleading keep-newest behavior claim. Test10 existing + new11th via actual authenticated-role RPC; expect final count10/new token present/oldest gone under eviction policy, concurrent calls bounded, existing token refresh does not delete itself.

### BACK-16 — Medium — Deployed recovery accepts another owner's order UUID without login

Locations: deployed `functions/verify-payment/index.ts:58`–`:82`; current owner checks `supabase/functions/verify-payment/index.ts:66` and `:111`.

```ts
// deployed: no getUserFromAuthHeader import/call
const order = await db.from('orders').select('id,razorpay_order_id').eq('id',internalOrderId);
if (recover) {
  const captured = await fetchCapturedPaymentForOrder(order.razorpay_order_id);
  return settle(order.razorpay_order_id,captured.id);
}
```

Anyone who learns an order UUID can distinguish missing/not-started/unpaid/paid and receive payment amount after verified settlement; they can also trigger provider work. UUID unpredictability reduces discovery, but does not authorize access. Grant still goes to actual order owner after real provider verification, so this is not a free-entitlement/ownership takeover.

```diff
+if (recover) require verified Auth bearer
+recovery query.eq('user_id',verifiedUser.id)
+wrong-owner and missing-order responses indistinguishable
+signed callback HMAC checked before order lookup
```

The full current-source boundary already implements this. Acceptance: no JWT401, other user404, owner normal pending/success; signed callback valid/invalid; recovered refund remains terminal; no probe leaks product/contact/user data.

## BACK-17 — Low — Legacy self-delete RPC bypasses Edge deletion rate limits

Locations: supabase/migrations/20260922100000_phase1a_sync_and_order_security.sql:1985–2013, current Edge supabase/functions/delete-account/index.ts:39 and:58. Live pg_proc has authenticated EXECUTE and identical wrapper; exact definition backend-live-wallet-push-rpcs.json.

```sql
create or replace function public.delete_my_account() returns void ... security definer ...
  v_uid uuid := auth.uid();
  v_res := public.erase_user_data(v_uid);
  if v_res->>'status'='admin_blocked' then raise exception ...; end if;
  delete from auth.users where id=v_uid;
...
grant execute on function public.delete_my_account() to authenticated;
```

Root cause: backwards compatibility preserves a second destructive entrypoint without the Edge limiter. A signed-in student can call RPC directly rather than delete-account and avoid the fail-closed IP/account counters around the Edge Auth/erase/delete work. Caller ownership and admin refusal remain enforced; financial anonymization uses current erase_user_data. This is not another-user deletion or proof of retention loss, and a user may legitimately delete their own account.

```diff
 -- only after released-client compatibility/retirement decision:
-grant execute on function public.delete_my_account() to authenticated;
+revoke execute on function public.delete_my_account() from authenticated;
 -- OR preserve compatibility and centralize account deletion limiting:
+apply shared DB-side rate-limit guard before erase_user_data/auth.users delete
+use same guard from Edge-backed and legacy RPC paths without double-counting
```

Acceptance: old-client support decision recorded, same-user deletion still works, unauth/admin denied, repeat/parallel calls bounded, failed-auth deletion retry and retained accounting semantics preserved. No production deletion tested. Main paid PDF URL expiresIn is120 seconds (get-note-url/index.ts:13,:58,:63), not180; existing URLs may remain usable until their issued expiry after revocation.

### Admin panel and hosted pages

The legacy page findings apply to the source copies. Tested canonical `www.medveda.in` pages serve the modern implementation; **no live legacy-XSS exposure was demonstrated**. Other historical host aliases/deployment roots remain a manual inventory check.

### WEB-01 — High — legacy password-reset DOM XSS

`reset-password.html:113,120–124,139–140` and byte-identical `github-original-website/reset-password.html`:
```js
const errorDescription = params.get("error_description");
content.innerHTML = '<div class="error-box">' + message + "</div>" + ...;
renderError(errorDescription.replace(/\+/g, " "));
```
Root cause: attacker-controlled URL fragment becomes HTML without escaping. A synthetic local URL ending `#error_description=%3Cimg%20src=x%20onerror=alert(1)%3E` reaches an event-handler sink. If either legacy deployment serves this page without an effective CSP, code runs under its origin and can replace the recovery UI or read any fragment credentials supplied with the malicious message. This is a confirmed source sink, not a demonstrated production takeover. Current `website/assets/js/auth-common.js:42` uses `textContent`, so the modern fix did not cover these copies.

Proposed smallest patch in BOTH copies (or replace both with a fixed-origin redirect to the current bridge after owner confirms legacy routing):
```diff
 function renderError(message) {
   content.innerHTML =
-    '<div class="error-box">' + message + "</div>" +
+    '<div class="error-box" id="reset-error"></div>' +
     '<a class="btn" href="ayurpulse://reset-password">Open MedVeda App</a>' + ...;
+  document.getElementById("reset-error").textContent = message;
 }
```
Manual exposure check: enumerate Vercel project root/output, custom domain aliases and any GitHub Pages deployment; open each legacy `/reset-password(.html)` with an inert HTML marker on a staging/local copy, inspect DOM, then check actual CSP headers. Do not send real reset tokens in a security test.

### WEB-02 — Medium — legacy recovery links retain credentials and target a retired scheme

Both legacy reset pages `:108–116,123,130,136,143` read the hash without `history.replaceState`, inject tokens into an anchor and automatically navigate to `ayurpulse://reset-password`; current production website config uses `medveda://`. A returning user landing on an older hosted URL can be stranded; credentials remain in browser history and DOM. Tokens in fragments are not HTTP referrers, so this does NOT claim a referrer leak.
```diff
 const params = new URLSearchParams(hash);
+history.replaceState(null, "", location.pathname + location.search);
-"ayurpulse://reset-password#access_token="
+"medveda://reset-password#access_token="
-'<a class="btn" href="ayurpulse://reset-password">Open MedVeda App</a>'
+'<a class="btn" href="medveda://reset-password">Open MedVeda App</a>'
-window.location.href = appUrl;
+// Keep the visible explicit user-tap action; do not auto-launch.
```
Preferred reviewed replacement: retire the duplicated bridge in favor of the current fixed-origin bridge, preserving only the in-memory fragment during the redirect. Verify every old redirect URL and installed production/staging scheme before deployment. Live legacy exposure is UNVERIFIED.

### WEB-03 — Medium — conflicting purchase instructions on the current site

`website/_src/pages/index.html:52` says `Buy notes ... and read them instantly`; `download.html:7,10` says browse and buy/unlock notes. But `terms.html:17`, `features.html:17`, `how-it-works.html:9` and `_src/faq.mjs:26` say `New purchases are unavailable in this Android app version`. Generated pages exactly reproduce this disagreement. Users following Google Play download CTA receive mutually incompatible instructions. Product channel status is a live/release fact to reconcile with the release owner; the source inconsistency itself is confirmed.
```diff
-<li><h3>Unlock premium notes</h3><p>Buy notes per chapter, subject, year or bundle and read them instantly.</p></li>
+<li><h3>Open your purchased notes</h3><p>Previously purchased Notes remain available in your account. See the payments FAQ for purchase availability in your app version.</p></li>
-<li>An internet connection to sign in, browse and buy (downloaded notes and quizzes work offline)</li>
+<li>An internet connection to sign in and browse; downloaded notes and quizzes work offline within the app's access limits</li>
```
Apply equivalent wording to download after-install step; regenerate committed HTML. This is a copy proposal, not permission to enable payments.

### WEB-04 — Medium — legacy privacy promises contradict current disclosure

`privacy.html:49,52,55` and byte-identical GitHub copy claim Mumbai hosting, sharing only with Razorpay/Supabase, and deletion of purchase history. Root/GitHub `index.html:452` repeats Mumbai. Current `website/_src/pages/privacy-policy.html:34,36–39,45–47` states Seoul hosting, Expo/Sentry/email providers and retained transaction/fraud records. Source copies provide conflicting declarations; actual hosted region/retention is UNVERIFIED here. Older refunds/terms also omit Play and disagree with current refund windows and response time.
```diff
-<p>Data is stored using Supabase (... Mumbai region) ...</p>
+<p>Read the current <a href="https://www.medveda.in/privacy-policy">MedVeda Privacy Policy</a> for hosting, processors, retention and deletion information.</p>
```
Preferred: static host 308 mappings `/privacy(.html)` → fixed `https://www.medveda.in/privacy-policy`, `/refunds(.html)` → `/refund-policy`, `/terms(.html)` → `/terms`; preserve old incoming links. Validate the hosting inventory first; do not delete legacy files assuming they are unreachable.

### ADM-01 — Medium — clearing product MRP does not clear the stored discount

`admin-panel/src/components/ProductFormModal.tsx:465–470` writes `originalPrice: undefined` when the field is blank. `services/productService.ts:57–60` sends the result through `toSnakeCase` to `.update`. JSON serialization omits undefined properties, leaving the previous `original_price` intact. The types say blank/0 hides discount (`types/product.ts:27–31`), but baseline DB constraint `supabase/migrations/20260701000000_baseline_live_schema.sql:484–485` requires null or original_price >= price, so entering zero for a positive-price product is rejected. Repro: edit a product with MRP > price, clear MRP, save/reload; discount returns.
```diff
 // services/productService.ts updateProduct
-const { chapterTitle, subjectTitle, yearTitle, yearTitles, courseTitle, ...payload } = data;
+const { chapterTitle, subjectTitle, yearTitle, yearTitles, courseTitle, ...rest } = data;
+const payload = { ...rest, originalPrice: rest.originalPrice == null || rest.originalPrice === 0 ? null : rest.originalPrice };
```
Apply consistent normalization on insert and validation; use `originalPrice?: number | null` if storing null in the form. Verify against a synthetic product in staging; no live write was performed.

### ADM-02 — Medium — four content forms can be closed during save, allowing a stale completion to close another editor

`CourseFormModal.tsx:67–90,95–98`, `YearFormModal.tsx:75–91,96–99`, `SubjectFormModal.tsx:100–116,121–124`, `ChapterFormModal.tsx:125–141,146–149` pass no `closeDisabled={saving}` and have no synchronous submission ref. `Modal.tsx:12–25` defaults it to false, and `useDialogFocus.ts:16–18` honors Escape. Repro: throttle save A, close with X/Escape, open B, let A complete; old `onClose()` closes B and can discard B's unsaved edits. Rapid/programmatic submission can also insert duplicates. Current Note/Product/Quiz/Video forms already protect closing and have synchronous guards, demonstrating the intended pattern.
```diff
-import { useEffect, useState } from "react";
+import { useEffect, useRef, useState } from "react";
+const saveBusy = useRef(false);
 async function handleSubmit() {
-  if (!validate()) return;
+  if (saveBusy.current || !validate()) return;
+  saveBusy.current = true;
   try { setSaving(true); await onSubmit(form); onClose(); }
-  finally { setSaving(false); }
+  finally { saveBusy.current = false; setSaving(false); }
 }
 <Modal open={open} onClose={onClose}
+  closeDisabled={saving}
```
Apply to all four forms, retaining existing `useMemo` imports where needed. A lifetime/generation check is also needed if route navigation should remain possible during a mutation.

### ADM-03 — Medium — global notification sends are not idempotent

`pages/Notifications.tsx:11–25,34–39` sets React `loading` but has no synchronous guard or persistent request ID; `services/notificationService.ts:22–29` submits title/body/type only. `supabase/functions/send-push-notification/index.ts:86–102` inserts a new broadcast before token enumeration; enumeration error returns 500 after persistence. Repro: successful insert followed by token query error; admin sees failure, retries, creating duplicate feed rows. A double handler invocation before rerender also starts two broadcasts. The 10/hour server throttle is not deduplication.
```diff
-import { useState } from "react";
+import { useRef, useState } from "react";
+const sending = useRef(false);
 const sendNotification = async () => {
+  if (sending.current) return;
   if (!title.trim() || !message.trim()) { ...; return; }
+  sending.current = true;
   try { ... }
-  finally { setLoading(false); }
+  finally { sending.current = false; setLoading(false); }
```
This only closes same-render duplicates. Complete proposal: generate one request UUID per composed notification, retain it across ambiguous failures, extend service/handler body with `requestId`, and reserve/upsert a server-side delivery record with a unique `(admin_id, request_id)` before persistence/dispatch. Return existing result on replay; mark provider-unknown batches and prohibit blind retry. This requires a separately reviewed schema/worker change. Until then, explicitly distinguish `notification saved, push not completed` from unsaved failure and direct admin to reconcile feed before retrying.

### ADM-04 — Medium — billing status is truncated while product list is fully paginated

`services/playBillingSyncService.ts:15–18` uses `.select("*")` without range/order. `productService.ts:11–16` pages every product, and `components/ProductTable.tsx:97,106–108` labels missing status `Pending` and hides Retry sync when no billing row exists. View `20261016100000_play_catalog_sync.sql:262–275` emits one row per product. For a catalog above Data API max rows, products past the cap always appear pending even if ready/failed and cannot be retried. The exact deployed max row setting/count is UNVERIFIED.
```diff
+import { fetchAllPages } from "../utils/filters";
-const { data, error } = await supabase.from("admin_play_billing_status").select("*");
-if (error) throw error;
-return Object.fromEntries(((data ?? []) as BillingStatus[]).map(...));
+const data = await fetchAllPages<BillingStatus>(() =>
+  supabase.from("admin_play_billing_status").select("*").order("product_id"));
+return Object.fromEntries(data.map((row) => [row.product_id, row]));
```
Use a query scoped to visible product IDs as a more scalable alternative. Manual check: read aggregate product count/max_rows, then synthetic >cap fixtures in staging; compare first/last billing statuses.

### ADM-05 — Low — Retry falsely reports a successful mutation

`hooks/useNotes.ts:75,87`, `useVideos.ts:75,87`, `useQuiz.ts:75,87` expose `reload: refreshAfterMutation`. Their list Retry buttons invoke it after an initial read failure. A second failed read then says `The note/video/quiz change succeeded` even though no mutation happened. This partially undermines historic F11's otherwise present Retry action.
```diff
-reload: refreshAfterMutation,
+reload: loadNotes,
```
Use loadVideos/loadTests for the equivalent hooks. Notes upload path `pages/Notes.tsx:72–73` should invoke an explicitly exposed `refreshAfterMutation` so genuine upload-save refresh failures remain truthful.

### ADM-06 — Low — Referrals and Review Flags errors have no Retry action

`pages/Referrals.tsx:75` does not destructure hook `reload`; error at :376 is text only. `pages/ReviewFlags.tsx:91` is also text only despite a guarded `load` function. On transient read failure, users must leave/reload the route; Review Flags additionally says `Nothing needs review` at :112–115 while error is present.
```diff
-const { referrals, settings, audit, loading, error, saveSettings, reject } = useReferrals(...);
+const { referrals, settings, audit, loading, error, reload, saveSettings, reject } = useReferrals(...);
-{error && <p className="text-red-500">{error}</p>}
+{error && <div role="alert"><p>{error}</p><button onClick={() => void reload()}>Retry</button></div>}
```
ReviewFlags uses `load()` and guards its empty row with `!error`. Dashboard similarly drops `reload` at :13 and has no retry for failed count cards; add an aggregate retry using the existing hook function.

### ADM-07 — Medium — referral filter reload silently destroys unsaved settings

`hooks/useReferrals.ts:28–46` refetches settings/audit on every status change and installs a new settings object. `pages/Referrals.tsx:95–97` unconditionally copies it to form. Repro: edit referral reward/discount without saving, select Pending/Rewarded to inspect referrals, wait for read; all unsaved settings revert without warning. The same coupling allows a response begun before settings save to replace form data during a network race.
```diff
 // Split settings bootstrap/explicit refresh from status-dependent referral list reads.
-const [list, s, log] = await Promise.all([getReferrals(status), getReferralSettings(), ...]);
+const list = await getReferrals(status);
 setReferrals(list);
-setSettings(s);
-setAudit(log);
```
Add a separate guarded `loadSettings` called on mount and after successful save, and copy into the form only on initial load/explicit reset/save confirmation. Preserve edited fields using a dirty flag and bind the confirmation dialog to a saved payload snapshot.

### ADM-08 — Medium — offset pagination is unstable under concurrent inserts/deletes

`utils/filters.ts:21–28` issues independent offset/range requests; notes/orders/products/users/referrals are ordered newest-first and paged. A new newest row after page 1 shifts the boundary, repeating an existing row on page 2; a deletion skips one. `analyticsService.ts:40–76` sums repeated paid rows, so this can overstate revenue and top products. This is distinct from the old >1000-row truncation fix, which is present. Repro with 501 synthetic rows: read first 500, insert one at the front, then offset 500; last old row repeats.
```diff
 // Financial analytics: compute the complete aggregate in one authenticated DB snapshot.
-const orders = await fetchAllPages<any>(() => ...);
+const { data, error } = await supabase.rpc("get_admin_analytics", { p_course_id: filters.courseId ?? null });
+if (error) throw error;
+return data;
```
The proposed RPC must check `am_i_admin()` and use one statement/snapshot. For lists use stable keyset `(created_at,id)` pagination with an initial upper-bound cursor; an ID Map also prevents duplicated rendering/counting but cannot repair skipped records. No schema/RPC was added in this audit.

### ADM-09 — Medium — referral settings UPDATE can report success after writing zero rows

`services/referralService.ts:28–35` checks only `.error` from `.update(...).eq("id",true)` and does not ask for a returned row. PostgreSQL RLS can hide the row without an error (for example admin membership/AAL authorization changed after the form loaded). `pages/Referrals.tsx:129–130` subsequently reports `Referral settings saved.` A missing singleton has the same behavior. Most other admin mutation services now use `.select("id").single()`; this older path was missed.
```diff
 .update(toSnakeCase(payload))
-.eq("id", true);
+.eq("id", true).select("id").single();
 if (error) throw error;
```
Do not silently upsert a missing financial-settings row. Test with a mocked zero-row update and with AAL1/staging RLS denial; no production authorization was changed.

### Build, dependencies and test infrastructure

### CFG-01 — Medium — Required Expo SDK patch compatibility check fails

**Status:** Confirmed. **Files:** `mobile-app/package.json:26`, `:30`, `:38`, `:41`, and the corresponding installed lockfile entries. Fresh online `expo-doctor` reports 20/21 passed, and `expo install --check` exits 1. This supersedes the initial offline compatibility check, which had passed using its cached manifest.

```json
"expo": "~57.0.32",
"expo-constants": "~57.0.19",
"expo-sqlite": "~57.0.4",
"expo-updates": "~57.0.27"
```

**Root cause:** Installed lockfile versions are behind the current SDK 57 compatibility manifest: Expo 57.0.32 versus expected ~57.0.33, Constants 57.0.23 versus ~57.0.24, SQLite 57.0.4 versus ~57.0.5, Updates 57.0.27 versus ~57.0.28. This demonstrates a failed required compatibility gate; it does not establish a specific crash in those releases.

**Failure scenario:** A release built from this lockfile fails the requested Expo compatibility check and omits current compatible SDK patch fixes. Native changes must be qualified in a new binary, not presumed repaired by OTA.

**Proposed diff:**

```diff
--- a/mobile-app/package.json
+++ b/mobile-app/package.json
-    "expo": "~57.0.32",
+    "expo": "~57.0.33",
-    "expo-constants": "~57.0.19",
+    "expo-constants": "~57.0.24",
-    "expo-sqlite": "~57.0.4",
+    "expo-sqlite": "~57.0.5",
-    "expo-updates": "~57.0.27",
+    "expo-updates": "~57.0.28",
```

Regenerate the mobile lockfile using Expo's compatible installer after Phase 2 approval, then repeat Doctor/type/lint/tests and native PDF/billing/update acceptance. Do not suppress Doctor's check to manufacture a pass.

### CFG-02 — Medium — Mobile and lint toolchains contain published dependency advisories

**Status:** Confirmed advisory matches; application exploitability not demonstrated. **Files:** `mobile-app/package.json:26,48`, `tooling/package.json:9,12`, their lockfiles, and raw `mobile-npm-audit.log` / `tooling-npm-audit.log`.

```json
"react-native-blob-util": "^0.24.10"
"eslint": "10.13.0"
"typescript-eslint": "8.59.4"
```

**Root cause:** The resolved dependency graphs include vulnerable glob/minimatch versions. Fresh npm audit finds mobile **4 moderate, 0 high, 0 critical**, tooling **9 moderate, 0 high, 0 critical**, and admin **0**. Counts include transitive affected packages, not 13 independent root vulnerabilities. Mobile paths include `@expo/fingerprint`, `glob`, `minimatch`, and `react-native-blob-util`; tooling paths include ESLint/typescript-eslint and minimatch.

**Failure scenario:** Untrusted/adversarial glob inputs can amplify filesystem/pattern work in affected tooling. This is not evidence that a remote app user can execute code or attack the shipped native PDF viewer. Advisory classification is kept distinct from reachability.

**Proposed diff:** Prefer upgrading the parent packages to versions that select fixed dependencies. A concrete fallback candidate uses already-present fixed versions (the mobile lockfile already resolves 14.0.4/11.0.5 under other Expo parents):

```diff
--- a/mobile-app/package.json
+++ b/mobile-app/package.json
   "overrides": {
+    "glob": "14.0.4",
+    "minimatch": "11.0.5",
     "image-size": "2.0.4",
--- a/tooling/package.json
+++ b/tooling/package.json
+  "overrides": { "minimatch": "11.0.5" },
   "devDependencies": {
```

Regenerate both lockfiles. This override crosses major dependency boundaries, so the proposed fallback is **not compatibility-approved**: review all import/API callers and run Doctor/build/lint/tests before choosing it in Phase 2. Use compatible upstream parent upgrades instead where available. Do not run `npm audit fix --force` blindly. No dependency was installed or changed during this audit. The advisories identify minimatch >=11.0.1 and glob >=14.0.2 as fixed: [minimatch amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249), [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).

### QA-01 — Low — Historical payment harnesses do not match current helper migration dependencies

**Status:** Confirmed test failure; no successful entitlement bypass. **Files:** `supabase/tests/run-mv003-local.py:28,39,46`, `supabase/tests/run-phase-b-local.py:78`, `supabase/tests/run-phase-c-local.py`, `supabase/tests/mv003-entitlement-selftest.cjs:108`, and `supabase/functions/_shared/settle.ts:52`.

```python
if m.name.split('_')[0] <= '20261104110000':
    psql('-f', str(m), ...)
run(['node', 'supabase/tests/mv003-entitlement-selftest.cjs'])
```

```ts
await supabaseAdmin.rpc("reverse_refunded_capture", { ... });
```

**Root cause:** The historical wrapper assembles an older SQL baseline plus selected forward migrations but imports today's settlement helper. The helper now calls `reverse_refunded_capture`, introduced by the November 12 refund migration. A full-refund test consequently observes fail-closed HTTP **500** where the harness expects **400**. The wrapper stops before its remaining assertions. Full-current-schema `supabase/tests/run-all.sh` passes; these failing wrappers must not be presented as passing or as proof of a production grant vulnerability.

**Proposed diff:** Keep historical compatibility tests on their frozen, reviewed source bundle and add an explicit full-current-schema helper run:

```diff
--- a/supabase/tests/run-mv003-local.py
+++ b/supabase/tests/run-mv003-local.py
+# Before exercising CURRENT helper, install its full forward SQL dependencies.
+for m in sorted((root / 'supabase/migrations').glob('*.sql')):
+    if m.name.split('_')[0] > '20261110100000':
+        psql('-f', str(m), stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
 run(['node', 'supabase/tests/mv003-entitlement-selftest.cjs'])
```

Preserve the earlier historical snapshot assertions before this upgrade step; do not blindly add the latest schema to a test whose purpose is pre-upgrade compatibility. Phase B/C wrappers need the same explicit fixture/source separation. The initial six direct Node harness invocations also lacked their required local DB environment; those prerequisite failures are separately recorded in raw evidence and not counted as application defects.

## 4. Payment sequence and failure points

```text
Student -> Notes -> entitlement check
  owned/free preview -> get-note-url -> private signed URL (120s) -> viewer
  unowned -> provider gate
    standard production/internal-testing: disabled -> purchase-unavailable UI
    approved native Play/UCB build or dedicated non-Play test build -> quote

Client -> quote_my_order(productId,useWallet) [NO client price authority]
  unavailable/blocked/unpublished -> deny
  already_owned -> must open purchases [MOB-18: current screen only Retry]
  quote/network error -> retry; no charge
  quote ready -> synchronous submit guard

PLAY/UCB PATH:
  Client -> create-play-order(JWT,productId)
    -> auth/rollout gates -> SQL locks/publication/catalog checks -> order snapshot
    403/catalog not ready -> fail before native payment [manual Play-403 checks]
    current deployment lacks some current gates/endpoints [BACK-04]
  Client -> native catalog fetch (15s deadline) -> exact SKU/INR offer match
    missing/mismatched offer/timeout -> fail before charge
  Client -> BillingClient user-choice integration/native purchase UI
    cancel/error -> listener -> restore button/retry after known terminal result
    promise resolves, callback lost -> recovery required [MOB-04: UI can stick]
    account changes -> drop old result; native receipt still needs owner recovery
    pending purchase -> pending UI; NEVER grant
    Google payment -> verify-play-purchase(JWT,token,order,product)
      -> Google API -> validate purchased state, SKU, quantity/account binding
      -> atomic settle_play_purchase -> purchase/order committed
      -> consume/acknowledge after commitment; failed call -> durable worker retry
      -> success screen only for verified server success
      refund/void -> worker Google verification -> reverse entitlement/wallet/referral
      inactive consume/reconcile/void jobs [BACK-03] threaten recovery/deadline
    alternative selected -> durable external token + buyer-state/context
      -> attach-external-token -> create-order-play-choice -> Razorpay below
      missing deployed functions/report worker -> broken flow [BACK-04/BACK-03]
      amount changed -> reconfirm reserved server price; do not silently charge

RAZORPAY PATH (non-Play or enrolled user-choice alternative):
  Client -> authorized create-order endpoint (product + wallet flag, no amount)
    -> verified user -> server-priced SQL order/reservations -> Razorpay order API
    ambiguous create response -> receipt-based GET recovery, not blind second POST
    unknown/duplicate receipt -> fail closed/manual recovery
    unauthorized build/header -> source gates; headers are NOT attestation
  Client -> WebView checkout with server order/currency/amount
    blocked origin/invalid postMessage -> reject
    UPI app switch -> WebView renderer/callback may disappear
      app resume -> bounded owner recovery polling -> pending/terminal state
      uncertain status -> 'confirming' recovery, no replacement payment
    cancel/checkout failure -> status check; late capture can still settle

  SUCCESS CALLBACK -> verify-payment
    signed callback: HMAC-SHA256(order_id|payment_id), fixed-width compare
    unsigned recovery: verified JWT + owned internal order in CURRENT source
      [BACK-16: live older recovery lacks this owner/auth check]
    invalid signature/auth -> reject before financial mutation
    provider GET -> captured? correct order/currency/amount? -> reject mismatch
    full refund/dispute -> reverse; never grant [BACK-01 live SQL gap]
    DB/provider outage -> fail closed/pending; retry same payment
    settleCapturedPayment -> service RPC -> row/advisory locks + snapshots
      atomic order/payment/purchase + wallet debit/referral transition
      duplicate -> verify exact committed entitlement; never grant from UI flag
      capture without eligible grant -> durable compensation/reversal queue
      transaction failure -> rollback -> retry
    -> confirmed success only after owner-bound entitlement commitment

  WEBHOOK, independent of client:
    raw body -> HMAC verify (current/previous secret rotation window)
    -> validate event -> durable provider inbox -> provider GET -> same settlement
    callback/webhook race -> SQL serialization/idempotency -> one grant/debit
    duplicate/replayed event -> recognized recorded outcome; no second reward
    refund/dispute before linkage -> retain inbox/retry, not permanent ACK
      [BACK-02: live older handler ACKs unknown outcome without durable inbox]
    partial refund -> apply documented partial policy, not blanket full revoke
    full refund/lost dispute -> revoke purchase/access + correct financial reversal
    dispute won -> only explicit authorized restoration path
    invalid/unrecognized RPC outcome -> retryable response; no false success

RECOVERY/REPORTING:
  cron -> claim leased bounded jobs -> settle/report/consume/refund/reconcile
    provider timeout/429/5xx -> retain with retry/backoff; parked job -> alert
    expired lease/process kill -> replay idempotently
    native/store restore -> server verification, never trust client receipt alone
      [MOB-03: disabled-sales production currently disables this restore caller]
    UCB -> external transaction report/refund report to Google, exact amounts/tax
      absent/inactive deployed workers -> operations incomplete [BACK-03]
      batch budget currently undercounts serial calls [BACK-09]
```

This diagram covers current source intent and identifies known live deviations. It does not assert provider acceptance, enrollment, successful real UPI recovery, or delivery of refunds. The three-day Play acknowledgment requirement must be tested from `PURCHASED`, not `PENDING`; recurring subscriptions are not the configured per-product notes model. See [Google purchase processing](https://developer.android.com/google/play/billing/integrate), [one-time lifecycle](https://developer.android.com/google/play/billing/lifecycle/one-time), [UCB integration](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app), and [Razorpay webhook validation/idempotency](https://razorpay.com/docs/webhooks/validate-test).

### Schema versus financial queries

Current source writes settlement using settle.ts→service-only SQL RPCs; no grantPurchase.ts exists in the canonical function tree. product_title is a purchases field introduced by 20260801150000, retained in live schema and correctly used by SQL purchase INSERT. It is absent from orders/products; do not add it to those API payloads based on an old PGRST204 error.

| Financial table | live columns used by reviewed INSERT statements across canonical migration chain | insert field absent live |
|---|---|---|
| orders | amount, chapter_id, course_id, expires_at, id, list_price, play_purchase_option_id, play_sku, product_id, provider, referral_discount, referral_id, scope, status, subject_id, user_id, wallet_amount, year_id, year_ids | none |
| payments | amount, order_id, play_sku, product_id, provider, purchase_token, razorpay_order_id, razorpay_payment_id, status, user_id, verified_at | none |
| purchases | amount, chapter_id, course_id, order_id, product_id, product_title, razorpay_order_id, scope, status, subject_id, user_id, year_id, year_ids | none |
| wallet_ledger | amount, available_at, entry_type, expires_at, note, order_id, referral_id, reverses_id, source, status, user_id | none |
| referrals | code_used, qualified_at, referred_id, referrer_id, status | none |
| first_purchase_identities | account_id, first_purchase_at, identity_hash, kind | none |
| wallet_order_reservations | amount, expires_at, order_id, user_id | none |
| first_discount_reservations | order_id, referral_id, user_id | none |
| payment_captures | amount_paise, order_id, payment_id, provider_time, razorpay_order_id | none |
| payment_compensations | amount_paise, order_id, payment_id, reason, refund_request_id | none |
| provider_events | event_id, event_type, payload_hash, payment_id, provider_object_id, provider_time, razorpay_order_id | none |
| notes_choice_checkouts | buyer_state, choice_id, order_id, use_wallet | none |

Mutation UPDATE/UPSERT audit: current Edge order updates use status, razorpay_order_id, play_consumption_status, play_last_attempt_at/play_last_checked_at, payment/capture completion markers, external report/refund status/error/attempt/test fields and UCB transaction time, all present live. SQL financial updates use the live order identity/scope/price/provider/tax snapshot columns; purchase status/ownership/snapshot fields; wallet status/status_changed_at/amount/reverses_id/availability/expiry fields; referral status/order markers/qualification/reward/reject fields. Ledger fields were checked against backend-columns.json; complete insert-name scan above found no removed/absent field. This is source/schema validation, not permission to mutate immutable fields: triggers independently constrain updates. No migration/code missing financial column was confirmed. The only missing current SQL API dependencies are the three Nov12 helper RPCs, not columns.

Four public views were checked: admin_play_billing_status uses security_invoker=true plus am_i_admin and underlying RLS; payment_queue_metrics/play_recovery_metrics/play_void_sweep_metrics have no anon/auth SELECT grants. Their default definer behavior therefore does not expose payment/token data to clients. Metadata in backend-views.json.

## 5. RLS and permission matrix

The following matrix is based on retrieved production metadata, not merely the migration filenames. All **57 public tables have RLS enabled**. `admin` means an authenticated user for whom `am_i_admin()` is true; it is not a distinct SQL role. MFA is currently optional by production configuration (BACK-06). Service role bypasses RLS but remains subject to explicit SQL constraints/triggers. Public read policies using `true` on intended public configuration/broadcasts are not automatically vulnerabilities; targeted data in the broadcast table is the separate BACK-05 defect. Profiles cannot self-edit protected balance/admin/purchase fields through the reviewed protected-field triggers.

Legend: S/I/U/D; columns describe effective RLS authority after SQL grants, not just ACL. O=own row; A=admin membership with configured MFA; C=published allowed course scope; P=public. Admin is authenticated + am_i_admin, not a separate SQL role. Table-wide restrictions do not prevent an independently validated SECURITY DEFINER RPC. Service denotes SQL CRUD grants with BYPASSRLS.

| Table | anon | authenticated student | authenticated admin | service role | predicate / RPC caveat |
|---|---|---|---|---|---|
| admin_settings | - | - | - | S/I/U/D | No client policy |
| admins | - | - | S(A) | S/I/U/D | admins_admin_only |
| analytics_events | I(user_id=NULL) | I(O or user_id=NULL) | I(O or NULL) | S/I/U/D | analytics_insert_own_or_anon |
| app_config | S(P) | S(P) | S/I/U/D(A) | S/I/U/D | app_config_admin_delete; app_config_admin_insert; app_config_admin_update; app_config_public_read |
| app_settings | - | S(signed-in) | S/U(A) | S/I/U/D | app_settings_admin_update; public read app_settings |
| chapters | - | S(C) | S/I/U/D(A) | S/I/U/D | chapters_admin_write; chapters_public_read_active; chapters_published_ancestry |
| courses | S(active) | S(active) | S/I/U/D(A) | S/I/U/D | courses_admin_write; courses_public_read_active |
| first_discount_reservations | - | - | - | S/I/U/D | No client policy |
| first_purchase_identities | - | - | - | S/I/U/D | No client policy |
| nonplay_test_attempts | - | - | - | S/I/U/D | No client policy |
| nonplay_test_audit | - | - | - | S/I/U/D | No client policy |
| nonplay_test_checkouts | - | - | - | S/I/U/D | No client policy |
| nonplay_test_config | - | - | - | S/I/U/D | No client policy |
| nonplay_test_entitlements | - | - | - | S/I/U/D | No client policy |
| nonplay_test_notes | - | - | - | S/I/U/D | No client policy |
| nonplay_test_orders | - | - | - | S/I/U/D | No client policy |
| nonplay_test_products | - | - | - | S/I/U/D | No client policy |
| nonplay_test_users | - | - | - | S/I/U/D | No client policy |
| nonplay_test_webhooks | - | - | - | S/I/U/D | No client policy |
| note_pdf_validation_jobs | - | - | - | S/I/U/D | No client policy |
| note_upload_requests | - | - | - | S/I/U/D | No client policy |
| notes | - | S(C) | S/I/U/D(A) | S/I/U/D | notes_admin_write; notes_public_read_active; notes_published_ancestry |
| notes_choice_checkouts | - | - | - | S/I/U/D | No client policy |
| notifications | S(active) | S(active) | S/I/U/D(A) | S/I/U/D | notifications_admin_write; notifications_public_read_active |
| order_review_flags | - | - | S(A) | S/I/U/D | order_review_flags_admin_select |
| orders | - | S(O) | S(A) | S/I/U/D | orders_select_own_or_admin |
| payment_captures | - | - | - | S/I/U/D | No client policy |
| payment_compensations | - | - | - | S/I/U/D | No client policy |
| payment_jobs | - | - | - | S/I/U/D | No client policy |
| payment_sessions | - | S(O) | S(A) | S/I/U/D | payment_sessions_select_own |
| payments | - | S(O) | S(A) | S/I/U/D | Users can view own payments; payments_admin_read |
| play_payment_jobs | - | - | - | S/I/U/D | No client policy |
| play_price_sync | - | - | S(A) | S/I/U/D | admin_read_play_sync |
| play_price_sync_logs | - | - | - | S/I/U/D | No client policy |
| play_price_tiers | - | - | S(A) | S/I/U/D | admin_read_play_tiers |
| play_recovery_cursor | - | - | - | S/I/U/D | No client policy |
| play_void_sweep_state | - | - | - | S/I/U/D | No client policy |
| play_void_tokens | - | - | - | S/I/U/D | No client policy |
| products | - | S(C) | S/I/U/D(A) | S/I/U/D | products_admin_write; products_public_read_active; products_published_ancestry |
| profiles | - | S/U(O, protected-field trigger) | S/U(A) | S/I/U/D | profiles_admin_all; profiles_select_own_or_admin; profiles_update_own |
| provider_events | - | - | - | S/I/U/D | No client policy |
| purchases | - | S(O) | S(A) | S/I/U/D | purchases_select_own_or_admin |
| push_tokens | - | S/I/U/D(O) | S/I/U/D(A) | S/I/U/D | push_tokens_own |
| quiz_scores | - | S/I/U/D(O,legacy unverified) | S/I/U/D(A) | S/I/U/D | quiz_scores_own_or_admin |
| quiz_tests | - | S(metadata columns,C); question RPC | S(metadata)/I/U/D(A); full admin RPC | S/I/U/D | quiz_tests_admin_write; quiz_tests_public_read_active; quiz_tests_published_ancestry |
| rate_limits | - | - | - | S/I/U/D | No client policy |
| razorpay_webhook_events | - | - | - | S/I/U/D | No client policy |
| referral_settings | - | S(signed-in) | S/U(A) | S/I/U/D | referral_settings_admin_write; referral_settings_read_authenticated |
| referral_settings_audit | - | - | S(A) | S/I/U/D | referral_settings_audit_admin_read |
| referrals | - | - | S(A) | S/I/U/D | referrals_admin_write |
| subjects | - | S(C) | S/I/U/D(A) | S/I/U/D | subjects_admin_write; subjects_public_read_active; subjects_published_ancestry |
| ucb_external_refunds | - | - | - | S/I/U/D | No client policy |
| verified_quiz_attempts | - | S(O) | S(A) | S/I/U/D | verified_quiz_attempts_read |
| videos | - | S(C) | S/I/U/D(A) | S/I/U/D | videos_admin_write; videos_public_read_active; videos_published_ancestry |
| wallet_ledger | - | S(O) | S(A) | S/I/U/D | wallet_ledger_select_admin; wallet_ledger_select_own |
| wallet_order_reservations | - | - | - | S/I/U/D | No client policy |
| years | S(active course+year) | S(active course+year) | S/I/U/D(A) | S/I/U/D | years_admin_write; years_public_read_active |

Service trigger validation still applies. notes PDF URL/object path metadata is visible under C but private object bytes require the URL Edge Function; quiz questions/answers are not granted as table SELECT. get_public_quiz_tests strips answers; admin RPC checks am_i_admin. Financial writes are RPC/server-only even for authenticated admins. All 57 public tables have RLS enabled.

Public RPC correction: anon EXECUTE includes user_owns_chapter(text), in addition to am_i_admin(), get_maintenance_mode(), normalize_phone(text). user_owns_chapter uses auth.uid() and cannot select another owner. No arbitrary-user access helper is anon callable.

### Public RPC execution authority

An EXECUTE grant alone is not row authority: each user/admin RPC must additionally validate `auth.uid()`/`am_i_admin()`. Definer routines and search paths were reviewed through the final migration chain; legacy pricing/settlement helpers have client execution revoked. The table below records every retrieved live public RPC, including routines not exposed to client roles. Exact policy expressions, column-only quiz grants and SQL metadata are in the backend JSON evidence.

| Function(signature) | definer | anon | authenticated | service role |
|---|---|---|---|---|
| accounts_share_network(p_a uuid, p_b uuid) | True | False | False | True |
| admin_mfa_required() | True | False | False | True |
| admin_reject_referral(p_referral_id uuid, p_reason text) | True | False | True | True |
| admin_resolve_order_flag(p_flag_id uuid, p_note text) | True | False | True | True |
| admin_reverse_wallet_credit(p_ledger_id uuid, p_note text) | True | False | True | True |
| admin_set_order_status(p_order_id text, p_status text) | True | False | True | True |
| am_i_admin() | True | True | True | True |
| analytics_events_rate_limit() | True | False | False | True |
| app_config_touch_updated_at() | False | False | False | True |
| apply_referral_code(p_code text) | True | False | True | True |
| attach_ucb_external_token(p_user_id uuid, p_order_id text, p_token text) | True | False | False | True |
| backfill_auth_user_profile(p_user_id uuid) | True | False | False | False |
| bind_ucb_razorpay_order(p_user_id uuid, p_choice_id text, p_razorpay_id text, p_buyer_state text) | True | False | False | True |
| block_client_writes() | True | False | False | True |
| bump_quiz_question_revision() | False | False | False | True |
| change_my_phone(p_phone text) | True | False | True | True |
| chapters_derive_course() | True | False | False | True |
| chapters_propagate_course_move() | True | False | False | True |
| claim_note_pdf_validation() | True | False | False | True |
| claim_payment_jobs(p_kind text, p_limit integer) | True | False | False | True |
| claim_play_payment_jobs(p_kind text, p_limit integer) | True | False | False | True |
| claim_play_price_sync() | True | False | False | True |
| claim_play_recovery_cursor() | True | False | False | True |
| claim_play_void_sweep() | True | False | False | True |
| claim_ucb_external_refund(p_refund_id text) | True | False | False | True |
| content_is_published(p_course_id text, p_year_id text, p_subject_id text, p_chapter_id text) | True | False | True | True |
| create_play_order(p_user_id uuid, p_product_id text) | True | False | False | True |
| create_priced_order(p_user_id uuid, p_product_id text, p_use_wallet boolean) | True | False | False | True |
| create_priced_order_legacy(p_user_id uuid, p_product_id text, p_use_wallet boolean) | True | False | False | False |
| delete_my_account() | True | False | True | True |
| enqueue_payment_jobs() | True | False | False | True |
| enqueue_play_payment_jobs() | True | False | False | True |
| erase_user_data(p_user_id uuid) | True | False | False | True |
| fail_play_price_sync(p_price numeric, p_lease uuid, p_reason text, p_retry boolean) | True | False | False | True |
| finish_note_pdf_validation(p_request_id uuid, p_lease uuid, p_outcome text, p_error text) | True | False | False | True |
| finish_payment_job(p_kind text, p_target_id text, p_lease_id uuid, p_success boolean, p_error text) | True | False | False | True |
| finish_play_payment_job(p_kind text, p_order_id text, p_lease_id uuid, p_success boolean, p_error text) | True | False | False | True |
| finish_play_price_sync(p_price numeric, p_lease uuid, p_sku text, p_option text) | True | False | False | True |
| finish_play_recovery_cursor(p_lease_id uuid, p_success boolean, p_next_page_token text, p_error text) | True | False | False | True |
| generate_unique_referral_code(p_length integer) | True | False | False | True |
| get_admin_quiz_tests(p_course_id text, p_year_id text) | True | False | True | True |
| get_maintenance_mode() | True | True | True | True |
| get_my_play_fulfillment(p_order_id text) | True | False | True | True |
| get_my_referral_list() | True | False | True | True |
| get_my_referrals() | True | False | True | True |
| get_my_wallet() | True | False | True | True |
| get_public_quiz_tests(p_subject_id text, p_test_id text) | True | False | True | True |
| grant_razorpay_payment(p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint) | True | False | False | True |
| guard_purchase_success_ownership() | True | False | False | True |
| guard_razorpay_order_transition() | True | False | False | True |
| handle_new_user() | True | False | False | True |
| handle_payment_dispute(p_razorpay_payment_id text, p_outcome text) | True | False | False | True |
| handle_payment_refund(p_razorpay_payment_id text, p_full_refund boolean) | True | False | False | True |
| has_content_access(p_course_id text, p_year_id text) | True | False | True | True |
| has_prior_purchase_identity(p_uid uuid) | True | False | False | True |
| identity_hash(p_kind text, p_value text) | False | False | False | True |
| is_admin_account() | True | False | True | True |
| log_referral_settings_change() | True | False | False | True |
| mark_ucb_report_attempt(p_order_id text, p_refund boolean) | True | False | False | True |
| my_course_id() | True | False | True | True |
| my_year_id() | True | False | True | True |
| nonplay_test_attach_order(p_user uuid, p_order uuid, p_provider text) | True | False | False | True |
| nonplay_test_immutable_order() | False | False | False | True |
| nonplay_test_observe_payment(p_order uuid, p_payment text, p_status text, p_amount integer, p_currency text, p_provider text, p_created timestamp with time zone) | True | False | False | True |
| nonplay_test_prepare_order(p_user uuid, p_product text, p_key uuid, p_key_id text) | True | False | False | True |
| nonplay_test_product_allowed(p_user uuid, p_product text) | True | False | False | True |
| nonplay_test_quote(p_user uuid, p_product text) | True | False | False | True |
| nonplay_test_user_allowed(p_user uuid) | True | False | False | True |
| normalize_phone(input text) | False | True | True | True |
| notes_derive_course() | True | False | False | True |
| orders_derive_course() | True | False | False | True |
| orders_entitlement_immutable() | False | False | False | True |
| orders_guard_client_writes() | True | False | False | True |
| orders_immutable_columns() | False | False | False | True |
| orders_play_option_immutable() | False | False | False | True |
| orders_reserve_first_discount() | True | False | False | True |
| orders_snapshot_tax() | True | False | False | True |
| play_entitlement_committed(p_order_id text, p_token text) | True | False | False | True |
| play_notes_product_eligible(p products) | True | False | True | True |
| play_price_has_eligible_product(p_price numeric) | True | False | False | True |
| play_purchase_entitlement_from_order() | True | False | False | True |
| prepare_notes_choice_checkout(p_user_id uuid, p_choice_id text, p_product_id text, p_use_wallet boolean, p_buyer_state text) | True | False | False | True |
| products_derive_course() | True | False | False | True |
| profiles_before_write() | True | False | False | True |
| profiles_generate_referral_code() | True | False | False | True |
| profiles_temp_default_course() | True | False | False | True |
| purge_expired_first_purchase_identities() | True | False | False | True |
| purge_old_analytics_events() | True | False | False | True |
| purge_old_payment_sessions() | True | False | False | True |
| push_tokens_cap() | True | False | False | True |
| queue_notes_play_price() | True | False | False | True |
| queue_play_price_sync(p_price numeric) | True | False | False | True |
| queue_product_play_price() | True | False | False | True |
| quiz_scores_own_email() | True | False | False | True |
| quiz_scores_rate_limit() | True | False | False | True |
| quiz_tests_derive_course() | True | False | False | True |
| quote_my_order(p_product_id text, p_use_wallet boolean) | True | False | True | True |
| quote_my_order_legacy(p_product_id text, p_use_wallet boolean) | True | False | False | False |
| rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer) | True | False | False | True |
| razorpay_entitlement_committed(p_order_id text, p_payment_id text) | True | False | False | True |
| razorpay_purchase_entitlement_from_order() | True | False | False | True |
| record_notes_choice_authorization(p_order_id text, p_provider_time timestamp with time zone) | True | False | False | True |
| record_payment_capture(p_payment_id text, p_razorpay_order_id text, p_amount_paise bigint, p_provider_time timestamp with time zone) | True | False | False | True |
| record_play_void_tokens(p_tokens text[]) | True | False | False | True |
| record_provider_event(p_event_id text, p_event_type text, p_razorpay_order_id text, p_payment_id text, p_provider_object_id text, p_payload_hash text, p_provider_time timestamp with time zone) | True | False | False | True |
| record_purchase_identity(p_uid uuid) | True | False | False | True |
| register_push_token(p_token text, p_platform text) | True | False | True | True |
| release_due_wallet_credits(p_user uuid) | True | False | False | True |
| requeue_stale_play_price_sync() | True | False | False | True |
| reserve_note_pdf_validation(p_request_id uuid, p_admin uuid, p_hash text, p_bytes bigint, p_url text) | True | False | False | True |
| retry_play_price_sync(p_price numeric) | True | False | True | True |
| reverse_payment(p_razorpay_payment_id text, p_purchase_status text, p_restore_wallet boolean) | True | False | False | True |
| reverse_play_payment(p_purchase_token text) | True | False | False | True |
| rls_auto_enable() | True | False | False | True |
| rotate_play_price_sku(p_price numeric, p_lease uuid, p_reason text) | True | False | False | True |
| save_note_with_upload(p_request_id uuid, p_note_id text, p_title text, p_description text, p_chapter_id text, p_order integer, p_active boolean, p_is_free_preview boolean) | True | False | True | True |
| set_admin_mfa_required(p_required boolean) | True | False | False | True |
| set_my_course_year(p_course_id text, p_year_id text) | True | False | True | True |
| settle_play_purchase(p_user_id uuid, p_order_id text, p_product_id text, p_play_sku text, p_purchase_token text, p_paid_at timestamp with time zone) | True | False | False | True |
| settle_razorpay_payment(p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint, p_paid_at timestamp with time zone) | True | False | False | True |
| settle_razorpay_payment_legacy(p_event_id text, p_razorpay_order_id text, p_razorpay_payment_id text, p_amount_paise bigint, p_paid_at timestamp with time zone) | True | False | False | False |
| subjects_derive_course() | True | False | False | True |
| subjects_propagate_course_move() | True | False | False | True |
| submit_quiz_attempt(p_attempt_id text, p_test_id text, p_question_revision bigint, p_answers jsonb) | True | False | True | True |
| sync_profile_email() | True | False | False | True |
| sync_profile_mobile_verified() | True | False | False | True |
| sync_profile_phone_normalized() | False | False | False | True |
| touch_profile_updated_at() | False | False | False | True |
| user_can_access_note(p_user uuid, p_note_id text) | True | False | False | True |
| user_can_access_note_with_aal(p_user uuid, p_note_id text, p_aal text) | True | False | False | True |
| user_can_access_video(p_user uuid, p_video_id text) | True | False | False | True |
| user_can_access_video_with_aal(p_user uuid, p_video_id text, p_aal text) | True | False | False | True |
| user_owns_chapter(p_chapter_id text) | True | True | True | True |
| videos_derive_course() | True | False | False | True |
| wallet_balance_of(p_user uuid) | True | False | False | True |
| wallet_ledger_append_only() | False | False | False | True |
| wallet_ledger_no_overdraw() | True | False | False | True |
| wallet_ledger_no_truncate() | False | False | False | True |
| years_before_write() | True | False | False | True |
| years_propagate_course_move() | True | False | False | True |

No anon/auth execution is granted on settlement, capture, compensation, reversal, wallet mutation, rate-limit, private note entitlement helper or worker-lease routines. User RPCs use verified auth.uid(); admin RPCs require am_i_admin. am_i_admin/get_maintenance_mode/normalize_phone/user_owns_chapter are the anon callable public functions in retrieved inventory. Legacy settlement/pricing functions have service execution revoked and are reachable only through privileged wrappers. Trigger functions are not direct client API mutations.

### Storage

Observed: `notes` and `note-quarantine` are private PDF buckets capped at 50 MiB; `nonplay-test-notes` is private PDF-only capped at 10 MiB; `thumbnails` is public and has no bucket MIME/size restriction. Admin-only write/preview boundaries are separate from paid-student note authority. Student note metadata/object paths are not authorization to fetch private bytes. Signed note URLs are bearer capabilities until expiry; a refund does not retroactively cancel a previously issued URL, so verify the short TTL and stop issuance immediately after revocation. Offline access separately has the seven-day grace and B03 protection gap. No public paid-note bucket was found in retrieved metadata. No production storage object bytes were downloaded.

## 6. Verification of earlier audit fixes

Each row is one historical finding/fix, checked against current code and, where available, deployed metadata. “Source verified” does not close the device/provider acceptance boundary. Superseded product decisions are preserved as superseded, not turned into new requirements.

| Historical ID | Status | Current verification |
|---|---|---|
| V1 | Previously fixed - verified | YouTube normalization/direct open/fallback retained; exact failed live row/device remains unverified. |
| V2 | Previously fixed - verified | Videos error/retry, subject lifetime and memoized filters retained. |
| A1 | Previously fixed - verified | Deep-link initial storage ordering retained; separate route lifetime regression MOB-01. |
| A2 | Previously fixed - verified | Forgot-reset request rejection handled with neutral response. |
| O1 | Previously fixed - verified | Sync guard acquired before connectivity await. |
| O2 | Previously fixed - verified | Outer drain rejection caught; background calls do not escape. |
| P1 | Previously fixed - verified | One preference read per fetched notification batch. |
| A3 | Previously fixed - verified | Supabase signOut returned error checked; separate push rollback defect MOB-10. |
| N1 | Previously fixed - verified | Successful/signaled logout resets registration marker. |
| C1 | Superseded product decision | MCQs and videos remain free; paid-MCQ proposal withdrawn. |
| C2 | Confirmed scope | Free catalog remains auth/course/publication scoped by design; not a PDF entitlement bypass. |
| A4 | Confirmed | Build-specific schemes still mismatch recovery routing: MOB-07. |
| A5 | Confirmed | Second link cannot replace mounted recovery state: MOB-06. |
| A6 | Confirmed | Reset keyboard-safe scrolling/support rejection gap remains: MOB-20. |
| A7 | Previously fixed - verified | Splash catches destination failure and has Retry; old fixed delay removed. |
| S1 | Previously fixed - verified | Search cache owner+course scope and stale completion rejection present. |
| S2 | Previously fixed - verified | Search sources use keyset pages and explicit maximum; quiz stats distinct MOB-17. |
| N2 | Previously fixed - verified | Cold/live push response hook is called; allowlist/dedup/auth routing present. |
| O3 | Confirmed, latent | Non-quiz outbox owner/retry semantics retained: MOB-14; no current non-quiz enqueue caller found. |
| O4 | Confirmed, latent | Non-atomic progress read/upsert retained: MOB-14. |
| U1 | Confirmed | Unknown reachability coerced false: MOB-19. |
| P2 | Previously fixed - verified | Request coalescing added for repeated Home years/notification reads; no device speed claim. |
| P3 | Confirmed low polish | Original large logo assets retained; no measured performance impact established. |
| T1 | Confirmed low polish | any/stale Firestore comments remain; no active Firestore data client found. |
| F01 | Previously fixed - verified | Play product reads bounded by 15-second deadline. |
| F02 | Previously fixed - verified | Session/order/receipt reads bounded; restoration availability regressed separately MOB-03. |
| F03 | Previously fixed - REGRESSED | Removed PlayBillingScreen watchdog not preserved in OrderSummary: MOB-04. |
| F04 | Previously fixed - verified | Malformed content route guard retained before mounting content. |
| F05 | Previously fixed - verified | Six content lists retain pull-to-refresh. |
| F06 | Previously fixed - verified | Admin scoped newest-request/lifetime guard retained. |
| F07 | Previously fixed - verified | Admin identity/AAL generation prevents stale authorization restoration. |
| F08 | Previously fixed - verified | PDF generation/owner/foreground invalidation retained; encryption remains separate B03. |
| F09 | Previously fixed - verified | Download action rejection boundary retained. |
| F10 | Previously fixed - verified | Login synchronous guard and secure read inside catch boundary retained. |
| F11 | Previously fixed - verified | Listed admin content/account retry actions retained; truthful Retry gaps ADM-05/06. |
| F12 | Previously fixed - verified | Quiz runtime shape checks retained; verified score authority retained. |
| F13 | Previously fixed - verified | Auth bootstrap yields to events/current-owner enforcement retained; offline claim race MOB-13. |
| F14 | Previously fixed - verified | Notes focus/account/tap guards and blur/refocus generation retained. |
| F15 | Source verified; deployed absent | Both local Play handlers reject null/primitive bodies; live bundles remain old: BACK-07. |
| F16 | Previously fixed - verified | Note sibling actions/labels/roles retained; real TalkBack/font acceptance pending. |
| F17 | Previously fixed - REGRESSED | Focused/coalesced status polling retained, already-owned action lost: MOB-18. |
| F18 | Previously fixed - verified | Profile auth-update errors, nonblank name, submit/owner guard retained. |
| B01 | Unverified provider root cause | No live Play API call; catalog/helper comparison recorded; exact 403 check in section 7. |
| B02 | Confirmed open gate | Play jobs inactive/UCB worker missing: BACK-03. |
| B03 | Confirmed, partial improvement | License timestamps moved to SecureStore; PDF bytes remain plaintext/dormant vault: MOB-02. |
| B04 | Confirmed open gate | 180-day function exists; named retention schedule absent: BACK-08. |
| B05 | Source/live boundaries inspected | RLS/ACL/migration drift verified directly; refund/publication deployment gaps remain BACK-01/04. |
| B06 | Confirmed open gate | Mandatory MFA disabled, live sender lacks corresponding guard: BACK-06. |
| B07 | Unverified | Full DB/Auth/Storage restore drill not performed. |
| B08 | Unverified | Final signed AAB/Store/device acceptance not performed; R8 now enabled in source. |
| B09 | Partially verified | Canonical website/status/headers verified; SMTP/delivery/allowlist/deletion end-to-end unverified. |
| B10 | Unverified | Sentry operational symbolication/alerts and actual EAS injection not verified. |
| B11 | Previously fixed - verified | Notification routing source/current local regressions present. |
| B12 | Previously fixed - verified | Content list error/retry source/current local regressions present. |
| B13 | Previously fixed - verified | Pinned Deno dependencies/frozen lock and current 26-entry checks pass. |
| B14 | Confirmed investigation gate | Diagnostics retained with Auth/admin/AAL2; retire only after authorized investigation closure. |
| B15 | Confirmed boundary limitation | Client/header distribution hints are not platform attestation; current server/deployment gates reviewed. |
| D01 | Previously fixed - verified | Diagnostic retirement comments and independent admin/AAL2 controls retained. |
| P01 | Superseded distribution invariant | Original blanket Android-never-Razorpay assertion superseded by explicit isolated/live/UCB lanes; standard Play sales disabled. |
| L01 | Confirmed low polish | StaggerItem lacks explicit animation stop on cleanup; Skeleton does clean its loop. |

## 7. Manual checks needed

All unchecked items below are **UNVERIFIED — needs manual check**. Exact read-only production metadata already collected does not need to be guessed or re-certified from screenshots. Use synthetic accounts/test-mode or an owner-approved internal test plan for mutating checks; this audit did not authorize charges, deletion, settings changes or deployment.

### Supabase dashboard and deployment

- [ ] **Auth → URL Configuration:** inspect Site URL and every allowed redirect. Confirm exact `https://www.medveda.in/reset-password` and `/account-verified`; inventory older Vercel/wildcard redirects and staging schemes. Do not infer the allowlist from `PASSWORD_RESET_REDIRECT_URL`.
- [ ] **Auth → Email / SMTP and Send Email Hook:** identify whether SMTP or a hook actually sends mail. In the active provider/Resend dashboard check verified sending domain, DNS SPF/DKIM/DMARC, sender address, API credential status, quotas and last sanitized delivery outcome. A missing repository SMTP password is expected; no credential value belongs in this report.
- [ ] **Auth → Security/password policy and Rate Limits:** verify server-enforced minimum/maximum/strength, reset token expiry, resend limits, signup/OTP behavior, leaked-password settings where supported and session/JWT lifetime. Replay an expired/used synthetic link. Direct Auth API calls must not bypass mandatory profile/identity requirements. `shouldCreateUser:false` in a caller is not an account-wide server policy; signup is intentionally enabled for registration.
- [ ] **Auth brute-force acceptance:** compare email/password direct Auth calls with the mobile-number Edge path. The latter source limits IP 20/10min, IP+phone 5/10min, phone 30/10min. Test generic errors/timing and trusted forwarded-IP handling. Clearing app data/reinstall/changing device bypasses the local SecureStore lockout; validate server controls independently.
- [ ] **Database → migrations/functions:** reconcile the recorded live migration list and definitions with the exact release manifest. Stage the missing November refund/publication protections, not a blind replay of the whole migration directory. Reproduce full-refund/lost-dispute/missed-webhook ordering and compare entitlement status. Count contradictory states only in a separately authorized privacy-preserving query.
- [ ] **Edge Functions:** compare deployed code hash/version and `verify_jwt` to the deployment table below. Functions without gateway JWT must verify their own HMAC, verified user JWT or exact server cron secret as appropriate. Confirm publishable-key versus gateway-JWT behavior with the actual deployed gateway; never disable verification globally to remove a 401.
- [ ] **Admin security:** verify enrollment and recovery for every admin using counts/status only; then stage AAL1 denial, AAL2 success, non-admin AAL2 denial for tables, RPCs, diagnostics and push. Deploy handler guards before any separately approved MFA-flag activation. Current `require_mfa=false` is confirmed, not an open factual question.
- [ ] **Cron/operations:** qualify inactive Play jobs, missing UCB/report/refund processors and retention scheduling in staging; verify last-success time, leased/stuck/parked age, retry exhaustion and alert delivery. Confirm the 180-day cutoff is from `first_purchase_at`, not a new 180 days after deletion. No retention job was enabled by this audit.
- [ ] **Storage:** with anon/student/owner/refunded/admin AAL1/admin AAL2 synthetic sessions, test direct object denial, signed URL issuance and expiry, path ownership, PDF MIME/structure/50MiB cap and quarantine rejection. Include traversal-style encoded paths and mismatched note/object references without uploading harmful files.
- [ ] **Deletion:** synthetic student deletes twice, with failure after SQL erase and before Auth deletion. Verify Auth/profile/purchases/referrals/push/quiz/analytics erasure and retained anonymized accounting/fraud records, plus native local cleanup. Shared catalog PDFs are not user-owned uploads to delete. Check the legacy `delete_my_account` behavior and retained-session token consequences. Admin deletion must remain blocked.
- [ ] **Restore drill:** restore DB/Auth/Storage metadata AND object bytes to a disposable compatible target, then test synthetic login, paid-note access, FK consistency and recovery time. A backup setting alone is not restore evidence.

### Razorpay dashboard

- [ ] In the correct Test/Live dashboard, match app environment, key-ID mode and configured webhook URL to the intended distribution; inspect names/status only. Production must never silently accept a test key. Confirm webhook event subscriptions include relevant captured/refund/dispute states and secret-rotation retention.
- [ ] Execute owner-approved test-mode success, cancellation, late capture, partial/full refund, dispute won/lost, duplicate/reordered webhook, callback loss and ambiguous order/refund HTTP response. Check one order/purchase/debit/reward and actual refund completion, not just a queued status.
- [ ] On Android UPI, switch app, background/kill WebView/app, deny callback, return slowly and lose network after capture. Confirm owner recovery, pending wording, eventual entitlement and no repeated charge. Do not accept a client `postMessage` as financial proof.

### Google Play Console and Google Cloud

- [ ] **Cloud Console → APIs & Services:** confirm Android Publisher API enablement in the service-account project. **Play Console → Users and permissions/API access:** verify the exact service-account email has access to package `in.medveda.app` and the required catalog/order/financial permissions. Project IAM alone does not prove per-app Play authority.
- [ ] **403 diagnosis:** retain sanitized HTTP status/method/path/error reason for token acquisition, catalog list/get/patch/create, and `monetization:convertRegionPrices` independently. Compare service-account email, package, product/offer IDs, `regionsVersion`, Money units/nanos and Indian regional pricing. Current and retrieved deployed catalog helpers match; conversion is in diagnostics rather than the sync path. No actual provider 403 was reproduced here, so neither conversion nor permissions is declared the established cause.
- [ ] **Monetize → Products → One-time products:** confirm generated notes SKU/purchase option/BUY offer is active, INR price matches server paise conversion and the release uses one-time products rather than subscriptions. Check inactive/draft/regional-unavailable/old SKU responses separately.
- [ ] **Alternative billing/program enrollment:** establish the actual India eligibility/program enrollment, required disclosures and Google-provided user-choice UI before enabling UCB flags. Test the standard Play and alternative selections, external token binding and timely transaction/refund reporting. Current disabled builds are not evidence of a compliant enabled flow.
- [ ] **License testing/internal track:** test purchased/pending/cancel, missing callback, process kill, restore on another device, account switch, acknowledge/consume retry and refund/void. Verify acknowledgment within three days of PURCHASED; do not acknowledge pending transactions or consume before committed delivery.
- [ ] **App content/Store listing:** review actual audience/content rating, educational-not-medical claim, app-access reviewer credentials with an already unlocked Note, Data safety, privacy/deletion URLs, purchase-unavailable wording, SDK disclosures and permission justification against the exact submitted build. Keep review credentials out of Git.

### Real-device, final binary, website and monitoring

- [ ] Build the exact approved EAS profile and record source digest, AAB digest, package, versionCode and signing certificate. EAS remotely manages/increments versionCode; the absent local integer is not proof of a missing Store version. Verify native manifest target SDK against the current Play requirement (API 36 for standard new submissions/updates as of this audit), exported components, queries, cleartext=false, backup=false and only justified permissions. [Current target requirement](https://support.google.com/googleplay/android-developer/answer/11926878).
- [ ] Validate the final release's 64-bit libraries, 16 KiB ELF/ZIP page alignment, AAB delivery size, Android 14–16 behavior, Hermes, R8/resource shrinking and PDF/IAP JNI/reflection. R8 is now enabled in app.config.js; this corrects the earlier “opt-in only” report. Host tests do not prove native compilation or device acceptance.
- [ ] Verify FCM package/config on EAS builder, push permission denied/granted, token refresh, logout failure/success, 11th-device registration, foreground/background/killed delivery and category mute. Tap routing must wait through authentication/onboarding and reject arbitrary destinations.
- [ ] Verify PDF extraction resistance/backup, screenshot and recording block on the actual paid viewer, 7-day expiry, clock rollback/forward, key loss, root-device limits, upgrade/legacy plaintext cleanup, force-stop/reboot, 1/10/50/100MiB PDFs, interrupted transfer/storage full and pause→cancel cleanup. B03 cannot be closed by passing dormant native host tests.
- [ ] Recovery from Gmail in-app browser and Chrome: cold/warm, signed out and A→B, second link while reset is mounted, MFA, expired/used/no token, network and cleanup failures. Confirm actual new password works and old one fails; verify no Home navigation interrupts recovery.
- [ ] YouTube: use the failing row's exact stored URL privately; normalize watch/youtu.be/embed/shorts/live/mobile/nocookie/bare ID/whitespace. Test YouTube installed/disabled, HTTPS fallback, default browser, offline/error and Back. The opening path is external Linking, not an embedded player. Android `<queries>` affects `canOpenURL`, not proof that `openURL` fails. Private/deleted/geoblocked/embed-restricted content requires provider/device evidence; current parser/tap tests do not identify the historic production cause.
- [ ] Small/landscape/tablet/large-font/TalkBack testing for every screen and form, Hindi/Marathi strings where content supplies them, dark palette, keyboard and nested gesture handling. No runtime RTL/locale/small-screen certification was performed.
- [ ] Vercel project settings: inventory root/output folders and all custom/old aliases. Canonical tested URLs passed HTTP/header checks; check all untested aliases plus `/privacy`, `/refunds` and `.html` routes before retiring duplicate pages. Test token-free page loads, hash removal, no-store/no-referrer and fixed-origin redirects; do not log real fragments.
- [ ] Sentry/EAS: confirm actual injected DSN, source-map/native-symbol upload, correct release/dist and sanitized symbolication from a test event. Inspect beforeSend output for user/request/breadcrumb URLs; verify alerts and account retention. Check OTA code-signing certificate exists in the final build and updates are signed. Optional source hooks do not prove operational setup.

### Recorded Edge deployment comparison

Source flags below come from current config.toml; deployed flags come from connected list_edge_functions. Internal handler verification still matters when gateway false.

| Function | source verify_jwt | deployed verify_jwt | deployed version | status |
|---|---|---|---|---|
| attach-external-token | True | absent | - | NOT DEPLOYED |
| create-order | True | True | 23 | ACTIVE |
| create-order-nonplay-test | True | absent | - | NOT DEPLOYED |
| create-order-play-choice | True | absent | - | NOT DEPLOYED |
| create-play-order | True | True | 3 | ACTIVE |
| delete-account | True | True | 19 | ACTIVE |
| diagnose-play-matrix | False | True | 3 | ACTIVE |
| diagnose-play-pricing | True | True | 2 | ACTIVE |
| diagnose-play-service-account | False | False | 2 | ACTIVE |
| get-note-url | True | True | 20 | ACTIVE |
| get-note-url-nonplay-test | True | absent | - | NOT DEPLOYED |
| get-video-url | True | True | 20 | ACTIVE |
| login-with-mobile | False | False | 18 | ACTIVE |
| nonplay-test-catalog | True | absent | - | NOT DEPLOYED |
| play-payment-worker | False | False | 3 | ACTIVE |
| razorpay-webhook | False | False | 51 | ACTIVE |
| razorpay-webhook-nonplay-test | False | absent | - | NOT DEPLOYED |
| report-external-transaction | False | absent | - | NOT DEPLOYED |
| request-password-reset-by-mobile | False | False | 18 | ACTIVE |
| send-push-notification | False | False | 51 | ACTIVE |
| sync-play-catalog | False | False | 6 | ACTIVE |
| upload-note-pdf | False | False | 3 | ACTIVE |
| verify-payment | False | False | 69 | ACTIVE |
| verify-payment-nonplay-test | True | absent | - | NOT DEPLOYED |
| verify-play-purchase | True | True | 3 | ACTIVE |

Only gateway flag drift found among deployed/configured entrypoints: diagnose-play-matrix is live true vs current false. This affects browser CORS/preflight behavior; current handler independently requires verified Auth/admin/AAL2. No claim of unauthenticated diagnostic access follows. Missing routes are explicit in table.

| Deployed bundle | source file | live bytes | current bytes | exact content equal |
|---|---|---|---|---|
| create-order v23 | supabase/functions/create-order/index.ts | 6617 | 204 | False |
| create-order v23 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| create-order v23 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| create-order v23 | supabase/functions/_shared/razorpay.ts | 8263 | 11123 | False |
| create-order v23 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| create-play-order v3 | supabase/functions/create-play-order/index.ts | 2405 | 3636 | False |
| create-play-order v3 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| create-play-order v3 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| create-play-order v3 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| delete-account v19 | supabase/functions/delete-account/index.ts | 3412 | 4326 | False |
| delete-account v19 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| delete-account v19 | supabase/functions/_shared/supabaseAdmin.ts | 1554 | 2194 | False |
| login-with-mobile v18 | supabase/functions/login-with-mobile/index.ts | 4211 | 4388 | False |
| login-with-mobile v18 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| login-with-mobile v18 | supabase/functions/_shared/phone.ts | 727 | 727 | True |
| login-with-mobile v18 | supabase/functions/_shared/supabaseAdmin.ts | 1554 | 2194 | False |
| login-with-mobile v18 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| razorpay-webhook v51 | supabase/functions/razorpay-webhook/index.ts | 9210 | 11980 | False |
| razorpay-webhook v51 | supabase/functions/_shared/settle.ts | 7211 | 20527 | False |
| razorpay-webhook v51 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| razorpay-webhook v51 | supabase/functions/_shared/razorpay.ts | 8263 | 11123 | False |
| request-password-reset-by-mobile v18 | supabase/functions/request-password-reset-by-mobile/index.ts | 3450 | 3460 | False |
| request-password-reset-by-mobile v18 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| request-password-reset-by-mobile v18 | supabase/functions/_shared/phone.ts | 727 | 727 | True |
| request-password-reset-by-mobile v18 | supabase/functions/_shared/supabaseAdmin.ts | 1554 | 2194 | False |
| request-password-reset-by-mobile v18 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| send-push-notification v51 | supabase/functions/send-push-notification/index.ts | 6366 | 8392 | False |
| send-push-notification v51 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| send-push-notification v51 | supabase/functions/_shared/supabaseAdmin.ts | 1554 | 2194 | False |
| send-push-notification v51 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| sync-play-catalog v6 | supabase/functions/sync-play-catalog/index.ts | 5166 | 5166 | True |
| sync-play-catalog v6 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| sync-play-catalog v6 | supabase/functions/_shared/supabaseAdmin.ts | 2194 | 2194 | True |
| sync-play-catalog v6 | supabase/functions/_shared/googlePlay.ts | 21700 | 21740 | False |
| sync-play-catalog v6 | supabase/functions/_shared/playCatalog.ts | 9019 | 9019 | True |
| verify-payment v69 | supabase/functions/verify-payment/index.ts | 5301 | 7611 | False |
| verify-payment v69 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| verify-payment v69 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| verify-payment v69 | supabase/functions/_shared/razorpay.ts | 8263 | 11123 | False |
| verify-payment v69 | supabase/functions/_shared/settle.ts | 7211 | 20527 | False |
| verify-payment v69 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| verify-play-purchase v3 | supabase/functions/verify-play-purchase/index.ts | 5986 | 7000 | False |
| verify-play-purchase v3 | supabase/functions/_shared/cors.ts | 1015 | 1015 | True |
| verify-play-purchase v3 | supabase/functions/_shared/supabaseAdmin.ts | 2188 | 2194 | False |
| verify-play-purchase v3 | supabase/functions/_shared/rateLimit.ts | 1268 | 1268 | True |
| verify-play-purchase v3 | supabase/functions/_shared/googlePlay.ts | 8409 | 21740 | False |
| verify-play-purchase v3 | supabase/functions/_shared/playPurchaseValidation.ts | 1372 | 1372 | True |

Catalog read-back result: retrieved sync-play-catalog v6 entrypoint and playCatalog.ts are exact byte matches to canonical files; googlePlay.ts differs. Both paths build reviewed direct IN/INR requests using configured regionsVersion and do not invoke convertRegionPrices. The diagnostic invokes pricing:convertRegionPrices; its403 does not by itself establish that catalog GET/PATCH/activation have identical permission outcomes. No Google/Play API was invoked in this read-only audit, so provider permissions and403 root cause remain unverified manual checks.

## 8. Prioritized fix plan

Effort estimates are engineering time after reproduction/setup, not elapsed approval/provider-review time. Use the findings' real IDs in one-finding commits only after report approval; do not turn an operational switch into an automatic production action.

| Priority | Findings / action | Estimate | Acceptance |
|---|---|---|---|
| P0 | BACK-01/02/16: stage exact refund SQL + verifier/webhook owner/inbox protections | 2–4 days | Real SQL duplicate/reordering/refund tests; owned recovery; no false grants/ACKs |
| P0 | BACK-05/06: deploy privacy/MFA-aware push boundary, qualify admin enrollment/recovery | 1–2 days + owner rollout | Targeted send rejected; AAL1 denied/AAL2 admin allowed; non-admin denied |
| P0 | MOB-01: keep recovery route/controller alive across owner transitions | 1–2 days | Mounted cold/warm signed-out/A→B + MFA + cleanup tests |
| P0 | MOB-02/B03: complete authenticated native acquisition/viewing/license integration and legacy cleanup | 10–20 days + device matrix | Ciphertext-only durable writes; authenticated licenses; kill/expiry/key-loss/memory tests |
| P0 | MOB-03/04/18: preserve historical restoration; recover uncertain native outcomes; owned-item action | 2–4 days | Disabled-sales restore; lost callback; no repeat charge; correct owner routing |
| P0 | BACK-03/04: qualify full Play/UCB/compensation deployment and monitored workers, then policy/Console acceptance | 3–5 days + provider access | Exact bundle/schema parity; licensed device transactions; complete refund/report lifecycle |
| P0 | Final AAB/device/Play/SMTP/reset/restore/monitoring gates in section 7 | 3–5 days + external review | Artifact-bound evidence, not historical report sign-off |
| P1 | BACK-08 identity retention scheduler/legal cutoff qualification | 0.5–1 day + owner review | Correct 180-day rule, monitored successful purge in staging |
| P1 | BACK-09/10/11/12/13/15: job budget, block scope, wallet expiry/hold, flag result and device limit | 3–6 days | Atomic accounting/allocation fixtures; latency budget; blocked API and 11-device tests |
| P1 | MOB-05/06/07/08/09/10/11/12/13/14/17/20: gesture/recovery/offline/push/storage/statistics | 5–8 days | Focus/account/failure injection, native UI and persistence assertions |
| P1 | ADM-01/02/03/04/07/08/09 and WEB-01/02/03/04 | 3–5 days | Idempotent sends, correct MRP/settings/pagination and safe modern/legacy pages |
| P1 | CFG-01/02: compatible SDK/security dependency updates | 1–2 days | Doctor/audit/type/lint/build/native smoke |
| P2 | MOB-15/16/19, ADM-05/06, BACK-14/17, QA-01; branding/obsolete comment cleanup | 1–3 days | Accurate labels/ring/network state/readiness, truthful Retry, passing fixture-compatible suites |

Phase 2 has **not** started. After explicit approval: create the requested new branch, implement one finding per small commit with its ID, run tsc/lint/tests after each batch, and write `docs/audit/MEDVEDA_FIX_REPORT.md`. No fixes are silently included with this audit.

## 9. Fresh verification results and raw evidence

| Check | Exit | Result | Raw output |
|---|---|---|---|
| Mobile tsc --noEmit | 0 | PASS | [mobile-tsc.log](evidence/full-audit-2026-11-13/mobile-tsc.log) |
| Admin application tsc --noEmit | 0 | PASS | [admin-tsc.log](evidence/full-audit-2026-11-13/admin-tsc.log) |
| Admin tooling tsc --noEmit | 0 | PASS | [admin-node-tsc.log](evidence/full-audit-2026-11-13/admin-node-tsc.log) |
| ESLint | 0 | PASS | [eslint.log](evidence/full-audit-2026-11-13/eslint.log) |
| Expo Doctor | 1 | 20/21; SDK patch mismatch | [expo-doctor.log](evidence/full-audit-2026-11-13/expo-doctor.log) |
| Expo dependency compatibility | 1 | 4 SDK patch mismatches | [expo-dependencies.log](evidence/full-audit-2026-11-13/expo-dependencies.log) |
| Expo public config evaluation | 0 | PASS | [expo-public-config.log](evidence/full-audit-2026-11-13/expo-public-config.log) |
| Expo prebuild config evaluation | 0 | PASS | [expo-prebuild-config.log](evidence/full-audit-2026-11-13/expo-prebuild-config.log) |
| EAS production Android config validation | 0 | PASS | [eas-config.log](evidence/full-audit-2026-11-13/eas-config.log) |
| npm audit: mobile | 1 | 4 moderate; 0 high/critical | [mobile-npm-audit.log](evidence/full-audit-2026-11-13/mobile-npm-audit.log) |
| npm audit: admin | 0 | 0 vulnerabilities | [admin-npm-audit.log](evidence/full-audit-2026-11-13/admin-npm-audit.log) |
| npm audit: lint tooling | 1 | 9 moderate; 0 high/critical | [tooling-npm-audit.log](evidence/full-audit-2026-11-13/tooling-npm-audit.log) |
| Password-recovery npm script | 0 | PASS | [password-tests.log](evidence/full-audit-2026-11-13/password-tests.log) |
| Admin npm test | 0 | PASS | [admin-tests.log](evidence/full-audit-2026-11-13/admin-tests.log) |
| Tracked secret scanner | 0 | PASS | [secret-scan.log](evidence/full-audit-2026-11-13/secret-scan.log) |
| Website link validation | 0 | PASS | [website-links.log](evidence/full-audit-2026-11-13/website-links.log) |
| 26 Edge/worker typecheck entries | 0 | PASS | [deno-check.log](evidence/full-audit-2026-11-13/deno-check.log) |
| Expanded Deno unit tests | 0 | 46 passed, 0 failed | [deno-unit.log](evidence/full-audit-2026-11-13/deno-unit.log) |
| Full SQL/webhook/concurrency suite | 0 | ALL SUITES PASSED | [database-local-final.log](evidence/full-audit-2026-11-13/database-local-final.log) |
| Supplemental historical MV003 wrapper | 1 | FAIL — see QA-01 / raw output | [db-run-mv003-local.py.log](evidence/full-audit-2026-11-13/db-run-mv003-local.py.log) |
| Supplemental historical Phase B wrapper | 1 | FAIL — see QA-01 / raw output | [db-run-phase-b-local.py.log](evidence/full-audit-2026-11-13/db-run-phase-b-local.py.log) |
| Supplemental historical Phase C wrapper | 1 | FAIL — see QA-01 / raw output | [db-run-phase-c-local.py.log](evidence/full-audit-2026-11-13/db-run-phase-c-local.py.log) |
| Publication migration repeatability/authority | 0 | PASS | [db-run-remaining-audit-local.py.log](evidence/full-audit-2026-11-13/db-run-remaining-audit-local.py.log) |
| Native vault foundation host tests | 0 | PASS | [vault-final-run-host-tests.py.log](evidence/full-audit-2026-11-13/vault-final-run-host-tests.py.log) |
| Native vault Phase1B host tests | 0 | PASS | [vault-final-phase1b-run-tests.py.log](evidence/full-audit-2026-11-13/vault-final-phase1b-run-tests.py.log) |
| Native vault acquisition host tests | 0 | PASS | [vault-final-acquisition-run-tests.py.log](evidence/full-audit-2026-11-13/vault-final-acquisition-run-tests.py.log) |
| Native vault content host tests | 0 | PASS | [vault-final-content-run-tests.py.log](evidence/full-audit-2026-11-13/vault-final-content-run-tests.py.log) |

The initial runner recorded 169 commands: 154 exit-zero, 10 exit-one, 4 timeout and 1 prerequisite exit-two. Four time-limited native checks were subsequently rerun serially and **all passed**. The default DB command initially lacked a running local server; the full final disposable-Postgres run **passed**. Six directly discovered DB harness files refused to run without their dedicated local environment; correct historical wrappers were then invoked, and MV003/Phase B/Phase C each stop at the same 500-versus-400 assertion (QA-01). These raw failures remain in evidence. Do not summarize the entire discovered suite as “all tests passed.”

The 140 discovered Node test files include 134 direct passes and those six DB-prerequisite cases. Fresh Deno entrypoint checks cover 25 Edge entrypoints plus the validator worker; the expanded Deno unit suite reports **46 passed, 0 failed**. The full SQL suite builds all 78 migrations, tests RLS/financial/account-deletion/quiz behavior, provider mocks, concurrency and webhook harnesses, ending **ALL SUITES PASSED**. Native vault host tests prove host-side behavior of dormant code, not that the app uses encrypted acquisition or that Android/iOS release instrumentation passed.

Commands ran with credential-free test environments. Initial DNS/subprocess/socket sandbox failures were rerun with the required public registry/local-process access. Online Expo compatibility results supersede the initial cached-manifest pass. No dependency update, `npm audit fix`, generated native prebuild write, production mutation or deployment was run. Expo `config --type prebuild` evaluates configuration; it is not a native build.

**Raw output:** [raw-check-results.md](evidence/full-audit-2026-11-13/raw-check-results.md) contains the complete retained command logs, including errors and final reruns. [checks.json](evidence/full-audit-2026-11-13/checks.json) contains the initial aggregate; individual `*.result.json` contain every final rerun's exit code/timing. [wallet-expiry-repro.log](evidence/full-audit-2026-11-13/wallet-expiry-repro.log) records the actual SQL-function reproduction (`actual_available:0`, `expected_available:100`). [public-pages.json](evidence/full-audit-2026-11-13/public-pages.json) records public GET/header results without tokens or page bodies.

### Branding, comments, logs and secret checks

[markers.md](evidence/full-audit-2026-11-13/markers.md) and [markers.json](evidence/full-audit-2026-11-13/markers.json) list **every matched** AyurPulse string, TODO/FIXME/HACK marker, console call and placeholder marker in the scanned text inventory, with path/line and credential-like lines suppressed. Counts: **7,619 AyurPulse matches**, **6 TODO/FIXME/HACK matches**, **818 console calls**, **221 placeholder markers**. Most branding matches are historical audit paths/logs; test logs and HTML input placeholders are not automatically defects. The real legacy user-facing scheme defect is WEB-02. Retained `ayurpulse` Expo slug/npm package IDs, historical fraud-hash domain separator and corrective old-package regexes have compatibility meaning; do not rename them blindly.

The production mobile logger is development-gated and Sentry uses scrubbers; backend operational console statements still exist and are included in the inventory. No plaintext credential log was established from the reviewed runtime. Sentry runtime payload and vendor logs remain a section-7 manual check.

Tracked-file secret scanner passed. The expanded scanner found **zero recognized private-key/service-role/secret-token pattern matches** across 5,257 current text files and **3,830 historical Git blobs / 60,409,007 bytes**. This is pattern evidence, not proof that no arbitrary unlabeled secret can exist; binary/compressed historical artifacts are not all decoded by this scanner. The `.env` inventory records names and tracked status only: real local env files are ignored, examples tracked. Publishable/anon keys are public client identifiers, not service-role secrets; values are redacted from retained config logs. No private credential value was copied into the audit.

### Closing coverage record

Total reviewed: **645 unique files**. Findings: **Critical: 0; High: 11; Medium: 34; Low: 8; Info: 0**. All current principal source modules and canonical migrations are accounted for by the ledgers; generated/duplicate review methods and excluded archival artifacts are disclosed above. Provider, dashboard, final-artifact and real-device items explicitly marked unverified remain release gates.
