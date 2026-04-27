"use client";

import type { ReactNode } from "react";
import { FilePlus2 } from "lucide-react";
import { openNewGoogleDocument } from "@/lib/google-docs-create";
import { useTranslations } from "next-intl";

type Props = {
  className?: string;
  children?: ReactNode;
};

/**
 * Opens doc.new in a new tab so the user can create a Google Doc, then paste its URL into the form.
 */
export function OpenNewGoogleDocButton({
  className = "mun-btn inline-flex items-center gap-1.5",
  children,
}: Props) {
  const t = useTranslations("googleDocs");
  return (
    <button
      type="button"
      title={t("openNewDocHelp")}
      onClick={() => openNewGoogleDocument()}
      className={className}
    >
      <FilePlus2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      {children ?? t("newGoogleDoc")}
    </button>
  );
}
