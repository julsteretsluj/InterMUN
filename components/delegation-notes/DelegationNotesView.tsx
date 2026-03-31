"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { detectInappropriateTerms } from "@/lib/note-moderation";
import { HelpButton } from "@/components/HelpButton";

type NoteTopic =
  | "bloc forming"
  | "speech pois or pocs"
  | "questions"
  | "informal conversations";

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
  topic: NoteTopic;
  content: string;
  concern_flag: boolean;
  created_at: string;
  forwarded_to_smt: boolean;
  forwarded_at: string | null;
  sender: NoteSender;
  recipients: NoteRecipient[];
  starred_by_me: boolean;
};

type AllocationOption = { id: string; country: string };
type ChairOption = { id: string; name: string };

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
}) {
  const supabase = useMemo(() => createClient(), []);

  const [notes, setNotes] = useState<DelegationNote[]>(initialNotes);
  const [topic, setTopic] = useState<NoteTopic>("bloc forming");
  const [content, setContent] = useState("");
  const [concernFlag, setConcernFlag] = useState(false);

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

  const isChairLike = myRole === "chair" || myRole === "admin";
  const isDelegate = myRole === "delegate";
  const isSmt = myRole === "smt";

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

  const canCompose =
    (!isSmt && (isChairLike || isDelegate)) &&
    (myAllocationId !== null || isChairLike) &&
    (allocationOptions.length > 0 || isChairLike) &&
    sessionActive &&
    !unmoderatedLocked &&
    !votingProcedureLocked;

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
        topic: NoteTopic;
        content: string;
        concern_flag: boolean;
        created_at: string;
        forwarded_to_smt: boolean;
        forwarded_at: string | null;
        sender_allocation_id: string | null;
        sender_profile_id: string | null;
      }>;

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

      const profileNameFallback = myProfileName || "Chair";

      const mapped: DelegationNote[] = typedNotes.map((n) => {
        const senderAllocationId = n.sender_allocation_id;
        const senderProfileId = n.sender_profile_id;

        const sender: NoteSender =
          senderAllocationId && allocationIdToCountry.get(senderAllocationId)
            ? {
                kind: "allocation",
                allocationId: senderAllocationId,
                country: allocationIdToCountry.get(senderAllocationId) ?? "Unknown",
              }
            : {
                kind: "profile",
                profileId: senderProfileId ?? myUserId,
                name:
                  senderProfileId === myUserId
                    ? profileNameFallback
                    : chairIdToName.get(senderProfileId ?? "") ?? "Chair",
              };

        const recipientRowsForNote = (recipientsByNoteId.get(n.id) ?? []) as Array<{
          note_id: string;
          recipient_kind: "allocation" | "chair" | "chair_all";
          recipient_allocation_id: string | null;
          recipient_profile_id: string | null;
        }>;

        const recipients: NoteRecipient[] = recipientRowsForNote.map((r) => {
          if (r.recipient_kind === "allocation") {
            const allocId = r.recipient_allocation_id ?? "";
            return {
              kind: "allocation",
              allocationId: allocId,
              country: allocationIdToCountry.get(allocId) ?? "Unknown",
            };
          }
          if (r.recipient_kind === "chair") {
            return {
              kind: "chair",
              profileId: r.recipient_profile_id ?? "",
              name: chairIdToName.get(r.recipient_profile_id ?? "") ?? "Chair",
            };
          }
          return { kind: "chair_all" };
        });

        return {
          id: n.id,
          conference_id: n.conference_id,
          topic: n.topic,
          content: n.content,
          concern_flag: n.concern_flag,
          created_at: n.created_at,
          forwarded_to_smt: n.forwarded_to_smt,
          forwarded_at: n.forwarded_at,
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

  async function createNote() {
    if (sending) return;
    setError(null);
    if (votingProcedureLocked) {
      setError("Voting procedure is active: note composing is disabled.");
      return;
    }
    if (!sessionActive) {
      setError("Notes are disabled while the committee session is not active.");
      return;
    }
    if (unmoderatedLocked) {
      setError("Notes are disabled during unmoderated caucus.");
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) return setError("Write the note content first.");

    if (selectedAllocationRecipientIds.length === 0 && selectedChairRecipientIds.length === 0) {
      if (!anyChairRecipient) return setError("Select at least one recipient (delegation or chair).");
    }

    const senderAllo = myAllocationId;
    const senderProfile = senderAllo ? null : isChairLike ? myUserId : null;
    if (!senderAllo && !senderProfile) {
      return setError("You need an allocation to send notes (or be a chair).");
    }

    setSending(true);
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

      for (const allocationId of selectedAllocationRecipientIds) {
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

      for (const chairId of selectedChairRecipientIds) {
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

      if (anyChairRecipient) {
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
            country: allocationIdToCountry.get(senderAllo) ?? "Unknown",
          }
        : {
            kind: "profile",
            profileId: myUserId,
            name: myProfileName,
          };

      const recipients: NoteRecipient[] = [];
      for (const allocationId of selectedAllocationRecipientIds) {
        recipients.push({
          kind: "allocation",
          allocationId,
          country: allocationIdToCountry.get(allocationId) ?? "Unknown",
        });
      }
      for (const chairId of selectedChairRecipientIds) {
        recipients.push({
          kind: "chair",
          profileId: chairId,
          name: chairIdToName.get(chairId) ?? "Chair",
        });
      }
      if (anyChairRecipient) recipients.push({ kind: "chair_all" });

      const newNote: DelegationNote = {
        id: inserted.id,
        conference_id: inserted.conference_id,
        topic: inserted.topic,
        content: inserted.content,
        concern_flag: inserted.concern_flag,
        created_at: inserted.created_at,
        forwarded_to_smt: inserted.forwarded_to_smt,
        forwarded_at: inserted.forwarded_at,
        sender,
        recipients,
        starred_by_me: false,
      };

      setNotes((prev) => [newNote, ...prev]);
      setContent("");
      setConcernFlag(false);
      setSelectedAllocationRecipientIdsState([]);
      setSelectedChairRecipientIdsState([]);
      setAnyChairRecipientState(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to send note.";
      setError(message);
    } finally {
      setSending(false);
    }
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
    if (!isChairLike) return;
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

  async function reportNote(noteId: string) {
    if (!isChairLike) return;
    const { error: insErr } = await supabase.from("delegation_note_reports").insert({
      note_id: noteId,
      chair_profile_id: myUserId,
    });
    if (insErr) return;
    // No visible state for now; future UI can show "reported" markers.
  }

  const recipientSummary = (r: NoteRecipient) => {
    if (r.kind === "allocation") return r.country;
    if (r.kind === "chair") return r.name || "Chair";
    return "Any chair";
  };

  const card = "mun-card";
  const labelStrong = "mun-label";
  const body = "text-sm text-brand-navy";
  const muted = "text-brand-muted";
  const field = "mun-field";

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="mb-3 font-semibold text-brand-navy">Delegation notes</h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <label className={labelStrong}>Topic</label>
              <select
                className={`ml-auto px-3 py-2 text-sm ${field}`}
                value={topic}
                onChange={(e) => setTopic(e.target.value as NoteTopic)}
              >
                <option value="bloc forming">Bloc forming</option>
                <option value="speech pois or pocs">Speech pois or pocs</option>
                <option value="questions">Questions</option>
                <option value="informal conversations">Informal conversations</option>
              </select>
            </div>

            <div className="flex items-start justify-between gap-3">
              <label className={`flex items-center gap-2 ${body}`}>
                <input
                  type="checkbox"
                  checked={concernFlag}
                  onChange={(e) => setConcernFlag(e.target.checked)}
                  className="size-4 rounded border-white/25 accent-brand-gold"
                />
                <span className="text-brand-navy/90">Concern (auto placeholder)</span>
              </label>
              <HelpButton title="Concern flag">
                Use this when your note includes a moderation-sensitive concern. The reader may see a warning,
                but your note will still send.
              </HelpButton>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={canCompose ? "Write your note..." : "Only delegates/chairs can send notes."}
              className={`w-full h-28 px-3 py-2 ${field}`}
              disabled={votingProcedureLocked || !sessionActive || unmoderatedLocked}
            />
            {error ? (
              <p className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}
            {!sessionActive ? (
              <p className={`text-xs ${muted}`}>
                Notes are available only during active committee sessions.
              </p>
            ) : null}
            {unmoderatedLocked ? (
              <p className={`text-xs ${muted}`}>
                Notes are disabled during unmoderated caucus.
              </p>
            ) : null}

            <div className="flex gap-3 items-center flex-wrap">
              <button
                type="button"
                onClick={() => void createNote()}
                disabled={!canCompose || sending}
                className="mun-btn-primary disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send note"}
              </button>
              <HelpButton title="Send note">
                Sends this note to the recipients selected above. It doesn’t prevent sending; it only affects
                how the reader is warned/flagged.
              </HelpButton>
              {isSmt ? (
                <p className={`text-xs ${muted}`}>
                  {smtVerified ? (
                    "Viewing full notes (password verified)."
                  ) : (
                    <>
                      Viewing forwarded notes (SMT inbox).{" "}
                  <Link className="mun-link" href={`/committee-gate?next=${encodeURIComponent(nextPathAfterVerification)}`}>
                        Enter staff secondary password
                      </Link>
                      .
                    </>
                  )}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-brand-navy">Recipients</p>

            <div className="space-y-2">
              <p className={labelStrong}>Delegations</p>
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
                        className="size-4 rounded border-white/25 accent-brand-gold"
                    disabled={votingProcedureLocked || !sessionActive || unmoderatedLocked}
                        onChange={(e) => {
                          setSelectedAllocationRecipientIdsState((prev) => {
                            if (e.target.checked) return [...prev, a.id];
                            return prev.filter((x) => x !== a.id);
                          });
                        }}
                      />
                      <span className="truncate">
                        {flagEmojiForCountryName(a.country)} {a.country}
                      </span>
                    </label>
                  );
                })}
                {allocationOptions.length === 0 ? (
                  <p className={`text-xs ${muted} p-1`}>No assigned delegations for this committee.</p>
                ) : null}
              </div>
              {isDelegate ? (
                <p className={`text-xs ${muted}`}>Targets are limited to assigned allocations only.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className={labelStrong}>Chairs</p>

              <label className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-brand-navy">
                <input
                  type="checkbox"
                  checked={anyChairRecipient}
                  className="size-4 rounded border-white/25 accent-brand-gold"
                  disabled={votingProcedureLocked || !sessionActive || unmoderatedLocked}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setAnyChairRecipientState(next);
                    if (next) setSelectedChairRecipientIdsState([]);
                  }}
                />
                <span>Any chair</span>
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
                        className="size-4 rounded border-white/25 accent-brand-gold"
                        disabled={
                          anyChairRecipient || votingProcedureLocked || !sessionActive || unmoderatedLocked
                        }
                        onChange={(e) => {
                          if (anyChairRecipient) return;
                          setSelectedChairRecipientIdsState((prev) => {
                            if (e.target.checked) return [...prev, c.id];
                            return prev.filter((x) => x !== c.id);
                          });
                        }}
                      />
                      <span className="truncate">{c.name || "Chair"}</span>
                    </label>
                  );
                })}
                {chairOptions.length === 0 ? (
                  <p className={`text-xs ${muted} p-1`}>No chair profiles found.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-brand-navy">Notes list</h3>
          <p className={`text-xs ${muted}`}>
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
        </div>

        {notes.length === 0 ? (
          <p className={`text-sm ${muted} mt-3`}>No notes yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {notes.map((n) => (
              <div
                key={n.id}
                className="mun-card-dense border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-brand-muted">
                      <span className="font-medium normal-case text-brand-navy">
                        {n.concern_flag ? "🚩" : "⚑"}{" "}
                        {n.sender.kind === "allocation" ? (
                          <>
                            {flagEmojiForCountryName(n.sender.country)} {n.sender.country}
                          </>
                        ) : (
                          <>
                            🏳️ {n.sender.name}
                          </>
                        )}
                      </span>
                      <span className="text-brand-muted/60">•</span>
                      <span className="capitalize text-brand-navy">{n.topic}</span>
                      {n.forwarded_to_smt ? (
                        <span className="ml-2 font-semibold text-brand-gold-bright">(forwarded)</span>
                      ) : null}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap break-words text-sm text-brand-navy">
                      {n.content.length > 280 ? `${n.content.slice(0, 280)}…` : n.content}
                    </div>
                    {noteModerationById.get(n.id)?.length ? (
                      <p className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                        Reader warning: this note may contain inappropriate language.
                      </p>
                    ) : null}
                    {n.content.length > 280 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedNote(n)}
                        className="mt-1 text-xs font-medium text-brand-gold hover:underline"
                      >
                        View full note
                      </button>
                    ) : null}
                    <div className={`mt-2 text-xs ${muted}`}>
                      To:{" "}
                      {n.recipients.length === 0
                        ? "—"
                        : n.recipients.map(recipientSummary).join(", ")}
                    </div>
                  </div>

                  {isChairLike ? (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void toggleStar(n.id, !n.starred_by_me)}
                        className="mun-btn px-2.5 py-1 text-xs"
                      >
                        {n.starred_by_me ? "Starred" : "Star"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void forwardToSmt(n.id)}
                        disabled={n.forwarded_to_smt}
                        className="mun-btn px-2.5 py-1 text-xs disabled:opacity-50"
                      >
                        {n.forwarded_to_smt ? "Forwarded" : "Forward to SMT"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void reportNote(n.id)}
                        className="mun-btn-danger px-2.5 py-1 text-xs"
                      >
                        Report
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {expandedNote ? (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Full note"
          onClick={() => setExpandedNote(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-white/15 bg-brand-paper p-4 md:p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-brand-navy">Full note</h3>
              <button
                type="button"
                onClick={() => setExpandedNote(null)}
                className="text-xs font-medium text-brand-gold hover:underline"
              >
                Close
              </button>
            </div>
            <div className="mb-2 text-xs text-brand-muted">
              {expandedNote.sender.kind === "allocation"
                ? `${flagEmojiForCountryName(expandedNote.sender.country)} ${expandedNote.sender.country}`
                : `🏳️ ${expandedNote.sender.name}`}
              {" · "}
              <span className="capitalize">{expandedNote.topic}</span>
            </div>
            {noteModerationById.get(expandedNote.id)?.length ? (
              <p className="mb-2 rounded-md border border-amber-300/50 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                Reader warning: this note may contain inappropriate language.
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

