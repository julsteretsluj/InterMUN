#!/usr/bin/env python3
"""
Read an Allocation Matrix workbook and emit SQL for Supabase.

Supports SEAMUN 2027 layout:
- Row 1: Committee label in column B (column A is \"Committee:\").
- Topic rows: column A is \"Topic 1\" / \"Topic 1:\" / \"Topic 2\" / \"Topic 2:\" — title in column B.
- Delegation header row: column A is Country, Delegation, Person, or Agency.
- Column C may omit gate codes; codes are generated as {STEM}-001 (STEM = first 3 letters from chamber).

Skips worksheets: OVERVIEW, BEG, INT, ADV (multi-committee reference sheets).

Stable UUIDs: worksheet tab names PC / FWC / INTERPOL map to legacy committee keys used in uuid5
(Press Corps, FWC - Stranger Things, Interpol) so conference IDs stay stable.
"""

from __future__ import annotations

import argparse
import re
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# Stable namespace for deterministic UUIDs (arbitrary but fixed project constant)
SEED_NS = uuid.UUID("a1b2c3d4-e5f6-4789-a012-3456789abcde")

# Default conference event id (first gate) used by the app.
DEFAULT_EVENT_ID = "11111111-1111-1111-1111-111111111101"

# Overview / multi-grid sheets — not one committee + roster.
SKIP_SHEETS = frozenset({"OVERVIEW", "BEG", "INT", "ADV"})

# Map tab name -> committee string stored in DB and used in uuid5 (must match historical matrix).
SHEET_COMMITTEE_KEY: dict[str, str] = {
    "PC": "Press Corps",
    "FWC": "FWC - Stranger Things",
    "INTERPOL": "Interpol",
}


def committee_key(sheet_tab: str) -> str:
    return SHEET_COMMITTEE_KEY.get(sheet_tab, sheet_tab)


def fnv1a32(input_s: str) -> int:
    h = 2166136261
    for ch in input_s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def committee_join_code_prefix(committee_label: str) -> str:
    raw = (committee_label or "").strip().upper()
    tokens = re.split(r"[\s\-–—]+", raw)
    tokens = [t for t in tokens if t]
    merged = ""
    for t in tokens:
        merged += re.sub(r"[^A-Z0-9]", "", t)
        if len(merged) >= 3:
            break
    if len(merged) < 3:
        merged = (merged + "XXX")[:3]
    return merged[:3]


def generate_six_char_committee_code(committee_label: str, conference_uuid: str) -> str:
    prefix = committee_join_code_prefix(committee_label)
    n = fnv1a32(conference_uuid) % 1000
    return f"{prefix}{str(n).zfill(3)}"


def sql_str(s: str | None) -> str:
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def parse_shared_strings(z: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for si in root.findall(".//m:si", NS):
        t = si.find("m:t", NS)
        if t is not None and t.text is not None:
            strings.append(t.text)
            continue
        parts: list[str] = []
        for r in si.findall(".//m:t", NS):
            if r.text:
                parts.append(r.text)
        strings.append("".join(parts))
    return strings


def cell_value(c: ET.Element, strings: list[str]) -> str | None:
    t = c.get("t")
    v = c.find("m:v", NS)
    if v is not None and v.text is not None:
        if t == "s":
            return strings[int(v.text)]
        return v.text
    is_ = c.find("m:is", NS)
    if is_ is not None:
        parts: list[str] = []
        for t_el in is_.findall(".//m:t", NS):
            if t_el.text:
                parts.append(t_el.text)
        return "".join(parts) if parts else None
    return None


def parse_sheet(z: zipfile.ZipFile, path: str, strings: list[str]) -> dict[int, dict[str, str | None]]:
    root = ET.fromstring(z.read(path))
    rows: dict[int, dict[str, str | None]] = {}
    for row in root.findall(".//m:sheetData/m:row", NS):
        r_idx = int(row.get("r", 0))
        cells: dict[str, str | None] = {}
        for c in row.findall("m:c", NS):
            ref = c.get("r", "")
            m = re.match(r"^([A-Z]+)(\d+)$", ref)
            if not m:
                continue
            col = m.group(1)
            cells[col] = cell_value(c, strings)
        rows[r_idx] = cells
    return rows


def get_workbook_sheets(z: zipfile.ZipFile) -> list[tuple[str, str]]:
    root = ET.fromstring(z.read("xl/workbook.xml"))
    ns = {
        "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    }
    rels: dict[str, str] = {}
    rroot = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    for rel in rroot.findall(
        "{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"
    ):
        rels[rel.get("Id", "")] = rel.get("Target", "")
    sheets: list[tuple[str, str]] = []
    for sh in root.findall(".//m:sheet", ns):
        name = sh.get("name") or "Sheet"
        rid = sh.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        target = rels.get(rid or "", "")
        path = "xl/" + target.lstrip("/")
        if not path.startswith("xl/"):
            path = "xl/" + path
        sheets.append((name, path))
    return sheets


DELEGATION_HEADER_MARKERS = frozenset(
    {"Country", "Delegation", "Person", "Agency"}
)


def find_header_row(rows: dict[int, dict[str, str | None]]) -> int | None:
    for ri in sorted(rows):
        row = rows[ri]
        a = (row.get("A") or "").strip()
        if a in DELEGATION_HEADER_MARKERS:
            return ri
        vals = [str(v or "") for v in row.values()]
        if "Delegation" in vals and "Status" in vals:
            return ri
    return None


def extract_delegations(
    rows: dict[int, dict[str, str | None]],
    header_row: int,
    committee_label: str,
) -> list[tuple[str, str]]:
    """Rows as (placard / country / agency name, gate code). Codes are always set."""
    stem = committee_join_code_prefix(committee_label)
    out: list[tuple[str, str]] = []
    seq = 0
    for ri in sorted(rows):
        if ri <= header_row:
            continue
        r = rows[ri]
        a = (r.get("A") or "").strip()
        if not a:
            continue
        if a.lower().startswith("total"):
            break
        raw_code = r.get("C")
        code = str(raw_code).strip() if raw_code is not None else ""
        seq += 1
        if not code:
            code = f"{stem}-{seq:03d}"
        out.append((a, code))
    return out


def topics_for_sheet(rows: dict[int, dict[str, str | None]]) -> list[str]:
    """Scan for Topic 1 / Topic 2 rows (SEAMUN 2027 layout) or legacy Agenda/B1–B2."""
    topics: list[str] = []
    for ri in sorted(rows):
        row = rows[ri]
        label = (row.get("A") or "").strip()
        title = (row.get("B") or "").strip()
        if not title:
            continue
        if re.match(r"^topic\s*1\b", label, re.I):
            topics.append(title)
        elif re.match(r"^topic\s*2\b", label, re.I):
            topics.append(title)

    if topics:
        return topics

    # Legacy: A1=Agenda, B1/B2 topics
    r1 = rows.get(1, {})
    topic1 = ""
    if (r1.get("A") or "").strip().lower() == "agenda":
        topic1 = (r1.get("B") or "").strip()
    if not topic1:
        topic1 = (r1.get("B") or "").strip()
    if not topic1:
        topic1 = "Conference"
    r2 = rows.get(2, {})
    topic2 = (r2.get("B") or "").strip() or ""
    if topic2 and topic2 != topic1:
        return [topic1, topic2]
    return [topic1]


def emit_sql(
    sheets_data: list[tuple[str, list[str], list[tuple[str, str]]]],
) -> str:
    lines: list[str] = [
        "-- Generated by scripts/parse-allocation-matrix.py — do not edit by hand.",
        "-- Source: data/allocation-matrix.xlsx (Allocation Matrix).",
        "--",
        "-- Creates conferences for 1–2 topics per worksheet; allocations have user_id NULL until",
        "-- chairs assign delegates. allocation_gate_codes use spreadsheet column C when present,",
        "-- otherwise generated {STEM}-### codes.",
        "--",
        "-- WARNING: Deletes existing allocations + gate codes for these conference IDs,",
        "-- then re-inserts. Run on dev/staging or when you intentionally refresh the matrix.",
        "",
    ]

    conf_ids: list[str] = []
    base = datetime(2026, 3, 24, 12, 0, 0, tzinfo=timezone.utc)
    n = len(sheets_data)

    for idx, (sheet_tab, topics, _delegations) in enumerate(sheets_data):
        ck = committee_key(sheet_tab)
        for topic_idx, topic in enumerate(topics):
            cid = str(uuid.uuid5(SEED_NS, f"conference:{ck}:{topic_idx}"))
            conf_ids.append(cid)

            created = base + timedelta(minutes=((n - 1 - idx) * 2 + topic_idx))
            ts = created.isoformat().replace("+00:00", "Z")

            room = generate_six_char_committee_code(ck, cid)
            lines.append(
                "INSERT INTO conferences (id, name, committee, created_at, event_id, committee_code, room_code) VALUES "
                f"({sql_str(cid)}, {sql_str(topic)}, {sql_str(ck)}, {sql_str(ts)}, {sql_str(DEFAULT_EVENT_ID)}, {sql_str(room)}, {sql_str(room)}) "
                "ON CONFLICT (id) DO UPDATE SET "
                "name = EXCLUDED.name, committee = EXCLUDED.committee, created_at = EXCLUDED.created_at, "
                "event_id = EXCLUDED.event_id, committee_code = EXCLUDED.committee_code, room_code = EXCLUDED.room_code;"
            )

    lines.append("")
    id_list = ", ".join(sql_str(x) for x in conf_ids)
    lines.append(
        f"DELETE FROM allocation_gate_codes WHERE allocation_id IN "
        f"(SELECT id FROM allocations WHERE conference_id IN ({id_list}));"
    )
    lines.append(f"DELETE FROM allocations WHERE conference_id IN ({id_list});")
    lines.append("")

    for sheet_tab, topics, delegations in sheets_data:
        ck = committee_key(sheet_tab)
        for topic_idx, _topic in enumerate(topics):
            cid = str(uuid.uuid5(SEED_NS, f"conference:{ck}:{topic_idx}"))
            lines.append(f"-- {ck} topic {topic_idx + 1}: {len(delegations)} allocations")
            for country, code in delegations:
                aid = str(uuid.uuid5(SEED_NS, f"allocation:{cid}:{code}"))
                lines.append(
                    "INSERT INTO allocations (id, conference_id, user_id, country) VALUES ("
                    f"{sql_str(aid)}, {sql_str(cid)}, NULL, {sql_str(country)});"
                )
                lines.append(
                    "INSERT INTO allocation_gate_codes (allocation_id, code, updated_at) VALUES ("
                    f"{sql_str(aid)}, {sql_str(code)}, NOW());"
                )
            lines.append("")

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "xlsx",
        nargs="?",
        default=str(Path(__file__).resolve().parents[1] / "data" / "allocation-matrix.xlsx"),
        help="Path to Allocation Matrix.xlsx",
    )
    ap.add_argument(
        "--out",
        "-o",
        default=str(Path(__file__).resolve().parents[1] / "supabase" / "seed_allocation_matrix.sql"),
        help="Output SQL path",
    )
    args = ap.parse_args()
    path = Path(args.xlsx)
    if not path.is_file():
        raise SystemExit(f"File not found: {path}")

    z = zipfile.ZipFile(path)
    strings = parse_shared_strings(z)
    sheets_data: list[tuple[str, list[str], list[tuple[str, str]]]] = []

    for sheet_name, spath in get_workbook_sheets(z):
        if sheet_name in SKIP_SHEETS:
            continue
        rows = parse_sheet(z, spath, strings)
        hdr = find_header_row(rows)
        if hdr is None:
            continue
        ck = committee_key(sheet_name)
        delegations = extract_delegations(rows, hdr, ck)
        if not delegations:
            continue
        topics = topics_for_sheet(rows)
        if not topics:
            continue
        sheets_data.append((sheet_name, topics, delegations))

    z.close()

    sql = emit_sql(sheets_data)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(sql, encoding="utf-8")
    total_alloc_rows = sum(len(d) * len(t) for _, t, d in sheets_data)
    topic_count = sum(len(topics) for _, topics, _ in sheets_data)
    print(
        f"Wrote {out} ({len(sheets_data)} committees, {topic_count} topic sessions, "
        f"{total_alloc_rows} allocation rows)"
    )


if __name__ == "__main__":
    main()
