// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccessibilitySelector } from "@/components/AccessibilitySelector";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeSelector } from "@/components/ThemeSelector";
import { AppleProductPage } from "@/components/ui/AppleProductPage";
import { AppleSidebar, AppleSidebarRow, AppleSidebarSection } from "@/components/ui/AppleSidebar";
import { AppleWindowWithSidebar } from "@/components/ui/AppleWindow";

type AdminNavItem = {
  href: string;
  label: string;
  priority: number;
};

type AdminAppChromeProps = {
  appName: string;
  navItems: AdminNavItem[];
  activeEventName?: string | null;
  activeEventCode?: string | null;
  children: React.ReactNode;
};

export function AdminAppChrome({
  appName,
  navItems,
  activeEventName,
  activeEventCode,
  children,
}: AdminAppChromeProps) {
  const pathname = usePathname();

  function isSelected(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <AppleProductPage width="wide" className="min-h-screen bg-[var(--dashboard-cream)] py-8 md:py-12">
      <AppleWindowWithSidebar
        title="Admin"
        subtitle={activeEventName ?? appName}
        className="bg-[var(--dashboard-card)]"
        sidebarClassName="hidden flex-col bg-[color:color-mix(in_srgb,var(--dashboard-cream)_64%,white)] md:flex"
        trailing={
          <div className="flex items-center gap-1">
            <Link href="/" className="mun-apple-btn mun-apple-btn-plain-blue mun-apple-btn-compact !px-2">
              Back to home
            </Link>
            <AccessibilitySelector />
            <ThemeSelector />
            <SignOutButton className="mun-apple-btn mun-apple-btn-plain-blue mun-apple-btn-compact !px-2" />
          </div>
        }
        sidebar={
          <AppleSidebar className="h-full min-h-0 w-full" aria-label="Admin navigation">
            <AppleSidebarSection heading="Admin" detail={String(navItems.length)}>
              {navItems.map((item) => (
                <AppleSidebarRow
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  detail={String(item.priority)}
                  selected={isSelected(item.href)}
                />
              ))}
            </AppleSidebarSection>
            {activeEventName ? (
              <div className="px-3 py-3">
                <p className="mun-apple-text mun-apple-text-caption-1 mun-vibrancy-secondary">
                  Active event: <span className="mun-vibrancy-primary">{activeEventName}</span>
                  {activeEventCode ? (
                    <>
                      {" "}
                      · <span className="font-mono">{activeEventCode}</span>
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}
            <div className="px-3 pb-3">
              <p className="mun-apple-text mun-apple-text-caption-2 mun-vibrancy-tertiary">
                First admin account is assigned in the database. Never share the service role key.
              </p>
            </div>
          </AppleSidebar>
        }
      >
        <div className="mun-apple-page-body space-y-4 bg-[var(--dashboard-card)] p-4 md:p-6">{children}</div>
      </AppleWindowWithSidebar>
    </AppleProductPage>
  );
}
