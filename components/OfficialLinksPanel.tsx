"use client";

import { useTranslations } from "next-intl";
import { OFFICIAL_UN_LINK_GROUPS_DEF } from "@/lib/official-un-links";

export function OfficialLinksPanel() {
  const t = useTranslations("officialLinks");

  return (
    <>
      <p className="mb-6 text-sm text-slate-600 dark:text-zinc-400">{t("intro")}</p>
      <div className="space-y-8">
        {OFFICIAL_UN_LINK_GROUPS_DEF.map((group) => (
          <section key={group.groupKey}>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-zinc-50">
              {t(`groups.${group.groupKey}`)}
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-diplomatic underline decoration-brand-diplomatic/35 underline-offset-2 hover:decoration-brand-diplomatic dark:text-brand-accent-bright dark:decoration-brand-accent-bright/45"
                  >
                    {t(`links.${link.linkKey}`)} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
