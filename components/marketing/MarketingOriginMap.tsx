// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { MapPin } from "lucide-react";
import { MarketingOriginGlobe } from "@/components/marketing/MarketingOriginGlobe";
import { cn } from "@/lib/utils";

/** Interactive globe with a Bangkok pin — hover/focus reveals origin tooltip. */
export function MarketingOriginMap({
  tooltip,
  mapAria,
  locationLabel,
  className,
}: {
  tooltip: string;
  mapAria: string;
  locationLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mun-marketing-origin-map relative aspect-[5/3] w-full overflow-hidden rounded-[1.75rem]",
        className
      )}
      role="img"
      aria-label={mapAria}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage: "radial-gradient(color-mix(in srgb, var(--navy) 7%, transparent) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />

      <div className="relative flex h-full w-full items-center justify-center gap-6 px-6 py-6 md:gap-10 md:px-10 md:py-8">
        <MarketingOriginGlobe className="w-full max-w-[12rem] md:max-w-[15rem]" />

        <div className="hidden min-w-0 flex-col items-start md:flex">
          <p className="mun-marketing-origin-location-label">{locationLabel}</p>
          <p className="mun-marketing-origin-location-copy mt-2 max-w-[12rem] text-sm leading-relaxed text-brand-muted">
            {tooltip}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="group absolute left-[58%] top-[34%] z-10 -translate-x-1/2 -translate-y-full focus:outline-none md:left-[42%]"
        aria-label={tooltip}
      >
        <span
          className="pointer-events-none absolute left-1/2 top-full mt-2 w-max max-w-[14rem] -translate-x-1/2 rounded-xl border border-[var(--hairline)] bg-[color-mix(in_srgb,var(--material-thick)_94%,transparent)] px-3 py-2 text-left text-xs font-medium leading-snug text-brand-navy opacity-0 shadow-[var(--marketing-float-shadow)] backdrop-blur-md transition-opacity duration-[var(--dur-base)] group-hover:opacity-100 group-focus-visible:opacity-100 sm:max-w-[16rem] sm:text-sm md:hidden"
          role="tooltip"
        >
          {tooltip}
        </span>
        <span className="relative flex flex-col items-center">
          <span
            aria-hidden
            className="absolute -bottom-1 h-8 w-8 rounded-full bg-[#FF5A5F]/35 blur-md transition-transform duration-[var(--dur-base)] group-hover:scale-110"
          />
          <MapPin
            aria-hidden
            className="relative h-9 w-9 drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-transform duration-[var(--dur-base)] group-hover:scale-110"
            fill="#FF5A5F"
            stroke="#FFFFFF"
            strokeWidth={1.75}
          />
        </span>
      </button>

      <p className="mun-marketing-origin-location-mobile absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-center md:hidden">
        {locationLabel}
      </p>
    </div>
  );
}
