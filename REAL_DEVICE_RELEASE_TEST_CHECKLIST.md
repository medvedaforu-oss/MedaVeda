# Real-device release test checklist

Pending manual acceptance. Record revision, AAB SHA-256, versionName/versionCode,
certificate, device/Android/page size, clean or upgrade install, account and UTC.
Mark PASS / FAIL / N/A with evidence. Use isolated synthetic accounts for
payment/deletion tests and the exact signed candidate.

## Authentication and content

- [ ] Clean launch, signup/confirmation, invalid/existing credentials,
      email/mobile login, logout, killed-app session restore and revoked session.
- [ ] Cold/warm recovery from browser/email, expired/used/second links, password
      policy, MFA, network retry and successful new-password login.
- [ ] Course/year choice survives authenticated save and refresh. Missing
      profile/mismatched read/failed save stays on the picker with retry.
- [ ] Home/year/subject/chapter/search: correct course, pagination, navigation,
      empty/error/offline/retry. Account switch exposes no former-account state.
- [ ] Owned Notes/preview open; unowned/refunded/blocked/wrong-account and
      unpublished content stays denied. Owned download opens offline.
- [ ] Large/corrupt PDF, pause/resume, disk full, process death, seven-day expiry,
      clock rollback, reconnect denial and legacy-download upgrade.
- [ ] Free video with/without YouTube installed, browser fallback and return.
- [ ] Free quiz submit/score, offline queue/reconnect, stale revision and upgrade
      cleanup. No answers in downloaded or student-response content.
- [ ] Push permissions, foreground/background/killed-app taps, login handoff,
      deduplication, preferences, badge and reminders.
- [ ] Contact/legal links, maintenance/update gates and accessibility.

## Production purchase boundary

- [ ] Production/internal-testing Buy shows purchases unavailable, with no order,
      checkout or external payment link from any entry point.
- [ ] Existing entitled Notes, purchase history, downloads and offline access work.
- [ ] Final binary has no mobile Play Billing SDK or Billing permission.
- [ ] Historical recovery/refund support and deployed workers are verified
      separately; disabling new sales does not retire those obligations.

For a permitted non-Play test distribution, follow the
[Razorpay test profile](docs/audit/MEDVEDA_RAZORPAY_INTERNAL_TEST_ROUTING_2026-11-04.md)
and [deployment/rollback handoff](docs/audit/MEDVEDA_RAZORPAY_FIXES_2026-11-04.md).
Hosted checkout remains blocked; this checklist does not authorize live charges.

## Security and release

- [ ] Deep links cannot bypass login/crash navigation; logout blocks protected
      routes and former-account files. Student/admin isolation and MFA work.
- [ ] Screenshot/recording behavior and native PDF viewer on 16 KB Android.
- [ ] Synthetic deletion/interrupted retry, Auth/server/device residuals and
      monitored external request handling match the approved policy.
- [ ] Package `in.medveda.app`, versionCode, certificate, merged permissions,
      backup and debuggable flags verified on the exact signed artifact.
- [ ] Symbolicated crash, push, alerts, Play pre-launch results, reviewer access,
      live legal URLs, listing and Console answers match the new build.

Use the [performance checklist](docs/audit/MEDVEDA_PERF_ANDROID_CHECKLIST_2026-10-27.md)
for timing/memory/size and optional shrinking. The [release gates](docs/RELEASE_GATES.md)
track unresolved encryption, hosted migrations, privacy and rollback requirements.
