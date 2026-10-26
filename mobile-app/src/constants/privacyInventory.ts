// Current source data inventory, aligned with website privacy-policy.html.
export const PRIVACY_INVENTORY = [
  {
    "category": "Account and study profile",
    "data": "Name, email, mobile number, account ID, verification status, course, year and referral details. Passwords are handled by Supabase Auth.",
    "provider": "Supabase Auth/database; email delivery provider.",
    "purpose": "Sign-in, account security and study selection."
  },
  {
    "category": "Learning and analytics",
    "data": "Quiz selections, attempts, scores and queued offline attempts; screen/content views, searches, order/unlock events and app version/build/platform. Search terms may include information you type.",
    "provider": "Supabase; offline attempts also stay on the device until submission/sync.",
    "purpose": "Save progress, understand use and improve the app."
  },
  {
    "category": "Notifications",
    "data": "Push token, device platform and notification preferences.",
    "provider": "Supabase, Expo Push Service and device push providers (FCM/APNs).",
    "purpose": "Deliver permitted notifications; some preferences stay on the device."
  },
  {
    "category": "Crash diagnostics",
    "data": "Error details, stack traces, device model, OS and app/build version when a release DSN is configured. Default personal data, user/request/extra fields and console/navigation breadcrumbs are removed; common identifiers are scrubbed. No performance traces, screenshots or session replay are enabled.",
    "provider": "Sentry.",
    "purpose": "Find and fix crashes; scrubbing reduces personal data but cannot guarantee every error is anonymous."
  },
  {
    "category": "Purchases and referrals",
    "data": "Products/scopes, amounts, status, dates, refunds, referral/wallet records and payment identifiers.",
    "provider": "Supabase; the relevant payment provider.",
    "purpose": "Verify access, provide support, prevent abuse and keep accounting records."
  },
  {
    "category": "Google Play",
    "data": "Purchase token, product/order IDs and obfuscated account/order identifiers; eligible legacy payment-program reporting identifiers where applicable.",
    "provider": "Google Play and Supabase verification functions.",
    "purpose": "Android digital notes purchases and purchase verification."
  },
  {
    "category": "Razorpay",
    "data": "Order/payment IDs and payment status; checkout prefill and billing state for applicable non-Play/legacy channels.",
    "provider": "Razorpay and Supabase.",
    "purpose": "Process and verify applicable payments. The current Play Android app uses Google Play Billing."
  },
  {
    "category": "Account email",
    "data": "Email address and verification/password-reset message content.",
    "provider": "Supabase Auth and its configured email delivery provider, intended to be Resend; the live provider configuration requires verification.",
    "purpose": "Deliver account emails. The contact form instead opens your email app."
  },
  {
    "category": "Retained identity records",
    "data": "Email/phone hashes, original account ID and first-purchase timestamp. These identifiers are not anonymous.",
    "provider": "Supabase.",
    "purpose": "Detect repeated first-purchase discounts and referral abuse, subject to the retention cutoff below."
  },
  {
    "category": "Security and support",
    "data": "Hashed IP-derived rate-limit keys, service request metadata and information you send by email/WhatsApp. Provider/hosting logs may include IP/browser details.",
    "provider": "Supabase, hosting/service providers and the support inbox.",
    "purpose": "Protect accounts, operate the service and respond to support requests."
  },
  {
    "category": "Website and local storage",
    "data": "Website IP/browser details reach Google Fonts and hosting. Local downloads, recent searches/activity, streak, reminders, preferences and offline queues remain on the device unless separately submitted as described above.",
    "provider": "Website providers; device files, SQLite and local storage.",
    "purpose": "Display the website and support offline study. No website analytics scripts or advertising cookies are configured."
  }
];
