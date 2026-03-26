"use client";

import { useEffect, useMemo, useState } from "react";
import { Armchair, Gavel, Mic } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface DaisSeat {
  title: string;
  name: string | null;
  showGavel: boolean;
  profileId: string | null;
}

export interface DelegatePlacard {
  allocationId: string;
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

  // Digital MUN: click-to-select recipient targeting (optional).
  selectedAllocationRecipientIds?: string[];
  onToggleAllocationRecipient?: (allocationId: string) => void;
  selectedChairRecipientIds?: string[];
  anyChairRecipient?: boolean;
  onToggleChairRecipient?: (chairProfileId: string) => void;
}

function dash(v: string | null | undefined) {
  const t = v?.trim();
  return t ? t : "—";
}

function Placard({
  placard,
  selected,
  onClick,
}: {
  placard: DelegatePlacard;
  selected: boolean;
  onClick?: () => void;
}) {
  const { vacant, country, name, school, pronouns, allocationId } = placard;
  const disabled = vacant || !onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-[6.75rem] sm:w-28 md:w-32 text-left",
        disabled ? "opacity-100 cursor-default" : "cursor-pointer",
        selected && !vacant ? "ring-2 ring-brand-gold-bright/60 rounded-[0.35rem]" : "",
      ].join(" ")}
      aria-label={vacant ? `Vacant seat` : `Toggle recipient ${country}`}
      data-allocation-id={allocationId}
    >
      <div
        className={[
          "rounded-sm border-2 shadow-md px-1.5 py-2 text-left leading-snug",
          vacant
            ? "border-brand-navy/20 bg-brand-cream/40 text-brand-muted/80"
            : selected
              ? "border-brand-gold-bright/40 bg-brand-paper/90 text-brand-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
              : "border-brand-gold-bright/30 bg-brand-paper/70 text-brand-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
        ].join(" ")}
      >
        {vacant ? (
          <div className="text-center font-display text-xs font-semibold py-1">
            Vacant
          </div>
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
        )}
      </div>
      <div
        className={[
          "mx-auto mt-0.5 h-1 rounded-sm",
          vacant ? "bg-brand-navy/15 w-[90%]" : "bg-brand-gold-bright/50 w-full",
        ].join(" ")}
      />
    </button>
  );
}

function DaisStation({
  seat,
  selected,
  onClick,
}: {
  seat: DaisSeat;
  selected: boolean;
  onClick?: () => void;
}) {
  const disabled = !onClick || !seat.profileId;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex flex-col items-center gap-1 text-brand-navy min-w-[5.5rem] sm:min-w-[6.5rem]",
        disabled ? "cursor-default" : "cursor-pointer",
        selected && !disabled ? "ring-2 ring-brand-gold-bright/50 rounded-[0.35rem]" : "",
      ].join(" ")}
    >
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
          "rounded-md bg-black/25 px-2 py-1 w-full text-center border",
          selected && !disabled ? "border-brand-gold-bright/40" : "border-white/10",
        ].join(" ")}
      >
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-brand-gold-bright/90">
          {seat.title}
        </p>
        <p className="text-xs sm:text-sm font-medium truncate max-w-[7rem] mx-auto">
          {seat.name ?? "—"}
        </p>
      </div>
    </button>
  );
}

const VACANT_SEAT: DelegatePlacard = {
  allocationId: "VACANT",
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
  selectedAllocationRecipientIds = [],
  onToggleAllocationRecipient,
  selectedChairRecipientIds = [],
  anyChairRecipient = false,
  onToggleChairRecipient,
}: VirtualCommitteeRoomProps) {
  const supabase = useMemo(() => createClient(), []);
  const [livePlacards, setLivePlacards] = useState<DelegatePlacard[]>(placards);

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

  return (
    <div className="space-y-4">
      {helperText === null ? null : (
        <p className="text-sm text-brand-muted max-w-2xl">
          {helperText ?? (
            <>
              Placards list <strong>country</strong> (from allocations), <strong>name</strong>,{" "}
              <strong>school</strong>, and <strong>pronouns</strong> from each delegate&apos;s profile. Edit
              yours under <strong>Profile</strong>. Empty committee seats show as{" "}
              <span className="text-brand-navy font-medium">Vacant</span>.
            </>
          )}
        </p>
      )}

      <figure
        className="relative w-full overflow-hidden rounded-2xl border border-brand-navy/15 shadow-[0_24px_60px_-20px_rgba(10,22,40,0.35)] select-none"
        aria-label="Virtual committee room"
      >
        <div
          className="relative aspect-[16/12] min-h-[380px] sm:min-h-[440px] md:min-h-[520px]"
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
              const selected =
                anyChairRecipient ||
                (seat.profileId ? selectedChairRecipientIds.includes(seat.profileId) : false);
              return (
                <DaisStation
                  key={`${seat.title}-${i}`}
                  seat={seat}
                  selected={selected}
                  onClick={
                    onToggleChairRecipient && seat.profileId
                      ? () => onToggleChairRecipient(seat.profileId as string)
                      : undefined
                  }
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

          <div className="absolute inset-0 z-[5] overflow-y-auto px-3 pb-4 pt-[30%]">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-2.5 place-items-center">
              {ringSeats.map((p, i) => (
                <Placard
                  key={`seat-${i}`}
                  placard={p}
                  selected={selectedAllocationRecipientIds.includes(p.allocationId)}
                  onClick={
                    onToggleAllocationRecipient && !p.vacant
                      ? () => onToggleAllocationRecipient(p.allocationId)
                      : undefined
                  }
                />
              ))}
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
