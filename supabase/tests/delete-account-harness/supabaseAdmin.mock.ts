import { execFileSync } from "node:child_process";
const q = (sql: string) => execFileSync("psql", ["-d", "ap_del_test", "-Atc", sql]).toString().trim();
const users: Record<string, string> = JSON.parse(process.env.TOKENS!);
export const supabaseAdmin: any = {
  auth: {
    getUser: async (t: string) => {
      const id = users[t];
      if (!id) return { data: { user: null }, error: { status: 401, message: "invalid JWT" } };
      if (q(`select 1 from auth.users where id='${id}'`) !== "1") return { data: { user: null }, error: { status: 403, code: "user_not_found", message: "User from sub claim in JWT does not exist" } };
      return { data: { user: { id } }, error: null };
    },
    admin: { deleteUser: async (id: string) => { q(`delete from auth.users where id='${id}'`); return { error: null }; } },
  },
  rpc: async (fn: string, args: any) => {
    if (fn === "erase_user_data") {
      return { data: JSON.parse(q(`select public.erase_user_data('${args.p_user_id}')`)), error: null };
    }
    if (fn === "rate_limit_hit") {
      // Limiter keys are SHA-256 hex. Bound numeric arguments before SQL so a
      // malformed fixture cannot turn this adapter into arbitrary SQL.
      if (!/^[0-9a-f]{64}$/.test(args.p_key) ||
          !Number.isSafeInteger(args.p_limit) || !Number.isSafeInteger(args.p_window_seconds)) {
        throw new Error("Invalid rate-limit fixture arguments");
      }
      return { data: JSON.parse(q(`select to_json(public.rate_limit_hit('${args.p_key}', ${args.p_limit}, ${args.p_window_seconds}))`)), error: null };
    }
    throw new Error(`Unexpected deletion harness RPC: ${fn}`);
  },
};
