// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Image from "next/image";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Globe with a Thailand pin — hover/focus reveals origin tooltip. */
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

      <div className="relative flex h-full w-full items-center justify-center px-6 py-8 md:px-10">
        <div className="relative w-full max-w-[15rem] md:max-w-[18rem]">
          <Image
            src="/globe.svg"
            alt=""
            width={288}
            height={288}
            aria-hidden
            className="mx-auto h-auto w-full opacity-[0.28] contrast-125"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_62%_48%,color-mix(in_srgb,var(--gold)_18%,transparent),transparent_52%)]"
            aria-hidden
          />
        </div>
      </div>

      <button
        type="button"
        className="group absolute left-[62%] top-[48%] z-10 -translate-x-1/2 -translate-y-full focus:outline-none"
        aria-label={tooltip}
      >
        <span
          className="pointer-events-none absolute left-1/2 top-full mt-2 w-max max-w-[14rem] -translate-x-1/2 rounded-xl border border-[var(--hairline)] bg-[color-mix(in_srgb,var(--material-thick)_94%,transparent)] px-3 py-2 text-left text-xs font-medium leading-snug text-brand-navy opacity-0 shadow-[var(--marketing-float-shadow)] backdrop-blur-md transition-opacity duration-[var(--dur-base)] group-hover:opacity-100 group-focus-visible:opacity-100 sm:max-w-[16rem] sm:text-sm"
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
