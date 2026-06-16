#!/usr/bin/env python3
"""Extract registered delegates (rows with email) from SEAMUN allocation matrix v3 layout."""

from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SKIP_SHEETS = frozenset({"MAIN", "OVERVIEW", "BEG", "INT", "ADV"})
HEADER_LABELS = frozenset({"Country", "Delegation", "Person", "Agency"})


def parse_shared_strings(z: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for si in root.findall(".//m:si", NS):
        t = si.find("m:t", NS)
        if t is not None and t.text is not None:
            strings.append(t.text)
            continue
        parts = [r.text for r in si.findall(".//m:t", NS) if r.text]
        strings.append("".join(parts))
    return strings


def cell_value(c: ET.Element, strings: list[str]) -> str | None:
    t = c.get("t")
    v = c.find("m:v", NS)
    if v is not None and v.text is not None:
        return strings[int(v.text)] if t == "s" else v.text
    return None


def parse_sheet(z: zipfile.ZipFile, path: str, strings: list[str]) -> dict[int, dict[str, str]]:
    root = ET.fromstring(z.read(path))
    rows: dict[int, dict[str, str]] = {}
    for row in root.findall(".//m:sheetData/m:row", NS):
        r_idx = int(row.get("r", 0))
        cells: dict[str, str] = {}
        for c in row.findall("m:c", NS):
            ref = c.get("r", "")
            m = re.match(r"^([A-Z]+)(\d+)$", ref)
            if not m:
                continue
            val = cell_value(c, strings)
            if val is not None:
                cells[m.group(1)] = str(val)
        rows[r_idx] = cells
    return rows


def get_sheets(z: zipfile.ZipFile) -> list[tuple[str, str]]:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels: dict[str, str] = {}
    rroot = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    for rel in rroot.findall(
        "{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"
    ):
        rels[rel.get("Id", "")] = rel.get("Target", "")
    out: list[tuple[str, str]] = []
    for sh in wb.findall(".//m:sheet", NS):
        name = sh.get("name", "")
        rid = sh.get(
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id", ""
        )
        target = rels.get(rid, "")
        out.append((name, "xl/" + target.lstrip("/")))
    return out


def parse_matrix(path: Path) -> list[dict[str, str]]:
    delegates: list[dict[str, str]] = []
    with zipfile.ZipFile(path) as z:
        strings = parse_shared_strings(z)
        for sheet, spath in get_sheets(z):
            if sheet in SKIP_SHEETS:
                continue
            rows = parse_sheet(z, spath, strings)
            hdr = next(
                (
                    ri
                    for ri in sorted(rows)
                    if (rows[ri].get("A") or "").strip() in HEADER_LABELS
                ),
                None,
            )
            if hdr is None:
                continue
            for ri in sorted(rows):
                if ri <= hdr:
                    continue
                delegation = (rows[ri].get("A") or "").strip()
                if not delegation or delegation.lower().startswith("total"):
                    break
                email = (rows[ri].get("H") or "").strip().lower()
                if not email or "@" not in email:
                    continue
                delegates.append(
                    {
                        "sheet": sheet,
                        "delegation": delegation,
                        "name": (rows[ri].get("F") or "").strip(),
                        "email": email,
                        "school": (rows[ri].get("G") or "").strip(),
                        "placardCode": (rows[ri].get("C") or "").strip(),
                        "status": (rows[ri].get("B") or "").strip(),
                    }
                )
    return delegates


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx", type=Path)
    args = parser.parse_args()
    if not args.xlsx.is_file():
        print(f"File not found: {args.xlsx}", file=sys.stderr)
        return 1
    json.dump(parse_matrix(args.xlsx), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
