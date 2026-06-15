"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import {
  detectInappropriateTerms,
  shouldAutoHoldNote,
  type DelegationNoteHoldReason,
  type DelegationNoteModerationState,
} from "@/lib/note-moderation";
import { moderateDelegationNoteAction } from "@/app/actions/delegationNoteModeration";
import { HelpButton } from "@/components/HelpButton";
import { EmojiQuickInsert } from "@/components/EmojiQuickInsert";
import { useTranslations } from "next-intl";
import { forwardDelegationNoteToAdvisorAction } from "@/app/actions/advisorStaff";
import { dedupeDelegationRecipientRows, uniqueIds } from "@/lib/delegation-notes-options";
import {
  groupNotesByThread,
  threadListTitle,
  type DelegationNoteThreadMeta,
} from "@/lib/delegation-note-threads";
import { DelegationNoteThreadDialog } from "@/components/delegation-notes/DelegationNoteThreadDialog";
import { DelegationNoteModerationToolbar } from "@/components/delegation-notes/DelegationNoteModerationToolbar";
import { avatarToneClass, displayInitials } from "@/lib/ui/avatar-chip";

type NoteTopic =
  | "bloc forming"
  | "speech pois or pocs"
  | "questions"
  | "informal conversations";

const TOPIC_MSG_KEY: Record<
  NoteTopic,
  "blocForming" | "speechPoisOrPocs" | "questions" | "informalConversations"
> = {
  "bloc forming": "blocForming",
  "speech pois or pocs": "speechPoisOrPocs",
  questions: "questions",
  "informal conversations": "informalConversations",
};

type NoteSender =
  | {
      kind: "allocation";
      allocationId: string;
      country: string;
    }
  | {
      kind: "profile";
      profileId: string;
      name: string;
    };

type NoteRecipient =
  | {
      kind: "allocation";
      allocationId: string;
      country: string;
    }
  | {
      kind: "chair";
      profileId: string;
      name: string;
    }
  | {
      kind: "chair_all";
    };

type DelegationNote = {
  id: string;
  conference_id: string;
  thread_id: string | null;
  reply_to_note_id: string | null;
  topic: NoteTopic;
  content: string;
  concern_flag: boolean;
  moderation_state: DelegationNoteModerationState;
  hold_reason: DelegationNoteHoldReason | null;
  moderation_note: string | null;
  created_at: string;
  forwarded_to_smt: boolean;
  forwarded_at: string | null;
  forwarded_to_advisor_profile_id: string | null;
  forwarded_to_advisor_at: string | null;
  sender: NoteSender;
  recipients: NoteRecipient[];
  starred_by_me: boolean;
};

type AllocationOption = { id: string; country: string };
type ChairOption = { id: string; name: string };
type SupabaseErrorLike = { message?: string };

export function DelegationNotesView({
  conferenceId,
  initialNotes,
  myUserId,
  myRole,
  smtVerified,
  myAllocationId,
  myProfileName,
  allocationOptions,
  chairOptions,
  nextPathAfterVerification = "/chats-notes",
  votingProcedureLocked,
  sessionActive = true,
  unmoderatedLocked = false,
  initialSelectedAllocationRecipientIds,
  initialSelectedChairRecipientIds,
  initialAnyChairRecipient,
  advisorByAllocationId = {},
  composeOnly = false,
  smtSecretariatCompose = false,
  composeTitle,
  onNoteCreated,
  initialOpenThreadId = null,
}: {
  conferenceId: string;
  initialNotes: DelegationNote[];
  myUserId: string;
  myRole: string;
  smtVerified: boolean;
  myAllocationId: string | null;
  myProfileName: string;
  allocationOptions: AllocationOption[];
  chairOptions: ChairOption[];
  nextPathAfterVerification?: string;
  votingProcedureLocked?: boolean;
  /** Notes can only be composed during active committee sessions. */
  sessionActive?: boolean;
  /** Notes are disabled during an active unmoderated caucus. */
  unmoderatedLocked?: boolean;
  /** Pre-check recipients (e.g. deep link from a member profile). */
  initialSelectedAllocationRecipientIds?: string[];
  initialSelectedChairRecipientIds?: string[];
  initialAnyChairRecipient?: boolean;
  advisorByAllocationId?: Record<string, { advisorProfileId: string; name: string }>;
  /** Hide the notes list (compose + recipients only). */
  composeOnly?: boolean;
  /** SMT dashboard compose: no committee-gate; may send outside active session. */
  smtSecretariatCompose?: boolean;
  composeTitle?: string;
  onNoteCreated?: (note: DelegationNote) => void;
  /** Open a thread from deep link (/chats-notes?thread=…). */
  initialOpenThreadId?: string | null;
}) {
  const t = useTranslations("delegationNotes");
  const supabase = useMemo(() => createClient(), []);

  const topicLabel = (topicValue: NoteTopic) => t(`topics.${TOPIC_MSG_KEY[topicValue]}`);

  const [notes, setNotes] = useState<DelegationNote[]>(initialNotes);
  const [topic, setTopic] = useState<NoteTopic>("bloc forming");
  const [content, setContent] = useState("");
  const [concernFlag, setConcernFlag] = useState(false);
  const [composeSuccess, setComposeSuccess] = useState<string | null>(null);

  const [selectedAllocationRecipientIdsState, setSelectedAllocationRecipientIdsState] = useState<
    string[]
  >(() => initialSelectedAllocationRecipientIds ?? []);
  const [selectedChairRecipientIdsState, setSelectedChairRecipientIdsState] = useState<string[]>(
    () => initialSelectedChairRecipientIds ?? []
  );
  const [anyChairRecipientState, setAnyChairRecipientState] = useState(
    () => initialAnyChairRecipient ?? false
  );

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<DelegationNote | null>(null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(initialOpenThreadId);
  const [threadMetaById, setThreadMetaById] = useState<Map<string, DelegationNoteThreadMeta>>(
    () => new Map()
  );

  const isChairLike = myRole === "chair" || myRole === "admin";
  const isDelegate = myRole === "delegate";
  const isSmt = myRole === "smt";
  const isStaffLike = isChairLike || isSmt;

  const selectedAllocationRecipientIds = selectedAllocationRecipientIdsState;
  const selectedChairRecipientIds = selectedChairRecipientIdsState;
  const anyChairRecipient = anyChairRecipientState;

  const allocationIdToCountry = useMemo(() => {
    return new Map(allocationOptions.map((a) => [a.id, a.country] as const));
  }, [allocationOptions]);
  const chairIdToName = useMemo(() => {
    return new Map(chairOptions.map((c) => [c.id, c.name] as const));
  }, [chairOptions]);
  const noteModerationById = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const n of notes) m.set(n.id, detectInappropriateTerms(n.content));
    return m;
  }, [notes]);

  const threadGroups = useMemo(
    () => groupNotesByThread(notes, threadMetaById),
    [notes, threadMetaById]
  );

  const openThreadGroup = useMemo(
    () => threadGroups.find((g) => g.threadId === openThreadId) ?? null,
    [threadGroups, openThreadId]
  );

  const moderationLabels = useMemo(
    () => ({
      toolbarLabel: t("moderationToolbarLabel"),
      star: t("star"),
      starred: t("starred"),
      forwardToSmt: t("forwardToSmt"),
      forwarded: t("forwarded"),
      forwardedToAdvisor: t("forwardedToAdvisor"),
      report: t("report"),
      approve: t("moderation.approve"),
      reject: t("moderation.reject"),
      rejectReasonPlaceholder: t("moderation.rejectReasonPlaceholder"),
      pendingReview: t("moderation.pendingBadge"),
      rejected: t("moderation.rejectedBadge"),
      holdReason: t("moderation.holdReason"),
      holdReasons: {
        profanity: t("moderation.holdReasons.profanity"),
        concernFlag: t("moderation.holdReasons.concernFlag"),
        reported: t("moderation.holdReasons.reported"),
        unknown: t("moderation.holdReasons.unknown"),
      },
    }),
    [t]
  );

  const composeWillHold = useMemo(
    () => shouldAutoHoldNote({ content, concernFlag }),
    [content, concernFlag]
  );

  function isNoteSender(note: DelegationNote): boolean {
    if (note.sender.kind === "allocation") {
      return note.sender.allocationId === myAllocationId;
    }
    return note.sender.profileId === myUserId;
  }

  function moderationAdvisorForNote(n: DelegationNote) {
    const adv = advisorForNote(n);
    if (!adv) return null;
    return {
      advisorProfileId: adv.advisorProfileId,
      forwardLabel: t("forwardToAdvisor", { name: adv.name }),
    };
  }

  useEffect(() => {
    if (initialOpenThreadId) setOpenThreadId(initialOpenThreadId);
  }, [initialOpenThreadId]);

  const smtComposeOk = smtSecretariatCompose || smtVerified;
  const sessionOk = sessionActive || smtSecretariatCompose;

  const canCompose =
    (isStaffLike || isDelegate) &&
    (!isSmt || smtComposeOk) &&
    (myAllocationId !== null || isStaffLike) &&
    (allocationOptions.length > 0 || isStaffLike) &&
    sessionOk &&
    !unmoderatedLocked &&
    !votingProcedureLocked;

  function appendEmoji(emoji: string) {
    setContent((prev) => `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${emoji} `);
  }

  const lastRefreshAtRef = useRef<number>(0);

  const refreshNotes = async () => {
    // Simple debounce to avoid cascades when inserts + recipients inserts land.
    const now = Date.now();
    if (now - lastRefreshAtRef.current < 300) return;
    lastRefreshAtRef.current = now;

    try {
      let notesQ = supabase
        .from("delegation_notes")
        .select("*")
        .eq("conference_id", conferenceId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (isSmt && !smtVerified) {
        notesQ = notesQ.eq("forwarded_to_smt", true);
      }

      const { data: notesData, error: notesErr } = await notesQ;
      if (notesErr) return;

      const typedNotes = (notesData ?? []) as Array<{
        id: string;
        conference_id: string;
        thread_id: string | null;
        reply_to_note_id: string | null;
        topic: NoteTopic;
        content: string;
        concern_flag: boolean;
        moderation_state: DelegationNoteModerationState;
        hold_reason: DelegationNoteHoldReason | null;
        moderation_note: string | null;
        created_at: string;
        forwarded_to_smt: boolean;
        forwarded_at: string | null;
        forwarded_to_advisor_profile_id: string | null;
        forwarded_to_advisor_at: string | null;
        sender_allocation_id: string | null;
        sender_profile_id: string | null;
      }>;

      const threadIds = [
        ...new Set(typedNotes.map((n) => n.thread_id).filter((id): id is string => Boolean(id))),
      ];
      if (threadIds.length > 0) {
        const { data: threadRows } = await supabase
          .from("delegation_note_threads")
          .select("id, display_name, message_count, root_note_id")
          .in("id", threadIds);
        const metaMap = new Map<string, DelegationNoteThreadMeta>();
        for (const row of (threadRows ?? []) as DelegationNoteThreadMeta[]) {
          metaMap.set(row.id, row);
        }
        setThreadMetaById(metaMap);
      } else {
        setThreadMetaById(new Map());
      }

      const noteIds = typedNotes.map((n) => n.id);
      if (noteIds.length === 0) {
        setNotes([]);
        return;
      }

      const { data: recipientRows, error: recErr } = await supabase
        .from("delegation_note_recipients")
        .select("*")
        .in("note_id", noteIds);
      if (recErr) return;

      type RecipientRow = {
        note_id: string;
        recipient_kind: "allocation" | "chair" | "chair_all";
        recipient_allocation_id: string | null;
        recipient_profile_id: string | null;
      };

      const recipientsByNoteId = new Map<string, RecipientRow[]>();
      for (const row of (recipientRows ?? []) as RecipientRow[]) {
        const arr = recipientsByNoteId.get(row.note_id) ?? [];
        arr.push(row);
        recipientsByNoteId.set(row.note_id, arr);
      }

      const starredByMe = new Set<string>();
      if (isChairLike) {
        const { data: starRows, error: starErr } = await supabase
          .from("delegation_note_stars")
          .select("note_id")
          .eq("chair_profile_id", myUserId)
          .in("note_id", noteIds);
        if (starErr) return;
        for (const s of (starRows ?? []) as Array<{ note_id: string }>) {
          starredByMe.add(s.note_id);
        }
      }

      const profileNameFallback = myProfileName || t("chairFallback");

      const mapped: DelegationNote[] = typedNotes.map((n) => {
        const senderAllocationId = n.sender_allocation_id;
        const senderProfileId = n.sender_profile_id;

        const sender: NoteSender =
          senderAllocationId && allocationIdToCountry.get(senderAllocationId)
            ? {
                kind: "allocation",
                allocationId: senderAllocationId,
                country: allocationIdToCountry.get(senderAllocationId) ?? t("unknownCountry"),
              }
            : {
                kind: "profile",
                profileId: senderProfileId ?? myUserId,
                name:
                  senderProfileId === myUserId
                    ? profileNameFallback
                    : chairIdToName.get(senderProfileId ?? "") ?? t("chairFallback"),
              };

        const recipientRowsForNote = dedupeDelegationRecipientRows(
          (recipientsByNoteId.get(n.id) ?? []) as Array<{
            note_id: string;
            recipient_kind: "allocation" | "chair" | "chair_all";
            recipient_allocation_id: string | null;
            recipient_profile_id: string | null;
          }>
        );

        const recipients: NoteRecipient[] = recipientRowsForNote.map((r) => {
          if (r.recipient_kind === "allocation") {
            const allocId = r.recipient_allocation_id ?? "";
            return {
              kind: "allocation",
              allocationId: allocId,
              country: allocationIdToCountry.get(allocId) ?? t("unknownCountry"),
            };
          }
          if (r.recipient_kind === "chair") {
            return {
              kind: "chair",
              profileId: r.recipient_profile_id ?? "",
              name: chairIdToName.get(r.recipient_profile_id ?? "") ?? t("chairFallback"),
            };
          }
          return { kind: "chair_all" };
        });

        return {
          id: n.id,
          conference_id: n.conference_id,
          thread_id: n.thread_id,
          reply_to_note_id: n.reply_to_note_id,
          topic: n.topic,
          content: n.content,
          concern_flag: n.concern_flag,
          moderation_state: n.moderation_state ?? "approved",
          hold_reason: n.hold_reason ?? null,
          moderation_note: n.moderation_note ?? null,
          created_at: n.created_at,
          forwarded_to_smt: n.forwarded_to_smt,
          forwarded_at: n.forwarded_at,
          forwarded_to_advisor_profile_id: n.forwarded_to_advisor_profile_id,
          forwarded_to_advisor_at: n.forwarded_to_advisor_at,
          sender,
          recipients,
          starred_by_me: starredByMe.has(n.id),
        };
      });

      setNotes(mapped);
    } catch {
      // Best-effort: if realtime refresh fails, composer still works.
    }
  };

  useEffect(() => {
    void refreshNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conferenceId, smtVerified, myRole]);

  useEffect(() => {
    const handle = () => void refreshNotes();
    const ch1 = supabase
      .channel(`delegation-notes-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delegation_notes",
          filter: `conference_id=eq.${conferenceId}`,
        },
        handle
      )
      .subscribe();

    // Recipients insert/update happens in a separate table; subscribe so we update "To:" correctly.
    const ch2 = supabase
      .channel(`delegation-note-recipients-${conferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delegation_note_recipients",
        },
        handle
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conferenceId, smtVerified, myRole, isChairLike, isSmt]);

  async function createNote(overrides?: {
    allocationRecipientIds?: string[];
    chairRecipientIds?: string[];
    anyChairRecipient?: boolean;
    contentText?: string;
  }) {
    if (sending) return;
    setError(null);
    if (votingProcedureLocked) {
      setError(t("errors.votingProcedure"));
      return;
    }
    if (!sessionOk) {
      setError(t("errors.sessionInactive"));
      return;
    }
    if (unmoderatedLocked) {
      setError(t("errors.unmoderated"));
      return;
    }
    if (isSmt && !smtComposeOk) {
      setError(t("errors.smtVerify"));
      return;
    }

    const allocationRecipientIds = uniqueIds(
      overrides?.allocationRecipientIds ?? selectedAllocationRecipientIds
    );
    const chairRecipientIds = uniqueIds(overrides?.chairRecipientIds ?? selectedChairRecipientIds);
    const useAnyChair = overrides?.anyChairRecipient ?? anyChairRecipient;

    const trimmed = (overrides?.contentText ?? content).trim();
    if (!trimmed) return setError(t("errors.emptyContent"));

    if (allocationRecipientIds.length === 0 && chairRecipientIds.length === 0) {
      if (!useAnyChair) return setError(t("errors.noRecipients"));
    }

    const senderAllo = myAllocationId;
    const senderProfile = senderAllo ? null : isStaffLike ? myUserId : null;
    if (!senderAllo && !senderProfile) {
      return setError(t("errors.needAllocation"));
    }

    setSending(true);
    let insertedNoteId: string | null = null;
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from("delegation_notes")
        .insert({
          conference_id: conferenceId,
          topic,
          content: trimmed,
          concern_flag: concernFlag,
          sender_allocation_id: senderAllo,
          sender_profile_id: senderProfile,
        })
        .select("*")
        .single();
      if (insertErr) throw insertErr;
      insertedNoteId = inserted.id;

      for (const allocationId of allocationRecipientIds) {
        const { error: recipErr } = await supabase
          .from("delegation_note_recipients")
          .insert({
            note_id: inserted.id,
            recipient_kind: "allocation",
            recipient_allocation_id: allocationId,
            recipient_profile_id: null,
          });
        if (recipErr) throw recipErr;
      }

      for (const chairId of chairRecipientIds) {
        const { error: recipErr } = await supabase
          .from("delegation_note_recipients")
          .insert({
            note_id: inserted.id,
            recipient_kind: "chair",
            recipient_allocation_id: null,
            recipient_profile_id: chairId,
          });
        if (recipErr) throw recipErr;
      }

      if (useAnyChair) {
        const { error: recipErr } = await supabase
          .from("delegation_note_recipients")
          .insert({
            note_id: inserted.id,
            recipient_kind: "chair_all",
            recipient_allocation_id: null,
            recipient_profile_id: null,
          });
        if (recipErr) throw recipErr;
      }

      const sender: NoteSender = senderAllo
        ? {
            kind: "allocation",
            allocationId: senderAllo,
            country: allocationIdToCountry.get(senderAllo) ?? t("unknownCountry"),
          }
        : {
            kind: "profile",
            profileId: myUserId,
            name: myProfileName,
          };

      const recipients: NoteRecipient[] = [];
      for (const allocationId of allocationRecipientIds) {
        recipients.push({
          kind: "allocation",
          allocationId,
          country: allocationIdToCountry.get(allocationId) ?? t("unknownCountry"),
        });
      }
      for (const chairId of chairRecipientIds) {
        recipients.push({
          kind: "chair",
          profileId: chairId,
          name: chairIdToName.get(chairId) ?? t("chairFallback"),
        });
      }
      if (useAnyChair) recipients.push({ kind: "chair_all" });

      const newNote: DelegationNote = {
        id: inserted.id,
        conference_id: inserted.conference_id,
        thread_id: (inserted as { thread_id?: string | null }).thread_id ?? null,
        reply_to_note_id: null,
        topic: inserted.topic,
        content: inserted.content,
        concern_flag: inserted.concern_flag,
        moderation_state:
          (inserted as { moderation_state?: DelegationNoteModerationState }).moderation_state ??
          "approved",
        hold_reason:
          (inserted as { hold_reason?: DelegationNoteHoldReason | null }).hold_reason ?? null,
        moderation_note:
          (inserted as { moderation_note?: string | null }).moderation_note ?? null,
        created_at: inserted.created_at,
        forwarded_to_smt: inserted.forwarded_to_smt,
        forwarded_at: inserted.forwarded_at,
        forwarded_to_advisor_profile_id: inserted.forwarded_to_advisor_profile_id ?? null,
        forwarded_to_advisor_at: inserted.forwarded_to_advisor_at ?? null,
        sender,
        recipients,
        starred_by_me: false,
      };

      await refreshNotes();
      onNoteCreated?.(newNote);
      setContent("");
      setConcernFlag(false);
      setSelectedAllocationRecipientIdsState([]);
      setSelectedChairRecipientIdsState([]);
      setAnyChairRecipientState(false);
      if (newNote.moderation_state === "held") {
        setComposeSuccess(t("moderation.pendingAfterSend"));
      } else {
        setComposeSuccess(null);
      }

      const sentToSelf =
        newNote.moderation_state === "approved" &&
        ((myAllocationId !== null && allocationRecipientIds.includes(myAllocationId)) ||
          chairRecipientIds.includes(myUserId));
      if (sentToSelf && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("intermun:delegation-note-popup", {
            detail: {
              title: "New delegation note",
              body: trimmed.slice(0, 240),
              href: "/chats-notes",
            },
          })
        );
      }
    } catch (e: unknown) {
      const rawMessage =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? ((e as SupabaseErrorLike).message ?? "")
            : "";
      const normalizedMessage = rawMessage.toLowerCase();
      const isNotificationTriggerFkError =
        insertedNoteId !== null &&
        (normalizedMessage.includes("user_notifications") ||
          normalizedMessage.includes("fn_notify_delegation_note_recipient") ||
          normalizedMessage.includes("violates foreign key constraint"));
      if (isNotificationTriggerFkError) {
        // The note row is already created; only notification side effects failed.
        // Refresh list and keep UX successful while DB migration/state catches up.
        await refreshNotes();
        setContent("");
        setConcernFlag(false);
        setSelectedAllocationRecipientIdsState([]);
        setSelectedChairRecipientIdsState([]);
        setAnyChairRecipientState(false);
        setError(null);
        return;
      }
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? ((e as SupabaseErrorLike).message ?? t("errors.sendFailed"))
            : t("errors.sendFailed");
      setError(message);
    } finally {
      setSending(false);
    }
  }

  function selectSelfRecipient() {
    if (myAllocationId) {
      setSelectedAllocationRecipientIdsState([myAllocationId]);
      setSelectedChairRecipientIdsState([]);
      setAnyChairRecipientState(false);
      return true;
    }
    if (isStaffLike) {
      setSelectedAllocationRecipientIdsState([]);
      setSelectedChairRecipientIdsState([myUserId]);
      setAnyChairRecipientState(false);
      return true;
    }
    return false;
  }

  async function replyInThread(replyToNoteId: string, replyContent: string) {
    if (sending) return;
    setError(null);
    if (votingProcedureLocked) {
      setError(t("errors.votingProcedure"));
      return;
    }
    if (!sessionOk) {
      setError(t("errors.sessionInactive"));
      return;
    }
    if (unmoderatedLocked) {
      setError(t("errors.unmoderated"));
      return;
    }
    if (isSmt && !smtComposeOk) {
      setError(t("errors.smtVerify"));
      return;
    }

    const parent = notes.find((n) => n.id === replyToNoteId);
    const threadId = parent?.thread_id;
    if (!parent || !threadId) {
      setError(t("errors.sendFailed"));
      return;
    }

    const trimmed = replyContent.trim();
    if (!trimmed) return setError(t("errors.emptyContent"));

    const senderAllo = myAllocationId;
    const senderProfile = senderAllo ? null : isStaffLike ? myUserId : null;
    if (!senderAllo && !senderProfile) {
      return setError(t("errors.needAllocation"));
    }

    setSending(true);
    try {
      const { error: insertErr } = await supabase.from("delegation_notes").insert({
        conference_id: conferenceId,
        thread_id: threadId,
        reply_to_note_id: replyToNoteId,
        topic: parent.topic,
        content: trimmed,
        concern_flag: false,
        sender_allocation_id: senderAllo,
        sender_profile_id: senderProfile,
      });
      if (insertErr) throw insertErr;
      await refreshNotes();
      if (shouldAutoHoldNote({ content: trimmed, concernFlag: false })) {
        setComposeSuccess(t("moderation.pendingAfterSend"));
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? ((e as SupabaseErrorLike).message ?? t("errors.sendFailed"))
            : t("errors.sendFailed");
      setError(message);
    } finally {
      setSending(false);
    }
  }

  function handleThreadRenamed(threadId: string, displayName: string) {
    setThreadMetaById((prev) => {
      const next = new Map(prev);
      const existing = next.get(threadId);
      if (existing) {
        next.set(threadId, { ...existing, display_name: displayName });
      }
      return next;
    });
  }

  async function sendTestNoteToSelf() {
    const testContent = content.trim() || t("selfTestDefaultContent");
    const allocationRecipientIds = myAllocationId ? [myAllocationId] : [];
    const chairRecipientIds = !myAllocationId && isStaffLike ? [myUserId] : [];
    if (allocationRecipientIds.length === 0 && chairRecipientIds.length === 0) {
      setError(t("errors.selfRecipientUnavailable"));
      return;
    }
    if (!content.trim()) setContent(testContent);
    selectSelfRecipient();
    await createNote({
      allocationRecipientIds,
      chairRecipientIds,
      anyChairRecipient: false,
      contentText: testContent,
    });
  }

  async function toggleStar(noteId: string, nextStarred: boolean) {
    if (!isChairLike) return;
    if (nextStarred) {
      const { error: insErr } = await supabase.from("delegation_note_stars").insert({
        note_id: noteId,
        chair_profile_id: myUserId,
      });
      if (insErr) return;
    } else {
      const { error: delErr } = await supabase
        .from("delegation_note_stars")
        .delete()
        .eq("note_id", noteId)
        .eq("chair_profile_id", myUserId);
      if (delErr) return;
    }

    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, starred_by_me: nextStarred } : n))
    );
  }

  async function forwardToSmt(noteId: string) {
    if (!isStaffLike) return;
    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("delegation_notes")
      .update({ forwarded_to_smt: true, forwarded_at: nowIso })
      .eq("id", noteId);
    if (updErr) return;

    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, forwarded_to_smt: true, forwarded_at: nowIso } : n
      )
    );
  }

  function advisorForNote(n: DelegationNote): { advisorProfileId: string; name: string } | null {
    if (n.sender.kind === "allocation") {
      const hit = advisorByAllocationId[n.sender.allocationId];
      if (hit) return hit;
    }
    for (const r of n.recipients) {
      if (r.kind === "allocation") {
        const hit = advisorByAllocationId[r.allocationId];
        if (hit) return hit;
      }
    }
    return null;
  }

  async function forwardToAdvisor(noteId: string, advisorProfileId: string) {
    if (!isStaffLike) return;
    const res = await forwardDelegationNoteToAdvisorAction(noteId, advisorProfileId);
    if (res.error) {
      setError(res.error);
      return;
    }
    const nowIso = new Date().toISOString();
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              forwarded_to_advisor_profile_id: advisorProfileId,
              forwarded_to_advisor_at: nowIso,
            }
          : n
      )
    );
  }

  async function reportNote(noteId: string) {
    if (!isChairLike) return;
    const { error: insErr } = await supabase.from("delegation_note_reports").insert({
      note_id: noteId,
      chair_profile_id: myUserId,
    });
    if (insErr) return;
    await refreshNotes();
  }

  async function moderateNote(noteId: string, action: "approve" | "reject", note?: string) {
    if (!isChairLike) return;
    const res = await moderateDelegationNoteAction({ noteId, action, note });
    if (res.error) {
      setError(res.error);
      return;
    }
    await refreshNotes();
  }

  const recipientSummary = (r: NoteRecipient) => {
    if (r.kind === "allocation") return r.country;
    if (r.kind === "chair") return r.name || t("chairFallback");
    return t("anyChair");
  };

  const formatRecipientSummary = (recipients: NoteRecipient[]) => {
    if (recipients.length === 0) return t("toEmpty");
    const seenAlloc = new Set<string>();
    const seenChair = new Set<string>();
    let chairAll = false;
    const labels: string[] = [];
    for (const r of recipients) {
      if (r.kind === "allocation") {
        if (seenAlloc.has(r.allocationId)) continue;
        seenAlloc.add(r.allocationId);
        labels.push(r.country);
      } else if (r.kind === "chair") {
        if (seenChair.has(r.profileId)) continue;
        seenChair.add(r.profileId);
        labels.push(r.name);
      } else if (!chairAll) {
        chairAll = true;
        labels.push(t("anyChair"));
      }
    }
    return labels.length === 0 ? t("toEmpty") : labels.join(", ");
  };

  const card = "mun-card";
  const labelStrong = "mun-label";
  const body = "text-sm text-brand-navy";
  const muted = "text-brand-muted";
  const field = "mun-field";

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
      <div className={card}>
        <h3 className="dashboard-panel-title mb-4">{composeTitle ?? t("title")}</h3>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-1">
          <div className="2xl:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className={labelStrong}>{t("topicLabel")}</label>
              <select
                className={`w-full sm:w-auto sm:ml-auto px-3 py-2 text-sm ${field}`}
                value={topic}
                onChange={(e) => setTopic(e.target.value as NoteTopic)}
              >
                <option value="bloc forming">{topicLabel("bloc forming")}</option>
                <option value="speech pois or pocs">{topicLabel("speech pois or pocs")}</option>
                <option value="questions">{topicLabel("questions")}</option>
                <option value="informal conversations">{topicLabel("informal conversations")}</option>
              </select>
            </div>

            <div className="flex items-start justify-between gap-3">
              <label className={`flex items-center gap-2 ${body}`}>
                <input
                  type="checkbox"
                  checked={concernFlag}
                  onChange={(e) => setConcernFlag(e.target.checked)}
                  className="size-4 rounded border-white/25 accent-brand-accent"
                />
                <span className="text-brand-navy/90">{t("concernLabel")}</span>
              </label>
              <HelpButton title={t("concernHelpTitle")}>{t("concernHelpBody")}</HelpButton>
            </div>

            {composeWillHold ? (
              <p className="rounded-lg border border-amber-300/45 bg-amber-50/70 px-3 py-2 text-xs text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-100">
                {t("moderation.composeHoldWarning")}
              </p>
            ) : null}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={canCompose ? t("placeholderCompose") : t("placeholderDisabled")}
              className={`w-full h-28 px-3 py-2 ${field}`}
              disabled={votingProcedureLocked || !sessionOk || unmoderatedLocked}
            />
            {canCompose ? <EmojiQuickInsert onPick={appendEmoji} /> : null}
            {composeSuccess ? (
              <p className="rounded-lg border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-xs text-brand-navy">
                {composeSuccess}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}
            {!sessionOk ? (
              <p className={`text-xs ${muted}`}>{t("sessionOnlyHint")}</p>
            ) : null}
            {unmoderatedLocked ? (
              <p className={`text-xs ${muted}`}>{t("unmoderatedHint")}</p>
            ) : null}

            <div className="flex gap-3 items-center flex-wrap">
              <button
                type="button"
                onClick={() => void createNote()}
                disabled={!canCompose || sending}
                className="mun-btn-primary disabled:opacity-50"
              >
                {sending ? t("sending") : t("sendNote")}
              </button>
              <button
                type="button"
                onClick={() => void sendTestNoteToSelf()}
                disabled={!canCompose || sending}
                className="mun-btn disabled:opacity-50"
                title={t("sendToSelfHelp")}
              >
                {t("sendToSelf")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectSelfRecipient()) setError(t("errors.selfRecipientUnavailable"));
                }}
                disabled={!canCompose || sending}
                className="mun-btn px-2.5 py-1.5 text-xs disabled:opacity-50"
              >
                {t("selectSelfRecipient")}
              </button>
              <HelpButton title={t("sendHelpTitle")}>{t("sendHelpBody")}</HelpButton>
              {isSmt && !smtSecretariatCompose ? (
                <p className={`text-xs ${muted}`}>
                  {smtVerified ? (
                    t("smtFullNotes")
                  ) : (
                    <>
                      {t("smtForwardedInbox")}{" "}
                  <Link className="mun-link" href={`/committee-gate?next=${encodeURIComponent(nextPathAfterVerification)}`}>
                        {t("enterStaffPassword")}
                      </Link>
                      .
                    </>
                  )}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-brand-navy">{t("recipientsTitle")}</p>

            <div className="space-y-2">
              <p className={labelStrong}>{t("delegationsLabel")}</p>
              <div className="mun-inset max-h-40 overflow-y-auto">
                {allocationOptions.map((a) => {
                  const checked = selectedAllocationRecipientIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-brand-navy"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        className="size-4 rounded border-white/25 accent-brand-accent"
                    disabled={votingProcedureLocked || !sessionOk || unmoderatedLocked}
                        onChange={(e) => {
                          setSelectedAllocationRecipientIdsState((prev) => {
                            if (e.target.checked) {
                              return prev.includes(a.id) ? prev : [...prev, a.id];
                            }
                            return prev.filter((x) => x !== a.id);
                          });
                        }}
                      />
                      <span className="break-words">
                        {flagEmojiForCountryName(a.country)} {a.country}
                      </span>
                    </label>
                  );
                })}
                {allocationOptions.length === 0 ? (
                  <p className={`text-xs ${muted} p-1`}>{t("noDelegations")}</p>
                ) : null}
              </div>
              {isDelegate ? (
                <p className={`text-xs ${muted}`}>{t("delegateTargetsHint")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className={labelStrong}>{t("chairsLabel")}</p>

              <label className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-brand-navy">
                <input
                  type="checkbox"
                  checked={anyChairRecipient}
                  className="size-4 rounded border-white/25 accent-brand-accent"
                  disabled={votingProcedureLocked || !sessionOk || unmoderatedLocked}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setAnyChairRecipientState(next);
                    if (next) setSelectedChairRecipientIdsState([]);
                  }}
                />
                <span>{t("anyChair")}</span>
              </label>

              <div className="mun-inset max-h-32 overflow-y-auto">
                {chairOptions.map((c) => {
                  const checked = selectedChairRecipientIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={[
                        "flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-brand-navy",
                        anyChairRecipient ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        className="size-4 rounded border-white/25 accent-brand-accent"
                        disabled={
                          anyChairRecipient || votingProcedureLocked || !sessionOk || unmoderatedLocked
                        }
                        onChange={(e) => {
                          if (anyChairRecipient) return;
                          setSelectedChairRecipientIdsState((prev) => {
                            if (e.target.checked) {
                              return prev.includes(c.id) ? prev : [...prev, c.id];
                            }
                            return prev.filter((x) => x !== c.id);
                          });
                        }}
                      />
                      <span className="break-words">{c.name || t("chairFallback")}</span>
                    </label>
                  );
                })}
                {chairOptions.length === 0 ? (
                  <p className={`text-xs ${muted} p-1`}>{t("noChairs")}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!composeOnly ? (

      <div className={`${card} lg:col-span-2`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="dashboard-panel-title">{t("notesListTitle")}</h3>
          <p className={`text-xs ${muted}`}>{t("threadCount", { count: threadGroups.length })}</p>
        </div>

        {threadGroups.length === 0 ? (
          <p className={`text-sm ${muted} mt-3`}>{t("emptyList")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {threadGroups.map((group) => {
              const n = group.latest;
              const root = group.root;
              const threadTitle = threadListTitle(group, topicLabel, t("unnamedChat"));
              const msgCount = group.meta?.message_count ?? group.messages.length;
              return (
              <div key={group.threadId} className="mun-card-dense">
                <div className="flex gap-3">
                  <div
                    className={`note-avatar ${avatarToneClass(
                      n.sender.kind === "allocation" ? n.sender.country : n.sender.name
                    )}`}
                    aria-hidden
                  >
                    {n.sender.kind === "allocation"
                      ? displayInitials(n.sender.country)
                      : displayInitials(n.sender.name)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">{threadTitle}</p>
                        <p className="mt-0.5 text-xs text-brand-muted">
                          <span className="font-medium text-brand-navy/90">
                            {t("fromLabel")}{" "}
                            {n.sender.kind === "allocation" ? (
                              <>
                                {flagEmojiForCountryName(n.sender.country)} {n.sender.country}
                              </>
                            ) : (
                              n.sender.name
                            )}
                          </span>
                          <span className="mx-1.5 text-brand-muted/50">·</span>
                          <span>
                            {t("toLabel")} {formatRecipientSummary(root.recipients)}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {isNoteSender(root) && root.moderation_state === "held" ? (
                          <span className="dashboard-status-badge bg-amber-500/15 text-[10px] text-amber-900 dark:text-amber-100">
                            {t("moderation.pendingBadge")}
                          </span>
                        ) : null}
                        {isNoteSender(root) && root.moderation_state === "rejected" ? (
                          <span className="dashboard-status-badge bg-red-500/15 text-[10px] text-red-900 dark:text-red-100">
                            {t("moderation.rejectedBadge")}
                          </span>
                        ) : null}
                        <span className="dashboard-status-badge dashboard-status-badge--info text-[10px]">
                          {topicLabel(root.topic)}
                        </span>
                        <span className="text-[11px] text-brand-muted">
                          {t("messageCount", { count: msgCount })}
                        </span>
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-navy">
                      {n.content.length > 280 ? `${n.content.slice(0, 280)}…` : n.content}
                    </div>
                    {noteModerationById.get(n.id)?.length ? (
                      <p className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                        {t("readerWarning")}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setOpenThreadId(group.threadId)}
                        className="mun-btn px-3 py-1.5 text-xs"
                      >
                        {msgCount > 1 ? t("openThread") : t("viewFullNote")}
                      </button>
                      {canCompose ? (
                        <button
                          type="button"
                          onClick={() => setOpenThreadId(group.threadId)}
                          className="mun-btn-primary px-3 py-1.5 text-xs"
                        >
                          {t("reply")}
                        </button>
                      ) : null}
                    </div>
                    <DelegationNoteModerationToolbar
                      note={root}
                      isChairLike={isChairLike}
                      isStaffLike={isStaffLike}
                      advisor={moderationAdvisorForNote(root)}
                      onStar={(id, starred) => void toggleStar(id, starred)}
                      onForwardSmt={(id) => void forwardToSmt(id)}
                      onForwardAdvisor={(id, advisorId) => void forwardToAdvisor(id, advisorId)}
                      onReport={(id) => void reportNote(id)}
                      onApprove={(id) => void moderateNote(id, "approve")}
                      onReject={(id, reason) => void moderateNote(id, "reject", reason)}
                      labels={moderationLabels}
                    />
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
      ) : null}
      {openThreadGroup ? (
        <DelegationNoteThreadDialog
          group={openThreadGroup}
          topicLabel={topicLabel}
          formatRecipientSummary={formatRecipientSummary}
          canReply={canCompose}
          sending={sending}
          onClose={() => setOpenThreadId(null)}
          onReply={replyInThread}
          onThreadRenamed={handleThreadRenamed}
          moderation={
            isChairLike || isStaffLike
              ? {
                  rootNote: openThreadGroup.root,
                  isChairLike,
                  isStaffLike,
                  advisor: moderationAdvisorForNote(openThreadGroup.root),
                  onStar: (id, starred) => void toggleStar(id, starred),
                  onForwardSmt: (id) => void forwardToSmt(id),
                  onForwardAdvisor: (id, advisorId) => void forwardToAdvisor(id, advisorId),
                  onReport: (id) => void reportNote(id),
                  onApprove: (id) => void moderateNote(id, "approve"),
                  onReject: (id, reason) => void moderateNote(id, "reject", reason),
                  labels: moderationLabels,
                }
              : undefined
          }
          labels={{
            close: t("close"),
            reply: t("reply"),
            replyPlaceholder: t("replyPlaceholder"),
            sendReply: t("sendReply"),
            sending: t("sending"),
            readerWarning: t("readerWarning"),
            composeHoldWarning: t("moderation.composeHoldWarning"),
            pendingBadge: t("moderation.pendingBadge"),
            rejectedBadge: t("moderation.rejectedBadge"),
            nameChat: t("nameChat"),
            nameChatHint: t("nameChatHint"),
            nameChatPlaceholder: t("nameChatPlaceholder"),
            saveChatName: t("saveChatName"),
            messageCount: t("messageCount"),
            unnamedChat: t("unnamedChat"),
            errors: { emptyReply: t("errors.emptyContent") },
          }}
        />
      ) : null}
      {expandedNote ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 px-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("fullNoteAria")}
          onClick={() => setExpandedNote(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-white/15 bg-brand-paper p-4 md:p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-brand-navy">{t("fullNoteTitle")}</h3>
              <button
                type="button"
                onClick={() => setExpandedNote(null)}
                className="text-xs font-medium text-brand-accent hover:underline"
              >
                {t("close")}
              </button>
            </div>
            <div className="mb-2 text-xs text-brand-muted">
              {expandedNote.sender.kind === "allocation"
                ? `${flagEmojiForCountryName(expandedNote.sender.country)} ${expandedNote.sender.country}`
                : `🏳️ ${expandedNote.sender.name}`}
              {" · "}
              <span>{topicLabel(expandedNote.topic)}</span>
            </div>
            {noteModerationById.get(expandedNote.id)?.length ? (
              <p className="mb-2 rounded-md border border-amber-300/50 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                {t("readerWarning")}
              </p>
            ) : null}
            <div className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap break-words text-sm text-brand-navy">
              {expandedNote.content}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

