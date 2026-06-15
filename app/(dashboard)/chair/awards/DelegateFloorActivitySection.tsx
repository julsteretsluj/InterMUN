"use client";

import { useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  EMPTY_DELEGATE_FLOOR_ACTIVITY,
  type DelegateFloorActivity,
} from "@/lib/delegate-floor-activity";
import { translateAgendaTopicLabel } from "@/lib/i18n/committee-topic-labels";
import { formatVoteTypeLabel } from "@/lib/i18n/vote-type-label";

type SessionPointCode =
  | "poi"
  | "poc"
  | "parliamentary_inquiry"
  | "order"
  | "personal_privilege"
  | "right_of_reply"
  | "fact_check";

type Props = {
  activity?: DelegateFloorActivity;
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DelegateFloorActivitySection({ activity }: Props) {
  const t = useTranslations("chairAwardsFloorActivity");
  const tSession = useTranslations("sessionControlClient");
  const tVoting = useTranslations("voting");
  const tTopics = useTranslations("agendaTopics");
  const locale = useLocale();

  const data = activity ?? EMPTY_DELEGATE_FLOOR_ACTIVITY;

  const sessionPointLabel = useCallback(
    (code: string) => {
      const map: Record<SessionPointCode, string> = {
        poi: tSession("pointOfInformation"),
        poc: tSession("pointOfClarification"),
        order: tSession("pointOfOrder"),
        parliamentary_inquiry: tSession("parliamentaryInquiry"),
        personal_privilege: tSession("personalPrivilege"),
        right_of_reply: tSession("rightOfReply"),
        fact_check: tSession("factCheck"),
      };
      return map[code as SessionPointCode] ?? code.replace(/_/g, " ");
    },
    [tSession]
  );

  const motionTitle = useCallback(
    (title: string | null, procedureCode: string | null) => {
      if (title?.trim()) {
        return translateAgendaTopicLabel(tTopics, title, locale);
      }
      if (procedureCode?.trim()) {
        return procedureCode.replace(/_/g, " ");
      }
      return t("untitledMotion");
    },
    [locale, t, tTopics]
  );

  const resolutionRoleLabel = useMemo(
    () => ({
      main: t("resolutionRoles.main"),
      co: t("resolutionRoles.co"),
      signatory: t("resolutionRoles.signatory"),
    }),
    [t]
  );

  return (
    <section className="rounded-xl border border-brand-navy/10 bg-logo-cyan/8 p-3 md:p-4 space-y-4">
      <div>
        <h4 className="font-display text-sm font-semibold text-brand-navy dark:text-zinc-100">
          {t("title")}
        </h4>
        <p className="mt-0.5 text-[11px] text-brand-muted leading-relaxed">{t("description")}</p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">
            {t("motionsTitle")}
          </p>
          {data.motions.length === 0 ? (
            <p className="mt-1.5 text-xs text-brand-muted">{t("noMotions")}</p>
          ) : (
            <ul className="mt-1.5 space-y-2">
              {data.motions.map((motion) => (
                <li
                  key={motion.id}
                  className="rounded-lg border border-brand-navy/8 bg-brand-paper/70 px-3 py-2 text-xs"
                >
                  <p className="font-medium text-brand-navy">
                    {motionTitle(motion.title, motion.procedureCode)}
                  </p>
                  <p className="mt-0.5 text-brand-muted">
                    {formatVoteTypeLabel(tVoting, motion.voteType)}
                    {motion.procedureCode ? ` · ${motion.procedureCode.replace(/_/g, " ")}` : ""}
                  </p>
                  {motion.description?.trim() ? (
                    <p className="mt-1 text-brand-muted">{motion.description.trim()}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-brand-muted">{formatTimestamp(motion.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">
            {t("pointsTitle")}
          </p>
          {data.points.length === 0 ? (
            <p className="mt-1.5 text-xs text-brand-muted">{t("noPoints")}</p>
          ) : (
            <ul className="mt-1.5 space-y-2">
              {data.points.map((point) => (
                <li
                  key={point.id}
                  className="rounded-lg border border-brand-navy/8 bg-brand-paper/70 px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        point.kind === "session"
                          ? "rounded-full bg-brand-accent/15 px-2 py-0.5 text-[10px] font-medium text-brand-navy"
                          : "rounded-full bg-logo-cyan/20 px-2 py-0.5 text-[10px] font-medium text-brand-navy"
                      }
                    >
                      {point.kind === "session"
                        ? t("pointKinds.session")
                        : t("pointKinds.delegate")}
                    </span>
                    <span className="font-medium text-brand-navy">
                      {point.kind === "session"
                        ? sessionPointLabel(point.label)
                        : t("chairLoggedPoint")}
                    </span>
                    {point.status ? (
                      <span className="text-[10px] text-brand-muted capitalize">{point.status}</span>
                    ) : null}
                  </div>
                  {point.detail?.trim() ? (
                    <p className="mt-1 text-brand-muted whitespace-pre-wrap break-words">
                      {point.detail.trim()}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-brand-muted">{formatTimestamp(point.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">
            {t("resolutionsTitle")}
          </p>
          {data.resolutions.length === 0 ? (
            <p className="mt-1.5 text-xs text-brand-muted">{t("noResolutions")}</p>
          ) : (
            <ul className="mt-1.5 space-y-2">
              {data.resolutions.map((resolution) => (
                <li
                  key={`${resolution.id}-${resolution.role}`}
                  className="rounded-lg border border-brand-navy/8 bg-brand-paper/70 px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-accent/15 px-2 py-0.5 text-[10px] font-medium text-brand-navy">
                      {resolutionRoleLabel[resolution.role]}
                    </span>
                    {resolution.url ? (
                      <a
                        href={resolution.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-accent hover:underline break-all"
                      >
                        {t("resolutionLink")}
                      </a>
                    ) : (
                      <span className="text-brand-muted">{t("resolutionNoLink")}</span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-brand-muted">
                    {formatTimestamp(resolution.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
