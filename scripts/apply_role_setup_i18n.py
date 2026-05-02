#!/usr/bin/env python3
"""Merge scripts/rs18n_part*.json into messages/*.json under roleSetupChecklist."""
from __future__ import annotations

import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MESSAGES = ROOT / "messages"
SCRIPTS = Path(__file__).resolve().parent


def deep_merge(a: dict, b: dict) -> dict:
    for k, v in b.items():
        if isinstance(v, dict) and k in a and isinstance(a[k], dict):
            deep_merge(a[k], v)
        else:
            a[k] = v
    return a


def main() -> None:
    base = json.loads((MESSAGES / "en.json").read_text(encoding="utf-8"))["roleSetupChecklist"]
    translations: dict[str, dict] = {}
    for name in ("rs18n_part1.json", "rs18n_part2.json", "rs18n_part3.json"):
        p = SCRIPTS / name
        if p.exists():
            translations.update(json.loads(p.read_text(encoding="utf-8")))

    for path in sorted(MESSAGES.glob("*.json")):
        if path.name == "en.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        loc = path.stem
        block = copy.deepcopy(base)
        if loc in translations:
            deep_merge(block, translations[loc])
        data["roleSetupChecklist"] = block
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(path.name)


if __name__ == "__main__":
    main()
