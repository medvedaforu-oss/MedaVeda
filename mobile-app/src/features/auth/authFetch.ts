// Abort the transport itself: racing signInWithPassword against a timer would
// allow a late response to persist a session after the student has retried.
// Limit this policy to authentication; content and payments retain their flows.
export const authFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!/\/(auth\/v1\/|functions\/v1\/login-with-mobile(?:\?|$))/.test(url)) {
    return fetch(input, init);
  }
  const controller = new AbortController();
  const upstream = init?.signal ?? (typeof input === "object" && "signal" in input ? input.signal : undefined);
  const abort = () => controller.abort();
  upstream?.addEventListener("abort", abort, { once: true });
  if (upstream?.aborted) abort();
  const timer = setTimeout(abort, 15_000);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    // Fetch resolves at headers. Keep cancellation active while the small auth
    // response body arrives too, so a stalled body cannot leave login spinning.
    const body = await response.text();
    return new Response([204, 205, 304].includes(response.status) ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
  } finally {
    clearTimeout(timer);
    upstream?.removeEventListener("abort", abort);
  }
};
