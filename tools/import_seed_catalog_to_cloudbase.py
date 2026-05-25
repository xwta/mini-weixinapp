#!/usr/bin/env python3
"""
Import a generated seed catalog JSON/JSONL into the seed-bulk-import cloud function.

This script calls Tencent CloudBase function through the CloudBase CLI.
It imports song metadata and guitar-tab search references only, not full tabs.

Usage:
  python tools/import_seed_catalog_to_cloudbase.py --input cloudbase/database/seed_bulk_catalog.jsonl --token YOUR_TOKEN
  python tools/import_seed_catalog_to_cloudbase.py --input cloudbase/database/seed_bulk_catalog.jsonl --dry-run
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterable, Iterator


def load_items(path: Path) -> list[dict]:
    if path.suffix.lower() == ".jsonl":
        items = []
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    items.append(json.loads(line))
        return items
    return json.loads(path.read_text(encoding="utf-8"))


def chunks(items: list[dict], size: int) -> Iterator[list[dict]]:
    for index in range(0, len(items), size):
        yield items[index:index + size]


def call_cloudbase(batch: list[dict], token: str, dry_run: bool, cli: str, function_name: str) -> dict:
    payload = {
        "action": "import",
        "items": batch,
        "dryRun": dry_run,
    }
    if token:
        payload["token"] = token

    with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False) as f:
        json.dump(payload, f, ensure_ascii=False)
        payload_path = f.name

    # CloudBase CLI versions differ. Most support `functions:invoke name --params-file file`.
    commands = [
        [cli, "functions:invoke", function_name, "--params-file", payload_path],
        [cli, "functions:invoke", function_name, "--params", json.dumps(payload, ensure_ascii=False)],
    ]

    last_error = None
    for command in commands:
        try:
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            output = result.stdout.strip() or result.stderr.strip()
            try:
                return json.loads(output)
            except Exception:
                return {"raw": output}
        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"CloudBase invoke failed: {last_error}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--token", default="")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--cli", default="cloudbase")
    parser.add_argument("--function", default="seed-bulk-import")
    args = parser.parse_args()

    items = load_items(args.input)
    total = len(items)
    created = updated = skipped = 0

    for batch_no, batch in enumerate(chunks(items, args.batch_size), start=1):
        response = call_cloudbase(batch, args.token, args.dry_run, args.cli, args.function)
        data = response.get("data") if isinstance(response, dict) else None
        if not data and isinstance(response, dict) and "result" in response:
            try:
                data = json.loads(response["result"]).get("data")
            except Exception:
                data = None
        data = data or response
        created += int(data.get("created", 0)) if isinstance(data, dict) else 0
        updated += int(data.get("updated", 0)) if isinstance(data, dict) else 0
        skipped += int(data.get("skipped", 0)) if isinstance(data, dict) else 0
        print(json.dumps({
            "batch": batch_no,
            "sent": min(batch_no * args.batch_size, total),
            "total": total,
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "response": data,
        }, ensure_ascii=False))

    print(json.dumps({
        "done": True,
        "total": total,
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "dryRun": args.dry_run,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
