"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";

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
  selectedAllocationRecipientIds: controlledSelectedAllocationRecipientIds,
  selectedChairRecipientIds: controlledSelectedChairRecipientIds,
  anyChairRecipient: controlledAnyChairRecipient,
  onToggleAllocationRecipient,
  onToggleChairRecipient,
  onAnyChairRecipientChange,
  onClearRecipientSelection,
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

  // Controlled recipients selection (digital MUN click-to-select).
  selectedAllocationRecipientIds?: string[];
  selectedChairRecipientIds?: string[];
  anyChairRecipient?: boolean;
  onToggleAllocationRecipient?: (allocationId: string) => void;
  onToggleChairRecipient?: (chairProfileId: string) => void;
  onAnyChairRecipientChange?: (next: boolean) => void;
  onClearRecipientSelection?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [notes, setNotes] = useState<DelegationNote[]>(initialNotes);
  const [topic, setTopic] = useState<NoteTopic>("bloc forming");
  const [content, setContent] = useState("");
  const [concernFlag, setConcernFlag] = useState(false);

  const [selectedAllocationRecipientIdsState, setSelectedAllocationRecipientIdsState] = useState<
    string[]
  >([]);
  const [selectedChairRecipientIdsState, setSelectedChairRecipientIdsState] = useState<string[]>([]);
  const [anyChairRecipientState, setAnyChairRecipientState] = useState(false);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isChairLike = myRole === "chair" || myRole === "admin";
  const isDelegate = myRole === "delegate";
  const isSmt = myRole === "smt";

  const isControlledRecipients =
    controlledSelectedAllocationRecipientIds !== undefined &&
    controlledSelectedChairRecipientIds !== undefined &&
    controlledAnyChairRecipient !== undefined &&
    !!onToggleAllocationRecipient &&
    !!onToggleChairRecipient &&
    !!onAnyChairRecipientChange &&
    !!onClearRecipientSelection;

  const selectedAllocationRecipientIds = isControlledRecipients
    ? controlledSelectedAllocationRecipientIds ?? []
    : selectedAllocationRecipientIdsState;
  const selectedChairRecipientIds = isControlledRecipients
    ? controlledSelectedChairRecipientIds ?? []
    : selectedChairRecipientIdsState;
  const anyChairRecipient = isControlledRecipients
    ? controlledAnyChairRecipient ?? false
    : anyChairRecipientState;

  const allocationIdToCountry = useMemo(() => {
    return new Map(allocationOptions.map((a) => [a.id, a.country] as const));
  }, [allocationOptions]);
  const chairIdToName = useMemo(() => {
    return new Map(chairOptions.map((c) => [c.id, c.name] as const));
  }, [chairOptions]);

  const canCompose =
    (!isSmt && (isChairLike || isDelegate)) &&
    (myAllocationId !== null || isChairLike) &&
    (allocationOptions.length > 0 || isChairLike);

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
      if (isControlledRecipients) {
        onClearRecipientSelection?.();
      } else {
        setSelectedAllocationRecipientIdsState([]);
        setSelectedChairRecipientIdsState([]);
        setAnyChairRecipientState(false);
      }
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

  return (
    <div className="space-y-6">
      <div className="border border-brand-navy/10 rounded-xl p-4 bg-white/60">
        <h3 className="font-semibold mb-3">Delegation notes</h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-wider text-brand-muted font-medium">
                Topic
              </label>
              <select
                className="ml-auto px-3 py-2 rounded-lg border border-brand-navy/15 bg-white text-brand-navy text-sm"
                value={topic}
                onChange={(e) => setTopic(e.target.value as NoteTopic)}
              >
                <option value="bloc forming">Bloc forming</option>
                <option value="speech pois or pocs">Speech pois or pocs</option>
                <option value="questions">Questions</option>
                <option value="informal conversations">Informal conversations</option>
              </select>
            </div>

            <div className="flex items-start gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={concernFlag}
                  onChange={(e) => setConcernFlag(e.target.checked)}
                />
                <span className="text-brand-muted">Concern (auto placeholder)</span>
              </label>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={canCompose ? "Write your note..." : "Only delegates/chairs can send notes."}
              className="w-full h-28 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
            />
            {error ? (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}

            <div className="flex gap-3 items-center">
              <button
                type="button"
                onClick={() => void createNote()}
                disabled={!canCompose || sending}
                className="px-4 py-2 rounded-lg border border-brand-navy/15 bg-brand-gold text-brand-navy font-medium disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send note"}
              </button>
              {isSmt ? (
                <p className="text-xs text-brand-muted">
                  {smtVerified ? (
                    "Viewing full notes (password verified)."
                  ) : (
                    <>
                      Viewing forwarded notes (SMT inbox).{" "}
                      <Link
                        className="underline text-brand-gold"
                        href={`/committee-gate?next=${encodeURIComponent(nextPathAfterVerification)}`}
                      >
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
            <p className="text-sm font-medium">Recipients</p>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-brand-muted">Delegations</p>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 bg-white/40">
                {allocationOptions.map((a) => {
                  const checked = selectedAllocationRecipientIds.includes(a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-2 text-sm px-1 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (isControlledRecipients) {
                            onToggleAllocationRecipient?.(a.id);
                            return;
                          }
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
                  <p className="text-xs text-brand-muted p-1">No assigned delegations for this committee.</p>
                ) : null}
              </div>
              {isDelegate ? (
                <p className="text-xs text-brand-muted">
                  Targets are limited to assigned allocations only.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-brand-muted">Chairs</p>

              <label className="flex items-center gap-2 text-sm px-1 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={anyChairRecipient}
                  onChange={(e) => {
                    const next = e.target.checked;
                    if (isControlledRecipients) {
                      onAnyChairRecipientChange?.(next);
                      return;
                    }
                    setAnyChairRecipientState(next);
                    if (next) setSelectedChairRecipientIdsState([]);
                  }}
                />
                <span>Any chair</span>
              </label>

              <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-white/40">
                {chairOptions.map((c) => {
                  const checked = selectedChairRecipientIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={[
                        "flex items-center gap-2 text-sm px-1 py-1 cursor-pointer",
                        anyChairRecipient ? "opacity-60 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={anyChairRecipient}
                        onChange={(e) => {
                          if (anyChairRecipient) return;
                          if (isControlledRecipients) {
                            onToggleChairRecipient?.(c.id);
                            return;
                          }
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
                  <p className="text-xs text-brand-muted p-1">No chair profiles found.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-brand-navy/10 rounded-xl p-4 bg-white/60">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Notes list</h3>
          <p className="text-xs text-brand-muted">
            {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-brand-muted mt-3">No notes yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="border border-brand-navy/10 rounded-xl p-3 bg-white/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-brand-muted flex items-center gap-2">
                      <span>
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
                      <span className="text-brand-navy/70">•</span>
                      <span className="capitalize">{n.topic}</span>
                      {n.forwarded_to_smt ? (
                        <span className="ml-2 text-brand-gold font-medium">(forwarded)</span>
                      ) : null}
                    </div>
                    <div className="mt-2 break-words whitespace-pre-wrap text-sm">{n.content}</div>
                    <div className="mt-2 text-xs text-brand-muted">
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
                        className="px-2.5 py-1 rounded-lg border border-brand-navy/15 text-xs bg-brand-cream hover:bg-brand-cream/70"
                      >
                        {n.starred_by_me ? "Starred" : "Star"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void forwardToSmt(n.id)}
                        disabled={n.forwarded_to_smt}
                        className="px-2.5 py-1 rounded-lg border border-brand-navy/15 text-xs bg-white hover:bg-brand-paper/20 disabled:opacity-50"
                      >
                        {n.forwarded_to_smt ? "Forwarded" : "Forward to SMT"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void reportNote(n.id)}
                        className="px-2.5 py-1 rounded-lg border border-brand-navy/15 text-xs bg-white hover:bg-red-50"
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
    </div>
  );
}

