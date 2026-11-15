"""Local credential-free release checks; no hosted endpoints or build requests."""
from pathlib import Path
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
env = {"PATH": os.environ["PATH"], "TZ": "UTC", "EXPO_OFFLINE": "1",
       "EXPO_NO_TELEMETRY": "1", "CI": "1"}
commands = []
for p in sorted((ROOT / "mobile-app/scripts").glob("*-selftest.cjs")):
    # Aggregate duplicates and alternate-environment config execution excluded.
    if p.name in {"closed-testing-selftest.cjs", "staging-build-selftest.cjs"}:
        continue
    commands.append((["node", str(p.relative_to(ROOT))], ROOT))
commands += [(["node", "mobile-app/scripts/password-recovery.test.cjs"], ROOT),
             (["node", "--experimental-strip-types", "mobile-app/scripts/password-policy-selftest.mjs"], ROOT),
             (["node", "mobile-app/scripts/checkout-html-selftest.mjs"], ROOT)]
backend = "phase-c-gates mv006-restoration mv004-recovery mv005-create-order recovery settle-timestamp razorpay-security notes-choice-order billing-recovery-worker play-consumption play-reconcile-fairness compensation-worker play-verification play-order play-payment-worker razorpay-routing".split()
commands += [(["node", f"supabase/tests/{n}-selftest.cjs"], ROOT) for n in backend]
commands += [(["node", "supabase/tests/google-reporting-selftest.cjs", "--production-only"], ROOT),
             (["node", "mobile-app/node_modules/typescript/bin/tsc", "--noEmit", "-p", "mobile-app/tsconfig.json"], ROOT),
             (["npm", "ls", "--depth=0", "--offline", "--ignore-scripts"], ROOT / "mobile-app"),
             (["node", "node_modules/expo/bin/cli", "install", "--check"], ROOT / "mobile-app"),
             (["git", "diff", "--check"], ROOT)]
results = []
for i, (cmd, cwd) in enumerate(commands):
    try:
        p = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=120)
        code, output = p.returncode, p.stdout + p.stderr
    except subprocess.TimeoutExpired:
        code, output = 124, "Timed out after 120 seconds\n"
    name = f"check-{i:02d}.log"
    (OUT / name).write_text(output)
    results.append({"command": cmd, "cwd": str(cwd.relative_to(ROOT)), "exit_code": code, "log": name})
    print("PASS" if code == 0 else "FAIL", " ".join(cmd), flush=True)
    (OUT / "check-results.json").write_text(json.dumps(results, indent=2) + "\n")
raise SystemExit(any(r["exit_code"] for r in results))
