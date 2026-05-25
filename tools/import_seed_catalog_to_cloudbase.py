#!/usr/bin/env python3
"""
Import a generated seed catalog JSON/JSONL into the seed-bulk-import cloud function.

This script calls Tencent CloudBase function through the CloudBase CLI.
It imports song metadata and guitar-tab search references only, not full tabs.

Usage:
  python tools/import_seed_catalog_to_cloudbase.py --input cloudbase/database/seed_bulk_catalog.jsonl --token YOUR_TOKEN
  python tools/import_seed_catalog_to_cloudbase.py --input cloudbase/database/seed_bulk_catalog.jsonl --dry-run
  python tools/import_seed_catalog_to_cloudbase.py --input cloudbase/database/seed_bulk_catalog.jsonl --cli "D:\\software\\nodejs\\tcb.cmd" --batch-size 10
"""

from __future__ import annotations

import argparse
import json
import shlex
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Iterator

WINDOWS_COMMAND_LIMIT = 28000


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


def split_cli(cli: str) -> list[str]:
    cli = (cli or "cloudbase").strip()
    if not cli or cli == "auto":
        return resolve_cli()
    return shlex.split(cli, posix=False)


def resolve_cli() -> list[str]:
    candidates = [
        ["cloudbase"],
        ["cloudbase.cmd"],
        ["tcb"],
        ["tcb.cmd"],
    ]
    for candidate in candidates:
        if shutil.which(candidate[0]):
            return candidate

    if shutil.which("npx"):
        return ["npx", "@cloudbase/cli"]
    if shutil.which("npx.cmd"):
        return ["npx.cmd", "@cloudbase/cli"]

    raise RuntimeError(
        "CloudBase CLI not found. Install it with `npm install -g @cloudbase/cli`, "
        "or run with `--cli \"D:\\\\software\\\\nodejs\\\\tcb.cmd\"`."
    )


def extract_data(response: dict) -> dict:
    if not isinstance(response, dict):
        return {"raw": response}
    if isinstance(response.get("data"), dict):
        return response["data"]
    if "result" in response:
        result = response.get("result")
        if isinstance(result, str):
            try:
                parsed = json.loads(result)
                return parsed.get("data") or parsed
            except Exception:
                return {"raw": result}
        if isinstance(result, dict):
            return result.get("data") or result
    return response


def command_length(command: list[str]) -> int:
    return sum(len(part) + 3 for part in command)


def run_command(command: list[str]) -> dict:
    result = subprocess.run(command, capture_output=True, text=True, check=True, encoding="utf-8", errors="ignore")
    output = result.stdout.strip() or result.stderr.strip()
    try:
        return json.loads(output)
    except Exception:
        return {"raw": output}


def invoke_once(batch: list[dict], token: str, dry_run: bool, cli_parts: list[str], function_name: str) -> dict:
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

    payload_inline = json.dumps(payload, ensure_ascii=False)
    commands = [
        cli_parts + ["functions:invoke", function_name, "--params-file", payload_path],
        cli_parts + ["fn", "invoke", function_name, "--params-file", payload_path],
    ]

    inline_commands = [
        cli_parts + ["functions:invoke", function_name, "--params", payload_inline],
        cli_parts + ["fn", "invoke", function_name, "--params", payload_inline],
    ]

    for command in inline_commands:
        if command_length(command) < WINDOWS_COMMAND_LIMIT:
            commands.append(command)

    errors = []
    for command in commands:
        try:
            return run_command(command)
        except Exception as exc:
            errors.append({"command": " ".join(command[:3]), "error": str(exc)})

    raise RuntimeError(json.dumps(errors, ensure_ascii=False))


def call_cloudbase(batch: list[dict], token: str, dry_run: bool, cli_parts: list[str], function_name: str) -> dict:
    try:
        return invoke_once(batch, token, dry_run, cli_parts, function_name)
    except Exception as exc:
        message = str(exc)
        too_long = "WinError 206" in message or "文件名或扩展名太长" in message or "too long" in message.lower()
        if too_long and len(batch) > 1:
            mid = max(1, len(batch) // 2)
            left = extract_data(call_cloudbase(batch[:mid], token, dry_run, cli_parts, function_name))
            right = extract_data(call_cloudbase(batch[mid:], token, dry_run, cli_parts, function_name))
            return {
                "data": {
                    "dryRun": dry_run,
                    "received": int(left.get("received", 0)) + int(right.get("received", 0)),
                    "created": int(left.get("created", 0)) + int(right.get("created", 0)),
                    "updated": int(left.get("updated", 0)) + int(right.get("updated", 0)),
                    "skipped": int(left.get("skipped", 0)) + int(right.get("skipped", 0)),
                    "errors": (left.get("errors", []) if isinstance(left.get("errors", []), list) else []) + (right.get("errors", []) if isinstance(right.get("errors", []), list) else []),
                    "autoSplit": True,
                }
            }
        raise RuntimeError(f"CloudBase invoke failed: {message}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--batch-size", type=int, default=10, help="Windows CLI recommends 5-20. Default: 10")
    parser.add_argument("--token", default="")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--cli", default="auto", help='cloudbase, cloudbase.cmd, tcb, or "D:\\software\\nodejs\\tcb.cmd"')
    parser.add_argument("--function", default="seed-bulk-import")
    args = parser.parse_args()

    cli_parts = split_cli(args.cli)
    print(json.dumps({"using_cli": " ".join(cli_parts), "batch_size": args.batch_size}, ensure_ascii=False))

    items = load_items(args.input)
    total = len(items)
    created = updated = skipped = 0

    for batch_no, batch in enumerate(chunks(items, args.batch_size), start=1):
        response = call_cloudbase(batch, args.token, args.dry_run, cli_parts, args.function)
        data = extract_data(response)
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
