// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export const GUIDE_FILES_BUCKET = "guide-files";
export const GUIDE_FILE_MAX_BYTES = 15 * 1024 * 1024;

export type GuideResourceKind = "link" | "button" | "file";

export type GuideResource = {
  id: string;
  kind: GuideResourceKind;
  label: string;
  url: string;
  filename?: string;
};

const FILE_EXT_RE = /\.(pdf|docx?|pptx?|xlsx?|csv|txt|md|rtf|png|jpe?g|webp|gif)(?:$|[?#])/i;

export function isGuideFileUrl(url: string): boolean {
  try {
    const path = new URL(url, "https://intermun.local").pathname;
    return FILE_EXT_RE.test(path);
  } catch {
    return FILE_EXT_RE.test(url);
  }
}

export function isGuidePdfUrl(url: string): boolean {
  try {
    const path = new URL(url, "https://intermun.local").pathname;
    return /\.pdf(?:$|[?#])/i.test(path);
  } catch {
    return /\.pdf(?:$|[?#])/i.test(url);
  }
}

export function isAllowedGuideUpload(file: File): boolean {
  if (file.size > GUIDE_FILE_MAX_BYTES) return false;
  if (FILE_EXT_RE.test(file.name)) return true;
  const type = file.type.toLowerCase();
  return (
    type === "application/pdf" ||
    type.startsWith("image/") ||
    type.startsWith("text/") ||
    type.includes("officedocument") ||
    type.includes("msword") ||
    type.includes("ms-excel") ||
    type.includes("ms-powerpoint")
  );
}

export function safeGuideHref(href: string | null | undefined): string | null {
  const trimmed = href?.trim() ?? "";
  if (!trimmed) return null;
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed) && !/^javascript:/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function parseGuideResources(raw: unknown): GuideResource[] {
  if (!Array.isArray(raw)) return [];
  const out: GuideResource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const kind = rec.kind === "button" || rec.kind === "file" || rec.kind === "link" ? rec.kind : null;
    const url = typeof rec.url === "string" ? safeGuideHref(rec.url) : null;
    const label = typeof rec.label === "string" ? rec.label.trim() : "";
    if (!kind || !url || !label) continue;
    out.push({
      id: typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : crypto.randomUUID(),
      kind,
      label,
      url,
      filename: typeof rec.filename === "string" && rec.filename.trim() ? rec.filename.trim() : undefined,
    });
  }
  return out;
}

export function newGuideResourceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeGuideFilename(name: string): string {
  const base = name.trim().replace(/[^\w.\-()+ ]+/g, "_").replace(/\s+/g, "-").slice(0, 80);
  return base || "file";
}
