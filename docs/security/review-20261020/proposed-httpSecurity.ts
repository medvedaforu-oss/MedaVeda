// REVIEW ONLY: copy to supabase/functions/_shared/httpSecurity.ts.
// Wrap each Deno.serve handler with secureEndpoint(). No global request state.
export type EndpointOptions = {
  origins?: readonly string[];
  // Set false for the Razorpay webhook: authenticate its unchanged raw bytes.
  jsonObject?: boolean;
  maxBodyBytes?: number;
};
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Referrer-Policy": "no-referrer",
};
export function secureEndpoint(
  handler: (request: Request) => Response | Promise<Response>,
  options: EndpointOptions = {},
): (request: Request) => Promise<Response> {
  const allowed = new Set(options.origins ?? []);
  return async (request) => {
    const origin = request.headers.get("Origin");
    const finish = (response: Response) => {
      const result = new Headers(response.headers);
      for (const key of [...result.keys()]) {
        if (key.toLowerCase().startsWith("access-control-")) result.delete(key);
      }
      for (const [key, value] of Object.entries(headers)) result.set(key, value);
      result.append("Vary", "Origin");
      if (origin && allowed.has(origin)) {
        result.set("Access-Control-Allow-Origin", origin);
        result.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        result.set("Access-Control-Allow-Headers",
          "authorization, apikey, content-type, x-client-info, x-medveda-app-version");
      }
      return new Response(response.body, { status: response.status, headers: result });
    };
    const error = (status: number, message: string) => finish(new Response(
      JSON.stringify({ error: message }),
      { status, headers: { "Content-Type": "application/json" } },
    ));
    // No Origin is normal for native/server requests; authentication still applies.
    // A missing Origin is not authentication and this is not a CSRF defence.
    if (origin && !allowed.has(origin)) return error(403, "Origin not allowed");
    if (request.method === "OPTIONS") return finish(new Response(null, { status: 204 }));
    try {
      const contentType = (request.headers.get("Content-Type") ?? "").split(";")[0].trim();
      // The upload handler already bounds multipart by streamed bytes.
      if (request.body && contentType !== "multipart/form-data") {
        const reader = request.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        const max = options.maxBodyBytes ?? 16 * 1024;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > max) {
            await reader.cancel();
            return error(413, "Request too large");
          }
          chunks.push(chunk.value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        if (options.jsonObject !== false && size > 0) {
          if (contentType !== "application/json") return error(415, "Expected application/json");
          let value: unknown;
          try { value = JSON.parse(new TextDecoder().decode(bytes)); }
          catch { return error(400, "Invalid JSON"); }
          if (!value || typeof value !== "object" || Array.isArray(value))
            return error(400, "Expected a JSON object");
        }
        // Preserve EXACT webhook bytes. Never JSON.stringify a signed webhook.
        const nextHeaders = new Headers(request.headers);
        nextHeaders.delete("Content-Length");
        request = new Request(request.url, {
          method: request.method, headers: nextHeaders, body: bytes,
        });
      }
      return finish(await handler(request));
    } catch {
      // Never serialize an exception/request body into the response or logs.
      return error(500, "Request could not be completed");
    }
  };
}
