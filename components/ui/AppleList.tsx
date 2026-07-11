// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppleToggle, type AppleToggleVariant } from "@/components/ui/AppleToggle";

type AppleListProps = {
  inset?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function AppleList({ inset = true, className, children }: AppleListProps) {
  return (
    <div className={cn("mun-apple-list", inset && "mun-apple-list-inset", className)} role="list">
      {children}
    </div>
  );
}

type AppleListSectionProps = {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function AppleListSection({ header, footer, className, children }: AppleListSectionProps) {
  return (
    <section className={cn("mun-apple-list-section", className)}>
      {header ? <div className="mun-apple-list-section-header">{header}</div> : null}
      <AppleList>{children}</AppleList>
      {footer ? <div className="mun-apple-list-section-footer">{footer}</div> : null}
    </section>
  );
}

type AppleListRowProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  detail?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  selected?: boolean;
  destructive?: boolean;
  className?: string;
  onClick?: () => void;
  as?: "button" | "div";
};

export function AppleListRow({
  title,
  subtitle,
  detail,
  leading,
  trailing,
  chevron = false,
  selected = false,
  destructive = false,
  className,
  onClick,
  as,
}: AppleListRowProps) {
  const Component = as ?? (onClick ? "button" : "div");
  const isInteractive = Component === "button" || Boolean(onClick);

  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      role="listitem"
      onClick={onClick}
      className={cn(
        "mun-apple-list-row",
        isInteractive && "mun-apple-list-row-interactive",
        selected && "is-selected",
        destructive && "is-destructive",
        className
      )}
    >
      {leading ? <div className="mun-apple-list-row-leading">{leading}</div> : null}
      {selected && !leading ? (
        <div className="mun-apple-list-row-leading" aria-hidden>
          <span className="mun-apple-list-row-check">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        </div>
      ) : null}
      <div className="mun-apple-list-row-content">
        <div className="mun-apple-list-row-title">{title}</div>
        {subtitle ? <div className="mun-apple-list-row-subtitle">{subtitle}</div> : null}
      </div>
      {detail ? <div className="mun-apple-list-row-detail">{detail}</div> : null}
      {trailing ? <div className="mun-apple-list-row-trailing">{trailing}</div> : null}
      {chevron ? (
        <ChevronRight className="mun-apple-list-row-chevron h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
      ) : null}
    </Component>
  );
}

type AppleListSwitchRowProps = {
  label: React.ReactNode;
  subtitle?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  variant?: AppleToggleVariant;
  disabled?: boolean;
};

export function AppleListSwitchRow({
  label,
  subtitle,
  checked,
  onChange,
  className,
  variant = "glass",
  disabled = false,
}: AppleListSwitchRowProps) {
  return (
    <div className={cn("mun-apple-list-row mun-apple-list-row-switch", className)} role="listitem">
      <div className="mun-apple-list-row-content">
        <div className="mun-apple-list-row-title">{label}</div>
        {subtitle ? <div className="mun-apple-list-row-subtitle">{subtitle}</div> : null}
      </div>
      <AppleToggle
        checked={checked}
        onCheckedChange={onChange}
        variant={variant}
        disabled={disabled}
        aria-label={typeof label === "string" ? label : undefined}
      />
    </div>
  );
}
