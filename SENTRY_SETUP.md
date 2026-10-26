# Source maps and EAS release verification (26 October 2026)

Metro now uses `getSentryExpoConfig` from the installed Sentry React Native
7.11 package. It injects Debug IDs and keeps the SQLite WASM asset extension.
`plugins/withOptionalSentry.cjs` calls the supported `@sentry/react-native/expo`
plugin when `SENTRY_AUTH_TOKEN` exists. Without it, the wrapper returns the
original config and adds no native upload hooks, so local builds need no token.
The wrapper path stays registered during local EAS config evaluation; on the
remote worker it reads the selected EAS environment again. Tokens are never
plugin props, Expo extras, or source files. With a token, missing organization
or project fails explicitly rather than silently losing maps.

Owner steps (not executed here):

1. In Sentry, choose the React Native project. Get its organization slug,
   project slug and Client Keys DSN. Create an organization auth token scoped
   for source-map upload/release creation.
2. In the linked EAS project's **Project settings → Environment variables →
   Add Variables**, select **production** and add:

   | Name | Visibility | Value |
   | --- | --- | --- |
   | EXPO_PUBLIC_SENTRY_DSN | Plain text | Project's public client DSN |
   | SENTRY_ORG | Plain text | Organization slug |
   | SENTRY_PROJECT | Plain text | Project slug |
   | SENTRY_AUTH_TOKEN | Secret | Private upload token |

   The DSN is embedded in the app; the upload token must never have an
   `EXPO_PUBLIC_` prefix. Set the same names in **preview** with the appropriate
   test Sentry project for `internal-testing`. Production now explicitly selects
   the production EAS environment. Do not put these values in git or `.env` files.
3. From `mobile-app`, run `eas build --platform android --profile internal-testing`
   for the internal candidate (or `--profile production` for the approved final
   candidate). This creates a new native build; an OTA alone cannot add hooks.
   Inspect EAS logs for the Sentry upload task and successful artifact upload.
   If the task is absent, verify the token's environment selection and regenerate
   native sources on the worker. Verify upload errors before accepting a build.
4. In a temporary internal-only test build, trigger from a button in a real
   application source file:

   ```tsx
   onPress={() => { throw new Error('MedVeda symbolication verification'); }}
   ```

   Use a release build, not development/Expo Go (`__DEV__` disables reporting).
   Restart after the error if needed. In Sentry, verify the event's release is
   `in.medveda.app@<version>+<versionCode>`, distribution is `<versionCode>`, and
   the stack resolves to that source file and line with source context. Inspect
   the payload for the existing scrubbing rules and confirm an alert reaches its
   owner. Remove the temporary button and rebuild before distributing normally.
5. For a later EAS Update, run `eas update --environment <environment>` and
   `npx --no-install sentry-expo-upload-sourcemaps dist` in the same trusted EAS
   worker/CI job with those variables. A secret token stays on EAS servers.
   Local EAS Update workflows instead need a deliberately configured **sensitive**
   token retrievable through EAS tooling; do not copy it into repo files or logs.
   Native plugin auto-upload covers builds; Update uploads are a separate step.

No Sentry event, upload, EAS build, alert, or secret change was performed here.
Backend payment alerting/queue monitoring still requires owner configuration;
payment worker code was outside scope. Privacy filters, zero tracing, and no
screenshot/replay behavior are preserved.

References: [Expo Sentry integration](https://docs.expo.dev/guides/using-sentry/),
[EAS environment management](https://docs.expo.dev/eas/environment-variables/manage/).

