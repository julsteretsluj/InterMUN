// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppleNotificationAction = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  destructive?: boolean;
  onSelect?: () => void;
};

export type AppleNotificationItem = {
  id: string;
  title: ReactNode;
  message?: ReactNode;
  time?: Date;
  icon?: ReactNode;
  variant?: "default" | "success" | "error";
  content?: ReactNode;
  actions?: AppleNotificationAction[];
  group?: string;
  durationMs?: number | null;
  onDismiss?: () => void;
};

type PushNotificationInput = Omit<AppleNotificationItem, "id" | "time"> & { id?: string; time?: Date };

type AppleNotificationContextValue = {
  notifications: AppleNotificationItem[];
  push: (item: PushNotificationInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  expand: (id: string) => void;
  collapse: (id: string) => void;
  expandedIds: Set<string>;
};

const AppleNotificationContext = createContext<AppleNotificationContextValue | null>(null);

export function useAppleNotifications() {
  const context = useContext(AppleNotificationContext);
  if (!context) {
    throw new Error("useAppleNotifications must be used within AppleNotificationProvider");
  }
  return context;
}

function formatNotificationTime(time: Date) {
  return time.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function defaultIcon(variant: AppleNotificationItem["variant"]) {
  if (variant === "success") {
    return <CheckCircle2 className="h-5 w-5" strokeWidth={2} aria-hidden />;
  }
  if (variant === "error") {
    return <AlertCircle className="h-5 w-5" strokeWidth={2} aria-hidden />;
  }
  return <Info className="h-5 w-5" strokeWidth={2} aria-hidden />;
}

type AppleNotificationProps = {
  item: AppleNotificationItem;
  expanded?: boolean;
  stacked?: boolean;
  stackDepth?: number;
  onDismiss?: () => void;
  onToggleExpand?: () => void;
  className?: string;
};

export function AppleNotification({
  item,
  expanded = false,
  stacked = false,
  stackDepth = 0,
  onDismiss,
  onToggleExpand,
  className,
}: AppleNotificationProps) {
  const time = item.time ?? new Date();
  const icon = item.icon ?? defaultIcon(item.variant);
  const expandable = Boolean(item.content || (item.actions && item.actions.length > 0));

  if (expanded) {
    return (
      <article
        className={cn("mun-apple-notification mun-apple-notification-expanded", className)}
        role="status"
        aria-live="polite"
      >
        <header className="mun-apple-notification-expanded-header">
          <div className="mun-apple-notification-icon">{icon}</div>
          <div className="mun-apple-notification-copy">
            <h3 className="mun-apple-notification-title">{item.title}</h3>
            {item.message ? <p className="mun-apple-notification-message">{item.message}</p> : null}
          </div>
          <time className="mun-apple-notification-time" dateTime={time.toISOString()}>
            {formatNotificationTime(time)}
          </time>
          {onDismiss ? (
            <button type="button" className="mun-apple-notification-dismiss" aria-label="Dismiss" onClick={onDismiss}>
              <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </header>
        {item.content ? <div className="mun-apple-notification-content">{item.content}</div> : null}
        {item.actions && item.actions.length > 0 ? (
          <div className="mun-apple-notification-actions" role="menu">
            {item.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                className={cn("mun-apple-notification-action", action.destructive && "is-destructive")}
                onClick={() => {
                  action.onSelect?.();
                  onDismiss?.();
                }}
              >
                {action.icon ? <span className="mun-apple-notification-action-icon">{action.icon}</span> : (
                  <span className="mun-apple-notification-action-icon mun-apple-notification-action-icon-placeholder" aria-hidden />
                )}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "mun-apple-notification mun-apple-notification-collapsed",
        stacked && "is-stacked",
        item.variant === "error" && "is-error",
        item.variant === "success" && "is-success",
        expandable && "is-expandable",
        className
      )}
      style={stacked ? { zIndex: 10 - stackDepth, transform: `translateY(${stackDepth * 4}px) scale(${1 - stackDepth * 0.03})` } : undefined}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="mun-apple-notification-collapsed-body"
        disabled={!expandable}
        onClick={expandable ? onToggleExpand : undefined}
      >
        <div className="mun-apple-notification-icon">{icon}</div>
        <div className="mun-apple-notification-copy">
          <h3 className="mun-apple-notification-title">{item.title}</h3>
          {item.message ? <p className="mun-apple-notification-message">{item.message}</p> : null}
        </div>
        <time className="mun-apple-notification-time" dateTime={time.toISOString()}>
          {formatNotificationTime(time)}
        </time>
      </button>
      {onDismiss ? (
        <button type="button" className="mun-apple-notification-dismiss" aria-label="Dismiss" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </article>
  );
}

type AppleNotificationStackProps = {
  items: AppleNotificationItem[];
  expandedId?: string | null;
  onDismiss?: (id: string) => void;
  onToggleExpand?: (id: string) => void;
  className?: string;
};

export function AppleNotificationStack({
  items,
  expandedId,
  onDismiss,
  onToggleExpand,
  className,
}: AppleNotificationStackProps) {
  const top = items[0];
  if (!top) return null;

  if (expandedId === top.id) {
    return (
      <AppleNotification
        item={top}
        expanded
        onDismiss={onDismiss ? () => onDismiss(top.id) : undefined}
        className={className}
      />
    );
  }

  return (
    <div className={cn("mun-apple-notification-stack", className)}>
      {items.slice(0, 3).map((item, index) => (
        <AppleNotification
          key={item.id}
          item={item}
          stacked={index > 0}
          stackDepth={index}
          onDismiss={index === 0 && onDismiss ? () => onDismiss(item.id) : undefined}
          onToggleExpand={index === 0 && onToggleExpand ? () => onToggleExpand(item.id) : undefined}
        />
      ))}
      {items.length > 1 ? (
        <span className="mun-apple-notification-stack-badge" aria-hidden>
          {items.length}
        </span>
      ) : null}
    </div>
  );
}

type AppleNotificationListProps = {
  items: AppleNotificationItem[];
  expandedIds?: Set<string>;
  onDismiss?: (id: string) => void;
  onToggleExpand?: (id: string) => void;
  className?: string;
};

export function AppleNotificationList({
  items,
  expandedIds,
  onDismiss,
  onToggleExpand,
  className,
}: AppleNotificationListProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("mun-apple-notification-list", className)} role="list">
      {items.map((item) => (
        <div key={item.id} role="listitem">
          <AppleNotification
            item={item}
            expanded={expandedIds?.has(item.id)}
            onDismiss={onDismiss ? () => onDismiss(item.id) : undefined}
            onToggleExpand={onToggleExpand ? () => onToggleExpand(item.id) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

type AppleNotificationHostProps = {
  className?: string;
  stackGroups?: boolean;
};

export function AppleNotificationHost({ className, stackGroups = true }: AppleNotificationHostProps) {
  const { notifications, dismiss, expandedIds, expand, collapse } = useAppleNotifications();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const grouped = useMemo(() => {
    if (!stackGroups) {
      return notifications.map((item) => ({ type: "single" as const, items: [item] }));
    }

    const groups = new Map<string, AppleNotificationItem[]>();
    const singles: AppleNotificationItem[] = [];

    for (const item of notifications) {
      if (item.group) {
        const list = groups.get(item.group) ?? [];
        list.push(item);
        groups.set(item.group, list);
      } else {
        singles.push(item);
      }
    }

    const result: Array<{ type: "stack" | "single"; items: AppleNotificationItem[] }> = [];
    for (const items of groups.values()) {
      result.push({ type: items.length > 1 ? "stack" : "single", items });
    }
    for (const item of singles) {
      result.push({ type: "single", items: [item] });
    }
    return result;
  }, [notifications, stackGroups]);

  if (!mounted || notifications.length === 0 || typeof document === "undefined") return null;

  function toggleExpand(id: string) {
    if (expandedIds.has(id)) collapse(id);
    else expand(id);
  }

  return createPortal(
    <div className={cn("mun-apple-notification-host", className)} aria-live="polite" aria-relevant="additions">
      {grouped.map((group) =>
        group.type === "stack" && group.items.length > 1 ? (
          <AppleNotificationStack
            key={group.items[0]!.id}
            items={group.items}
            expandedId={[...expandedIds].find((id) => group.items.some((item) => item.id === id)) ?? null}
            onDismiss={dismiss}
            onToggleExpand={toggleExpand}
          />
        ) : (
          <AppleNotificationList
            key={group.items[0]!.id}
            items={group.items}
            expandedIds={expandedIds}
            onDismiss={dismiss}
            onToggleExpand={toggleExpand}
          />
        )
      )}
    </div>,
    document.body
  );
}

type AppleNotificationProviderProps = {
  children: ReactNode;
  maxItems?: number;
};

export function AppleNotificationProvider({ children, maxItems = 6 }: AppleNotificationProviderProps) {
  const baseId = useId();
  const [notifications, setNotifications] = useState<AppleNotificationItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [counter, setCounter] = useState(0);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => {
      const item = prev.find((entry) => entry.id === id);
      item?.onDismiss?.();
      return prev.filter((entry) => entry.id !== id);
    });
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
    setExpandedIds(new Set());
  }, []);

  const expand = useCallback((id: string) => {
    setExpandedIds((prev) => new Set(prev).add(id));
  }, []);

  const collapse = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const push = useCallback(
    (item: PushNotificationInput) => {
      const id = item.id ?? `${baseId}-${counter}`;
      setCounter((value) => value + 1);
      const next: AppleNotificationItem = {
        ...item,
        id,
        time: item.time ?? new Date(),
        variant: item.variant ?? "default",
      };

      setNotifications((prev) => {
        const withoutDuplicate = item.id ? prev.filter((entry) => entry.id !== item.id) : prev;
        return [next, ...withoutDuplicate].slice(0, maxItems);
      });

      const duration = item.durationMs ?? (item.variant === "error" ? null : 6000);
      if (duration !== null && duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [baseId, counter, dismiss, maxItems]
  );

  const value = useMemo(
    () => ({
      notifications,
      push,
      dismiss,
      clear,
      expand,
      collapse,
      expandedIds,
    }),
    [notifications, push, dismiss, clear, expand, collapse, expandedIds]
  );

  return (
    <AppleNotificationContext.Provider value={value}>
      {children}
      <AppleNotificationHost />
    </AppleNotificationContext.Provider>
  );
}
