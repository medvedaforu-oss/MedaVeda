# Payment blocker closure verification plan

Scope: continue the completed ten-file review without changing migration/application/release bytes. User request authorizes local synthetic verification and preparation only. No production SQL, deployment, worker, provider or activation operation is authorized.

- [x] Verify frozen manifests, source copies, archives, JWT/import closures and A/C/D transaction units offline.
- [x] Rehearse exact A/C/D on disposable PostgreSQL 17.11; test C abort/visibility and D lock/abort/role behavior; distinguish managed-service limitations.
- [x] Prepare private reconciliation procedure and minimum provider evidence requirements, with no invented case facts.
- [x] Prepare standalone read-only drift SQL and acceptance comparisons; never connect it to production.
- [x] Prepare complete coordinated restore rehearsal and component acceptance plan; preserve known Auth/Storage gaps.
- [x] Keep seven-index/test-lane units separate; publish explicit blocker matrix and NO-GO.

Evidence lives in `evidence/`; plans/checklists contain no customer identifiers or secrets. Existing dirty workspace changes belong to prior work and remain untouched. A clean worktree would omit the frozen untracked candidates being verified. No commits or history manipulation are part of this audit.
