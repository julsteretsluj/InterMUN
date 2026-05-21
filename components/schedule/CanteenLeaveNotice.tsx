"use client";

import { useTranslations } from "next-intl";

export function CanteenLeaveNotice({ className = "" }: { className?: string }) {
  const t = useTranslations("smtConferenceSettings.schedule");
  return (
    <p
      className={[
        "rounded-lg border border-amber-400/35 bg-amber-50/80 px-3 py-2.5 text-sm font-medium text-amber-950",
        "dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="note"
    >
      {t("canteenLeaveNotice")}
    </p>
  );
}
