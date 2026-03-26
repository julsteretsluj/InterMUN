"use client";

import { useMemo } from "react";
import { Armchair, Gavel, Mic } from "lucide-react";

export interface DaisSeat {
  title: string;
  name: string | null;
  showGavel: boolean;
}

export interface DelegatePlacard {
  country: string;
  name: string | null;
  school: string | null;
  pronouns: string | null;
  vacant: boolean;
}

interface VirtualCommitteeRoomProps {
  conferenceName: string;
  committeeName: string;
  placards: DelegatePlacard[];
  dais: DaisSeat[];
  /** Omit the helper paragraph with `null`; omit prop for default delegate copy. */
  helperText?: string | null;
}

function dash(v: string | null | undefined) {
  const t = v?.trim();
  return t ? t : "—";
}

function Placard({
  placard,
  left,
  top,
  rotate,
}: {
  placard: DelegatePlacard;
  left: number;
  top: number;
  rotate: number;
}) {
  const { vacant, country, name, school, pronouns } = placard;

  return (
    <div
      className="absolute w-[6.75rem] sm:w-28 md:w-32 pointer-events-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
      }}
    >
      <div
        className={[
          "rounded-sm border-2 shadow-md px-1.5 py-2 text-left leading-snug",
          vacant
            ? "border-brand-navy/20 bg-brand-cream/40 text-brand-muted/80"
            : "border-amber-900/40 bg-[#fffef8] text-brand-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
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
          vacant ? "bg-brand-navy/15 w-[90%]" : "bg-amber-900/50 w-full",
        ].join(" ")}
      />
    </div>
  );
}

function DaisStation({ seat }: { seat: DaisSeat }) {
  return (
    <div className="flex flex-col items-center gap-1 text-brand-paper min-w-[5.5rem] sm:min-w-[6.5rem]">
      <div className="relative flex items-end justify-center gap-0.5 h-14 sm:h-16">
        <Armchair
          className="w-10 h-10 sm:w-12 sm:h-12 text-brand-paper drop-shadow-md"
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
      <div className="rounded-md bg-black/25 border border-white/10 px-2 py-1 w-full text-center">
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-brand-gold-bright/90">
          {seat.title}
        </p>
        <p className="text-xs sm:text-sm font-medium truncate max-w-[7rem] mx-auto">
          {seat.name ?? "—"}
        </p>
      </div>
    </div>
  );
}

const VACANT_SEAT: DelegatePlacard = {
  country: "Vacant",
  name: null,
  school: null,
  pronouns: null,
  vacant: true,
};

function placardRing(
  seats: DelegatePlacard[],
  startRad: number,
  endRad: number,
  rNear: number,
  rFar: number
): { placard: DelegatePlacard; left: number; top: number; rotate: number }[] {
  const n = seats.length;
  if (n === 0) return [];
  const span = endRad - startRad;
  const cy = 22;
  return seats.map((placard, i) => {
    const t = n === 1 ? 0.5 : (i + 0.5) / n;
    const rad = startRad + t * span;
    const radiusPct = i % 2 === 0 ? rFar : rNear;
    const left = 50 + radiusPct * Math.cos(rad);
    const top = cy + radiusPct * Math.sin(rad);
    const rotate = (rad * 180) / Math.PI + 90;
    return { placard, left, top, rotate };
  });
}

export function VirtualCommitteeRoom({
  conferenceName,
  committeeName,
  placards,
  dais,
  helperText,
}: VirtualCommitteeRoomProps) {
  const ringSeats = useMemo(() => {
    const minTotal = 22;
    const raw = [...placards];
    while (raw.length < minTotal) raw.push({ ...VACANT_SEAT });
    return raw;
  }, [placards]);

  const positions = useMemo(
    () => placardRing(ringSeats, Math.PI * 0.19, Math.PI * 0.81, 30, 42),
    [ringSeats]
  );

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
              "radial-gradient(ellipse 120% 80% at 50% 100%, #2d4a3e 0%, #1e3329 42%, #15261f 100%)",
          }}
        >
          <div
            className="absolute top-0 left-[8%] right-[8%] h-[26%] rounded-b-2xl border-x-2 border-b-2 border-amber-950/50 shadow-inner"
            style={{
              background:
                "linear-gradient(180deg, #5c4033 0%, #4a3428 45%, #3d2a20 100%)",
            }}
          >
            <div className="absolute inset-x-4 top-2 h-1 rounded-full bg-amber-200/15" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-brand-paper/50">
              <Mic className="w-3 h-3" />
              <span className="text-[0.55rem] uppercase tracking-[0.35em]">
                Committee floor
              </span>
            </div>
          </div>

          <div className="absolute top-[4%] left-0 right-0 flex justify-center items-start gap-4 sm:gap-10 md:gap-14 px-2 z-10 flex-wrap">
            {dais.map((seat, i) => (
              <DaisStation key={`${seat.title}-${i}`} seat={seat} />
            ))}
          </div>

          <div className="absolute top-[18%] left-1/2 -translate-x-1/2 z-20 px-4 py-1 rounded border border-amber-900/60 bg-[#f7f0e4] shadow-lg max-w-[90%]">
            <p className="font-display text-center text-sm sm:text-base font-semibold text-brand-navy leading-tight">
              {committeeName}
            </p>
            <p className="text-center text-[0.55rem] uppercase tracking-[0.25em] text-brand-muted">
              {conferenceName}
            </p>
          </div>

          <div className="absolute inset-0 z-[5]">
            {positions.map((p, i) => (
              <Placard
                key={`seat-${i}`}
                placard={p.placard}
                left={p.left}
                top={p.top}
                rotate={p.rotate}
              />
            ))}
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
