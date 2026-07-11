// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AppleToggleVariant = "standard" | "glass";

type AppleToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant?: AppleToggleVariant;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
};

export function AppleToggle({
  checked,
  onCheckedChange,
  variant = "standard",
  disabled = false,
  id,
  name,
  className,
  "aria-label": ariaLabel,
}: AppleToggleProps) {
  return (
    <span
      className={cn(
        "mun-apple-toggle",
        variant === "glass" && "mun-apple-toggle-glass",
        disabled && "is-disabled",
        className
      )}
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        role="switch"
        className="mun-apple-toggle-input"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <span className="mun-apple-toggle-track" aria-hidden>
        <span className="mun-apple-toggle-thumb" aria-hidden />
      </span>
    </span>
  );
}

type AppleToggleFieldProps = AppleToggleProps & {
  label: ReactNode;
  description?: ReactNode;
  layout?: "inline" | "stacked";
  fieldClassName?: string;
};

export function AppleToggleField({
  label,
  description,
  layout = "inline",
  fieldClassName,
  id,
  "aria-label": ariaLabel,
  ...toggleProps
}: AppleToggleFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div
      className={cn(
        "mun-apple-toggle-field",
        layout === "stacked" && "mun-apple-toggle-field-stacked",
        fieldClassName
      )}
    >
      <div className="mun-apple-toggle-field-copy">
        <label htmlFor={fieldId} className="mun-apple-toggle-field-label">
          {label}
        </label>
        {description ? <p className="mun-apple-toggle-field-description">{description}</p> : null}
      </div>
      <AppleToggle id={fieldId} aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)} {...toggleProps} />
    </div>
  );
}
