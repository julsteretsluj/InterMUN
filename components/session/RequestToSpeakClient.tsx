// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HelpButton } from "@/components/HelpButton";
import { useTranslations } from "next-intl";
import {
  canRequestOrJoinSpeakerList,
  fetchDisciplineForAllocation,
} from "@/lib/delegate-discipline";

export function RequestToSpeakClient({
  conferenceId,
  allocationId,
  allocationCountry,
  disabled,
  disabledReason,
}: {
  conferenceId: string;
  allocationId: string | null;
  allocationCountry: string | null;
  disabled?: boolean;
  disabledReason?: string | null;
}) {
  const t = useTranslations("session.requestToSpeak");
  const supabase = useMemo(() => createClient(), []);
  const [purpose, setPurpose] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const country = allocationCountry ?? t("delegateFallback");
  const blocked = Boolean(disabled);

  async function request() {
    if (!allocationId) {
      setMsg(t("needAllocation"));
      return;
    }
    if (blocked) {
      setMsg(disabledReason?.trim() || t("speakingSuspended"));
      return;
    }

    setPending(true);
    setMsg(null);
    try {
      const discipline = await fetchDisciplineForAllocation(supabase, conferenceId, allocationId);
      if (!canRequestOrJoinSpeakerList(discipline)) {
        setMsg(
          discipline?.removed_from_committee ? t("removedFromCommittee") : t("speakingSuspended")
        );
        return;
      }

      // Dedupe: one active waiting/current entry per allocation.
      const { data: existing, error: existingErr } = await supabase
        .from("speaker_queue_entries")
        .select("id,status")
        .eq("conference_id", conferenceId)
        .eq("allocation_id", allocationId)
        .in("status", ["waiting", "current"]);

      if (existingErr) throw existingErr;

      if ((existing ?? []).length > 0) {
        setMsg(t("alreadyQueued"));
        return;
      }

      const { data: maxRow } = await supabase
        .from("speaker_queue_entries")
        .select("sort_order")
        .eq("conference_id", conferenceId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

      const trimmedPurpose = purpose.trim();
      const label = trimmedPurpose ? `${country} - ${trimmedPurpose}` : country;

      const { error: insErr } = await supabase.from("speaker_queue_entries").insert({
        conference_id: conferenceId,
        allocation_id: allocationId,
        sort_order: nextSortOrder,
        label,
        status: "waiting",
      });

      if (insErr) throw insErr;

      setMsg(t("requested"));
      setPurpose("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("requestFailed");
      setMsg(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-navy/10 bg-white/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-sans text-sm font-semibold text-brand-navy">{t("title")}</h3>
        <HelpButton title={t("title")}>
          {t("helpBody")}
        </HelpButton>
      </div>
      {blocked && disabledReason ? (
        <p className="text-xs text-amber-800 dark:text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          {disabledReason}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs text-brand-muted uppercase tracking-wider">
          {t("purposeLabel")}
        </label>
        <HelpButton title={t("purposeHelpTitle")}>
          {t("purposeHelpBody")}
        </HelpButton>
      </div>
      <input
        className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 text-sm"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder={t("purposePlaceholder")}
        disabled={pending || !allocationId || blocked}
      />
      <button
        type="button"
        onClick={() => void request()}
        disabled={pending || !allocationId || blocked}
        className="w-full px-3 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t("requesting") : t("title")}
      </button>
      {msg ? (
        <p className="text-xs text-brand-muted bg-brand-paper border border-brand-navy/10 rounded-lg px-3 py-2">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

