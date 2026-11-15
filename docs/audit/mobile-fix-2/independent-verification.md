# Independent executable verification — 2026-11-13

Executed `node mobile-app/__tests__/MOB-XX.cjs` separately for MOB-01, 03, 04, 05, 06, 07, 08, 09, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20 against current source. All 18 exited 0. Raw stdout/stderr is in `after/MOB-XX.log`; exit codes are in `independent-verification.json`. MOB-02 has no test fixture here; MOB-12 remains the documented deferred item.

The harness compiles and executes source with mocked dependencies. MOB-06 additionally checks that disposal during pending `setSession` and `updateUser` prevents subsequent auth calls and late sign-out. MOB-04 checks that success delivered after the watchdog navigates exactly once and an old owner's success cannot navigate after switching to B. MOB-10 checks A→B→A stale logout handles, repeated/single-use handles, and late logout rejection against a newer lifetime's handle. MOB-17 models exact head counts, owner and upper-ID bounds, and a backend cap of 250 while requiring 601 attempts, an older best score of 100, and rounded average 40.

## Fixture correction and baseline evidence

The prior MOB-15 before log was invalid setup evidence: CommonJS transpilation wrapped default-only mocks lacking `__esModule`, causing `useDebounce_1.default is not a function`. It is preserved verbatim as `before/MOB-15.invalid-fixture-original.log`. Default import mocks now declare `__esModule: true`; assertions were retained. The harness reads a durable checkpoint overlay when a file exists and otherwise reads the current source for dependencies omitted from the partial checkpoint.

Corrected command:

```sh
MOBILE_FIX_ROOT=/home/ganeshp8545/AyurPulse/docs/audit/mobile-fix-2/checkpoints/MOB-15/before/mobile-app node mobile-app/__tests__/MOB-15.cjs > docs/audit/mobile-fix-2/before/MOB-15.log 2>&1
```

The corrected before log fails four behavior assertions: free-preview enrichment, free pricing-filter inclusion, no lock for free previews, and completed/local-file-only downloaded IDs. It is a real regression failure, replacing only invalid setup evidence. Overlay fallbacks make dependencies executable; they do not reconstruct an entire historical repository.

## Remaining acceptance limits

Native navigation lifetime, deep-link dispatch, MFA UI, gesture behavior, actual screen/layout geometry, native purchases/late callbacks, token delivery, SQLite transactions, and live backend behavior remain unverified on a device. These passing fixtures establish controlled source behavior only. They do not establish release acceptance or production readiness.
