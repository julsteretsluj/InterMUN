// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { inflateRawSync } from "node:zlib";
import type { FwcEvidenceCatalogItem } from "@/lib/fwc/evidence-library";

const ZIP_LOCAL = 0x04034b50;
const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const MAX_XLSX_BYTES = 8 * 1024 * 1024;

const XLSX_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
  "application/zip",
]);

export type ParsedEvidenceWorkbook = {
  sheetName: string;
  columns: string[];
  items: FwcEvidenceCatalogItem[];
};

export function isXlsxUpload(file: { name: string; type: string; size: number }): boolean {
  if (file.size <= 0 || file.size > MAX_XLSX_BYTES) return false;
  const name = file.name.trim().toLowerCase();
  if (!name.endsWith(".xlsx")) return false;
  const type = file.type.trim().toLowerCase();
  return !type || XLSX_MIME.has(type);
}

export function assertXlsxBuffer(buffer: Buffer): void {
  if (buffer.length < 4 || !buffer.subarray(0, 4).equals(XLSX_MAGIC)) {
    throw new Error("Not a valid .xlsx file.");
  }
}

export function parseFwcEvidenceXlsx(buffer: Buffer): ParsedEvidenceWorkbook {
  assertXlsxBuffer(buffer);
  const files = unzipEntries(buffer);
  const workbookXml = files.get("xl/workbook.xml");
  const sharedXml = files.get("xl/sharedStrings.xml") ?? "";
  if (!workbookXml) {
    throw new Error("Workbook is missing xl/workbook.xml.");
  }

  const sheets = parseWorkbookSheets(workbookXml);
  if (sheets.length === 0) {
    throw new Error("Workbook has no sheets.");
  }

  const shared = parseSharedStrings(sharedXml);
  let chosen: { name: string; items: FwcEvidenceCatalogItem[]; columns: string[] } | null = null;

  for (const sheet of sheets) {
    const path = sheet.path.startsWith("xl/") ? sheet.path : `xl/${sheet.path}`;
    const xml = files.get(path);
    if (!xml) continue;
    const grid = parseSheetGrid(xml, shared);
    if (grid.length === 0) continue;
    const parsed = catalogFromGrid(grid);
    if (parsed.items.length > 0) {
      chosen = { name: sheet.name, ...parsed };
      break;
    }
  }

  if (!chosen || chosen.items.length === 0) {
    throw new Error("No evidence rows found. Expected an Evidence ID column and at least one data row.");
  }

  return {
    sheetName: chosen.name,
    columns: chosen.columns,
    items: chosen.items,
  };
}

function parseWorkbookSheets(xml: string): { name: string; path: string }[] {
  const rels = new Map<string, string>();
  // Relationships live in xl/_rels/workbook.xml.rels — caller passes only workbook.
  // sheet path is usually worksheets/sheetN.xml; we infer from r:id order below.
  const sheets: { name: string; rId: string }[] = [];
  const sheetRe = /<sheet\b([^>]*?)\/>/gi;
  let m: RegExpExecArray | null;
  while ((m = sheetRe.exec(xml))) {
    const attrs = m[1] ?? "";
    const name = attr(attrs, "name") ?? "Sheet";
    const rId = attr(attrs, "r:id") ?? attr(attrs, "id") ?? "";
    sheets.push({ name, rId });
  }

  // Fallback paths sheet1, sheet2, …
  return sheets.map((sheet, index) => ({
    name: decodeXml(sheet.name),
    path: rels.get(sheet.rId) ?? `xl/worksheets/sheet${index + 1}.xml`,
  }));
}

function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    const inner = m[1] ?? "";
    const texts = [...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi)].map((t) => decodeXml(t[1] ?? ""));
    out.push(texts.join(""));
  }
  return out;
}

function parseSheetGrid(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(xml))) {
    const cells = new Map<number, string>();
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
    let cellMatch: RegExpExecArray | null;
    let maxCol = -1;
    while ((cellMatch = cellRe.exec(rowMatch[1] ?? ""))) {
      const attrs = cellMatch[1] ?? "";
      const inner = cellMatch[2] ?? "";
      const ref = attr(attrs, "r") ?? "";
      const type = attr(attrs, "t") ?? "";
      const col = colIndexFromRef(ref);
      if (col < 0) continue;
      const raw = (inner.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/i)?.[1] ?? "").trim();
      const isInline = type === "inlineStr";
      const inline = isInline
        ? [...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi)].map((t) => decodeXml(t[1] ?? "")).join("")
        : "";
      let value = "";
      if (isInline) value = inline;
      else if (type === "s") value = shared[Number(raw)] ?? "";
      else value = decodeXml(raw);
      cells.set(col, value.trim());
      if (col > maxCol) maxCol = col;
    }
    if (maxCol < 0) {
      rows.push([]);
      continue;
    }
    const row: string[] = [];
    for (let i = 0; i <= maxCol; i++) row.push(cells.get(i) ?? "");
    rows.push(row);
  }
  return rows;
}

function catalogFromGrid(grid: string[][]): { columns: string[]; items: FwcEvidenceCatalogItem[] } {
  const headerIdx = grid.findIndex((row) => row.some((cell) => normalizeHeader(cell)));
  if (headerIdx < 0) return { columns: [], items: [] };
  const headerRow = grid[headerIdx] ?? [];
  const columns = headerRow.map((cell) => cell.trim()).filter(Boolean);
  const index = headerIndex(headerRow);
  if (index.id < 0 || index.title < 0) return { columns, items: [] };

  const items: FwcEvidenceCatalogItem[] = [];
  const seen = new Set<string>();
  for (const row of grid.slice(headerIdx + 1)) {
    if (!row.some((cell) => cell.trim())) continue;
    const slugRaw = cellAt(row, index.id);
    const title = cellAt(row, index.title);
    if (!slugRaw && !title) continue;
    const slug = slugifyEvidenceId(slugRaw || title);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    items.push({
      slug,
      category: cellAt(row, index.category),
      title: title || slug,
      startingLocation: cellAt(row, index.location),
      discoverableBy: cellAt(row, index.discoverable),
      tacticalEffect: cellAt(row, index.effect),
      isSecret: parseSecretFlag(cellAt(row, index.secret)),
    });
  }
  return { columns, items };
}

function headerIndex(headerRow: string[]) {
  const keys = headerRow.map((h) => normalizeHeader(h));
  const find = (...needles: string[]) =>
    keys.findIndex((key) => needles.some((needle) => key.includes(needle)));
  return {
    id: find("evidence id", "evidenceid", "id", "slug"),
    category: find("category", "type", "tag"),
    title: find("item / description", "itemdescription", "description", "item", "title"),
    location: find("primary location", "location", "grid"),
    discoverable: find("discoverable", "requirements"),
    effect: find("tactical", "narrative", "effect"),
    secret: find("secret", "secrecy", "classified only"),
  };
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

function cellAt(row: string[], index: number): string {
  if (index < 0) return "";
  return (row[index] ?? "").trim();
}

function parseSecretFlag(value: string): boolean {
  const v = value.toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "secret" || v === "y";
}

function slugifyEvidenceId(value: string): string {
  const trimmed = value.trim();
  const evd = trimmed.match(/^EVD[-\s]?(\d+)$/i);
  if (evd) return `EVD-${String(evd[1]).padStart(2, "0")}`;
  return trimmed
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function colIndexFromRef(ref: string): number {
  const letters = ref.match(/^([A-Z]+)/i)?.[1];
  if (!letters) return -1;
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function attr(attrs: string, name: string): string | null {
  const re = new RegExp(`${name.replace(":", "\\:")}="([^"]*)"`, "i");
  return re.exec(attrs)?.[1] ?? null;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function unzipEntries(buffer: Buffer): Map<string, string> {
  const files = new Map<string, string>();
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== ZIP_LOCAL) break;
    const method = buffer.readUInt16LE(offset + 8);
    const flags = buffer.readUInt16LE(offset + 6);
    let compressed = buffer.readUInt32LE(offset + 18);
    let uncompressed = buffer.readUInt32LE(offset + 22);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    let dataStart = offset + 30 + nameLen + extraLen;
    if (flags & 0x08) {
      // Data descriptor: sizes come after the data; scan for descriptor signature.
      const scanned = scanDataDescriptor(buffer, dataStart);
      compressed = scanned.compressed;
      uncompressed = scanned.uncompressed;
      const data = buffer.subarray(dataStart, dataStart + compressed);
      files.set(name, inflateZipData(data, method, uncompressed));
      offset = scanned.nextOffset;
      continue;
    }
    const data = buffer.subarray(dataStart, dataStart + compressed);
    files.set(name, inflateZipData(data, method, uncompressed));
    offset = dataStart + compressed;
  }
  return files;
}

function scanDataDescriptor(
  buffer: Buffer,
  dataStart: number
): { compressed: number; uncompressed: number; nextOffset: number } {
  const desc = 0x08074b50;
  for (let i = dataStart; i + 16 <= buffer.length; i++) {
    if (buffer.readUInt32LE(i) === desc) {
      return {
        compressed: buffer.readUInt32LE(i + 8),
        uncompressed: buffer.readUInt32LE(i + 12),
        nextOffset: i + 16,
      };
    }
  }
  throw new Error("Could not read compressed spreadsheet entries.");
}

function inflateZipData(data: Buffer, method: number, uncompressed: number): string {
  if (method === 0) return data.subarray(0, uncompressed).toString("utf8");
  if (method === 8) return inflateRawSync(data).toString("utf8");
  throw new Error("Unsupported spreadsheet compression.");
}
