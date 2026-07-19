// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createSpeechOutlinePoint,
  MAX_SPEECH_OUTLINE_POINT_LENGTH,
  type SpeechOutlinePoint,
} from "@/lib/speech-outline";
import { cn } from "@/lib/utils";

export function SpeechOutlinePlanner({
  points,
  canEdit,
  saving = false,
  onChange,
}: {
  points: SpeechOutlinePoint[];
  canEdit: boolean;
  saving?: boolean;
  onChange?: (next: SpeechOutlinePoint[]) => void;
}) {
  const t = useTranslations("speeches");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const locked = !canEdit || saving;

  function toggle(id: string) {
    if (locked || !onChange) return;
    onChange(points.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
  }

  function add() {
    if (locked || !onChange) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...points, createSpeechOutlinePoint(trimmed)]);
    setDraft("");
  }

  function remove(id: string) {
    if (locked || !onChange) return;
    if (editingId === id) setEditingId(null);
    onChange(points.filter((p) => p.id !== id));
  }

  function startEdit(point: SpeechOutlinePoint) {
    if (locked) return;
    setEditingId(point.id);
    setEditDraft(point.text);
  }

  function commitEdit(id: string) {
    if (locked || !onChange) return;
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    onChange(points.map((p) => (p.id === id ? { ...p, text: trimmed } : p)));
    setEditingId(null);
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
              className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/20"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={p.done}
                disabled={locked}
                onClick={() => toggle(p.id)}
                className={cn(
                  "-my-1 -ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent",
                  locked && "cursor-default opacity-80"
                )}
                aria-label={p.done ? t("markUndone") : t("markDone")}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border transition",
                    p.done
                      ? "border-brand-accent bg-brand-accent text-white"
                      : "border-slate-300 bg-white dark:border-white/20 dark:bg-black/30"
                  )}
                  aria-hidden="true"
                >
                  {p.done ? <Check className="h-3 w-3" /> : null}
                </span>
              </button>
              {editingId === p.id ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    value={editDraft}
                    maxLength={MAX_SPEECH_OUTLINE_POINT_LENGTH}
                    autoFocus
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitEdit(p.id);
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    aria-label={t("editPoint")}
                    className="mun-field min-w-0 flex-1 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => commitEdit(p.id)}
                    disabled={locked}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-accent hover:bg-brand-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                    aria-label={t("save")}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent dark:hover:bg-white/10"
                    aria-label={t("cancel")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className={cn(
                      "min-w-0 flex-1 break-words text-sm",
                      p.done
                        ? "text-brand-muted line-through"
                        : "text-brand-navy dark:text-zinc-100"
                    )}
                  >
                    {p.text}
                  </span>
                  {canEdit ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => startEdit(p)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted transition hover:bg-slate-100 hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-zinc-100"
                        aria-label={t("editPoint")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => remove(p.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-muted transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        aria-label={t("deletePoint")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <div className="flex gap-2">
          <input
            value={draft}
            maxLength={MAX_SPEECH_OUTLINE_POINT_LENGTH}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            aria-label={t("outlinePlaceholder")}
            placeholder={t("outlinePlaceholder")}
            className="mun-field min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={add}
            disabled={saving || !draft.trim()}
            className="mun-btn shrink-0 disabled:opacity-50"
          >
            {t("addPoint")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
