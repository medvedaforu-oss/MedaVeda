import { getUserFromAuthHeader, supabaseAdmin } from "./supabaseAdmin.ts";
import { createNonplayTestHandlers } from "./nonplayTestHandlers.ts";

export const nonplayTestHandlers = createNonplayTestHandlers({
  db: supabaseAdmin,
  authenticate: getUserFromAuthHeader,
  env: (key) => Deno.env.get(key),
});
