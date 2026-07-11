// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AppleSliderVariant = "standard" | "glass" | "compact";

type AppleSliderProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  variant?: AppleSliderVariant;
  showTicks?: boolean;
  tickCount?: number;
  hideFill?: boolean;
  minIcon?: ReactNode;
  maxIcon?: ReactNode;
  label?: ReactNode;
  valueLabel?: ReactNode;
  className?: string;
  trackClassName?: string;
  trackStyle?: CSSProperties;
  "aria-label"?: string;
  id?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function AppleSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  variant = "standard",
  showTicks = false,
  tickCount = 5,
  hideFill = false,
  minIcon,
  maxIcon,
  label,
  valueLabel,
  className,
  trackClassName,
  trackStyle,
  "aria-label": ariaLabel,
  id,
}: AppleSliderProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const safeValue = clamp(value, min, max);
  const percent = max === min ? 0 : ((safeValue - min) / (max - min)) * 100;
  const customTrack = Boolean(trackStyle?.background || trackStyle?.backgroundImage);

  return (
    <div className={cn("mun-apple-slider", className)}>
      {label ? (
        <div className="mun-apple-slider-header">
          <label htmlFor={inputId} className="mun-apple-slider-label">
            {label}
          </label>
          {valueLabel ? <span className="mun-apple-slider-value">{valueLabel}</span> : null}
        </div>
      ) : null}
      <div className="mun-apple-slider-row">
        {minIcon ? <span className="mun-apple-slider-icon mun-apple-slider-icon-min">{minIcon}</span> : null}
        <div
          className={cn("mun-apple-slider-track", trackClassName)}
          style={
            {
              ...trackStyle,
              "--slider-progress": `${percent}%`,
            } as CSSProperties
          }
        >
          {!hideFill && !customTrack ? (
            <>
              <span className="mun-apple-slider-rail" aria-hidden />
              <span className="mun-apple-slider-fill" aria-hidden />
            </>
          ) : null}
          {showTicks ? (
            <span className="mun-apple-slider-ticks" aria-hidden style={{ "--slider-tick-count": tickCount } as CSSProperties} />
          ) : null}
          <input
            id={inputId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={safeValue}
            aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
            onChange={(event) => onChange(Number(event.target.value))}
            className={cn("mun-apple-slider-input", `mun-apple-slider-input-${variant}`)}
          />
        </div>
        {maxIcon ? <span className="mun-apple-slider-icon mun-apple-slider-icon-max">{maxIcon}</span> : null}
      </div>
    </div>
  );
}
