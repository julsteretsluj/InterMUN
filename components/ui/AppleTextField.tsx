// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { CircleX } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AppleTextFieldGroupProps = {
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function AppleTextFieldGroup({ header, footer, className, children }: AppleTextFieldGroupProps) {
  return (
    <section className={cn("mun-apple-text-field-section", className)}>
      {header ? <div className="mun-apple-text-field-section-header">{header}</div> : null}
      <div className="mun-apple-text-field-group">{children}</div>
      {footer ? <div className="mun-apple-text-field-section-footer">{footer}</div> : null}
    </section>
  );
}

type AppleTextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  clearLabel?: string;
  showClearButton?: boolean;
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
  id?: string;
  disabled?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
};

export function AppleTextField({
  value,
  onChange,
  placeholder,
  label,
  type = "text",
  clearLabel = "Clear text",
  showClearButton = true,
  className,
  inputClassName,
  autoComplete,
  id,
  disabled = false,
  inputMode,
}: AppleTextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [focused, setFocused] = useState(false);
  const showClear = showClearButton && focused && value.length > 0 && !disabled;

  return (
    <div
      className={cn(
        "mun-apple-text-field-row",
        focused && "is-focused",
        disabled && "is-disabled",
        className
      )}
    >
      <input
        id={inputId}
        type={type}
        value={value}
        disabled={disabled}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className={cn("mun-apple-text-field-input", inputClassName)}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {showClear ? (
        <button
          type="button"
          className="mun-apple-text-field-clear"
          aria-label={clearLabel}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange("")}
        >
          <CircleX className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

type AppleTextAreaFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
  clearLabel?: string;
  showClearButton?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  disabled?: boolean;
};

export function AppleTextAreaField({
  value,
  onChange,
  placeholder,
  label,
  rows = 4,
  clearLabel = "Clear text",
  showClearButton = true,
  className,
  inputClassName,
  id,
  disabled = false,
}: AppleTextAreaFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [focused, setFocused] = useState(false);
  const showClear = showClearButton && focused && value.length > 0 && !disabled;

  return (
    <div
      className={cn(
        "mun-apple-text-field-row mun-apple-text-field-row-multiline",
        focused && "is-focused",
        disabled && "is-disabled",
        className
      )}
    >
      <textarea
        id={inputId}
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className={cn("mun-apple-text-field-input mun-apple-text-field-textarea", inputClassName)}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {showClear ? (
        <button
          type="button"
          className="mun-apple-text-field-clear mun-apple-text-field-clear-multiline"
          aria-label={clearLabel}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange("")}
        >
          <CircleX className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
