// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createSpeechOutlinePoint,
  type SpeechOutlinePoint,
} from "@/lib/speech-outline";
import { cn } from "@/lib/utils";

export function SpeechOutlinePlanner({
  points,
  canEdit,
  onChange,
}: {
  points: SpeechOutlinePoint[];
  canEdit: boolean;
  onChange?: (next: SpeechOutlinePoint[]) => void;
}) {
  const t = useTranslations("speeches");
  const [draft, setDraft] = useState("");

  function toggle(id: string) {
    if (!canEdit || !onChange) return;
    onChange(points.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
  }

  function add() {
    if (!canEdit || !onChange) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...points, createSpeechOutlinePoint(trimmed)]);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      {points.length === 0 ? (
        <p className="text-sm text-brand-muted">{t("outlineEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {points.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/20"
            >
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => toggle(p.id)}
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                  p.done
                    ? "border-brand-accent bg-brand-accent text-white"
                    : "border-slate-300 bg-white dark:border-white/20 dark:bg-black/30",
                  !canEdit && "cursor-default opacity-80"
                )}
                aria-label={p.done ? t("markUndone") : t("markDone")}
              >
                {p.done ? <Check className="h-3 w-3" /> : null}
              </button>
              <span
                className={cn(
                  "text-sm",
                  p.done
                    ? "text-brand-muted line-through"
                    : "text-brand-navy dark:text-zinc-100"
                )}
              >
                {p.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={t("outlinePlaceholder")}
            className="mun-field min-w-0 flex-1"
          />
          <button type="button" onClick={add} className="mun-btn shrink-0">
            {t("addPoint")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
