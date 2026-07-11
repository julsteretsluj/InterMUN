// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useId, useRef, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

type AppleFileFieldProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  label?: string;
  help?: string;
  chooseLabel?: string;
  emptyLabel?: string;
  clearLabel?: string;
  required?: boolean;
  disabled?: boolean;
  grouped?: boolean;
  className?: string;
  error?: string | null;
};

function AppleFileFieldControls({
  inputId,
  inputRef,
  accept,
  required,
  disabled,
  label,
  chooseLabel,
  emptyLabel,
  clearLabel,
  value,
  error,
  onChange,
  onOpenPicker,
  onClear,
  className,
  inline = false,
}: {
  inputId: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  chooseLabel: string;
  emptyLabel: string;
  clearLabel: string;
  value: File | null;
  error?: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenPicker: () => void;
  onClear: () => void;
  className?: string;
  inline?: boolean;
}) {
  return (
    <div className={cn("mun-apple-file-field", inline && "mun-apple-file-field-inline", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        className="mun-apple-file-input-native"
        aria-label={label}
        onChange={onChange}
      />
      <button
        type="button"
        className="mun-apple-btn mun-apple-btn-tinted-gray mun-apple-btn-compact shrink-0"
        onClick={onOpenPicker}
        disabled={disabled}
        aria-controls={inputId}
      >
        {chooseLabel}
      </button>
      <div className="mun-apple-file-field-meta min-w-0">
        <p
          className={cn(
            "mun-apple-file-field-name mun-apple-text mun-apple-text-subheadline truncate",
            value ? "mun-vibrancy-primary" : "mun-vibrancy-tertiary"
          )}
        >
          {value?.name ?? emptyLabel}
        </p>
        {error ? (
          <p className="mun-apple-text mun-apple-text-caption-1 text-[var(--system-red)]">{error}</p>
        ) : null}
      </div>
      {value && !disabled ? (
        <button
          type="button"
          className="mun-apple-btn mun-apple-btn-plain-blue mun-apple-btn-compact shrink-0 !px-0"
          onClick={onClear}
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}

export function AppleFileField({
  value,
  onChange,
  accept,
  label,
  help,
  chooseLabel = "Choose File",
  emptyLabel = "No file chosen",
  clearLabel = "Clear",
  required = false,
  disabled = false,
  grouped = true,
  className,
  error,
}: AppleFileFieldProps) {
  const generatedId = useId();
  const inputId = `${generatedId}-file`;
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
  }

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function clearFile() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (!grouped && (label || help)) {
    return (
      <div className={cn("mun-apple-text-field-row mun-apple-text-field-row-multiline", className)}>
        <div className="mun-apple-file-field-stack">
          {label ? <p className="mun-apple-file-field-label">{label}</p> : null}
          {help ? <p className="mun-apple-file-field-help">{help}</p> : null}
          <AppleFileFieldControls
            inputId={inputId}
            inputRef={inputRef}
            accept={accept}
            required={required}
            disabled={disabled}
            label={label}
            chooseLabel={chooseLabel}
            emptyLabel={emptyLabel}
            clearLabel={clearLabel}
            value={value}
            error={error}
            onChange={handleChange}
            onOpenPicker={openPicker}
            onClear={clearFile}
            inline
          />
        </div>
      </div>
    );
  }

  if (grouped) {
    return (
      <div className={cn("mun-apple-text-field-row", className)}>
        <AppleFileFieldControls
          inputId={inputId}
          inputRef={inputRef}
          accept={accept}
          required={required}
          disabled={disabled}
          label={label}
          chooseLabel={chooseLabel}
          emptyLabel={emptyLabel}
          clearLabel={clearLabel}
          value={value}
          error={error}
          onChange={handleChange}
          onOpenPicker={openPicker}
          onClear={clearFile}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <AppleFileFieldControls
      inputId={inputId}
      inputRef={inputRef}
      accept={accept}
      required={required}
      disabled={disabled}
      label={label}
      chooseLabel={chooseLabel}
      emptyLabel={emptyLabel}
      clearLabel={clearLabel}
      value={value}
      error={error}
      onChange={handleChange}
      onOpenPicker={openPicker}
      onClear={clearFile}
      className={className}
    />
  );
}
