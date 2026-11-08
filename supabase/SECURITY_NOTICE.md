# Secrets handling

* Never commit `supabase/functions/.env` or any real key. `.gitignore` excludes it; use
  `supabase/functions/.env.example` as the template.
* Production Razorpay and webhook secrets exist only as Supabase function secrets
  (`supabase secrets set ...`). The three values must all be different (API key id, API key
  secret, webhook secret). The validator requires `APP_ENV=production` with an `rzp_live_` key,
  or `APP_ENV=staging` with an `rzp_test_` key; mismatches fail closed. `ALLOW_TEST_MODE` is ignored.
* Check what is deployed without revealing it: `supabase secrets list` shows a digest per secret;
  two secrets that should differ showing the same digest means one was set wrongly.
* An earlier revision of this repo contained a committed test key. Treat that key as burned: it must
  stay revoked in the Razorpay dashboard. `git log --all --full-history -- supabase/functions/.env`
  lists any commit that ever touched such a file.
* The public Supabase URL and publishable (anon) key in `mobile-app/eas.json` and
  `website/assets/js/config.js` are meant to be public. The service-role key must never appear in the
  mobile app, the admin panel, the website or CI logs.
