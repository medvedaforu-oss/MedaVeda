#!/usr/bin/env python3
"""Offline source checks only: no hosted SQL, provider calls or deployments.

Run from any directory. Requires the existing Node dependencies and Deno cache.
Output and optional build artifacts go to /tmp unless --output is supplied.
"""
import argparse
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", type=Path)
parser.add_argument("--full", action="store_true", help="Also export Android and build admin")
args = parser.parse_args()
output = args.output or Path(tempfile.mkdtemp(prefix="medveda-readiness-local-"))
output = output.resolve()
output.mkdir(parents=True, exist_ok=True)
# Neither Node fixtures nor Expo builds receive local service credentials/env files.
env = {key: value for key, value in os.environ.items()
       if key in {"PATH", "HOME", "DENO_DIR", "LANG", "TMPDIR"}}
env.update(EXPO_NO_DOTENV="1", CI="1")


def run(name, command, cwd=ROOT):
    started = time.monotonic()
    log_path = output / (name.replace("/", "_") + ".log")
    with log_path.open("w") as log:
        completed = subprocess.run(command, cwd=cwd, env=env,
                                   stdout=log, stderr=subprocess.STDOUT, check=False)
    result = {"name": name, "exit": completed.returncode,
              "seconds": round(time.monotonic() - started, 2), "command": command}
    print(json.dumps({key: result[key] for key in ("name", "exit", "seconds")}), flush=True)
    if completed.returncode:
        print(log_path.read_text()[-5000:], flush=True)
    return result


jobs = [
    ("mobile-tsc", ["node", "node_modules/typescript/bin/tsc", "--noEmit"], ROOT / "mobile-app"),
    ("admin-app-tsc", ["node", "node_modules/typescript/bin/tsc", "-p", "tsconfig.app.json", "--noEmit"], ROOT / "admin-panel"),
    ("admin-node-tsc", ["node", "node_modules/typescript/bin/tsc", "-p", "tsconfig.node.json", "--noEmit"], ROOT / "admin-panel"),
    ("lint", ["node", "tooling/node_modules/eslint/bin/eslint.js", "mobile-app/App.tsx", "mobile-app/src", "admin-panel/src"]),
    ("deno-check-20", ["deno", "check", "--cached-only", "--config", "supabase/deno.json"]
     + [str(path.relative_to(ROOT)) for path in sorted((ROOT / "supabase/functions").glob("*/index.ts"))]
     + ["supabase/workers/validate-note-pdf.ts"]),
    ("website-links", ["node", "website/scripts/check-links.mjs"]),
]

# These three self-tests write a database. Never discover/run them implicitly.
db_tests = {"content-url-publication-selftest.cjs", "play-cron-config-selftest.cjs", "ucb-cron-config-selftest.cjs"}
node_tests = []
for directory in ["mobile-app/scripts", "admin-panel/scripts", "supabase/tests", "scripts"]:
    for path in sorted((ROOT / directory).iterdir()):
        if path.name in db_tests or path.suffix not in {".cjs", ".mjs", ".js"}:
            continue
        if "selftest" not in path.name and ".test." not in path.name:
            continue
        relative = str(path.relative_to(ROOT))
        node_tests.append(relative)
        jobs.append(("node-" + relative, ["node", "--experimental-strip-types", relative]))

deno_unit = [
    "supabase/functions/diagnose-play-pricing/handler_test.ts",
    "supabase/functions/diagnose-play-pricing/sanitize_test.ts",
    "supabase/tests/play_catalog_api_test.ts", "supabase/tests/play_catalog_unit_test.ts",
    "supabase/tests/play_diagnostic_sanitization_review_test.ts",
    "supabase/tests/note-pdf-hash-test.ts", "supabase/tests/pdf-validation-test.ts",
    "supabase/tests/quarantine-worker-test.ts", "supabase/tests/upload-body-test.ts",
    "supabase/tests/upload-note-pdf-test.ts",
]
jobs.append(("deno-unit", ["deno", "test", "--cached-only", "--config", "supabase/deno.json",
                           "--allow-read", "--allow-env"] + deno_unit))
for name in ["payment-backlog-load", "payment-gate", "play-offer", "razorpay-env", "razorpay-refund"]:
    jobs.append(("deno-" + name, ["deno", "run", "--cached-only", "--config", "supabase/deno.json",
                                  "--allow-read", "--allow-env", f"supabase/tests/{name}-selftest.ts"]))
if args.full:
    jobs.extend([
        ("android-export", ["node", "node_modules/expo/bin/cli", "export", "--platform", "android",
                            "--output-dir", str(output / "android-export")], ROOT / "mobile-app"),
        ("admin-build", ["node", "node_modules/vite/bin/vite.js", "build", "--outDir",
                         str(output / "admin-dist")], ROOT / "admin-panel"),
    ])

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    futures = [executor.submit(run, *job) for job in jobs]
    results = [future.result() for future in futures]

# Inventory includes tracked/untracked nonignored files. The JS scanner reports
# locations only, never values. Also inspect decompressed audit archives.
inventory = subprocess.check_output(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=ROOT, env=env)
inventory = b"\0".join(sorted(set(inventory.split(b"\0"))))
scan = """
import {readFileSync, existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {scanSecrets} from './scripts/scan-secrets.mjs';
let findings=0, count=0;
for(const file of readFileSync(0,'utf8').split('\\0').filter(Boolean)) {
  if (!existsSync(file)) continue;
  const bytes=readFileSync(file);
  const source=file.endsWith('.gz') ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8');
  count++;
  for(const hit of scanSecrets(source)) { findings++; console.error(`${file}:${hit.line}: ${hit.kind} (value redacted)`); }
}
console.log(JSON.stringify({files:count,potentialSecrets:findings}));
process.exitCode=findings?1:0;
"""
with (output / "secret-scan.log").open("w") as log:
    secret_result = subprocess.run(["node", "--input-type=module", "-e", scan], input=inventory,
                                   cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, check=False)
results.append({"name": "secret-scan-including-archives", "exit": secret_result.returncode})
summary = {"nodeTestFiles": len(node_tests), "results": results,
           "excluded": sorted(db_tests) + ["hosted_quiz_controlled_test.ts", "note_upload_staging_test.ts",
                                          "SQL/concurrency/provider smoke scripts", "historical review artifacts"]}
(output / "results.json").write_text(json.dumps(summary, indent=2) + "\n")
failed = any(result["exit"] for result in results)
print(f"{'FAIL' if failed else 'PASS'}: {len(node_tests)} Node files; results in {output}", flush=True)
raise SystemExit(int(failed))
