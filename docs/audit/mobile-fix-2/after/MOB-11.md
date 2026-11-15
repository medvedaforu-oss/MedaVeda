# MOB-11 — locally fixed; device validation pending

Same verifier PASS recorded in after/MOB-11.log. Pause and cancel serialize per download; cancel invalidates active transfer ownership immediately. Persisted paused partial paths are validated as direct owned filenames and deleted before resume metadata is forgotten; native deletion failures remain visible/retryable. Resume/enqueue respect control operations. Source before/after and incremental patch are under checkpoints/MOB-11.

Native filesystem byte deletion, overlapping pause/cancel and failed-deletion retry require device validation; the runtime harness does not establish those results.
