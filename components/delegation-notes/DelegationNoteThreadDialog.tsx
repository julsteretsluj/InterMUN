"use client";

import { useEffect, useState } from "react";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { detectInappropriateTerms } from "@/lib/note-moderation";
import { renameDelegationNoteThreadAction } from "@/app/actions/delegationNoteThreads";
import {
  canNameThread,
  threadListTitle,
  type DelegationNoteThreadGroup,
} from "@/lib/delegation-note-threads";
import type { NoteTopic } from "@/lib/delegation-notes-bundle";
import {
  DelegationNoteModerationToolbar,
  type ModerationNoteState,
} from "@/components/delegation-notes/DelegationNoteModerationToolbar";

type NoteSender =
  | { kind: "allocation"; allocationId: string; country: string }
  | { kind: "profile"; profileId: string; name: string };

type NoteRecipient =
  | { kind: "allocation"; allocationId: string; country: string }
  | { kind: "chair"; profileId: string; name: string }
  | { kind: "chair_all" };

export type ThreadDialogNote = {
  id: string;
  thread_id: string | null;
  reply_to_note_id: string | null;
  topic: NoteTopic;
  content: string;
  concern_flag: boolean;
  created_at: string;
  sender: NoteSender;
  recipients: NoteRecipient[];
};

type Props = {
  group: DelegationNoteThreadGroup<ThreadDialogNote>;
  topicLabel: (topic: NoteTopic) => string;
  formatRecipientSummary: (recipients: NoteRecipient[]) => string;
  canReply: boolean;
  sending: boolean;
  onClose: () => void;
  onReply: (replyToNoteId: string, content: string) => Promise<void>;
  onThreadRenamed: (threadId: string, displayName: string) => void;
  moderation?: {
    rootNote: ModerationNoteState & {
      forwarded_to_smt: boolean;
      forwarded_to_advisor_profile_id: string | null;
      starred_by_me: boolean;
    };
    isChairLike: boolean;
    isStaffLike: boolean;
    advisor: { advisorProfileId: string; forwardLabel: string } | null;
    onStar: (noteId: string, starred: boolean) => void;
    onForwardSmt: (noteId: string) => void;
    onForwardAdvisor: (noteId: string, advisorProfileId: string) => void;
    onReport: (noteId: string) => void;
    labels: {
      toolbarLabel: string;
      star: string;
      starred: string;
      forwardToSmt: string;
      forwarded: string;
      forwardedToAdvisor: string;
      report: string;
    };
  };
  labels: {
    close: string;
    reply: string;
    replyPlaceholder: string;
    sendReply: string;
    sending: string;
    readerWarning: string;
    nameChat: string;
    nameChatHint: string;
    nameChatPlaceholder: string;
    saveChatName: string;
    messageCount: string;
    unnamedChat: string;
    errors: { emptyReply: string };
  };
};

export function DelegationNoteThreadDialog({
  group,
  topicLabel,
  formatRecipientSummary,
  canReply,
  sending,
  onClose,
  onReply,
  onThreadRenamed,
  moderation,
  labels,
}: Props) {
  const [replyText, setReplyText] = useState("");
  const [nameText, setNameText] = useState(group.meta?.display_name ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const messageCount = group.meta?.message_count ?? group.messages.length;
  const showNaming = canNameThread(messageCount);
  const title = threadListTitle(group, topicLabel, labels.unnamedChat);

  useEffect(() => {
    setNameText(group.meta?.display_name ?? "");
  }, [group.meta?.display_name]);

  async function saveName() {
    if (!group.meta?.id) return;
    setNameSaving(true);
    setLocalError(null);
    const res = await renameDelegationNoteThreadAction(group.meta.id, nameText);
    setNameSaving(false);
    if (res.error) {
      setLocalError(res.error);
      return;
    }
    onThreadRenamed(group.meta.id, nameText.trim());
  }

  async function submitReply() {
    const trimmed = replyText.trim();
    if (!trimmed) {
      setLocalError(labels.errors.emptyReply);
      return;
    }
    setLocalError(null);
    await onReply(group.latest.id, trimmed);
    setReplyText("");
  }

  return (
    <div
      className="fixed inset-0 z-[86] flex items-center justify-center bg-black/55 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-white/15 bg-brand-paper p-4 md:p-5 shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-brand-navy">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-brand-accent hover:underline"
          >
            {labels.close}
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-muted">
          <span>{labels.messageCount.replace("{count}", String(messageCount))}</span>
          <span>{formatRecipientSummary(group.root.recipients)}</span>
        </div>

        {moderation ? (
          <DelegationNoteModerationToolbar
            note={moderation.rootNote}
            isChairLike={moderation.isChairLike}
            isStaffLike={moderation.isStaffLike}
            advisor={moderation.advisor}
            onStar={moderation.onStar}
            onForwardSmt={moderation.onForwardSmt}
            onForwardAdvisor={moderation.onForwardAdvisor}
            onReport={moderation.onReport}
            labels={moderation.labels}
          />
        ) : null}

        {showNaming && group.meta?.id ? (
          <div className="mb-4 rounded-lg border border-brand-navy/10 bg-brand-paper/60 p-3">
            <p className="text-xs font-medium text-brand-navy">{labels.nameChat}</p>
            <p className="mt-0.5 text-xs text-brand-muted">{labels.nameChatHint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="text"
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
                placeholder={labels.nameChatPlaceholder}
                maxLength={120}
                className="min-w-[12rem] flex-1 rounded-lg border border-brand-navy/15 bg-white/80 px-3 py-2 text-sm text-brand-navy"
              />
              <button
                type="button"
                disabled={nameSaving || !nameText.trim()}
                onClick={() => void saveName()}
                className="mun-btn px-3 py-2 text-xs disabled:opacity-50"
              >
                {nameSaving ? labels.sending : labels.saveChatName}
              </button>
            </div>
          </div>
        ) : null}

        {localError ? (
          <p className="mb-3 text-xs text-red-700 dark:text-red-200">{localError}</p>
        ) : null}

        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {group.messages.map((n) => (
            <div key={n.id} className="mun-card-dense border-white/10 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                <span className="font-medium normal-case text-brand-navy">
                  {n.sender.kind === "allocation" ? (
                    <>
                      {flagEmojiForCountryName(n.sender.country)} {n.sender.country}
                    </>
                  ) : (
                    <>🏳️ {n.sender.name}</>
                  )}
                </span>
                <span>·</span>
                <time dateTime={n.created_at}>
                  {new Date(n.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              {detectInappropriateTerms(n.content).length ? (
                <p className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                  {labels.readerWarning}
                </p>
              ) : null}
              <div className="mt-2 whitespace-pre-wrap break-words text-sm text-brand-navy">
                {n.content}
              </div>
            </div>
          ))}
        </div>

        {canReply ? (
          <div className="mt-4 space-y-2 border-t border-brand-navy/10 pt-4">
            <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted">
              {labels.reply}
            </label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={labels.replyPlaceholder}
              rows={3}
              className="w-full rounded-lg border border-brand-navy/15 bg-white/80 px-3 py-2 text-sm text-brand-navy"
            />
            <button
              type="button"
              disabled={sending || !replyText.trim()}
              onClick={() => void submitReply()}
              className="mun-btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {sending ? labels.sending : labels.sendReply}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
