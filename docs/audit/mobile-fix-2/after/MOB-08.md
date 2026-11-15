MOB-08: foreground notification presentation now combines the existing broadcast/deduplication gate with the persisted preference for a validated notification category. Unknown categories and untyped local study reminders retain existing presentation behavior.

Verification: `node mobile-app/__tests__/MOB-08.cjs` passed. The recorded before run failed for a muted offer; the after run checks muted offers, enabled notes, and untyped notifications.

Scope: this client handler controls foreground presentation only. Suppressing OS-delivered background push notifications requires sender-side persisted preferences and delivery filtering; background behavior remains unverified.

Expo SDK 57 notification handler reference checked: https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
