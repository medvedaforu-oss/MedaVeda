# Wallet final design and verification cap

Attempt 1: reversal-on-empty denial and FK index regressed. Attempt 2: strict monetary treatment of provider reversal facts rejected an existing refund flow; expired-admin wording also differed. Original SQL assertions remain unchanged by Fix-4.

Final different design separates nominal provider reversal facts from recovered money. A provider fact requires the original owner/credit and refunded order; allocations consume only original remaining value; reverse_payment flags unrecovered value. Admin reversal is bounded by original unexpired remainder. Shared remaining-credit computation serves display, pricing/reservations and debit guard. Ledger rows are never rewritten; hold duration and first availability live in derived tables.

This is the final allowed wallet design attempt. Wallet verification failed again on unchanged C5; both findings are BLOCKED and the unapplied candidate is quarantined. Source-only changes are not deployment approval.

Automatic approval review rejected a combined wallet-source/PDF-test-edit action. A narrower source-only request was approved after showing user authorization, no production operation and unchanged SQL assertions. The proposed PDF assertion edit was not performed; its obsolete seven-day copy expectation remains a recorded failing test.
