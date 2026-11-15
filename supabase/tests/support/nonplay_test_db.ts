// Real disposable PostgreSQL adapter for the actual Edge handlers. No network
// permission, hosted credentials, live payment APIs or Supabase calls are needed.
export function literal(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  return "'" + String(v).replaceAll("'", "''") + "'";
}
function ident(s: string) {
  if (!/^[a-z_][a-z_0-9]*$/.test(s)) throw new Error("Unsafe test identifier");
  return '"' + s + '"';
}
export async function sql(query: string): Promise<string> {
  if (
    !(["/tmp", "127.0.0.1", "localhost"].includes(Deno.env.get("PGHOST") ?? "")
      || /^\/tmp\/[A-Za-z0-9_/-]+$/.test(Deno.env.get("PGHOST") ?? ""))
    || !/^ap_ci_[a-z0-9_]+$/.test(Deno.env.get("TEMPLATE_DB") ?? "")
  ) throw new Error("Disposable localhost test database required");
  const childEnv = Object.fromEntries(
    ["PATH", "PGHOST", "PGPORT", "PGUSER", "PGPASSWORD"].flatMap((k) =>
      Deno.env.get(k) === undefined ? [] : [[k, Deno.env.get(k)!]]
    ),
  );
  const result = await new Deno.Command("psql", {
    clearEnv: true,
    env: childEnv,
    args: [
      "-XqAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-d",
      Deno.env.get("TEMPLATE_DB")!,
      "-c",
      query,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) throw new Error(new TextDecoder().decode(result.stderr));
  return new TextDecoder().decode(result.stdout).trim();
}
export class TestDatabase {
  signed: string[] = [];
  storage = {
    from: (bucket: string) => ({
      createSignedUrl: async (path: string, ttl: number) => {
        if (bucket !== "nonplay-test-notes" || ttl !== 120) {
          throw new Error("Wrong synthetic storage bucket");
        }
        this.signed.push(path);
        return {
          data: {
            signedUrl:
              `https://xbvenkfmesugrbjuufyw.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=synthetic`,
          },
          error: null,
        };
      },
    }),
  };
  async rpc(name: string, args: Record<string, unknown>) {
    if (!name.startsWith("nonplay_test_")) {
      throw new Error("Live RPC reached from test handler");
    }
    try {
      const value = await sql(
        `select to_jsonb(public.${ident(name)}(${
          Object.entries(args).map(([k, v]) => ident(k) + "=>" + literal(v))
            .join(",")
        }))`,
      );
      return { data: JSON.parse(value), error: null };
    } catch (e) {
      return { data: null, error: { code: "TEST_SQL", message: String(e) } };
    }
  }
  from(table: string) {
    // Explicit synthetic setting for existing enabled-checkout fixtures only.
    // This is not a query/update of the persisted switch (which stays false).
    // Production handlers now share that switch; deny cases have fake-DB probes.
    if (table === "purchase_settings") {
      return {
        select: (_columns: string) => ({
          eq: (_key: string, _value: boolean) => ({
            maybeSingle: () => Promise.resolve({ data: { new_orders_enabled: true }, error: null }),
          }),
        }),
      };
    }
    if (!table.startsWith("nonplay_test_")) {
      throw new Error("Live table reached from test handler");
    }
    return new Query(table);
  }
}
class Query {
  columns = "*";
  filters: string[] = [];
  mode = "select";
  values: Record<string, unknown> = {};
  conflict = "";
  suffix = "";
  sort = "";
  constructor(public table: string) {}
  select(columns = "*") {
    this.columns = columns.split(",").map((x) => x === "*" ? x : ident(x)).join(
      ",",
    );
    return this;
  }
  eq(k: string, v: unknown) {
    this.filters.push(`${ident(k)}=${literal(v)}`);
    return this;
  }
  neq(k: string, v: unknown) {
    this.filters.push(`${ident(k)}<>${literal(v)}`);
    return this;
  }
  is(k: string, _v: unknown) {
    this.filters.push(`${ident(k)} is null`);
    return this;
  }
  in(k: string, values: unknown[]) {
    this.filters.push(
      values.length
        ? `${ident(k)} in (${values.map(literal).join(",")})`
        : "false",
    );
    return this;
  }
  order(k: string, { ascending }: { ascending: boolean }) {
    this.sort = ` order by ${ident(k)} ${ascending ? "asc" : "desc"}`;
    return this;
  }
  limit(n: number) {
    if (!Number.isSafeInteger(n)) throw new Error("bad limit");
    this.suffix = ` limit ${n}`;
    return this;
  }
  update(v: Record<string, unknown>) {
    this.mode = "update";
    this.values = v;
    return this;
  }
  insert(v: Record<string, unknown>) {
    this.mode = "insert";
    this.values = v;
    return this;
  }
  upsert(
    v: Record<string, unknown>,
    options: { onConflict: string; ignoreDuplicates: boolean },
  ) {
    this.insert(v);
    this.conflict = ` on conflict(${ident(options.onConflict)}) do nothing`;
    return this;
  }
  async execute(single = false, strict = false) {
    const table = `public.${ident(this.table)}`,
      where = this.filters.length ? " where " + this.filters.join(" and ") : "";
    let q;
    if (this.mode === "select") {
      q =
        `select ${this.columns} from ${table}${where}${this.sort}${this.suffix}`;
    } else if (this.mode === "update") {
      q = `update ${table} set ${
        Object.entries(this.values).map(([k, v]) => ident(k) + "=" + literal(v))
          .join(",")
      }${where} returning *`;
    } else {q = `insert into ${table}(${
        Object.keys(this.values).map(ident).join(",")
      }) values(${
        Object.values(this.values).map(literal).join(",")
      })${this.conflict} returning *`;}
    try {
      const rows = JSON.parse(
        await sql(
          this.mode === "select"
            ? `select coalesce(json_agg(t),'[]') from (${q}) t`
            : `with changed as (${q}) select coalesce(json_agg(t),'[]') from changed t`,
        ),
      );
      if (strict && rows.length !== 1) throw new Error("Expected one row");
      return { data: single ? rows[0] ?? null : rows, error: null };
    } catch (e) {
      return { data: null, error: { code: "TEST_SQL", message: String(e) } };
    }
  }
  maybeSingle() {
    return this.execute(true);
  }
  single() {
    return this.execute(true, true);
  }
  then(resolve: (v: any) => unknown, reject?: (e: unknown) => unknown) {
    return this.execute().then(resolve, reject);
  }
}
