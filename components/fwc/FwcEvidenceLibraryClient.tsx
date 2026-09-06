"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  updateFwcEvidenceState,
  uploadFwcEvidenceLibrary,
} from "@/app/actions/fwcCrisis";
import type {
  FwcEvidenceHolder,
  FwcEvidenceLibraryPayload,
  FwcEvidenceMonitorRow,
  FwcEvidenceSourceMeta,
} from "@/lib/fwc/evidence-types";
import { cn } from "@/lib/utils";

type FoundFilter = "all" | "found" | "unfound";

export function FwcEvidenceLibraryClient({
  conferenceId,
  initial,
}: {
  conferenceId: string;
  initial: FwcEvidenceLibraryPayload;
}) {
  const t = useTranslations("fwcEvidence");
  const [items, setItems] = useState(initial.items);
  const [holders] = useState<FwcEvidenceHolder[]>(initial.holders);
  const [source, setSource] = useState<FwcEvidenceSourceMeta | null>(initial.source);
  const [foundFilter, setFoundFilter] = useState<FoundFilter>("all");
  const [locationQuery, setLocationQuery] = useState("");
  const [holderId, setHolderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const loc = locationQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (foundFilter === "found" && !item.found) return false;
      if (foundFilter === "unfound" && item.found) return false;
      if (holderId && item.heldByAllocationId !== holderId) return false;
      if (loc) {
        const hay = `${item.currentLocation} ${item.startingLocation}`.toLowerCase();
        if (!hay.includes(loc)) return false;
      }
      return true;
    });
  }, [items, foundFilter, holderId, locationQuery]);

  const foundCount = items.filter((item) => item.found).length;

  function patchItem(next: FwcEvidenceMonitorRow) {
    setItems((prev) => prev.map((item) => (item.id === next.id ? next : item)));
  }

  function saveRow(
    item: FwcEvidenceMonitorRow,
    patch: {
      found?: boolean;
      currentLocation?: string | null;
      heldByAllocationId?: string | null;
      notes?: string | null;
    }
  ) {
    setError(null);
    startTransition(async () => {
      const result = await updateFwcEvidenceState({
        conferenceId,
        itemId: item.id,
        ...patch,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      patchItem(result.data.item);
    });
  }

  function onUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    const form = new FormData();
    form.set("conferenceId", conferenceId);
    form.set("file", file);
    startTransition(async () => {
      const result = await uploadFwcEvidenceLibrary(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems(result.data.items);
      setSource(result.data.source);
      setNotice(t("uploadSuccess", { count: result.data.items.length }));
    });
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-[16px] border border-[#D1D1D6] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-[#6E6E73]">
            {t("summary", { found: foundCount, total: items.length })}
          </p>
          {source?.publicUrl ? (
            <a
              href={source.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-semibold text-[#007AFF] hover:text-[#0077ED]"
            >
              {t("sourceFile", { name: source.filename })}
            </a>
          ) : (
            <p className="text-sm text-[#AEAEB2]">{t("sourceMissing")}</p>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-[980px] bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0077ED]">
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              onUpload(file);
            }}
          />
          {pending ? t("working") : t("replaceUpload")}
        </label>
      </section>

      <div className="flex flex-wrap items-end gap-3 rounded-[16px] border border-[#D1D1D6] bg-white p-4">
        <label className="min-w-[8rem] flex-1 text-xs font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">
          {t("filterFound")}
          <select
            className="mun-field mt-1 w-full"
            value={foundFilter}
            onChange={(event) => setFoundFilter(event.target.value as FoundFilter)}
          >
            <option value="all">{t("filterAll")}</option>
            <option value="found">{t("filterFoundOnly")}</option>
            <option value="unfound">{t("filterUnfound")}</option>
          </select>
        </label>
        <label className="min-w-[10rem] flex-[2] text-xs font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">
          {t("filterLocation")}
          <input
            className="mun-field mt-1 w-full"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder={t("filterLocationPlaceholder")}
          />
        </label>
        <label className="min-w-[10rem] flex-1 text-xs font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">
          {t("filterHolder")}
          <select
            className="mun-field mt-1 w-full"
            value={holderId}
            onChange={(event) => setHolderId(event.target.value)}
          >
            <option value="">{t("filterAnyHolder")}</option>
            {holders.map((holder) => (
              <option key={holder.id} value={holder.id}>
                {holder.country}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-[12px] bg-[#FFF2F2] px-4 py-3 text-sm text-[#C41C1C]">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-[12px] bg-[#F2F8FF] px-4 py-3 text-sm text-[#007AFF]">{notice}</p>
      ) : null}

      <div className="overflow-x-auto rounded-[16px] border border-[#D1D1D6] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <table className="min-w-[78rem] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#D1D1D6] bg-[#F2F2F7] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">
              <th className="px-3 py-3">{t("colId")}</th>
              <th className="px-3 py-3">{t("colCategory")}</th>
              <th className="min-w-[12rem] px-3 py-3">{t("colItem")}</th>
              <th className="min-w-[10rem] px-3 py-3">{t("colPrimary")}</th>
              <th className="min-w-[10rem] px-3 py-3">{t("colDiscoverable")}</th>
              <th className="min-w-[14rem] px-3 py-3">{t("colEffect")}</th>
              <th className="px-3 py-3">{t("colFound")}</th>
              <th className="min-w-[10rem] px-3 py-3">{t("colCurrent")}</th>
              <th className="min-w-[10rem] px-3 py-3">{t("colHeldBy")}</th>
              <th className="min-w-[10rem] px-3 py-3">{t("colNotes")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-[#6E6E73]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-b border-[#E5E5EA] align-top last:border-b-0">
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#1D1D1F]">{item.slug}</td>
                  <td className="px-3 py-3 text-[#6E6E73]">{item.category}</td>
                  <td className="px-3 py-3 font-medium text-[#1D1D1F]">{item.title}</td>
                  <td className="px-3 py-3 text-[#6E6E73]">{item.startingLocation}</td>
                  <td className="px-3 py-3 text-[#6E6E73]">{item.discoverableBy}</td>
                  <td className="px-3 py-3 text-[#6E6E73]">{item.tacticalEffect}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveRow(item, { found: !item.found })}
                      className={cn(
                        "rounded-[980px] px-3 py-1 text-xs font-semibold",
                        item.found
                          ? "bg-[#007AFF] text-white"
                          : "bg-[#F2F2F7] text-[#6E6E73]"
                      )}
                    >
                      {item.found ? t("foundYes") : t("foundNo")}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className="mun-field w-full min-w-[8rem] text-sm"
                      defaultValue={item.currentLocation}
                      key={`${item.id}-${item.currentLocation}`}
                      disabled={pending}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next === item.currentLocation) return;
                        saveRow(item, { currentLocation: next });
                      }}
                      placeholder={item.startingLocation}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="mun-field w-full min-w-[8rem] text-sm"
                      value={item.heldByAllocationId ?? ""}
                      disabled={pending}
                      onChange={(event) =>
                        saveRow(item, { heldByAllocationId: event.target.value || null })
                      }
                    >
                      <option value="">{t("heldByNone")}</option>
                      {holders.map((holder) => (
                        <option key={holder.id} value={holder.id}>
                          {holder.country}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className="mun-field w-full min-w-[8rem] text-sm"
                      defaultValue={item.notes}
                      key={`${item.id}-notes-${item.notes}`}
                      disabled={pending}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next === item.notes) return;
                        saveRow(item, { notes: next });
                      }}
                      placeholder={t("notesPlaceholder")}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
