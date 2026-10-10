// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { ChevronDown, X } from "lucide-react";
import { AppleMenu, AppleMenuContent, AppleMenuItem, AppleMenuSection, AppleMenuTrigger } from "@/components/ui/AppleMenu";
import { ropInputClass } from "@/components/fwc/rop-ui";

export type CitationPickerOption = {
  id: string;
  label: string;
  description?: string | null;
  /** Usage limit / uses left, shown under the description. */
  meta?: string | null;
  /** Section heading (owner character when resources are pooled, or a category). */
  group?: string | null;
};

/**
 * Multi-select dropdown for directive powers/assets. Options come from the eligible
 * characters' sheets; spent options are listed separately and cannot be picked.
 */
export function FwcCitationPicker({
  label,
  placeholder,
  emptyLabel,
  options,
  unavailable = [],
  selected,
  onChange,
  required,
}: {
  label: string;
  placeholder: string;
  emptyLabel: string;
  options: CitationPickerOption[];
  unavailable?: { id: string; label: string; reason: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  required?: boolean;
}) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const chosen = selected.map((id) => byId.get(id)).filter((o): o is CitationPickerOption => Boolean(o));
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const triggerClass = `${ropInputClass} flex items-center justify-between gap-2 text-left`;

  return (
    <div className="space-y-1.5">
      <span className="text-[13px] font-semibold text-[#1D1D1F]">
        {label}
        {required ? <span className="text-[#007AFF]"> *</span> : null}
      </span>
      {options.length === 0 ? (
        <button type="button" disabled aria-label={label} className={`${triggerClass} cursor-not-allowed bg-[#F2F2F7] text-[#AEAEB2]`}>
          <span>{emptyLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      ) : (
        <AppleMenu>
          <AppleMenuTrigger aria-label={label} className={triggerClass}>
            <span className={chosen.length ? "text-[#1D1D1F]" : "text-[#AEAEB2]"}>
              {chosen.length ? chosen.map((o) => o.label).join(", ") : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#6E6E73]" aria-hidden />
          </AppleMenuTrigger>
          <AppleMenuContent className="max-h-[360px] max-w-[min(440px,calc(100vw-24px))] overflow-y-auto">
            {groups.map((g) => (
              <AppleMenuSection key={g || "all"} title={g || undefined}>
                {options
                  .filter((o) => (o.group ?? "") === g)
                  .map((o) => (
                    <AppleMenuItem
                      key={o.id}
                      selected={selected.includes(o.id)}
                      onSelect={() => toggle(o.id)}
                      label={
                        <span className="block py-0.5">
                          <span className="block text-[13px] font-semibold">{o.label}</span>
                          {o.description ? <span className="block text-[12px] font-normal text-[#6E6E73]">{o.description}</span> : null}
                          {o.meta ? <span className="block text-[11px] font-normal text-[#AEAEB2]">{o.meta}</span> : null}
                        </span>
                      }
                    />
                  ))}
              </AppleMenuSection>
            ))}
          </AppleMenuContent>
        </AppleMenu>
      )}
      {chosen.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {chosen.map((o) => (
            <li key={o.id}>
              <span
                title={[o.description, o.meta].filter(Boolean).join(" · ") || undefined}
                className="inline-flex items-center gap-1 rounded-[980px] bg-[#E8F1FF] py-0.5 pl-2.5 pr-1 text-[12px] font-semibold text-[#0057B8]"
              >
                {o.group ? `${o.label} · ${o.group}` : o.label}
                <button
                  type="button"
                  aria-label={`${o.label} ✕`}
                  onClick={() => toggle(o.id)}
                  className="rounded-full p-0.5 transition-colors duration-200 hover:bg-[#D6E6FF]"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {unavailable.length ? (
        <ul className="space-y-0.5 text-[12px] text-[#AEAEB2]">
          {unavailable.map((u) => (
            <li key={u.id}>
              <span className="line-through">{u.label}</span> — {u.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
