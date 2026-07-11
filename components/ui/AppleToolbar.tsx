// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { ChevronLeft, CircleX, Mic, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AppleToolbarTopProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  center?: ReactNode;
  variant?: "iphone" | "ipad";
  className?: string;
};

export function AppleToolbarTop({
  title,
  subtitle,
  onBack,
  backLabel = "Back",
  leading,
  trailing,
  center,
  variant = "iphone",
  className,
}: AppleToolbarTopProps) {
  const leadingContent =
    leading ??
    (onBack ? <AppleToolbarBackButton label={backLabel} onClick={onBack} /> : <span className="mun-apple-toolbar-slot" aria-hidden />);

  return (
    <header
      className={cn(
        "mun-apple-toolbar mun-apple-toolbar-top grid",
        variant === "ipad" && "mun-apple-toolbar-top-ipad",
        className
      )}
    >
      <div className="mun-apple-toolbar-leading">{leadingContent}</div>
      <div className="mun-apple-toolbar-center">
        {center ?? (
          <>
            {title ? <div className="mun-apple-toolbar-title">{title}</div> : null}
            {subtitle ? <div className="mun-apple-toolbar-subtitle">{subtitle}</div> : null}
          </>
        )}
      </div>
      <div className="mun-apple-toolbar-trailing">
        {trailing ?? <span className="mun-apple-toolbar-slot" aria-hidden />}
      </div>
    </header>
  );
}

type AppleToolbarBottomProps = {
  leading?: ReactNode;
  center?: ReactNode;
  trailing?: ReactNode;
  floating?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function AppleToolbarBottom({
  leading,
  center,
  trailing,
  floating = false,
  className,
  "aria-label": ariaLabel,
}: AppleToolbarBottomProps) {
  const bar = (
    <footer
      className={cn("mun-apple-toolbar mun-apple-toolbar-bottom grid", className)}
      aria-label={ariaLabel}
    >
      <div className="mun-apple-toolbar-leading">{leading ?? <span className="mun-apple-toolbar-slot" aria-hidden />}</div>
      <div className="mun-apple-toolbar-center">{center ?? null}</div>
      <div className="mun-apple-toolbar-trailing">{trailing ?? <span className="mun-apple-toolbar-slot" aria-hidden />}</div>
    </footer>
  );

  if (!floating) return bar;

  return <div className="mun-apple-toolbar-host mun-apple-toolbar-host-bottom-floating">{bar}</div>;
}

type AppleToolbarBackButtonProps = {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export function AppleToolbarBackButton({
  label = "Back",
  onClick,
  disabled = false,
  className,
}: AppleToolbarBackButtonProps) {
  return (
    <button
      type="button"
      className={cn("mun-apple-toolbar-back", className)}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      <span className="mun-apple-toolbar-back-label">{label}</span>
    </button>
  );
}

type AppleToolbarButtonProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "plain" | "tinted" | "filled";
  icon?: ReactNode;
  className?: string;
};

export function AppleToolbarButton({
  label,
  onClick,
  disabled = false,
  variant = "plain",
  icon,
  className,
}: AppleToolbarButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "mun-apple-toolbar-button",
        variant === "tinted" && "mun-apple-toolbar-button-tinted",
        variant === "filled" && "mun-apple-toolbar-button-filled",
        icon && "mun-apple-toolbar-button-icon-only",
        className
      )}
      aria-label={icon ? label : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {icon ?? label}
    </button>
  );
}

type AppleToolbarSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
  showMic?: boolean;
  micLabel?: string;
  onMicClick?: () => void;
  className?: string;
  "aria-label"?: string;
};

export function AppleToolbarSearch({
  value,
  onChange,
  placeholder = "Search",
  clearLabel = "Clear search",
  showMic = false,
  micLabel = "Dictation",
  onMicClick,
  className,
  "aria-label": ariaLabel,
}: AppleToolbarSearchProps) {
  return (
    <label className={cn("mun-apple-toolbar-search", className)}>
      <Search className="mun-apple-toolbar-search-icon h-4 w-4" strokeWidth={2.25} aria-hidden />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="mun-apple-toolbar-search-input"
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          className="mun-apple-toolbar-search-clear"
          aria-label={clearLabel}
          onClick={() => onChange("")}
        >
          <CircleX className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
      {showMic ? (
        <button
          type="button"
          className="mun-apple-toolbar-search-mic"
          aria-label={micLabel}
          onClick={onMicClick}
        >
          <Mic className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </label>
  );
}
