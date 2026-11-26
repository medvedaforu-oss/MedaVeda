# Independent review — Question Paper remediation

A fresh read-only reviewer inspected the new module, privileged mutation RPCs, server signing/validation boundary, immutable receipts, lifecycle handling and file preservation. No implementation work was delegated.

The reviewer found one P2: cross-origin iframe error events cannot establish that web PDF embedding failed. Manually invoking the prop in a test proved wiring only. See [MDN iframe error/load behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#error_and_load_event_behavior).

Resolution: the web screen now fetches the signed URL through a controlled fetch, checks HTTP status, MIME, size and signature, and embeds a locally created Blob using an object element with fallback content. Independent visible guidance points to Download PDF when embedding is unavailable. The preview hook cancels superseded requests, suppresses stale callbacks and revokes Blob URLs. The new web-preview regression failed before the hook existed, then passed for fetch failure, interruption, stale response and cleanup. Download tests exercise HTTP failure and invalid bytes; browser embedding itself remains a manual acceptance gate.

The reviewer identified no P0/P1 in the reviewed implementation. Four focused suites passed during review: edge handler, native downloads, mobile lifecycle and Admin UI. It confirmed that baseline hash differences were limited to authorized Question Paper resources. The reviewer correctly qualified that injected clients and disposable SQL cannot establish hosted Storage API behavior, deployed permissions, token expiration or real browser/device rendering.

The author implemented and verified the web finding after review. No claim of a second independent review of that fix is made.
