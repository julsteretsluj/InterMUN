"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Armchair, Gavel, Mic } from "lucide-react";
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
  const { vacant, country, name, school, pronouns, allocationId } = placard;
  const interactive = Boolean(personHref);
  const dimmed = searchActive && !matchesSearch;
  const ringMatch = searchActive && matchesSearch;

  const inner = (
    <>
      <div
        className={[
          "rounded-sm border-2 shadow-md px-1.5 py-2 text-left leading-snug transition-[opacity,transform,box-shadow,border-color] duration-200",
          vacant
            ? "border-brand-navy/20 bg-brand-cream/40 text-brand-muted/80"
            : "border-brand-gold-bright/30 bg-brand-paper/70 text-brand-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
          interactive ? "hover:border-brand-gold-bright/50 hover:shadow-md" : "",
          dimmed ? "opacity-[0.32] scale-[0.98]" : "",
          ringMatch ? "ring-2 ring-brand-gold-bright/70 ring-offset-2 ring-offset-[rgba(12,12,12,0.85)] border-brand-gold-bright/60" : "",
        ].join(" ")}
      >
        {vacant ? (
          <div className="text-center font-display text-xs font-semibold py-1">
            Vacant
          </div>
        ) : (
          compactPlacardDetails ? (
            <>
              <div className="text-base leading-none mb-1">{flagEmojiForCountryName(country)}</div>
              <div className="text-[0.56rem] uppercase tracking-widest text-brand-muted/90 mb-0.5 border-b border-brand-navy/10 pb-0.5 font-semibold line-clamp-2">
                {country}
              </div>
            </>
          ) : (
            <>
              <div className="text-[0.5rem] uppercase tracking-widest text-brand-muted/90 mb-1 border-b border-brand-navy/10 pb-0.5 font-semibold line-clamp-2">
                {country}
              </div>
              <div className="text-[0.62rem] sm:text-[0.65rem] font-medium line-clamp-2 break-words">
                {dash(name)}
              </div>
              <div className="text-[0.55rem] sm:text-[0.58rem] text-brand-muted mt-0.5 line-clamp-2 break-words">
                {dash(school)}
              </div>
              <div className="text-[0.52rem] sm:text-[0.55rem] text-brand-muted/85 mt-0.5 italic line-clamp-2">
                {pronouns?.trim() ? pronouns.trim() : "—"}
              </div>
            </>
          )
        )}
      </div>
      <div
        className={[
          "mx-auto mt-0.5 h-1 rounded-sm",
          vacant ? "bg-brand-navy/15 w-[90%]" : "bg-brand-gold-bright/50 w-full",
        ].join(" ")}
      />
    </>
  );

  const wrapClass = "w-[6.75rem] sm:w-28 md:w-32 text-left block";

  if (personHref) {
    return (
      <Link
        href={personHref}
        className={[wrapClass, "cursor-pointer rounded-[0.35rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-bright"].join(
          " "
        )}
        aria-label={`View profile: ${country}`}
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
      aria-label={vacant ? "Vacant seat" : `Placard ${country}`}
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
  const dimmed = searchActive && !matchesSearch;
  const ringMatch = searchActive && matchesSearch;

  const inner = (
    <>
      <div className="relative flex items-end justify-center gap-0.5 h-14 sm:h-16">
        <Armchair
          className="w-10 h-10 sm:w-12 sm:h-12 text-brand-navy drop-shadow-md"
          strokeWidth={1.25}
        />
        {seat.showGavel && (
          <Gavel
            className="w-6 h-6 sm:w-7 sm:h-7 text-brand-gold-bright -mb-0.5 -ml-1 drop-shadow"
            strokeWidth={2}
            aria-label="Gavel"
          />
        )}
      </div>
      <div
        className={[
          "rounded-md bg-black/25 px-2 py-1 w-full text-center border border-white/10 transition-[opacity,transform,box-shadow] duration-200",
          dimmed ? "opacity-[0.35] scale-[0.97]" : "",
          ringMatch ? "ring-2 ring-brand-gold-bright/70 ring-offset-2 ring-offset-[rgba(12,12,12,0.85)] border-brand-gold-bright/50" : "",
        ].join(" ")}
      >
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-brand-gold-bright/90">
          {seat.title}
        </p>
        <p className="text-xs sm:text-sm font-medium truncate max-w-[7rem] mx-auto">
          {seat.name ?? "—"}
        </p>
      </div>
    </>
  );

  const wrapClass = [
    "flex flex-col items-center gap-1 text-brand-navy min-w-[5.5rem] sm:min-w-[6.5rem] transition-opacity duration-200",
    dimmed ? "opacity-[0.35]" : "",
    personHref ? "cursor-pointer rounded-[0.35rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-bright" : "cursor-default",
  ].join(" ");

  if (personHref) {
    return (
      <Link href={personHref} className={wrapClass} aria-label={`View profile: ${seat.title}`}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={wrapClass} aria-label={`${seat.title} (no profile link)`}>
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

      const next: DelegatePlacard[] = (allocationRows as AllocationRow[]).map((row) => {
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
    <div className="space-y-4">
      {helperText === null ? null : (
        <p className="text-sm text-brand-muted max-w-2xl">
          {helperText ?? (
            <>
              Placards list <strong>country</strong> (from allocations), <strong>name</strong>,{" "}
              <strong>school</strong>, and <strong>pronouns</strong> from each delegate&apos;s profile. Edit
              yours under <strong>Profile</strong>. Empty committee seats show as{" "}
              <span className="text-brand-navy font-medium">Vacant</span>.{" "}
              <strong>Click</strong> a filled placard or dais seat to open that member&apos;s page (chat and
              report from there).
            </>
          )}
        </p>
      )}

      <figure
        className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] select-none ring-1 ring-brand-gold/10"
        aria-label="Virtual committee room"
      >
        {searchActive ? (
          <span className="sr-only" aria-live="polite">
            Filtering delegations. First highlighted seat is the first match in the ring.
          </span>
        ) : null}
        <div
          className="relative aspect-[16/10] min-h-[420px] sm:min-h-[520px] md:min-h-[620px]"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% 100%, rgba(29,185,84,0.35) 0%, rgba(20,20,20,0.9) 42%, rgba(10,10,10,1) 100%)",
          }}
        >
          <div
            className="absolute top-0 left-[8%] right-[8%] h-[26%] rounded-b-2xl border-x-2 border-b-2 border-brand-gold-bright/20 shadow-inner"
            style={{
              background:
                "linear-gradient(180deg, rgba(29,185,84,0.35) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.55) 100%)",
            }}
          >
            <div className="absolute inset-x-4 top-2 h-1 rounded-full bg-brand-gold-bright/20" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-brand-navy/50">
              <Mic className="w-3 h-3" />
              <span className="text-[0.55rem] uppercase tracking-[0.35em]">
                Committee floor
              </span>
            </div>
          </div>

          <div className="absolute top-[4%] left-0 right-0 flex justify-center items-start gap-4 sm:gap-10 md:gap-14 px-2 z-10 flex-wrap">
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

          <div className="absolute top-[18%] left-1/2 -translate-x-1/2 z-20 px-4 py-1 rounded border border-brand-gold/30 bg-brand-paper/80 shadow-lg max-w-[90%]">
            <p className="font-display text-center text-sm sm:text-base font-semibold text-brand-navy leading-tight">
              {committeeName}
            </p>
            <p className="text-center text-[0.55rem] uppercase tracking-[0.25em] text-brand-muted">
              {conferenceName}
            </p>
          </div>

          <div className="absolute inset-0 z-[5] overflow-y-auto md:overflow-y-hidden px-3 pb-4 pt-[30%] md:pt-[28%]">
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

          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(255,255,255,0.08), transparent)",
            }}
          />
        </div>
        <figcaption className="sr-only">
          Virtual Model UN committee room with delegate placards showing country,
          name, school, and pronouns.
        </figcaption>
      </figure>
    </div>
  );
}
