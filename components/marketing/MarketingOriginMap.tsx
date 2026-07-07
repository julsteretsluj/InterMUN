// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Stylized map with a Thailand pin — hover/focus reveals origin tooltip. */
export function MarketingOriginMap({
  tooltip,
  mapAria,
  className,
}: {
  tooltip: string;
  mapAria: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mun-marketing-origin-map relative aspect-[5/3] w-full overflow-hidden rounded-[1.75rem]",
        className
      )}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 400 240"
        role="img"
        aria-label={mapAria}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="mun-origin-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="color-mix(in srgb, var(--navy) 10%, transparent)" />
          </pattern>
          <radialGradient id="mun-origin-glow" cx="58%" cy="54%" r="42%">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--gold) 22%, transparent)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="400" height="240" fill="url(#mun-origin-grid)" />
        <rect width="400" height="240" fill="url(#mun-origin-glow)" />
        {/* Simplified landmass hints — Southeast Asia / Pacific focus */}
        <path
          d="M0 168 C48 150 72 132 108 128 C142 124 168 108 204 104 C238 100 260 88 296 82 C332 76 360 70 400 64 L400 240 L0 240 Z"
          fill="color-mix(in srgb, var(--navy) 7%, transparent)"
        />
        <path
          d="M118 98 C138 88 158 84 178 86 C198 88 214 78 236 72 C258 66 278 58 302 54 C318 52 334 48 352 44 L352 120 C330 126 308 132 286 136 C262 140 240 148 218 152 C196 156 174 160 152 164 C138 166 126 168 118 172 Z"
          fill="color-mix(in srgb, var(--navy) 11%, transparent)"
        />
        <path
          d="M248 108 C262 100 278 96 294 98 C310 100 324 94 340 90 C352 88 364 86 376 84 L376 132 C360 138 344 142 328 144 C312 146 296 152 280 156 C266 160 254 164 248 168 Z"
          fill="color-mix(in srgb, var(--accent) 14%, transparent)"
        />
        <circle cx="232" cy="126" r="5" fill="color-mix(in srgb, var(--gold) 35%, transparent)" />
      </svg>

      <button
        type="button"
        className="group absolute left-[58%] top-[52%] z-10 -translate-x-1/2 -translate-y-full focus:outline-none"
        aria-label={tooltip}
      >
        <span
          className="absolute left-1/2 top-full mt-2 w-max max-w-[14rem] -translate-x-1/2 rounded-xl border border-[var(--hairline)] bg-[color-mix(in_srgb,var(--material-thick)_94%,transparent)] px-3 py-2 text-left text-xs font-medium leading-snug text-brand-navy opacity-0 shadow-[var(--marketing-float-shadow)] backdrop-blur-md transition-opacity duration-[var(--dur-base)] group-hover:opacity-100 group-focus-visible:opacity-100 pointer-events-none sm:max-w-[16rem] sm:text-sm"
          role="tooltip"
        >
          {tooltip}
        </span>
        <span className="relative flex flex-col items-center">
          <span
            aria-hidden
            className="absolute -bottom-1 h-8 w-8 rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,transparent)] blur-md transition-transform duration-[var(--dur-base)] group-hover:scale-110"
          />
          <MapPin
            aria-hidden
            className="relative h-9 w-9 text-[var(--gold)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-transform duration-[var(--dur-base)] group-hover:scale-110"
            fill="currentColor"
            strokeWidth={1.5}
          />
        </span>
      </button>
    </div>
  );
}
