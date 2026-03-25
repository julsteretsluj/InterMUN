"use client";

import { useMemo } from "react";
import { Armchair, Gavel, Mic } from "lucide-react";

export interface DaisSeat {
  title: string;
  name: string | null;
  showGavel: boolean;
}

interface VirtualCommitteeRoomProps {
  conferenceName: string;
  committeeName: string;
  placards: string[];
  dais: DaisSeat[];
}

function Placard({
  label,
  left,
  top,
  rotate,
  vacant,
}: {
  label: string;
  left: number;
  top: number;
  rotate: number;
  vacant: boolean;
}) {
  return (
    <div
      className="absolute w-[4.5rem] sm:w-[5.25rem] md:w-24 pointer-events-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
      }}
    >
      <div
        className={[
          "rounded-sm border-2 shadow-md px-1 py-1.5 text-center leading-tight",
          vacant
            ? "border-brand-navy/20 bg-brand-cream/40 text-brand-muted/70"
            : "border-amber-900/40 bg-[#fffef8] text-brand-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
        ].join(" ")}
      >
        <div className="text-[0.5rem] uppercase tracking-widest text-brand-muted/80 mb-0.5">
          {vacant ? "—" : "Placard"}
        </div>
        <div className="font-display text-[0.65rem] sm:text-xs font-semibold line-clamp-3 break-words">
          {label}
        </div>
      </div>
      {/* Desk edge */}
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

function placardRing(
  labels: string[],
  startRad: number,
  endRad: number,
  rNear: number,
  rFar: number
): { label: string; left: number; top: number; rotate: number }[] {
  const n = labels.length;
  if (n === 0) return [];
  const span = endRad - startRad;
  const cy = 22;
  return labels.map((label, i) => {
    const t = n === 1 ? 0.5 : (i + 0.5) / n;
    const rad = startRad + t * span;
    const radiusPct = i % 2 === 0 ? rFar : rNear;
    const left = 50 + radiusPct * Math.cos(rad);
    const top = cy + radiusPct * Math.sin(rad);
    const rotate = (rad * 180) / Math.PI + 90;
    return { label, left, top, rotate };
  });
}

export function VirtualCommitteeRoom({
  conferenceName,
  committeeName,
  placards,
  dais,
}: VirtualCommitteeRoomProps) {
  const ringLabels = useMemo(() => {
    const minTotal = 22;
    const raw = [...placards];
    while (raw.length < minTotal) raw.push("Vacant");
    return raw;
  }, [placards]);

  const positions = useMemo(
    () => placardRing(ringLabels, Math.PI * 0.19, Math.PI * 0.81, 30, 42),
    [ringLabels]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-muted max-w-2xl">
        Top-down style layout: dais with chairs and gavels, delegate placards in a
        horseshoe. Placards use your conference allocations; empty seats show as{" "}
        <span className="text-brand-navy font-medium">Vacant</span> until assigned.
      </p>

      <figure
        className="relative w-full overflow-hidden rounded-2xl border border-brand-navy/15 shadow-[0_24px_60px_-20px_rgba(10,22,40,0.35)] select-none"
        aria-label="Virtual committee room"
      >
        {/* Room floor */}
        <div
          className="relative aspect-[16/11] min-h-[320px] sm:min-h-[400px] md:min-h-[460px]"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% 100%, #2d4a3e 0%, #1e3329 42%, #15261f 100%)",
          }}
        >
          {/* Wood dais platform */}
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

          {/* Dais team */}
          <div className="absolute top-[4%] left-0 right-0 flex justify-center items-start gap-4 sm:gap-10 md:gap-14 px-2 z-10">
            {dais.map((seat, i) => (
              <DaisStation key={`${seat.title}-${i}`} seat={seat} />
            ))}
          </div>

          {/* UN-style nameplate on dais front */}
          <div className="absolute top-[18%] left-1/2 -translate-x-1/2 z-20 px-4 py-1 rounded border border-amber-900/60 bg-[#f7f0e4] shadow-lg">
            <p className="font-display text-center text-sm sm:text-base font-semibold text-brand-navy leading-tight">
              {committeeName}
            </p>
            <p className="text-center text-[0.55rem] uppercase tracking-[0.25em] text-brand-muted">
              {conferenceName}
            </p>
          </div>

          {/* Horseshoe placards (alternating near/far radius for double row) */}
          <div className="absolute inset-0 z-[5]">
            {positions.map((p, i) => (
              <Placard
                key={`seat-${i}`}
                label={p.label}
                left={p.left}
                top={p.top}
                rotate={p.rotate}
                vacant={p.label === "Vacant"}
              />
            ))}
          </div>

          {/* Subtle floor highlight */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(255,255,255,0.08), transparent)",
            }}
          />
        </div>
        <figcaption className="sr-only">
          Virtual Model UN committee room showing dais with chairs and gavels and
          delegate placards in a horseshoe arrangement.
        </figcaption>
      </figure>
    </div>
  );
}
