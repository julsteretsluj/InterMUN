// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

import { PREVIEW_CARD, PREVIEW_LABEL } from "./marketing-preview-styles";

type CommitteeCodeRow = {
  id: string;
  label: string;
  code: string;
};

const COMMITTEE_SEED: CommitteeCodeRow[] = [
  { id: "ecosoc", label: "ECOSOC", code: "ECO741" },
  { id: "legal", label: "Legal", code: "LEG482" },
  { id: "who", label: "WHO", code: "WHO319" },
];

export function MarketingGateCodesPanel({ className }: { className?: string }) {
  const tEvent = useTranslations("smtConferenceSettings");
  const tRoom = useTranslations("smtRoomCodesClient");
  const tPage = useTranslations("smtRoomCodesPage");
  const tCommon = useTranslations("common");
  const tPreview = useTranslations("marketing.rolePreviews.secretariat");

  const [eventCode, setEventCode] = useState("SEAMUN7");
  const [committees, setCommittees] = useState<CommitteeCodeRow[]>(
    COMMITTEE_SEED.map((row) => ({ ...row }))
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const flash = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2200);
  }, []);

  const copyText = useCallback(async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  const saveEventCode = useCallback(() => {
    flash(tEvent("saved"));
  }, [flash, tEvent]);

  const saveCommitteeCode = useCallback(
    (id: string) => {
      const next = (drafts[id] ?? committees.find((row) => row.id === id)?.code ?? "").trim().toUpperCase();
      if (next.length !== 6) return;
      setCommittees((prev) => prev.map((row) => (row.id === id ? { ...row, code: next } : row)));
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      flash(tEvent("saved"));
    },
    [committees, drafts, flash, tEvent]
  );

  return (
    <div className={cn(PREVIEW_CARD, "space-y-4", className)}>
      <div>
        <span className={PREVIEW_LABEL}>{tPreview("gatesLabel")}</span>
        <p className="mt-1 text-xs text-zinc-500">{tPage("subtitle")}</p>
      </div>

      {message ? (
        <p
          className="rounded-lg border border-[color-mix(in_srgb,var(--accent)_22%,#d4d4d8)] bg-[color-mix(in_srgb,var(--accent)_10%,#ffffff)] px-3 py-2 text-xs text-zinc-900"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
        <h3 className="font-sans text-sm font-semibold text-zinc-900">{tEvent("eventDetails")}</h3>
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500">
            {tEvent("conferenceCodeFirstGate")}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value.toUpperCase())}
              className="min-w-[10rem] flex-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider text-zinc-900"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => copyText("event", eventCode)}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-white"
              aria-label={tPreview("copyCode")}
            >
              {copiedKey === "event" ? (
                <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={saveEventCode}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {tCommon("save")}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
        <h3 className="font-sans text-sm font-semibold text-zinc-900">{tRoom("committeeRoomCodes")}</h3>
        <div className="space-y-2">
          {committees.map((row) => {
            const draft = drafts[row.id] ?? row.code;
            return (
              <form
                key={row.id}
                className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveCommitteeCode(row.id);
                }}
              >
                <p className="text-xs font-medium text-zinc-900">{row.label}</p>
                <p className="text-[0.65rem] text-zinc-500">
                  {tRoom("currentCode")}{" "}
                  <span className="font-mono text-zinc-800">{row.code}</span>
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[8rem] flex-1">
                    <label className="mb-1 block text-[0.65rem] text-zinc-500">{tRoom("newCommitteeCode")}</label>
                    <input
                      value={draft}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
                        }))
                      }
                      required
                      minLength={6}
                      maxLength={6}
                      pattern="[A-Z0-9]{6}"
                      placeholder={tRoom("committeeCodePlaceholder")}
                      autoComplete="off"
                      className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 font-mono text-xs uppercase tracking-widest text-zinc-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(row.id, row.code)}
                    className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50"
                    aria-label={tPreview("copyCode")}
                  >
                    {copiedKey === row.id ? (
                      <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {tCommon("save")}
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}
