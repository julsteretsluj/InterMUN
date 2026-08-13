// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Minimal CSV parsing for allocation imports: country/position (required).
 * Extra columns (including legacy placard codes) are ignored. Supports a header
 * row with "country", UTF-8 BOM, and quoted fields.
 */

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export type AllocationCsvRow = { country: string };

export function parseAllocationCsv(text: string): AllocationCsvRow[] {
  const raw = text.replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/);
  const rows: AllocationCsvRow[] = [];
  let start = 0;
  const head = lines[0]?.toLowerCase() ?? "";
  if (head.includes("country") || head.includes("allocation") || head.includes("position")) {
    start = 1;
  }
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    if (!line) continue;
    const cols = parseCsvLine(line);
    const country = (cols[0] ?? "").trim();
    if (!country) continue;
    rows.push({ country });
  }
  return rows;
}
