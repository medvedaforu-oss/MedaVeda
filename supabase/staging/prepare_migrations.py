#!/usr/bin/env python3
"""Build a reviewed, staging-only copy of the SQL migration chain.

This script writes local files only. It never connects to Supabase.
"""

import argparse
import hashlib
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "migrations"
REVIEWED_HASHES = Path(__file__).with_name("reviewed-source-sha256.json")
CRON_BLOCKS = {
    "20260921120000_analytics_retention.sql": (
        "\ndo $$\nbegin\n  if not exists (select 1 from pg_extension where extname = 'pg_cron')",
        "\nend\n$$;",
    ),
    "20260922100000_phase1a_sync_and_order_security.sql": (
        "\ndo $$\nbegin\n  if not exists (select 1 from pg_extension where extname = 'pg_cron')",
        "\nend\n$$;",
    ),
    "20260925110000_phase2_wallet_ledger.sql": (
        "\ndo $$\nbegin\n  create extension if not exists pg_cron;",
        "\nend;\n$$;",
    ),
}
STORE_URL_FILES = {
    "20260920130000_app_config.sql",
    "20260922100000_phase1a_sync_and_order_security.sql",
    "20261020102000_correct_stale_store_url.sql",
}
PRODUCTION_STORE_URL = "https://play.google.com/store/apps/details?id=com.medveda.app"
STAGING_STORE_URL = "https://play.google.com/store/apps/details?id=in.medveda.staging"


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def neutralize_cron(sql: str, filename: str) -> str:
    start, end = CRON_BLOCKS[filename]
    if sql.count(start) != 1:
        raise ValueError(f"Expected one cron block start in {filename}")
    begin = sql.index(start)
    finish = sql.index(end, begin) + len(end)
    block = sql[begin:finish]
    if "cron.schedule(" not in block:
        raise ValueError(f"Expected a schedule call in {filename}")
    return sql[:begin] + "\n-- STAGING ONLY: automatic cron setup removed; functions above remain.\n" + sql[finish:]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    target = args.output.resolve()
    if target == SOURCE.resolve() or SOURCE.resolve() in target.parents:
        parser.error("Output must be outside the production migration directory")
    if target.exists() and any(target.iterdir()):
        parser.error("Output directory must be empty")

    files = sorted(SOURCE.glob("*.sql"))
    versions = [p.name.split("_", 1)[0] for p in files]
    if len(files) != 62 or len(set(versions)) != 62:
        raise ValueError("Expected exactly 62 unique local migration versions")
    if not all(re.fullmatch(r"\d{8}|\d{14}", v) for v in versions):
        raise ValueError("Unexpected migration version format")
    reviewed = json.loads(REVIEWED_HASHES.read_text())
    if set(reviewed) != {p.name for p in files}:
        raise ValueError("Migration file set changed since audit")
    for path in files:
        if digest(path.read_bytes()) != reviewed[path.name]:
            raise ValueError(f"Migration changed since audit: {path.name}")

    target.mkdir(parents=True, exist_ok=True)
    manifest = []
    for path in files:
        original = path.read_bytes()
        sql = original.decode("utf-8")
        changes = []
        if path.name in CRON_BLOCKS:
            sql = neutralize_cron(sql, path.name)
            changes.append("cron setup block removed")
        if path.name in STORE_URL_FILES:
            count = sql.count(PRODUCTION_STORE_URL)
            if path.name == "20261020102000_correct_stale_store_url.sql":
                if "\\1in.medveda.app\\3" not in sql:
                    raise ValueError("Expected store URL replacement target")
                sql = sql.replace("\\1in.medveda.app\\3", "\\1in.medveda.staging\\3")
                changes.append("store URL correction targets staging package")
            elif count != 1:
                raise ValueError(f"Expected one production store URL seed in {path.name}")
            else:
                sql = sql.replace(PRODUCTION_STORE_URL, STAGING_STORE_URL)
                changes.append("store URL seed targets staging package")

        active = "\n".join(line for line in sql.splitlines() if not line.lstrip().startswith("--"))
        forbidden = ("xbvenkfmesugrbjuufyw", "cron.schedule(", "net.http_", "pg_net", PRODUCTION_STORE_URL)
        for token in forbidden:
            if token in active:
                raise ValueError(f"Forbidden active SQL token {token!r} in {path.name}")
        staged = sql.encode("utf-8")
        (target / path.name).write_bytes(staged)
        manifest.append({"file": path.name, "version": versions[len(manifest)],
                         "source_sha256": digest(original), "staging_sha256": digest(staged),
                         "changes": changes})
    (target.parent / "migration-manifest.json").write_text(
        json.dumps({"target_project_ref": "nsmsqsogedzohwboripd", "count": len(manifest),
                    "migrations": manifest}, indent=2) + "\n"
    )
    print(f"Prepared {len(manifest)} staging migrations in {target}")


if __name__ == "__main__":
    main()
