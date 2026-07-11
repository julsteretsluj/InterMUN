// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type AppleTabBarItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
};

type AppleTabBarAction = {
  label: string;
  onClick: () => void;
  icon: ReactNode;
};

type AppleTabBarProps = {
  items: AppleTabBarItem[];
  value: string;
  onValueChange: (id: string) => void;
  variant?: "iphone" | "ipad";
  floating?: boolean;
  leadingAction?: AppleTabBarAction;
  trailingAction?: AppleTabBarAction;
  className?: string;
  "aria-label"?: string;
};

export function AppleTabBar({
  items,
  value,
  onValueChange,
  variant = "iphone",
  floating = false,
  leadingAction,
  trailingAction,
  className,
  "aria-label": ariaLabel,
}: AppleTabBarProps) {
  if (items.length < 2) return null;

  const bar = (
    <nav
      className={cn(
        "mun-apple-tab-bar",
        variant === "iphone" ? "mun-apple-tab-bar-iphone" : "mun-apple-tab-bar-ipad",
        className
      )}
      aria-label={ariaLabel}
    >
      {leadingAction ? (
        <AppleTabBarAccessory
          label={leadingAction.label}
          onClick={leadingAction.onClick}
          className="mun-apple-tab-bar-accessory-leading"
        >
          {leadingAction.icon}
        </AppleTabBarAccessory>
      ) : null}
      <div
        className={cn("mun-apple-tab-bar-pill", variant === "ipad" && "mun-apple-tab-bar-pill-ipad")}
        role="tablist"
      >
        {items.map((item) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={item.disabled}
              onClick={() => onValueChange(item.id)}
              className={cn(
                "mun-apple-tab-bar-item",
                selected && "is-selected",
                item.disabled && "is-disabled"
              )}
            >
              {item.icon ? <span className="mun-apple-tab-bar-item-icon">{item.icon}</span> : null}
              <span className="mun-apple-tab-bar-item-label">{item.label}</span>
            </button>
          );
        })}
      </div>
      {trailingAction ? (
        <AppleTabBarAccessory
          label={trailingAction.label}
          onClick={trailingAction.onClick}
          className="mun-apple-tab-bar-accessory-trailing"
        >
          {trailingAction.icon}
        </AppleTabBarAccessory>
      ) : null}
    </nav>
  );

  if (!floating) return bar;

  return <div className="mun-apple-tab-bar-host mun-apple-tab-bar-host-floating">{bar}</div>;
}

type AppleTabBarAccessoryProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
};

export function AppleTabBarAccessory({ label, onClick, children, className }: AppleTabBarAccessoryProps) {
  return (
    <button
      type="button"
      className={cn("mun-apple-tab-bar-accessory", className)}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
