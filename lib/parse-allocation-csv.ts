/**
 * Minimal CSV parsing for allocation imports: country (required), placard code (optional).
 * Supports "country,code" header row, UTF-8 BOM, and quoted fields.
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

export type AllocationCsvRow = { country: string; code: string | null };

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
    const codeRaw = (cols[1] ?? "").trim();
    rows.push({ country, code: codeRaw.length ? codeRaw : null });
  }
  return rows;
}
