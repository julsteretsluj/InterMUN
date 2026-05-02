"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { exportDelegateMaterialsAction } from "@/app/actions/exportMaterials";

export type ExportMaterialsRange = "today" | "all";

type ExportMaterialsActionState = { error?: string; success?: string };

export function DelegateMaterialsExportCard() {
  const t = useTranslations("materialsExportCard");
  const tExport = useTranslations("serverActions.exportMaterials");
  const [state, formAction, pending] = useActionState<
    ExportMaterialsActionState | null,
    FormData
  >(
    exportDelegateMaterialsAction,
    null
  );

  return (
    <div className="mb-6 rounded-2xl border border-brand-navy/10 bg-black/25 shadow-sm overflow-hidden">
      <div className="p-5 md:p-6">
        <h3 className="font-display text-xl font-semibold text-brand-navy">
          {t("title")}
        </h3>
        <p className="mt-2 text-sm text-brand-muted">{t("description")}</p>

        <form action={formAction} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="range"
              className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5"
            >
              {t("whatToInclude")}
            </label>
            <select
              id="range"
              name="range"
              defaultValue="today"
              className="w-full px-3 py-2 rounded-lg border border-brand-navy/15 bg-black/25 text-brand-navy font-medium"
            >
              <option value="today">{tExport("rangeTodayUtc")}</option>
              <option value="all">{tExport("rangeAllTime")}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft transition-colors disabled:opacity-50"
          >
            {pending ? t("preparing") : t("submit")}
          </button>

          {state?.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="text-sm text-brand-diplomatic bg-brand-accent/10 border border-brand-accent/22 rounded-lg px-3 py-2">
              {state.success}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

