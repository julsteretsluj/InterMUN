// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type AppleSidebarProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function AppleSidebar({ children, className, "aria-label": ariaLabel }: AppleSidebarProps) {
  return (
    <aside className={cn("mun-apple-sidebar", className)} aria-label={ariaLabel}>
      {children}
    </aside>
  );
}

type AppleSidebarToolbarProps = {
  children: ReactNode;
  className?: string;
};

export function AppleSidebarToolbar({ children, className }: AppleSidebarToolbarProps) {
  return <div className={cn("mun-apple-sidebar-toolbar", className)}>{children}</div>;
}

type AppleSidebarSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

export function AppleSidebarSearch({
  value,
  onChange,
  placeholder = "Search",
  className,
  "aria-label": ariaLabel,
}: AppleSidebarSearchProps) {
  return (
    <label className={cn("mun-apple-sidebar-search", className)}>
      <Search className="mun-apple-sidebar-search-icon h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mun-apple-sidebar-search-input"
      />
    </label>
  );
}

type AppleSidebarSectionProps = {
  heading: ReactNode;
  detail?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  children: ReactNode;
};

export function AppleSidebarSection({
  heading,
  detail,
  collapsible = false,
  defaultCollapsed = false,
  className,
  children,
}: AppleSidebarSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section className={cn("mun-apple-sidebar-section", className)}>
      {collapsible ? (
        <button
          type="button"
          className="mun-apple-sidebar-section-heading mun-apple-sidebar-section-heading-button"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span className="mun-apple-sidebar-section-heading-label">{heading}</span>
          <span className="mun-apple-sidebar-section-heading-meta">
            {detail ? <span className="mun-apple-sidebar-section-detail">{detail}</span> : null}
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            )}
          </span>
        </button>
      ) : (
        <div className="mun-apple-sidebar-section-heading">
          <span className="mun-apple-sidebar-section-heading-label">{heading}</span>
          {detail ? <span className="mun-apple-sidebar-section-detail">{detail}</span> : null}
        </div>
      )}
      {!collapsed ? <div className="mun-apple-sidebar-section-items">{children}</div> : null}
    </section>
  );
}

type AppleSidebarRowProps = {
  title: ReactNode;
  detail?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  chevron?: boolean;
  indent?: boolean;
  className?: string;
  href?: string;
  onClick?: () => void;
  dataTour?: string;
};

export function AppleSidebarRow({
  title,
  detail,
  leading,
  trailing,
  selected = false,
  disabled = false,
  chevron = false,
  indent = false,
  className,
  href,
  onClick,
  dataTour,
}: AppleSidebarRowProps) {
  const rowClassName = cn(
    "mun-apple-sidebar-row",
    selected && "is-selected",
    disabled && "is-disabled",
    indent && "is-indented",
    (onClick || href) && "is-interactive",
    className
  );

  const content = (
    <>
      {leading ? <span className="mun-apple-sidebar-row-leading">{leading}</span> : null}
      <span className="mun-apple-sidebar-row-title">{title}</span>
      {detail ? <span className="mun-apple-sidebar-row-detail">{detail}</span> : null}
      {trailing ? <span className="mun-apple-sidebar-row-trailing">{trailing}</span> : null}
      {chevron ? (
        <ChevronRight className="mun-apple-sidebar-row-chevron h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      ) : null}
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        role="listitem"
        className={rowClassName}
        aria-current={selected ? "page" : undefined}
        onClick={onClick}
        data-tour={dataTour}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" role="listitem" disabled={disabled} onClick={onClick} className={rowClassName}>
        {content}
      </button>
    );
  }

  return (
    <div role="listitem" className={rowClassName}>
      {content}
    </div>
  );
}
