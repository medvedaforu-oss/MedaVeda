# Mobile read-only source audit — 13 November 2026

No product/native/database/deployment/provider changes. This report and mobile-reviewed.txt are the only audit writes. Parent owns fresh checks. All source findings are distinguished from installed-binary or hosted acceptance, which is UNVERIFIED.

Historical reports read first: `5460921:docs/audit/MEDVEDA_AUDIT_FIX_1_20261026.md`, then actual historical path `8a6161f^:docs/audit/MEDVEDA_BUGFIX_FINAL_2026-10-27.md`. Newer documents were hints only; all findings below come from current code.

## Coverage

Fully read all 220 actual files under mobile-app/src, App.tsx, index.ts, package/build configuration, all three plugins, and every runtime native vault Kotlin/Swift/module/build file. The 259-path ledger lists fully-read files. Truncated output for StudentProfileCard/SubjectCard/TestCard and config/auth sections was reread. Native test harnesses were inventoried, not claimed fully read or executed. No mobile-app/android tree or generated AndroidManifest.xml exists: actual merged manifest/permissions/queries and release native compilation are UNVERIFIED. No private Firebase/service-account/signing configs read.

Flow: Expo AppEntry → App startup SQLite/legacy quiz cleanup/sync → maintenance/update gates → owner-keyed navigation. Login email/mobile password uses secure persisted identifier lockout (5→5min, later 3→15min), classifies wrong credentials separately from service failures, clears success counts. Registration verifies email; OTP helpers exist but no active OTP UI caller. Recovery imports the linked session, checks AAL/verified TOTP, changes password then signs out. Browse drills Year→Subject→Chapter→Notes; free Videos/MCQs skip chapter where appropriate. Signed URLs remain server-authorized. SQLite downloads/outbox are separate from dormant native vault. Payment provider defaults disabled, with explicit isolated/live-test/UCB distributions; server quotes and verification control amounts/grants. Push registration is owner/generation-bound; notification routes are broadcast allowlisted, cold/live deduplicated and delayed through auth/onboarding. Sentry removes user/request/extra and selected breadcrumbs/URL queries; tracing/screenshots/replay are off. Legal UI discloses plaintext PDFs and retained local data.

All abbreviated runtime paths below are relative to `mobile-app/src/`; configuration paths are relative to `mobile-app/`. Native paths explicitly start `modules/`. Line references identify evidence in the current checkout.

## Findings and proposed diffs (NOT applied)

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

## Prior-fix verification against current source

| Historical ID | Current source verdict (not fresh-test claims) |
|---|---|
| V1/V2 | Retained/enhanced: videoUrl sanitize/validate, videoLink Android native→HTTPS→browser/copy/retry, VideosScreen errors/retry/subject cleanup/memo filter/free cards. Stored production rows and actual playback unverified. |
| A1/A2 | Initial link storage ordering/caught reset-request promise retained. End-to-end recovery separately regressed MOB-01; mounted new link MOB-06. |
| O1/O2 | Guard before NetInfo await and outer background catch retained. |
| P1 | One preference read per fetched notification batch retained. |
| A3/N1 | signOut returned error checked; push-registration marker reset on successful/signaled logout retained. New failed-logout suppression MOB-10. |
| C1 | Closed by product decision: MCQ/video cards free, no purchase gate. Paid-MCQ proposal withdrawn. |
| C2 | Client auth/course catalog scope remains. Server RLS/product decision parent backend scope; hosted state unverified. |
| A4/A5/A6 | Still present: MOB-07/MOB-06/MOB-20. |
| A7 | Fixed source: Splash catches destination rejection, Retry available, fixed startup sleep removed. |
| S1/S2 | Search cache scope now account+course; completion rejects changed scope; seven catalog sources use stable keyset pages 250 and explicit 10k bound. Old search leak/truncation addressed. Other queries not covered (MOB-17). |
| N2 | Fixed source: navigator calls useNotificationRouting; cold response read/live subscription, dedup/allowlist/login/onboarding/recovery gates present. |
| O3/O4 | Retained latent non-quiz paths MOB-14. |
| U1 | Retained MOB-19. |
| P2 | Years and notification reads coalesce pending requests by account/context with one-second sharing limit. Independent Home callers remain; no measured UI speed claim. |
| P3/T1 | Original large logos remain; any/stale Firestore comments remain. Low polish, no new remote exploit. |
| F01/F02 | Play product/session/order/receipt reads have 15s deadlines; HTTP covers body reads. Native late read cannot continue timed-out original await. |
| F03 | Synchronous payment guard retained but old screen/watchdog removed: MOB-04. |
| F04/F05 | Route validation retained for Years/Subjects/Chapters/Details/Notes/Videos/TestList; six-list pull refresh retained. Quiz/PDF have own shape guards. |
| F06/F07/F11/F15 | Admin/backend outside mobile assignment, parent owns verification. |
| F08 | PDF generation/alive/foreground/owner checks retained; remote retry fresh URL/45s loading deadline added. cache:false does not prove file cleanup/encryption. |
| F09 | useDownloads.runAction catches action rejection and refreshes; native/storage failure acceptance unverified. |
| F10 | Login synchronous submit guard and secure read inside try retained; only credential rejection counted. |
| F12 | Quiz id/questions/options validation retained; no answer keys persisted; result only promoted on verified server response. |
| F13 | auth bootstrap yields to events; blocked-profile enforcement checks current owner; offline owner-claim race separate MOB-13. |
| F14 | Notes focus generation+owner/tap ref guards retained; obsolete cleanup cannot release newer open. |
| F16 | Note Open/Download/Remove are sibling accessible controls; CustomInput/Button labels/roles/min sizing retained. TalkBack/font-scale unverified. TestCard nested action is not covered by prior NoteCard change. |
| F17 | Focused/coalesced failed-status polling/terminal message retained; old already-owned action lost MOB-18. |
| F18 | EditProfile inspects auth error, synchronous submit/current-owner checks, nonblank name and distinct phone-error response retained. |
| B03 | PARTIAL: secure licenses implemented; PDFs plaintext/native dormant MOB-02. |
| B01/B02/B04–B10/B14 | Hosted catalog/workers/retention/MFA/restore/release/legal/Sentry/diagnostics not closed by mobile source; parent evidence/unverified live gates. |
| B11–B13 | Notification routing/list errors visibly implemented; Deno reproducibility parent scope. |
| B15/P01 | Old absolute Android-never-Razorpay assertion superseded by explicit isolated/live-test/UCB design. Standard production disables sales. Arbitrary HTTP platform attestation and Play policy/enrollment not certified by client guard. |
| D01 | Backend diagnostic retirement/auth parent scope. |
| L01 | StaggerItem still starts animation without explicit cleanup stop (low polish); Skeleton loop does stop. |

## Unverified acceptance and non-findings

Explicit live/device gates: deployed redirect/SMTP/email/MFA/RLS/migrations; stored YouTube URLs/device playback; UCB enrollment/API/catalog/reporting and real provider flows; Kotlin Android compilation/instrumentation/Swift execution; hardware key lock/loss/backup/power-loss; PDF native memory/renderer/cache/force-kill; actual merged manifest/FCM/OS push; Store signatures/16KB/native release; Sentry DSN/symbols/alerts/retention. Do not describe these as passed from JS mocks.

No plaintext password logging, client service-role/secret, paid MCQ/video gate, direct client grant or successful server authorization bypass established in reviewed mobile code. Native dormant format checks expected metadata, order/length/final manifest/digest and immutable publication, but cannot authenticate its own caller/permit. Secure offline licenses preserve seven-day grace and persisted rollback invalidation. Those positives do not close plaintext PDF or device acceptance gates.
