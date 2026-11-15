# MOB-17 correction review

APPROVE — narrow review of `mobile-app/src/hooks/useQuizStats.ts` and `mobile-app/__tests__/MOB-17.cjs`.

Verified with `node __tests__/MOB-17.cjs` from `mobile-app` (login shell disabled): all seven cases pass: backend cap, mutable owner/epoch A→B→A, unmount, superseding refresh, page error, count mismatch, and incomplete scan. Source guards every asynchronous publication with request, mounted state, owner, and auth epoch; cleanup captures the lifecycle object and unsubscribes. No blocking finding in this scope.

Limitation: bounded keyset paging plus matching initial/final counts is not a transactional snapshot under concurrent writes. Equal-count replacements or edits during the scan can escape count checks; this review does not claim snapshot consistency.

Integration requirement: MOB-17 imports `getAuthEpoch` from the uncommitted MOB-13 `authState.ts` prerequisite. Keep MOB-17 uncommitted while that prerequisite remains uncommitted; approval does not authorize independently committing this dependency chain.

No source, test, or git changes made by this review.
