# MOB-12 — analysis only; authenticated storage still pending

No crypto dependencies, package files or encryption code changed for this finding. Current native v2 AES-CTR envelope has confidentiality and immutable-generation publication but no authentication. A forged local blob is not proof of server authorization bypass.

## SDK 57 candidate

Use the SDK-matched `expo-crypto` native AES-GCM implementation. The official [Expo SDK 57 Crypto reference](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/) documents `AESEncryptionKey.generate(256)`/`import`, `aesEncryptAsync`/`aesDecryptAsync`, authenticated additional data, and `AESSealedData` transport containing IV, ciphertext and tag. It supports Android/iOS. The reference currently recommends ~57.0.4; a later implementation must resolve the exact compatible package through `npx expo install expo-crypto` and regenerate the lockfile. These APIs are a supported option, not a native build acceptance result. Do not introduce a custom MAC construction or reuse the existing CTR primitive for v3.

## Proposed envelope and publication

Define a strict v3 schema: version=3, algorithm=A256GCM, random 128-bit generation identifier, 96-bit nonce, ciphertext and 128-bit authentication tag, using one canonical bounded encoding. AAD is canonical UTF-8 encoding of an ordered array containing a fixed app/domain separator, storage key, version, algorithm and generation. Validate types, lengths and encoding before decoding. Every publication generates a fresh 256-bit key and nonce; never reuse a key/nonce pair. Persist the key under a versioned immutable SecureStore generation name. Keep keys in SecureStore; never log keys, plaintext, tokens or ciphertext.

Retain the existing per-storage-key serialization. Persist new generation key first, then publish the complete v3 envelope to AsyncStorage as the commit point. Delete the old generation key only after confirmed publication. On ambiguous publication failure retain both keys; restart resolves the published envelope. Missing/locked/unavailable keystore must not trigger deletion of the persisted blob. Removing a session deletes the published blob first, then best-effort generation cleanup. Unknown envelope versions fail closed.

## Legacy and v2 migration

Read legacy raw CTR ciphertext with its original SecureStore key and v2 with its recorded generation. Neither format authenticates plaintext: parsing JSON alone cannot make it trusted. For strongest migration, require a fresh server-authenticated session refresh before publishing its returned session as v3. If offline, keep the legacy envelope intact for later validation rather than silently claiming authenticated migration or deleting an existing session. Failed refresh must follow existing explicit session-invalid versus transient-error policy. Under the same storage-key serialization, publish a fresh v3 generation only after validation succeeds; remove the original key only after successful durable publication. Never downgrade v3 when verification fails and never fall back from a malformed v3 blob to CTR.

## Required verification before implementation acceptance

Test tampering independently for nonce/ciphertext/tag/AAD/key/generation/version; every authentication failure must yield no plaintext. Test Unicode and long sessions, cross-storage-key substitution, legacy and v2 upgrade, offline refresh deferral, concurrent set/get/remove, process interruption at each publication step, ambiguous AsyncStorage failure and locked SecureStore retry. Run an actual SDK 57 Android/iOS development build and device restart tests. A valid old v3 ciphertext can still be replayed by a storage writer; local AEAD is not a trusted anti-rollback counter. Server revocation/refresh remains authoritative.
