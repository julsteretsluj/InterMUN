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
import { fwcEvidenceIconSrc } from "@/lib/fwc/evidence-icons";
import {
  fwcEvidencePlaceLabel,
  groupFwcEvidenceByLocation,
} from "@/lib/fwc/evidence-location";
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

  const isEvidenceFound = (item: FwcEvidenceMonitorRow) =>
    item.found || Boolean(item.heldByAllocationId);

  const holdersById = useMemo(
    () => Object.fromEntries(holders.map((holder) => [holder.id, holder])),
    [holders]
  );

  const locationGroups = useMemo(
    () => groupFwcEvidenceByLocation(items, holders),
    [items, holders]
  );

  const filtered = useMemo(() => {
    const loc = locationQuery.trim().toLowerCase();
    return items.filter((item) => {
      const found = isEvidenceFound(item);
      if (foundFilter === "found" && !found) return false;
      if (foundFilter === "unfound" && found) return false;
      if (holderId && item.heldByAllocationId !== holderId) return false;
      if (loc) {
        const where = fwcEvidencePlaceLabel(item, holdersById).toLowerCase();
        const hay = `${item.currentLocation} ${item.startingLocation} ${where}`.toLowerCase();
        if (!hay.includes(loc)) return false;
      }
      return true;
    });
  }, [items, foundFilter, holderId, locationQuery, holdersById]);

  const foundCount = items.filter(isEvidenceFound).length;

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

      <section
        aria-label={t("locationsTitle")}
        className="rounded-[16px] border border-[#D1D1D6] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-[#1D1D1F]">
              {t("locationsTitle")}
            </h2>
            <p className="mt-1 text-sm text-[#6E6E73]">{t("locationsIntro")}</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">
            {t("locationsCount", { count: locationGroups.length })}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {locationGroups.map((group) => (
            <article
              key={group.key}
              className={cn(
                "rounded-[12px] border px-4 py-3",
                group.held
                  ? "border-[#007AFF]/28 bg-[#F2F8FF]"
                  : "border-[#D1D1D6] bg-[#F2F2F7]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                    {group.label}
                  </p>
                  {group.grid ? (
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.04em] text-[#007AFF]">
                      {t("locationsGrid", { grid: group.grid })}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-[980px] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#6E6E73]">
                  {t("locationsItemCount", { count: group.items.length })}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {group.items.map((item) => {
                  const iconSrc = fwcEvidenceIconSrc(item.slug);
                  const found = isEvidenceFound(item);
                  return (
                    <li key={item.id} className="flex items-center gap-2 text-sm text-[#1D1D1F]">
                      {iconSrc ? (
                        <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-[6px] border border-[#D1D1D6] bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element -- small static public badge */}
                          <img
                            src={iconSrc}
                            alt=""
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-semibold">{item.slug}</span>
                        <span className="text-[#6E6E73]"> · {item.title}</span>
                      </span>
                      {found ? (
                        <span className="shrink-0 rounded-[980px] bg-[#007AFF] px-2 py-0.5 text-[10px] font-semibold text-white">
                          {t("foundYes")}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-[980px] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#6E6E73]">
                          {t("foundNo")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
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
              filtered.map((item) => {
                const iconSrc = fwcEvidenceIconSrc(item.slug);
                const isFound = item.found || Boolean(item.heldByAllocationId);
                return (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-[#E5E5EA] align-top last:border-b-0",
                    isFound && "bg-[#F2F8FF]"
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#1D1D1F]">
                    <span className="inline-flex items-center gap-2">
                      {iconSrc ? (
                        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[8px] border border-[#D1D1D6] bg-[#F2F2F7]">
                          {/* eslint-disable-next-line @next/next/no-img-element -- small static public badge */}
                          <img
                            src={iconSrc}
                            alt=""
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        </span>
                      ) : null}
                      {item.slug}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[#6E6E73]">{item.category}</td>
                  <td className="px-3 py-3 font-medium text-[#1D1D1F]">{item.title}</td>
                  <td className="px-3 py-3 text-[#6E6E73]">{item.startingLocation}</td>
                  <td className="px-3 py-3 text-[#6E6E73]">{item.discoverableBy}</td>
                  <td className="px-3 py-3 text-[#6E6E73]">{item.tacticalEffect}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveRow(item, { found: !isFound })}
                      className={cn(
                        "rounded-[980px] px-3 py-1 text-xs font-semibold",
                        isFound
                          ? "bg-[#007AFF] text-white"
                          : "bg-[#F2F2F7] text-[#6E6E73]"
                      )}
                    >
                      {isFound ? t("foundYes") : t("foundNo")}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
