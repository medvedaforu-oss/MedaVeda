**Local routing enabled for the new `razorpay-internal-test` Android profile. Hosted payment and Notes unlock remain UNVERIFIED.**

This is the scoped follow-up to the Notes acceptance report, not another backend audit. No Supabase/device access was required to implement or test the app routing. No remote calls, deployment, payment, settlement changes or Play Billing restoration occurred in this follow-up.

| Setting | New profile |
|---|---|
| Artifact/distribution | Internal Android APK; no inheritance and no submit profile |
| EAS environment/channel | `development` / `razorpay-internal-test` |
| Display name | `MedVeda Razorpay Test` |
| Native package | `in.medveda.razorpaytest` |
| Scheme | `medveda-razorpay-test` |
| Android runtime | `1.2.1-razorpay-internal-test` |
| Configured backend | Expected staging `https://nsmsqsogedzohwboripd.supabase.co`; live identity/environment not confirmed |
| Payment provider | `razorpay`, gated by staging target and explicit `non-play-internal-test` distribution marker |

Buy Now now reaches the existing `OrderSummary`; Pay invokes the existing authenticated server order service and opens `PaymentCheckout` with the returned checkout data. Existing navigator routes and payment screens/services required no edits. Owned cards continue to expose content browsing without a Buy button. Existing duplicate-Pay, stale-quote, pending recovery and callback/resume protections remain intact.

The runtime additionally checks **the installed native application ID**, not merely the mutable Expo configuration's package field. A Play package cannot enable Razorpay by receiving stale or hostile test markers. Production and internal-testing remain disabled; development, preview, screenshots, shrink-test and staging-validation retain their previous disabled behavior. The test package, channel and runtime are distinct from Play releases. This profile is for direct internal APK distribution, not Play submission.

The new profile deliberately contains **no publishable key**. Configure the actual distinct staging `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the EAS `development` environment before running `eas build --platform android --profile razorpay-internal-test`. Local configuration commands likewise need the explicit profile env and staging key. Missing/placeholder/production keys, production or unexpected URLs, wrong target, wrong provider, and use of the test marker with another build profile fail validation. The existing production mobile `.env` is not a staging credential; configuration fails if that key is inherited. Never put Razorpay private keys or service-role credentials in the mobile build. No native binary was built in this follow-up.

**Focused checks: PASS**

- New functional test derives the provider from the actual new build configuration and native package, then exercises the real Notes card, purchase hook, order summary and payment service with fixture Auth/HTTP. The paid product ID reaches both summary and create-order body unchanged; Pay passes server data to checkout. Owned Notes create no order; duplicate Pay calls produce one create-order request. No test provider override enables this path artificially.
- Existing checkout is rendered with the resolved provider. Cancel goes back, failure reaches PaymentFailed, an unconfirmed callback remains pending, and only a server-confirmed success reaches PaymentSuccess.
- Existing provider, routing, Play-disabled, staging/same-project, navigator, summary, verdict and pending-poll tests pass: ten focused scripts total. The new script is included in the existing mobile CI job.
- Mobile `tsc --noEmit`, lint of the changed provider module, and `git diff --check` pass. No broad database, export, native-build or device suite was rerun.
- SHA-256 comparison confirms backend files, settlement logic, existing payment screens/service, purchase hook and navigator were unchanged by this follow-up.

**Exact changed files**

1. `mobile-app/eas.json`
2. `mobile-app/app.config.js`
3. `mobile-app/src/config/paymentProvider.ts`
4. `mobile-app/scripts/check-staging-build.cjs`
5. `mobile-app/scripts/payment-routing-selftest.cjs`
6. `mobile-app/scripts/release-payments-disabled-selftest.cjs`
7. `mobile-app/scripts/razorpay-internal-test-selftest.cjs` (new)
8. `.github/workflows/ci.yml`
9. `docs/audit/MEDVEDA_RAZORPAY_INTERNAL_TEST_ROUTING_2026-11-04.md` (new)

**Remaining hosted/device blockers**

- The previous access result remains applicable, without re-auditing: the available Supabase credential could not access either expected MedVeda project. Staging project identity, deployed migration/functions, key mode, webhook/capture settings and real account/catalog data remain unverified.
- A real distinct staging publishable key must be supplied for configuration/build. The tests use an explicitly synthetic key and mock HTTP/Auth; they do not validate credentials.
- The retained `create-order` source rejects requests carrying `x-medveda-app-version`. This app still sends that native header; it was **not omitted to bypass the server guard**. A compatible, separately reviewed non-Play backend creation route is still required before a hosted Pay request can return checkout data. Settlement code is unchanged.
- Android build tooling and an attached device/account are still needed; no installed build, UPI round trip or restart was tested in this follow-up.
- No genuine hosted transaction has passed checkout → capture → server/webhook verification → settlement → exact Notes access → My Purchases. The local route is connected; end-to-end payment acceptance is **not established**.
