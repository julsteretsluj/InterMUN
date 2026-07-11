// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type AppleMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuId: string;
};

const AppleMenuContext = createContext<AppleMenuContextValue | null>(null);

function useAppleMenu() {
  const context = useContext(AppleMenuContext);
  if (!context) throw new Error("AppleMenu components must be used within AppleMenu");
  return context;
}

type AppleMenuProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export function AppleMenu({ open: openProp, onOpenChange, children }: AppleMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <AppleMenuContext.Provider value={{ open, setOpen, triggerRef, menuId }}>
      <div className="mun-apple-menu-root">{children}</div>
    </AppleMenuContext.Provider>
  );
}

type AppleMenuTriggerProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function AppleMenuTrigger({ children, className, "aria-label": ariaLabel }: AppleMenuTriggerProps) {
  const { open, setOpen, triggerRef, menuId } = useAppleMenu();

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      aria-label={ariaLabel}
      onClick={() => setOpen(!open)}
      className={cn("mun-apple-menu-trigger", className)}
    >
      {children}
    </button>
  );
}

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

type AppleMenuContentProps = {
  children: ReactNode;
  align?: "start" | "end";
  side?: "top" | "bottom";
  className?: string;
};

export function AppleMenuContent({
  children,
  align = "start",
  side = "bottom",
  className,
}: AppleMenuContentProps) {
  const { open, setOpen, triggerRef, menuId } = useAppleMenu();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    function syncPosition() {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportMargin = 12;
      const gap = 6;
      const minWidth = Math.max(rect.width, 220);
      const panelWidth = panel?.offsetWidth ?? minWidth;
      const panelHeight = panel?.offsetHeight ?? 0;

      let left =
        align === "end" ? rect.right - panelWidth : rect.left;
      left = Math.min(
        Math.max(viewportMargin, left),
        window.innerWidth - panelWidth - viewportMargin
      );

      let top = side === "bottom" ? rect.bottom + gap : rect.top - gap - panelHeight;
      if (top + panelHeight > window.innerHeight - viewportMargin) {
        top = Math.max(viewportMargin, rect.top - gap - panelHeight);
      }
      if (top < viewportMargin && side === "bottom") {
        top = rect.bottom + gap;
      }

      setPosition({ top, left, minWidth });
    }

    syncPosition();
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [align, open, side, triggerRef]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen, triggerRef]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      id={menuId}
      role="menu"
      style={
        position
          ? {
              top: position.top,
              left: position.left,
              minWidth: position.minWidth,
            }
          : { visibility: "hidden" }
      }
      className={cn("mun-apple-menu-panel", className)}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

type AppleMenuSectionProps = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AppleMenuSection({ title, children, className }: AppleMenuSectionProps) {
  return (
    <div className={cn("mun-apple-menu-section", className)} role="group" aria-label={typeof title === "string" ? title : undefined}>
      {title ? <div className="mun-apple-menu-section-title">{title}</div> : null}
      <div className="mun-apple-menu-section-items">{children}</div>
    </div>
  );
}

export function AppleMenuSeparator() {
  return <div className="mun-apple-menu-separator" role="separator" />;
}

type AppleMenuItemProps = {
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: ReactNode;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  submenu?: boolean;
  className?: string;
  onSelect?: () => void;
};

export function AppleMenuItem({
  label,
  icon,
  shortcut,
  selected = false,
  destructive = false,
  disabled = false,
  submenu = false,
  className,
  onSelect,
}: AppleMenuItemProps) {
  const { setOpen } = useAppleMenu();

  function handleClick() {
    if (disabled) return;
    onSelect?.();
    if (!submenu) setOpen(false);
  }

  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "mun-apple-menu-item",
        selected && "is-selected",
        destructive && "is-destructive",
        disabled && "is-disabled",
        submenu && "has-submenu",
        className
      )}
    >
      <span className="mun-apple-menu-item-leading">
        {selected ? (
          <span className="mun-apple-menu-item-check" aria-hidden>
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : icon ? (
          <span className="mun-apple-menu-item-icon">{icon}</span>
        ) : (
          <span className="mun-apple-menu-item-icon mun-apple-menu-item-icon-placeholder" aria-hidden />
        )}
      </span>
      <span className="mun-apple-menu-item-label">{label}</span>
      {shortcut ? <span className="mun-apple-menu-item-shortcut">{shortcut}</span> : null}
      {submenu ? (
        <ChevronRight className="mun-apple-menu-item-submenu h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      ) : null}
    </button>
  );
}

type AppleEditMenuItem = {
  id: string;
  label: ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
};

type AppleEditMenuProps = {
  items: AppleEditMenuItem[];
  className?: string;
  "aria-label"?: string;
};

export function AppleEditMenu({ items, className, "aria-label": ariaLabel }: AppleEditMenuProps) {
  return (
    <div className={cn("mun-apple-edit-menu", className)} role="toolbar" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <div key={item.id} className="mun-apple-edit-menu-item-wrap">
          {index > 0 ? <span className="mun-apple-edit-menu-divider" aria-hidden /> : null}
          <button
            type="button"
            disabled={item.disabled}
            onClick={item.onSelect}
            className={cn("mun-apple-edit-menu-item", item.disabled && "is-disabled")}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}

type AppleMenuSubmenuProps = {
  label: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AppleMenuSubmenu({ label, icon, children, className }: AppleMenuSubmenuProps) {
  const [open, setOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    function syncPosition() {
      const item = itemRef.current;
      const panel = panelRef.current;
      if (!item) return;

      const rect = item.getBoundingClientRect();
      const viewportMargin = 12;
      const gap = 4;
      const panelWidth = panel?.offsetWidth ?? 200;
      const panelHeight = panel?.offsetHeight ?? 0;

      let left = rect.right + gap;
      if (left + panelWidth > window.innerWidth - viewportMargin) {
        left = rect.left - gap - panelWidth;
      }

      let top = rect.top - 6;
      if (top + panelHeight > window.innerHeight - viewportMargin) {
        top = Math.max(viewportMargin, window.innerHeight - viewportMargin - panelHeight);
      }

      setPosition({ top, left });
    }

    syncPosition();
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [open]);

  return (
    <div
      ref={itemRef}
      className={cn("mun-apple-menu-submenu", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <AppleMenuItem label={label} icon={icon} submenu />
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={position ? { top: position.top, left: position.left } : { visibility: "hidden" }}
              className="mun-apple-menu-panel mun-apple-menu-submenu-panel"
              onMouseDown={(event) => event.stopPropagation()}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <div className="mun-apple-menu-section-items">{children}</div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

type AppleMenuSubmenuItemProps = {
  label: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

export function AppleMenuSubmenuItem({
  label,
  destructive = false,
  disabled = false,
  onSelect,
}: AppleMenuSubmenuItemProps) {
  const { setOpen } = useAppleMenu();

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        setOpen(false);
      }}
      className={cn(
        "mun-apple-menu-item",
        destructive && "is-destructive",
        disabled && "is-disabled"
      )}
    >
      <span className="mun-apple-menu-item-leading">
        <span className="mun-apple-menu-item-icon mun-apple-menu-item-icon-placeholder" aria-hidden />
      </span>
      <span className="mun-apple-menu-item-label">{label}</span>
    </button>
  );
}
