// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { Minus, Plus } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type AppleStepperProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  decreaseLabel?: string;
  increaseLabel?: string;
  className?: string;
  size?: "regular" | "compact";
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

export function AppleStepper({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  decreaseLabel = "Decrease",
  increaseLabel = "Increase",
  className,
  size = "regular",
  disabled = false,
  id,
  "aria-label": ariaLabel,
}: AppleStepperProps) {
  const generatedId = useId();
  const stepperId = id ?? generatedId;
  const safeValue = clamp(value, min, max);
  const atMin = safeValue <= min;
  const atMax = safeValue >= max;

  function adjust(delta: number) {
    if (disabled) return;
    const next = clamp(safeValue + delta, min, max);
    if (next !== safeValue) onChange(next);
  }

  return (
    <div
      id={stepperId}
      className={cn(
        "mun-apple-stepper",
        size === "compact" && "mun-apple-stepper-compact",
        disabled && "is-disabled",
        className
      )}
      role="group"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
    >
      <button
        type="button"
        className="mun-apple-stepper-segment mun-apple-stepper-decrease"
        disabled={disabled || atMin}
        aria-label={decreaseLabel}
        onClick={() => adjust(-step)}
      >
        <Minus className="mun-apple-stepper-icon" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        className="mun-apple-stepper-segment mun-apple-stepper-increase"
        disabled={disabled || atMax}
        aria-label={increaseLabel}
        onClick={() => adjust(step)}
      >
        <Plus className="mun-apple-stepper-icon" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}

type AppleStepperFieldProps = AppleStepperProps & {
  label: ReactNode;
  valueLabel?: ReactNode;
  description?: ReactNode;
  layout?: "inline" | "stacked";
  fieldClassName?: string;
};

export function AppleStepperField({
  label,
  valueLabel,
  description,
  layout = "inline",
  fieldClassName,
  id,
  ...stepperProps
}: AppleStepperFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div
      className={cn(
        "mun-apple-stepper-field",
        layout === "stacked" && "mun-apple-stepper-field-stacked",
        fieldClassName
      )}
    >
      <div className="mun-apple-stepper-field-copy">
        <label htmlFor={fieldId} className="mun-apple-stepper-field-label">
          {label}
        </label>
        {description ? <p className="mun-apple-stepper-field-description">{description}</p> : null}
      </div>
      <div className="mun-apple-stepper-field-control">
        {valueLabel ? <span className="mun-apple-stepper-field-value">{valueLabel}</span> : null}
        <AppleStepper id={fieldId} {...stepperProps} />
      </div>
    </div>
  );
}
