// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { NavPriorityBadge } from "@/components/NavPriorityBadge";
import { cn } from "@/lib/utils";

type PriorityTabLinkProps = {
  href: string;
  label: string;
  priority: number;
  active: boolean;
  activeClassName: string;
  inactiveClassName: string;
};

export function PriorityTabLink({
  href,
  label,
  priority,
  active,
  activeClassName,
  inactiveClassName,
}: PriorityTabLinkProps) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      aria-label={`${priority}. ${label}`}
      className={cn(
        "nav-priority-tab relative rounded-t-xl py-2.5 pl-8 pr-4 text-sm font-medium transition-colors border-b-2 -mb-px",
        active ? activeClassName : inactiveClassName
      )}
    >
      <NavPriorityBadge priority={priority} className="left-1.5 top-1/2 -translate-y-1/2" />
      {label}
    </Link>
  );
}
