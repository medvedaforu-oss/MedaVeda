# MVPDF/1 foundation wire format

Dormant Kotlin/JCA core only. No module registration, app imports, HTTP, DB,
migration, plaintext-view output or OS key provisioning. Input metadata must
already have been authenticated by a future integration; this core cannot
establish server authorization or license validity.

Integers are big-endian. AES-256-GCM has 12-byte nonces and 16-byte tags appended
to ciphertext. SHA-256 outputs 32 bytes. Maximum plaintext is 104857600 bytes;
chunk size 262144 bytes. Canonical identifier strings match
`[A-Za-z0-9_.:-]{1,128}`. Content identity/validator matches the same alphabet
with a 256-byte limit. All strings are UTF-8/ASCII, uint16-length-prefixed.
Version, total length and key epoch are positive. Bounds checked before allocation.

`M` (canonical expected metadata) is owner string, note string, uint64 content
version, uint64 total plaintext length, uint32 key epoch, content-identity string.
M must fit 65536 bytes. Reader takes M independently from its trusted caller;
does not accept a file's claims as authorization. ASCII restriction is deliberate;
future Unicode encoding needs a different version. File/key identity is independent
of payment order IDs; order means chunk order.

Outer prefix `P`: ASCII `MVPDF001` (version 1, AES-256-GCM suite fixed), 16 random
file-ID bytes, uint32 key epoch, 4 random data-nonce prefix bytes (32 bytes total).
Then random 12-byte wrap nonce and 48-byte wrapped random 32-byte DEK. Wrap AAD
is ASCII `MVPDF/1/wrap` || P || M. Owner root key is never serialized. Root-key
wrap nonce uses fresh CSPRNG entropy; uniqueness across wraps is probabilistic
(96-bit random). Data nonces are unique by construction per new random DEK:
4-byte prefix || uint64 counter, never resume/rewrite under that DEK.

Encrypted metadata: uint32 ciphertext length followed by AES-GCM(M), counter 0,
AAD ASCII `MVPDF/1/meta` || entire 92-byte outer header. Metadata ciphertext length
must equal expected M length + 16 and remain <=65536. Header digest H is SHA256
of outer header || metadata length || encrypted metadata.

Each record: uint8 kind, uint64 counter, uint32 plaintext length, ciphertext and
tag (length + 16). Kind 1 = data; kind 2 = completion. Record AAD is ASCII
`MVPDF/1/data` or `MVPDF/1/final` || H || M || encoded 13-byte record header.
Data counters must be 1..ceil(total/262144), lengths must exactly match the
remaining total, and first decrypted bytes must be `%PDF-`. Every write seals a
whole bounded chunk before persisting its ciphertext. No plaintext output API.

Completion counter N+1, kind 2, plaintext length exactly 52: uint64 N, uint64
total, uint32 final-chunk length, SHA256 of complete plaintext. Require all
fields, digest and immediate EOF. Reject incomplete records, duplicate/reordered
records, unknown kind/version, length overflow, trailing bytes and tag failures.
`verify` returns only authenticated identity and digest after completion; plaintext
exists transiently inside bounded native buffers and is wiped on normal exit.
Exceptions/immutable provider copies cannot be guaranteed zeroized by a JVM.

Every write allocates a fresh file ID, DEK, data prefix and wrap nonce. No API
accepts caller-supplied nonces or resumes a partially written container. Owner key
lookup never provisions/replaces a key; absent key fails closed. Keys must be
independently random per owner/epoch in the future secure-storage adapter.

Durability: only a newly created dedicated vault is initialized. Successful seal
uses CREATE_NEW ciphertext part, file force, complete streaming verification,
epoch-serialized atomic no-clobber hard link, directory force, then deletes only
its own newly written part link and forces directory again. Failures retain
ciphertext-only artifacts; never replace old finals or delete existing app data.
No automatic sweep, recovery import or migration API. A commit-boundary failure
may leave an authenticated orphan, never an asserted completed DB row.

Phase 1 host tests do not certify Expo/Android provider behavior, OS key storage,
iOS parity, fsync/power-loss guarantees, private-directory provisioning on device,
backup exclusions, lifecycle cleanup, real network bytes or viewer budgets.
