// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AppleMenu,
  AppleMenuContent,
  AppleMenuItem,
  AppleMenuTrigger,
} from "@/components/ui/AppleMenu";

export function MarketingFeaturesMenu() {
  const t = useTranslations("marketing");
  const router = useRouter();

  return (
    <AppleMenu>
      <AppleMenuTrigger
        aria-label={t("nav.features")}
        className="marketing-nav-link rounded-full px-2 py-1 text-sm font-medium"
      >
        {t("nav.features")}
      </AppleMenuTrigger>
      <AppleMenuContent align="end" className="min-w-[11rem]">
        <AppleMenuItem label={t("nav.chairs")} onSelect={() => router.push("/features/chairs")} />
        <AppleMenuItem label={t("nav.delegates")} onSelect={() => router.push("/features/delegates")} />
        <AppleMenuItem
          label={t("nav.secretariat")}
          onSelect={() => router.push("/features/secretariat")}
        />
      </AppleMenuContent>
    </AppleMenu>
  );
}

export function MarketingPrimaryNav() {
  const t = useTranslations("marketing");
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/about", label: "about" },
    { href: "/#how-it-works", label: t("nav.howItWorks") },
    { href: "/#contact", label: t("nav.contact") },
  ] as const;

  return (
    <>
      <nav className="marketing-nav hidden items-center justify-self-center gap-0.5 md:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <MarketingFeaturesMenu />
      </nav>

      <div className="relative justify-self-end md:hidden">
        <button
          type="button"
          className="rounded-full border border-[var(--clicky-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--clicky-ink)]"
          aria-expanded={open}
          aria-controls="marketing-mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "close" : "menu"}
        </button>
        {open ? (
          <div
            id="marketing-mobile-nav"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 rounded-[var(--clicky-radius)] border border-[var(--clicky-line)] bg-white p-2 shadow-[var(--clicky-shadow)]"
          >
            <nav className="flex flex-col gap-0.5 text-sm">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-[var(--clicky-ink)] hover:bg-[var(--clicky-paper)]"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/features/chairs"
                className="rounded-lg px-3 py-2 text-[var(--clicky-ink)] hover:bg-[var(--clicky-paper)]"
                onClick={() => setOpen(false)}
              >
                chairs
              </Link>
              <Link
                href="/features/delegates"
                className="rounded-lg px-3 py-2 text-[var(--clicky-ink)] hover:bg-[var(--clicky-paper)]"
                onClick={() => setOpen(false)}
              >
                delegates
              </Link>
              <Link
                href="/features/secretariat"
                className="rounded-lg px-3 py-2 text-[var(--clicky-ink)] hover:bg-[var(--clicky-paper)]"
                onClick={() => setOpen(false)}
              >
                secretariat
              </Link>
              <Link
                href="/signup"
                className="mt-1 rounded-full bg-[var(--clicky-blue)] px-3 py-2 text-center font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                join your conference
              </Link>
            </nav>
          </div>
        ) : null}
      </div>
    </>
  );
}
