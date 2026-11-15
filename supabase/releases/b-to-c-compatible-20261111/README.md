# B-to-C compatible upgrade candidate

Local review only. Do not deploy or activate payments. Requires baseline+A and atomic C1–C4 with strong final MV003. B1/B2 and the reporting worker derive from reviewed Phase C sources, restoring Phase B unknown refund/dispute rejection and unresolved capture retry behavior. B3 entrypoint remains the exact reviewed Phase B website handler; its shared provider helper is the additive Phase C version.

All import closures, source hashes, JWT settings and source archives are pinned in manifest.json. This does not change either reviewed release. These handlers are incompatible with baseline+A alone because they use C authorization, inbox and reporting contracts. Keep financial ingress drained across C commit and delivery of this separately approved upgrade. New choice routes remain gated off; reporting/worker delivery and schedules need separate approval.
