# MOB-12 decision — Fix 6 / free-only v1

Decision: **defer to v1.1**, explicitly selected by the owner. Status: **OWNER APPROVAL REQUIRED (deferred by owner)**. `mobile-app/src/config/secureSessionStorage.ts`, the v2 envelope and mobile dependencies are unchanged. No crypto dependency was installed.

V2 uses AES-256-CTR ciphertext in AsyncStorage with a fresh per-publication key in SecureStore. It protects storage-only confidentiality but has no authentication tag. Tampering requires write access to app-private storage: for example root/jailbreak, an applicable writable backup/restore path or debug/app-privileged execution. An ordinary sandboxed app has no such access by default. Phase 1 reproduced controlled known-plaintext ciphertext modification with in-memory stores; this does not forge a server JWT or bypass Supabase authorization. Fully compromised runtime/key access and storage deletion remain outside local envelope protection. Web retains its existing plaintext development fallback.

Recommended v1.1 design: SDK-compatible **Expo AES-GCM**, strict bounded v3 schema, 256-bit generation key, random 96-bit nonce and 128-bit tag. AAD binds application/domain, exact storage key, version, algorithm and generation. Preserve immutable SecureStore generation keys, per-key serialization and key-first → envelope publication → old-key cleanup ordering. Tag mismatch/corruption/wrong context must fail closed to signed-out without crashing or falling back to CTR. Temporarily unavailable/locked secure storage must preserve durable data and return a controlled retryable auth outcome.

Future owner command from mobile-app, **TEXT ONLY — NOT RUN**:

```bash
EXPO_NO_DOTENV=1 npx expo install expo-crypto
```

Installation, lockfile/native integration and device qualification require separate v1.1 approval. The local SDK57 compatibility manifest recommends ~57.0.4; recheck at that time. No native release build is authorized by this note. See [Phase 1](phase1-findings.md) for installed HMAC/JS AEAD alternatives and the source/API comparison.

Migration conditions: never authenticate CTR by JSON validity alone. Integrate a fresh server-validated session refresh with the SDK auth lifecycle, capture owner/auth epoch and reject stale A→B→A results before publishing v3. Do not recursively call refreshSession from storage.getItem. Offline/transient refresh failure defers conversion and preserves v2. Definitive revocation requires login. PKCE/code-verifier and auxiliary values need separate handling because they are not session objects. Test cross-key/AAD/nonce/tag/version/generation substitution, publication interruption, concurrent operations, locked/key-loss cases and actual Android/iOS restarts before rollout. Do not dual-write an unauthenticated v2 shadow.

Rollback: the present v2 reader returns null for v3. A v3-capable rollback/bridge binary is required for transparent rollback; after old generation keys are deleted, reverting to an old binary can force login. Agree on that compatibility boundary before shipping v3. Do not promise zero forced logouts: corruption, missing keys, server revocation and old-reader rollback can require reauthentication. No mass logout, key rotation, migration or server call was performed by Fix 6.
