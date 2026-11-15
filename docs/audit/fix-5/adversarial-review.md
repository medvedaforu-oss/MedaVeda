# Final adversarial review

Agent R approved the amended design and implementation semantics based on supplied source excerpts and final execution evidence. No additional concrete financial or privilege blocker was identified in that material. R had no filesystem/execution tools; this is not independent full-file inspection or execution certification.

Reviewed attacks and evidence:

- Balance/trigger/UI divergence: helper and no-overdraw share signed posted facts; owner get RPC materializes expiry before returning the expired aggregate. Real authenticated-role test uses synthetic JWT claims. Mobile renders positive expiry totals, including an expired-only wallet with program disabled.
- Double expiry/restore: unique credit expiry target, original-remainder allocation, order restore uniqueness, replay twice and zero-recovery after later deposit tests pass.
- C5/F8 conflict: actual recovered monetary facts only; provider unexpired reward recovery retains F8, manual admin remains original-remainder-only. Both controlled FIFO tie orders pass.
- Lost funds/overdraw/paise: original overdraw/refund/append-only assertions unchanged; new exact monetary conservation and concurrent settlement+expiry+refund pass.
- Privilege escalation: new internal helpers revoked from PUBLIC/anon/authenticated, fixed public search_path; internal tables RLS enabled, no client write policies; service INSERT/SELECT plus immutable/capacity/type/owner guards. No missing WITH CHECK on newly added policies because none grants client writes. Metadata view is security_invoker with no client SELECT.
- Lock order: sorted affected owners precede payment/credit/referral rows in cooperating paths; erasure includes affected referral owners. Old-schema reciprocal refund deadlock was reproduced. Intermediate-schema deletion/reversal and timestamp allocation regressions were caught and corrected. Final real-session probes pass.
- History: migration creates derived snapshots/consumption only; legacy protected ledger fields compare unchanged. Expiry is a new append-only fact. Optional legacy policy is outside migrations and unexecuted.
- Admin lockout/symptom hiding: existing admin/MFA/ownership gates unchanged; zero-row save and unknown mutation outcome fail visibly. K4 diagnostic retained. No invariant test was edited to obtain a pass; no purchase/billing flag enabled.

R qualifications: staging/device/production unverified; raw DB0 blocked by unchanged K4; optional legacy policy owner-review-only; backfill intentionally aborts on incompatible history/settings; concurrency coverage is finite. Root's final verification also corrected expired-only UI visibility after R's financial review; its rendered test, fresh TypeScript and focused lint pass.
