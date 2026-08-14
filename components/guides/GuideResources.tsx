// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GuidePdfEmbed } from "@/components/guides/GuideMarkdown";
import {
  GUIDE_FILE_MAX_BYTES,
  GUIDE_FILES_BUCKET,
  guideHrefOpenProps,
  isAllowedGuideUpload,
  isGuidePdfUrl,
  newGuideResourceId,
  parseGuideResources,
  safeGuideHref,
  sanitizeGuideFilename,
  type GuideResource,
  type GuideResourceKind,
} from "@/lib/guide-resources";
import { cn } from "@/lib/utils";

export function GuideResourceList({
  resources,
  embedPdfs = true,
  compact = false,
}: {
  resources: GuideResource[];
  embedPdfs?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("guides.resources");
  const items = parseGuideResources(resources);
  if (items.length === 0) return null;
  const pdfs = embedPdfs ? items.filter((r) => r.kind === "file" && isGuidePdfUrl(r.url)) : [];

  return (
    <div className={compact ? "mt-1.5 space-y-1.5" : "space-y-3"}>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const open = guideHrefOpenProps(item.url);
          if (item.kind === "button") {
            return (
              <a
                key={item.id}
                {...open}
                className={cn("mun-btn-primary inline-flex", compact && "px-2.5 py-1 text-xs")}
              >
                {item.label}
              </a>
            );
          }
          if (item.kind === "file") {
            return (
              <a
                key={item.id}
                {...open}
                className={cn(
                  "inline-flex items-center rounded-lg border border-[var(--hairline)] bg-[var(--apple-bg-secondary)] font-medium text-brand-navy hover:bg-white dark:border-white/15 dark:bg-black/30 dark:text-zinc-100 dark:hover:bg-white/10",
                  compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
                )}
              >
                {item.label}
                <span className="ml-2 text-[0.65rem] uppercase tracking-wide text-brand-muted">
                  {t("download")}
                </span>
              </a>
            );
          }
          return (
            <a
              key={item.id}
              {...open}
              className={cn(
                "inline-flex items-center rounded-lg px-1 py-1 font-medium text-brand-diplomatic underline underline-offset-2 hover:text-brand-navy dark:text-brand-accent-bright",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {item.label}
            </a>
          );
        })}
      </div>
      {pdfs.map((pdf) => (
        <GuidePdfEmbed key={`${pdf.id}-embed`} url={pdf.url} title={pdf.label} />
      ))}
    </div>
  );
}

export function GuideResourceEditor({
  resources,
  onChange,
  slugHint,
  help,
}: {
  resources: GuideResource[];
  onChange: (next: GuideResource[]) => void;
  slugHint: string;
  help?: string;
}) {
  const t = useTranslations("guides.resources");
  const supabase = createClient();
  const [kind, setKind] = useState<GuideResourceKind>("link");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addResource(extra?: Partial<GuideResource>) {
    const href = safeGuideHref(extra?.url ?? url);
    const text = (extra?.label ?? label).trim();
    if (!href || !text) return;
    onChange([
      ...resources,
      {
        id: newGuideResourceId(),
        kind: extra?.kind ?? kind,
        label: text,
        url: href,
        filename: extra?.filename,
      },
    ]);
    setLabel("");
    setUrl("");
    setError(null);
  }

  async function uploadFile(file: File) {
    setError(null);
    if (!isAllowedGuideUpload(file)) {
      setError(file.size > GUIDE_FILE_MAX_BYTES ? t("errorSize") : t("errorType"));
      return;
    }
    setPending(true);
    try {
      const safe = sanitizeGuideFilename(file.name);
      const folder = sanitizeGuideFilename(slugHint || "guide");
      const objectPath = `${folder}/${Date.now()}-${safe}`;
      const { error: uploadErr } = await supabase.storage.from(GUIDE_FILES_BUCKET).upload(objectPath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data } = supabase.storage.from(GUIDE_FILES_BUCKET).getPublicUrl(objectPath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error(t("errorUpload"));
      addResource({
        kind: "file",
        label: label.trim() || file.name.replace(/\.[^.]+$/, "") || file.name,
        url: publicUrl,
        filename: file.name,
      });
      setKind("file");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorUpload"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--hairline)] bg-[var(--apple-bg-secondary)] p-3 dark:border-white/10 dark:bg-black/20">
      <div>
        <p className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{t("title")}</p>
        <p className="mt-0.5 text-xs text-brand-muted">{help ?? t("help")}</p>
      </div>

      {resources.length > 0 ? (
        <ul className="space-y-2">
          {resources.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/30"
            >
              <span className="min-w-0">
                <span className="mr-2 rounded-full bg-[var(--apple-bg-tertiary)] px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-brand-muted dark:bg-white/10">
                  {t(
                    item.kind === "button"
                      ? "kindButton"
                      : item.kind === "file"
                        ? "kindFile"
                        : "kindLink"
                  )}
                </span>
                <span className="font-medium text-brand-navy dark:text-zinc-100">{item.label}</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(resources.filter((r) => r.id !== item.id))}
                className="text-xs font-medium text-brand-muted hover:text-brand-navy dark:hover:text-zinc-100"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-brand-muted">{t("empty")}</p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as GuideResourceKind)}
          className="mun-field"
          aria-label={t("kindLink")}
        >
          <option value="link">{t("kindLink")}</option>
          <option value="button">{t("kindButton")}</option>
          <option value="file">{t("kindFile")}</option>
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mun-field sm:col-span-2"
          placeholder={t("label")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mun-field min-w-[12rem] flex-1"
          placeholder={t("urlPlaceholder")}
          type="text"
          inputMode="url"
        />
        <button
          type="button"
          onClick={() => addResource()}
          className="mun-btn"
          disabled={pending}
        >
          {t("add")}
        </button>
        <label
          className={cn(
            "mun-btn cursor-pointer",
            pending && "pointer-events-none opacity-60"
          )}
        >
          {pending ? t("uploading") : t("upload")}
          <input
            type="file"
            className="sr-only"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadFile(file);
            }}
          />
        </label>
      </div>
      {error ? <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}
