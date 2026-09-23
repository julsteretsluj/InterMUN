// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { usePathname } from "next/navigation";
import { ChromePreferencesMenu } from "@/components/ChromePreferencesMenu";
import { AppleProductPage } from "@/components/ui/AppleProductPage";
import { AppleSidebar, AppleSidebarRow, AppleSidebarSection } from "@/components/ui/AppleSidebar";
import { AppleWindowWithSidebar } from "@/components/ui/AppleWindow";

type AdminNavItem = {
  href: string;
  label: string;
  priority: number;
  emoji?: string;
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
    <AppleProductPage width="wide" className="mun-clicky-site min-h-screen bg-[var(--clicky-paper)] py-8 md:py-12">
      <AppleWindowWithSidebar
        title="Admin"
        subtitle={activeEventName ?? appName}
        className="dashboard-app-frame bg-[var(--clicky-window)]"
        sidebarClassName="hidden flex-col bg-[color:color-mix(in_srgb,var(--clicky-paper)_82%,var(--clicky-window))] md:flex"
        trailing={
          <ChromePreferencesMenu
            account={{
              userName: "Admin",
              userEmail: "",
              profileHref: "/admin",
              conferenceLine: activeEventName
                ? [activeEventName, activeEventCode].filter(Boolean).join(" · ")
                : null,
            }}
          />
        }
        sidebar={
          <AppleSidebar className="h-full min-h-0 w-full" aria-label="Admin navigation">
            <AppleSidebarSection heading="Admin" detail={String(navItems.length)}>
              {navItems.map((item) => (
                <AppleSidebarRow
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  dataTour={
                    item.href === "/admin"
                      ? "nav-admin-overview"
                      : item.href.startsWith("/conference-setup")
                        ? "nav-admin-conference"
                        : item.href === "/smt"
                          ? "nav-admin-smt"
                          : item.href === "/admin/guides"
                            ? "nav-admin-guides"
                            : undefined
                  }
                  leading={
                    item.emoji ? (
                      <span className="text-base leading-none" aria-hidden>
                        {item.emoji}
                      </span>
                    ) : null
                  }
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
          </AppleSidebar>
        }
      >
        <div className="mun-apple-page-body space-y-4 bg-[var(--clicky-window)] p-4 md:p-6">{children}</div>
      </AppleWindowWithSidebar>
    </AppleProductPage>
  );
}
