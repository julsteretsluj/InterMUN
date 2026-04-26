"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type TabOption = {
  id: string;
  label: string;
};

const segmentTrackClasses =
  "inline-flex w-full max-w-full flex-wrap gap-0.5 rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)] p-0.5";

function tabButtonClasses(active: boolean) {
  return cn(
    "rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-sm transition-apple",
    active
      ? "bg-[var(--material-thick)] font-semibold text-brand-navy shadow-sm"
      : "font-medium text-brand-muted"
  );
}

export function useQueryTabState(tabKey: string, options: TabOption[], fallbackId?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultId = fallbackId ?? options[0]?.id ?? "";
  const rawCurrent = searchParams.get(tabKey);
  const isValid = options.some((opt) => opt.id === rawCurrent);
  const activeTab = isValid ? (rawCurrent as string) : defaultId;

  function setActiveTab(nextId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextId === defaultId) {
      params.delete(tabKey);
    } else {
      params.set(tabKey, nextId);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return { activeTab, setActiveTab };
}

export function LocalTabs({
  options,
  defaultTab,
  ariaLabel,
  className,
  renderPanel,
}: {
  options: TabOption[];
  defaultTab?: string;
  ariaLabel: string;
  className?: string;
  renderPanel: (activeTab: string) => React.ReactNode;
}) {
  const initialTab = useMemo(() => {
    const first = options[0]?.id ?? "";
    if (defaultTab && options.some((o) => o.id === defaultTab)) return defaultTab;
    return first;
  }, [defaultTab, options]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const activeBtnId = `tab-${ariaLabel.replace(/\s+/g, "-").toLowerCase()}-${activeTab}`;

  return (
    <div className={cn("space-y-4", className)}>
      <div className={segmentTrackClasses} role="tablist" aria-label={ariaLabel}>
        {options.map((opt) => (
          <button
            key={opt.id}
            id={`tab-${ariaLabel.replace(/\s+/g, "-").toLowerCase()}-${opt.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === opt.id}
            className={cn("min-w-0 flex-1 sm:flex-initial", tabButtonClasses(activeTab === opt.id))}
            onClick={() => setActiveTab(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-labelledby={activeBtnId}>
        {renderPanel(activeTab)}
      </div>
    </div>
  );
}

export function QueryTabs({
  options,
  tabKey,
  fallbackId,
  ariaLabel,
  className,
  renderPanel,
}: {
  options: TabOption[];
  tabKey: string;
  fallbackId?: string;
  ariaLabel: string;
  className?: string;
  renderPanel: (activeTab: string) => React.ReactNode;
}) {
  const { activeTab, setActiveTab } = useQueryTabState(tabKey, options, fallbackId);
  const activeBtnId = `tab-${ariaLabel.replace(/\s+/g, "-").toLowerCase()}-${activeTab}`;

  return (
    <div className={cn("space-y-4", className)}>
      <div className={segmentTrackClasses} role="tablist" aria-label={ariaLabel}>
        {options.map((opt) => (
          <button
            key={opt.id}
            id={`tab-${ariaLabel.replace(/\s+/g, "-").toLowerCase()}-${opt.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === opt.id}
            className={cn("min-w-0 flex-1 sm:flex-initial", tabButtonClasses(activeTab === opt.id))}
            onClick={() => setActiveTab(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-labelledby={activeBtnId}>
        {renderPanel(activeTab)}
      </div>
    </div>
  );
}
