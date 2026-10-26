# Edge dependency resolution

The unchanged floating import resolved to Supabase JS **2.118.0** with the local
Deno 2.9.7 cache (`deno check --cached-only --lock=<temporary-file>`). All four
runtime imports now name that exact version. No payment/worker behavior changed.

`supabase/deno.json` freezes `supabase/deno.lock` (Deno lock format 5 supported by
the installed Deno). It includes Supabase's transitive npm dependencies and the
existing exact pdf-lib 1.17.1 dependency. No dependencies were downloaded.

Reproduce from the repository root:

```sh
deno check --cached-only --config supabase/deno.json supabase/functions/*/index.ts supabase/workers/validate-note-pdf.ts
```

This checks all 19 functions and the standalone PDF worker with a frozen lock.
For an intentional future dependency update, review the exact version and run
the same command with `--frozen-lockfile=false`, then review the lock diff and
rerun local tests. Use a Deno/CLI toolchain supporting this lock format; verify
the deployment toolchain in staging before any later deployment. This task did
not build a deployment bundle or deploy anything.
