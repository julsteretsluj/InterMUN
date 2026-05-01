"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Armchair, Gavel, Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  daisSeatMatchesSearch,
  delegatePlacardMatchesSearch,
  normalizeDelegationSearchQuery,
} from "@/lib/committee-room-delegation-search";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";

export interface DaisSeat {
  title: string;
  name: string | null;
  showGavel: boolean;
  profileId: string | null;
}

export interface DelegatePlacard {
  allocationId: string;
  profileId: string | null;
  country: string;
  name: string | null;
  school: string | null;
  pronouns: string | null;
  vacant: boolean;
}

interface VirtualCommitteeRoomProps {
  conferenceId?: string;
  conferenceName: string;
  committeeName: string;
  placards: DelegatePlacard[];
  dais: DaisSeat[];
  /** Omit the helper paragraph with `null`; omit prop for default delegate copy. */
  helperText?: string | null;
  /** Base path for member profile pages (no trailing slash). */
  personHrefBase?: string;
  /** Filter / highlight placards and dais (country, name, school, pronouns; “vacant” matches empty seats). */
  delegationSearchQuery?: string;
  /** Increment (e.g. on Enter in search) to scroll the first matching placard into view. */
  scrollToDelegationMatchNonce?: number;
  /** Delegate matrix mode: show only allocation + flag on placards. */
  compactPlacardDetails?: boolean;
}

function dash(v: string | null | undefined) {
  const t = v?.trim();
  return t ? t : "—";
}

function isDaisSeatLabel(raw: string | null | undefined) {
  const label = String(raw ?? "").trim().toLowerCase();
  return label === "head chair" || label === "co-chair" || label === "co chair" || label === "rapporteur";
}

function emojiForDaisTitle(title: string | null | undefined) {
  const label = String(title ?? "").trim().toLowerCase();
  if (label === "head chair") return "🧑‍⚖️";
  if (label === "co-chair" || label === "co chair") return "👥";
  if (label === "rapporteur") return "📝";
  return "🎙️";
}

function Placard({
  placard,
  personHref,
  searchActive,
  matchesSearch,
  jumpAnchor,
  compactPlacardDetails,
}: {
  placard: DelegatePlacard;
  personHref: string | null;
  searchActive: boolean;
  matchesSearch: boolean;
  jumpAnchor: boolean;
  compactPlacardDetails?: boolean;
}) {
  const t = useTranslations("committeeRoom");
  const { vacant, country, name, school, pronouns, allocationId } = placard;
  const interactive = Boolean(personHref);
  const ringMatch = searchActive && matchesSearch;

  const inner = (
    <>
      <div
        className={[
          "rounded-md border px-2 py-2 text-left leading-snug transition-[opacity,transform,box-shadow,border-color,background-color] duration-150",
          vacant
            ? "border-[var(--hairline)] bg-[var(--material-thin)]/90 text-brand-muted dark:text-white/70"
            : "border-[var(--hairline)] bg-[var(--material-thick)] text-brand-navy shadow-[0_3px_10px_rgba(0,0,0,0.08)] dark:text-white dark:shadow-[0_8px_18px_rgba(0,0,0,0.35)]",
          interactive ? "hover:border-[color:color-mix(in_srgb,var(--accent)_40%,var(--hairline))] hover:shadow-[0_8px_18px_rgba(0,0,0,0.12)] hover:-translate-y-px transition-apple" : "",
          ringMatch ? "ring-2 ring-[color:color-mix(in_srgb,var(--accent-bright)_70%,transparent)] ring-offset-2 ring-offset-[var(--color-bg-page)] border-[color:color-mix(in_srgb,var(--accent)_50%,var(--hairline))]" : "",
        ].join(" ")}
      >
        {vacant ? (
          <div className="text-center font-display text-xs font-semibold py-1">
            <span aria-hidden="true" className="mr-1">🪑</span>
            {t("virtualRoomVacant")}
          </div>
        ) : (
          compactPlacardDetails ? (
            <>
              <div className="text-base leading-none mb-1">{flagEmojiForCountryName(country)}</div>
              <div className="text-[0.56rem] uppercase tracking-widest text-brand-muted/90 mb-0.5 border-b border-brand-navy/10 pb-0.5 font-semibold break-words dark:border-white/10 dark:text-white/70">
                {country}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm leading-none mb-1" aria-hidden="true">
                {flagEmojiForCountryName(country)}
              </div>
              <div className="text-[0.53rem] uppercase tracking-widest text-brand-muted/90 mb-1 border-b border-brand-navy/10 pb-0.5 font-semibold break-words dark:border-white/10 dark:text-white/70">
                {country}
              </div>
              <div className="text-[0.64rem] sm:text-[0.69rem] font-semibold break-words leading-tight text-brand-navy dark:text-white">
                {dash(name)}
              </div>
              <div className="text-[0.56rem] sm:text-[0.6rem] text-brand-muted mt-0.5 break-words leading-tight dark:text-white/70">
                {dash(school)}
              </div>
              <div className="text-[0.52rem] sm:text-[0.55rem] text-brand-muted/85 mt-0.5 italic break-words leading-tight dark:text-white/60">
                {pronouns?.trim() ? pronouns.trim() : "—"}
              </div>
            </>
          )
        )}
      </div>
      <div
        className={[
          "mx-auto mt-0.5 h-1 rounded-sm",
          vacant ? "w-[90%] bg-brand-navy/25 dark:bg-white/20" : "w-full bg-brand-navy/35 dark:bg-white/30",
        ].join(" ")}
      />
    </>
  );

  const wrapClass = [
    "w-[6.25rem] sm:w-[6.5rem] md:w-[7.25rem] text-left block",
    searchActive && !matchesSearch ? "hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (personHref) {
    return (
      <Link
        href={personHref}
        className={[wrapClass, "cursor-pointer rounded-[0.35rem] transition-apple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"].join(
          " "
        )}
        aria-label={t("profileAria", { country })}
        data-allocation-id={allocationId}
        data-committee-search-jump={jumpAnchor ? "" : undefined}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className={[wrapClass, vacant ? "opacity-100" : ""].join(" ")}
      aria-label={vacant ? t("vacantSeatAria") : t("placardAria", { country })}
      data-allocation-id={allocationId}
      data-committee-search-jump={jumpAnchor ? "" : undefined}
    >
      {inner}
    </div>
  );
}

function DaisStation({
  seat,
  personHref,
  searchActive,
  matchesSearch,
}: {
  seat: DaisSeat;
  personHref: string | null;
  searchActive: boolean;
  matchesSearch: boolean;
}) {
  const t = useTranslations("committeeRoom");
  const ringMatch = searchActive && matchesSearch;

  const inner = (
    <>
      <div className="relative flex items-end justify-center gap-0.5 h-12 sm:h-14">
        <Armchair
          className="w-8 h-8 sm:w-10 sm:h-10 text-brand-navy/90 drop-shadow-sm dark:text-white/80"
          strokeWidth={1.25}
        />
        {seat.showGavel && (
          <Gavel
            className="w-5 h-5 sm:w-6 sm:h-6 text-brand-accent-bright -mb-0.5 -ml-1 drop-shadow"
            strokeWidth={2}
            aria-label={t("gavelAria")}
          />
        )}
      </div>
      <div
        className={[
          "w-full rounded-md border border-[var(--hairline)] bg-[var(--material-thick)] px-1.5 py-1 text-center shadow-[0_3px_10px_rgba(0,0,0,0.1)] transition-[opacity,transform,box-shadow,border-color] [transition-duration:var(--dur-base)] [transition-timing-function:var(--ease-apple)]",
          "dark:shadow-[0_8px_18px_rgba(0,0,0,0.35)]",
          ringMatch ? "ring-2 ring-[color:color-mix(in_srgb,var(--accent-bright)_70%,transparent)] ring-offset-2 ring-offset-[var(--color-bg-page)] border-[color:color-mix(in_srgb,var(--accent)_45%,var(--hairline))]" : "hover:border-[color:color-mix(in_srgb,var(--accent)_35%,var(--hairline))]",
        ].join(" ")}
      >
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-brand-accent-bright/90">
          <span aria-hidden="true" className="mr-1">{emojiForDaisTitle(seat.title)}</span>
          {seat.title}
        </p>
        <p className="text-[0.7rem] sm:text-xs font-medium break-words leading-tight max-w-[7rem] mx-auto dark:text-white">
          {seat.name ?? "—"}
        </p>
      </div>
    </>
  );

  const wrapClass = [
    "flex flex-col items-center gap-1 text-brand-navy dark:text-white min-w-[5rem] sm:min-w-[5.75rem] transition-opacity duration-200",
    searchActive && !matchesSearch ? "hidden" : "",
    personHref ? "cursor-pointer rounded-[0.35rem] transition-apple focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" : "cursor-default",
  ].join(" ");

  if (personHref) {
    return (
      <Link href={personHref} className={wrapClass} aria-label={t("viewProfileAria", { title: seat.title })}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={wrapClass} aria-label={t("noProfileLinkAria", { title: seat.title })}>
      {inner}
    </div>
  );
}

const VACANT_SEAT: DelegatePlacard = {
  allocationId: "VACANT",
  profileId: null,
  country: "Vacant",
  name: null,
  school: null,
  pronouns: null,
  vacant: true,
};

export function VirtualCommitteeRoom({
  conferenceId,
  conferenceName,
  committeeName,
  placards,
  dais,
  helperText,
  personHrefBase = "/committee-room/person",
  delegationSearchQuery = "",
  scrollToDelegationMatchNonce = 0,
  compactPlacardDetails = false,
}: VirtualCommitteeRoomProps) {
  const t = useTranslations("committeeRoom");
  const supabase = useMemo(() => createClient(), []);
  const [livePlacards, setLivePlacards] = useState<DelegatePlacard[]>(placards);
  const placardGridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLivePlacards(placards);
  }, [placards]);

  useEffect(() => {
    if (!conferenceId) return;

    let isActive = true;

    type ProfileEmbed = {
      name: string | null;
      pronouns: string | null;
      school: string | null;
    };

    type AllocationRow = {
      id: string;
      country: string | null;
      user_id: string | null;
      display_name_override: string | null;
      display_pronouns_override: string | null;
      display_school_override: string | null;
      profiles: ProfileEmbed | ProfileEmbed[] | null;
    };

    async function refresh() {
      const { data: allocationRows, error } = await supabase
        .from("allocations")
        .select(
          "id, country, user_id, display_name_override, display_pronouns_override, display_school_override, profiles(name, pronouns, school)"
        )
        .eq("conference_id", conferenceId)
        .order("country");

      if (!isActive || error || !allocationRows) return;

      const next: DelegatePlacard[] = (allocationRows as AllocationRow[])
        .filter((row) => !isDaisSeatLabel(row.country))
        .map((row) => {
        const p = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null;
        const vacant = !row.user_id;
        const nameOverride = String(row.display_name_override ?? "").trim();
        const pronounsOverride = String(row.display_pronouns_override ?? "").trim();
        const schoolOverride = String(row.display_school_override ?? "").trim();
        return {
          allocationId: row.id,
          profileId: row.user_id ? String(row.user_id) : null,
          country: String(row.country ?? "").trim() || "—",
          name: vacant ? null : nameOverride ? nameOverride : p?.name?.trim() || null,
          school: vacant ? null : schoolOverride ? schoolOverride : p?.school?.trim() || null,
          pronouns: vacant
            ? null
            : pronounsOverride
              ? pronounsOverride
              : p?.pronouns?.trim() || null,
          vacant,
        };
      });

      setLivePlacards(next);
    }

    void refresh();

    const ch = supabase
      .channel(`committee-room-allocations-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "allocations",
          filter: `conference_id=eq.${conferenceId}`,
        },
        () => void refresh()
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(ch);
    };
  }, [conferenceId, supabase]);

  const ringSeats = useMemo(() => {
    const minTotal = 22;
    const raw = [...livePlacards];
    while (raw.length < minTotal) raw.push({ ...VACANT_SEAT });
    return raw;
  }, [livePlacards]);

  const qNorm = normalizeDelegationSearchQuery(delegationSearchQuery);
  const searchActive = qNorm.length > 0;

  const firstPlacardMatchIndex = useMemo(() => {
    if (!searchActive) return -1;
    return ringSeats.findIndex((p) => delegatePlacardMatchesSearch(p, qNorm));
  }, [ringSeats, searchActive, qNorm]);

  useEffect(() => {
    if (!scrollToDelegationMatchNonce || !searchActive || firstPlacardMatchIndex < 0) return;
    const root = placardGridRef.current;
    if (!root) return;
    requestAnimationFrame(() => {
      const el = root.querySelector<HTMLElement>("[data-committee-search-jump]");
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }, [scrollToDelegationMatchNonce, searchActive, firstPlacardMatchIndex, qNorm]);

  return (
    <div className="space-y-3">
      {helperText === null ? null : (
        <p className="text-sm text-brand-muted max-w-2xl">
          {helperText ?? t("helperText")}
        </p>
      )}

      <figure
        className="relative w-full select-none overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--hairline)] bg-[var(--material-thick)] shadow-[0_14px_36px_-22px_rgba(0,0,0,0.18)] ring-1 ring-[var(--hairline)] backdrop-blur-xl dark:shadow-[0_22px_48px_-28px_rgba(0,0,0,0.55)]"
        aria-label={t("virtualRoomFigureAria", { committeeName, conferenceName })}
      >
        {searchActive ? (
          <span className="sr-only" aria-live="polite">
            {t("filteringLiveRegion")}
          </span>
        ) : null}
        <div
          className="relative aspect-[16/10] min-h-[350px] sm:min-h-[440px] md:min-h-[520px] bg-[linear-gradient(180deg,#f5f8fd_0%,#eef3fb_45%,#e7eef8_100%)] dark:bg-[linear-gradient(180deg,#151620_0%,#12131b_45%,#101117_100%)]"
        >
          <div
            className="absolute top-0 left-[8%] right-[8%] h-[20%] rounded-b-[var(--radius-lg)] border-x border-b border-[var(--hairline)] bg-[color:color-mix(in_srgb,var(--material-thick)_96%,white)] shadow-[inset_0_-6px_18px_rgba(0,0,0,0.06)] dark:bg-[color:color-mix(in_srgb,var(--material-thin)_80%,transparent)] dark:shadow-[inset_0_-8px_24px_rgba(0,0,0,0.35)]"
          >
            <div className="absolute inset-x-6 top-3 h-1 rounded-full bg-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] dark:bg-white/10" />
          </div>

          <div className="absolute top-[2%] left-0 right-0 flex justify-center items-start gap-4 sm:gap-8 md:gap-12 px-2 z-10">
            {dais.map((seat, i) => {
              const href = seat.profileId
                ? `${personHrefBase.replace(/\/$/, "")}/${seat.profileId}`
                : null;
              return (
                <DaisStation
                  key={`${seat.title}-${i}`}
                  seat={seat}
                  personHref={href}
                  searchActive={searchActive}
                  matchesSearch={daisSeatMatchesSearch(seat, qNorm)}
                />
              );
            })}
          </div>

          <div className="absolute top-[18%] left-1/2 z-[6] flex -translate-x-1/2 items-center gap-1.5 text-brand-muted sm:top-[18.5%] md:top-[17.5%]">
            <Mic className="w-3 h-3" />
            <span className="text-[0.52rem] uppercase tracking-[0.3em]">
              {t("committeeFloor")}
            </span>
          </div>

          <div className="absolute inset-0 z-[5] overflow-y-auto md:overflow-y-hidden px-3 pb-4 pt-[14%] sm:pt-[15%] md:pt-[14%]">
            <div
              ref={placardGridRef}
              className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-2.5 place-items-center"
            >
              {ringSeats.map((p, i) => {
                const href =
                  !p.vacant && p.profileId
                    ? `${personHrefBase.replace(/\/$/, "")}/${p.profileId}`
                    : null;
                const matchesSearch = delegatePlacardMatchesSearch(p, qNorm);
                return (
                  <Placard
                    key={`seat-${i}`}
                    placard={p}
                    personHref={href}
                    searchActive={searchActive}
                    matchesSearch={matchesSearch}
                    jumpAnchor={searchActive && i === firstPlacardMatchIndex && firstPlacardMatchIndex >= 0}
                    compactPlacardDetails={compactPlacardDetails}
                  />
                );
              })}
            </div>
          </div>

        </div>
        <figcaption className="sr-only">
          {t("virtualRoomCaption")}
        </figcaption>
      </figure>
    </div>
  );
}
