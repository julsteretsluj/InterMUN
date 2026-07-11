// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { Copy, FileText, Hash, Mail, MoreHorizontal, Share2 } from "lucide-react";
import {
  archiveSecretariatIntakeAction,
  markSecretariatIntakeCompleteAction,
  markSecretariatIntakeCompleteFormAction,
  type SecretariatRegistrationAdminState,
} from "@/app/actions/secretariatRegistrationAdmin";
import {
  buildSecretariatIntakeAdminShareText,
  copyTextToClipboard,
  openMailto,
  shareTextNative,
} from "@/lib/secretariat-registration-share";
import { AppleConfirmSheet } from "@/components/ui/AppleSheet";
import { AppleActivityView } from "@/components/ui/AppleActivityView";
import { AppleListRow, AppleListSection } from "@/components/ui/AppleList";
import {
  AppleMenu,
  AppleMenuContent,
  AppleMenuItem,
  AppleMenuSeparator,
  AppleMenuSubmenu,
  AppleMenuSubmenuItem,
  AppleMenuTrigger,
} from "@/components/ui/AppleMenu";
import {
  useAppleNotifications,
} from "@/components/ui/AppleNotification";

type Row = {
  id: string;
  contact_name: string;
  contact_email: string;
  conference_name: string;
  committee_count: number;
  delegate_count: number | null;
  chair_count: number | null;
  conference_logo_status: string;
  rop_status: string;
  schedule_status: string;
  award_criteria_status: string;
  matrix_deferred: boolean;
  submitted_at: string;
  selected_features: string[];
};

function MarkCompleteButton({ requestId, field }: { requestId: string; field: "rop" | "schedule" | "award_criteria" | "conference_logo" }) {
  const t = useTranslations("secretariatRegistration.admin");
  const { push: pushNotification } = useAppleNotifications();
  const [state, action, pending] = useActionState(
    markSecretariatIntakeCompleteAction,
    null as SecretariatRegistrationAdminState | null
  );

  useEffect(() => {
    if (!state?.success && !state?.error) return;
    pushNotification({
      id: `mark-complete-${requestId}-${field}`,
      group: "admin-intake",
      variant: state.success ? "success" : "error",
      title: state.success ? t("notificationCompleteTitle") : t("notificationErrorTitle"),
      message: state.success ? t("notificationCompleteMessage") : state.error,
      durationMs: state.success ? 5000 : null,
    });
  }, [field, pushNotification, requestId, state, t]);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="field" value={field} />
      <button
        type="submit"
        disabled={pending}
        className="mun-apple-btn mun-apple-btn-plain-blue mun-apple-btn-compact !px-0 disabled:opacity-50"
      >
        {pending ? "…" : t("markComplete")}
      </button>
    </form>
  );
}

function MarkCompleteForm({
  requestId,
  field,
  formRef,
}: {
  requestId: string;
  field: "rop" | "schedule" | "award_criteria" | "conference_logo";
  formRef: RefObject<HTMLFormElement | null>;
}) {
  return (
    <form ref={formRef} action={markSecretariatIntakeCompleteFormAction} className="hidden">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="field" value={field} />
    </form>
  );
}

function IntakeActionsMenu({
  row,
  onShare,
  onArchive,
}: {
  row: Row;
  onShare: () => void;
  onArchive: () => void;
}) {
  const t = useTranslations("secretariatRegistration.admin");
  const ropFormRef = useRef<HTMLFormElement>(null);
  const scheduleFormRef = useRef<HTMLFormElement>(null);
  const awardFormRef = useRef<HTMLFormElement>(null);
  const logoFormRef = useRef<HTMLFormElement>(null);

  const pendingFields = [
    row.conference_logo_status === "pending_review" ? ("conference_logo" as const) : null,
    row.rop_status === "pending_review" ? ("rop" as const) : null,
    row.schedule_status === "pending_review" ? ("schedule" as const) : null,
    row.award_criteria_status === "pending_review" ? ("award_criteria" as const) : null,
  ].filter(Boolean);

  return (
    <>
      <MarkCompleteForm requestId={row.id} field="rop" formRef={ropFormRef} />
      <MarkCompleteForm requestId={row.id} field="schedule" formRef={scheduleFormRef} />
      <MarkCompleteForm requestId={row.id} field="award_criteria" formRef={awardFormRef} />
      <MarkCompleteForm requestId={row.id} field="conference_logo" formRef={logoFormRef} />
      <AppleMenu>
        <AppleMenuTrigger
          aria-label={t("menuActions")}
          className="mun-apple-btn mun-apple-btn-tinted-gray mun-apple-btn-compact px-2.5"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
        </AppleMenuTrigger>
        <AppleMenuContent align="end">
          <AppleMenuItem
            icon={<Share2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
            label={t("share")}
            onSelect={onShare}
          />
          {pendingFields.length > 0 ? (
            <AppleMenuSubmenu label={t("menuMarkComplete")}>
              {row.conference_logo_status === "pending_review" ? (
                <AppleMenuSubmenuItem
                  label={t("itemConferenceLogo")}
                  onSelect={() => logoFormRef.current?.requestSubmit()}
                />
              ) : null}
              {row.rop_status === "pending_review" ? (
                <AppleMenuSubmenuItem
                  label={t("itemRop")}
                  onSelect={() => ropFormRef.current?.requestSubmit()}
                />
              ) : null}
              {row.schedule_status === "pending_review" ? (
                <AppleMenuSubmenuItem
                  label={t("itemSchedule")}
                  onSelect={() => scheduleFormRef.current?.requestSubmit()}
                />
              ) : null}
              {row.award_criteria_status === "pending_review" ? (
                <AppleMenuSubmenuItem
                  label={t("itemAwardCriteria")}
                  onSelect={() => awardFormRef.current?.requestSubmit()}
                />
              ) : null}
            </AppleMenuSubmenu>
          ) : null}
          <AppleMenuSeparator />
          <AppleMenuItem
            icon={<Hash className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
            label={t("menuCopyRequestId")}
            onSelect={() => void copyTextToClipboard(row.id)}
          />
          <AppleMenuItem label={t("archive")} destructive onSelect={onArchive} />
        </AppleMenuContent>
      </AppleMenu>
    </>
  );
}

function statusDetail(status: string) {
  return status.replace(/_/g, " ");
}

export function SecretariatRegistrationBoard({ rows }: { rows: Row[] }) {
  return <SecretariatRegistrationBoardInner rows={rows} />;
}

function SecretariatRegistrationBoardInner({ rows }: { rows: Row[] }) {
  const t = useTranslations("secretariatRegistration.admin");
  const tFields = useTranslations("secretariatRegistration");
  const tCommon = useTranslations("common");
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<Row | null>(null);
  const archiveFormRef = useRef<HTMLFormElement>(null);

  const shareText = useMemo(() => {
    if (!shareTarget) return "";
    return buildSecretariatIntakeAdminShareText(shareTarget, {
      heading: t("activityShareHeading"),
      conference: tFields("fieldConference"),
      contact: tFields("fieldContactName"),
      email: tFields("fieldContactEmail"),
      submitted: t("submitted"),
      committees: tFields("fieldCommitteeCount"),
      delegates: tFields("fieldDelegateCount"),
      chairs: tFields("fieldChairCount"),
      rop: t("itemRop"),
      schedule: t("itemSchedule"),
      awardCriteria: t("itemAwardCriteria"),
      conferenceLogo: t("itemConferenceLogo"),
      matrix: tFields("fieldMatrix"),
      matrixDeferred: tFields("statusDeferred"),
      matrixReady: tFields("statusReadyNow"),
      requestId: t("activityShareRequestId"),
    });
  }, [shareTarget, t, tFields]);

  if (rows.length === 0) {
    return <p className="text-sm text-brand-muted">{t("empty")}</p>;
  }

  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <div key={row.id} className="space-y-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <h3 className="mun-apple-text mun-apple-text-headline !mb-0 min-w-0 truncate">{row.conference_name}</h3>
            <IntakeActionsMenu
              row={row}
              onShare={() => setShareTarget(row)}
              onArchive={() => setArchiveTargetId(row.id)}
            />
          </div>
          <AppleListSection footer={`${t("submitted")}: ${new Date(row.submitted_at).toLocaleString()}`}>
          <AppleListRow title={row.contact_name} subtitle={row.contact_email} />
          <AppleListRow
            title={t("summaryCounts", {
              committees: row.committee_count,
              delegates: row.delegate_count ?? "—",
              chairs: row.chair_count ?? "—",
            })}
          />
          <AppleListRow title={t("itemConferenceLogo")} detail={statusDetail(row.conference_logo_status)} trailing={
            row.conference_logo_status === "pending_review" ? (
              <MarkCompleteButton requestId={row.id} field="conference_logo" />
            ) : null
          } />
          <AppleListRow title={t("itemRop")} detail={statusDetail(row.rop_status)} trailing={
            row.rop_status === "pending_review" ? <MarkCompleteButton requestId={row.id} field="rop" /> : null
          } />
          <AppleListRow title={t("itemSchedule")} detail={statusDetail(row.schedule_status)} trailing={
            row.schedule_status === "pending_review" ? (
              <MarkCompleteButton requestId={row.id} field="schedule" />
            ) : null
          } />
          <AppleListRow title={t("itemAwardCriteria")} detail={statusDetail(row.award_criteria_status)} trailing={
            row.award_criteria_status === "pending_review" ? (
              <MarkCompleteButton requestId={row.id} field="award_criteria" />
            ) : null
          } />
          {row.matrix_deferred ? (
            <AppleListRow title={tFields("fieldMatrix")} detail={tFields("statusDeferred")} />
          ) : null}
          </AppleListSection>
        </div>
      ))}

      <form ref={archiveFormRef} action={archiveSecretariatIntakeAction} className="hidden">
        <input type="hidden" name="requestId" value={archiveTargetId ?? ""} />
      </form>

      <AppleConfirmSheet
        open={archiveTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTargetId(null);
        }}
        title={t("archiveConfirmTitle")}
        message={t("archiveConfirmMessage")}
        confirmLabel={t("archiveConfirmAction")}
        cancelLabel={tCommon("cancel")}
        confirmRole="destructive"
        onConfirm={() => {
          archiveFormRef.current?.requestSubmit();
          setArchiveTargetId(null);
        }}
      />

      <AppleActivityView
        open={shareTarget !== null}
        onOpenChange={(open) => {
          if (!open) setShareTarget(null);
        }}
        title={shareTarget?.conference_name ?? t("title")}
        subtitle={shareTarget ? `${shareTarget.contact_name} · ${shareTarget.contact_email}` : undefined}
        metaLabel={t("activityMetaLabel")}
        metaHint={t("activityMetaHint")}
        closeLabel={tCommon("cancel")}
        contacts={
          shareTarget
            ? [
                {
                  id: shareTarget.id,
                  name: shareTarget.contact_name,
                  initials: shareTarget.contact_name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join(""),
                  badge: <Mail className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />,
                  onSelect: () =>
                    openMailto(t("activityShareHeading"), shareText, shareTarget.contact_email),
                },
              ]
            : []
        }
        shortcuts={[
          {
            id: "mail",
            label: t("activityShortcutMail"),
            tint: "var(--system-green)",
            icon: <Mail className="h-7 w-7" strokeWidth={1.75} aria-hidden />,
            onSelect: () => {
              if (!shareTarget) return;
              openMailto(t("activityShareHeading"), shareText, shareTarget.contact_email);
            },
          },
          {
            id: "copy",
            label: t("activityShortcutCopy"),
            tint: "var(--system-gray)",
            icon: <Copy className="h-7 w-7" strokeWidth={1.75} aria-hidden />,
            onSelect: () => void copyTextToClipboard(shareText),
          },
          {
            id: "share",
            label: t("activityShortcutShare"),
            tint: "var(--system-blue)",
            icon: <Share2 className="h-7 w-7" strokeWidth={1.75} aria-hidden />,
            onSelect: () => {
              if (!shareTarget) return;
              void shareTextNative(shareTarget.conference_name, shareText);
            },
          },
        ]}
        quickActions={[
          {
            id: "copy-email",
            label: t("activityQuickCopyLink"),
            icon: <Mail className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
            onSelect: () => {
              if (!shareTarget) return;
              void copyTextToClipboard(shareTarget.contact_email);
            },
          },
          {
            id: "copy-summary",
            label: t("activityQuickCopySummary"),
            icon: <FileText className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
            onSelect: () => void copyTextToClipboard(shareText),
          },
        ]}
        listActions={[
          {
            id: "copy-summary-list",
            label: t("activityListCopySummary"),
            icon: <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
            onSelect: () => void copyTextToClipboard(shareText),
          },
          {
            id: "email-contact",
            label: t("activityListEmailContact"),
            icon: <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
            onSelect: () => {
              if (!shareTarget) return;
              openMailto(t("activityShareHeading"), shareText, shareTarget.contact_email);
            },
          },
          {
            id: "copy-id",
            label: t("activityListCopyId"),
            icon: <Hash className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
            onSelect: () => {
              if (!shareTarget) return;
              void copyTextToClipboard(shareTarget.id);
            },
          },
        ]}
      />
    </div>
  );
}
