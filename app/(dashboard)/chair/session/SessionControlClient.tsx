"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Pause, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { VoteType } from "@/types/database";
import {
  didMotionPass,
  didProceduralMotionPassAgainstRollPresent,
  membersPresentForMajorityDenominator,
  motionRequiresClauseTargets,
  motionRequiresResolutionOnly,
} from "@/lib/resolution-functions";
import { recordClauseVoteOutcomesAction } from "@/app/actions/resolutions";
import {
  DAIS_SEAT_CO_CHAIR,
  DAIS_SEAT_HEAD_CHAIR,
  sortAllocationsByDisplayCountry,
} from "@/lib/allocation-display-order";
import { ropRequiredMajority } from "@/lib/rop-required-majority";
import { formatVoteMajorityLabel } from "@/lib/format-vote-majority";
import type { CaucusDisruptivenessPrecedence } from "@/lib/motion-disruptiveness";
import { motionDisruptivenessScore, sortMotionsMostDisruptiveFirst } from "@/lib/motion-disruptiveness";
import { useConferenceTimer } from "@/lib/use-conference-timer";
import { fetchSpeakerQueue } from "@/lib/speaker-queue";
import {
  ChairSpeakerQueuePanel,
  type SpeakerListChairPromptKind,
} from "@/components/chair/ChairSpeakerQueuePanel";
import {
  BUILTIN_TIMER_PRESETS,
  presetToTimerFields,
  floorLabelLooksLikeGsl,
  isGslTimerPresetId,
  isModeratedCaucusTimerPresetId,
} from "@/lib/timer-presets";
import { DaisAnnouncementBody } from "@/components/dais/DaisAnnouncementBody";
import { isoToDatetimeLocalValue } from "@/lib/datetime-local";
import {
  type RollAttendance,
  parseRollAttendance,
  rollAttendanceRollLabel,
} from "@/lib/roll-attendance";
import { HelpButton } from "@/components/HelpButton";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { dedupeAllocationsByUserId } from "@/lib/conference-committee-canonical";
import { useLiveDebateConferenceId } from "@/lib/hooks/useLiveDebateConferenceId";
import { setActiveDebateTopicAction } from "@/app/actions/activeDebateTopic";
import {
  calculateEuPartyTimeAllocation,
  EU_PARLIAMENT_PARTY_KEYS,
  EU_PARTY_LABELS,
  formatSecondsAsMinSec,
} from "@/lib/eu-party-time";
import {
  euSessionPhaseLabel,
  isProcedureCodeRecommendedInEuPhase,
  nextEuSessionPhase,
  parseEuSessionPhase,
  previousEuSessionPhase,
  type EuSessionPhase,
} from "@/lib/eu-session-phase";
import { isEuParliamentProcedure } from "@/lib/procedure-profiles";
import { useLocale, useTranslations } from "next-intl";
import { translateAgendaTopicLabel } from "@/lib/i18n/committee-topic-labels";
import { localizeCountryName } from "@/lib/i18n/localize-country-name";

type Alloc = {
  id: string;
  country: string;
  user_id: string | null;
  userRole?: string | null;
  conference_id: string;
};
type RollRow = {
  allocation_id: string;
  conference_id: string;
  present: boolean;
  attendance: RollAttendance;
  allocations: { country: string } | { country: string }[] | null;
};
type Announcement = {
  id: string;
  body: string;
  created_at: string;
  body_format?: string | null;
  is_pinned?: boolean | null;
  publish_at?: string | null;
};
type PauseEvent = { id: string; reason: string; created_at: string };
type MotionRow = {
  id: string;
  conference_id: string;
  vote_type: VoteType;
  procedure_code: string | null;
  procedure_resolution_id: string | null;
  procedure_clause_ids: string[];
  title: string | null;
  description: string | null;
  must_vote: boolean;
  required_majority: string;
  motioner_allocation_id: string | null;
  open_for_voting: boolean;
  created_at: string;
  closed_at: string | null;
};
type AgendaTopic = { id: string; name: string | null };
type MotionAudit = {
  id: string;
  event_type: "created" | "edited" | "opened" | "closed";
  created_at: string;
  actor_profile_id: string | null;
  metadata: Record<string, unknown> | null;
};
type VoteCountRow = { value: string; user_id: string };
type ResolutionRow = {
  id: string;
  google_docs_url: string | null;
  main_submitters?: string[] | null;
  co_submitters?: string[] | null;
  signatories?: string[] | null;
};
type ClauseRow = {
  id: string;
  resolution_id: string;
  clause_number: number;
  clause_text: string;
};
type CurrentSpeakerQueueRow = {
  id: string;
  allocation_id: string | null;
  label: string | null;
};
type ChairSpeechNoteRow = {
  id: string;
  speaker_label: string;
  content: string;
  allocation_id: string | null;
  created_at: string;
  updated_at: string;
};
type SessionPointCode =
  | "poi"
  | "poc"
  | "parliamentary_inquiry"
  | "order"
  | "personal_privilege"
  | "right_of_reply"
  | "fact_check";
type SessionPointRow = {
  id: string;
  conference_id: string;
  raised_by_allocation_id: string | null;
  point_code: SessionPointCode;
  detail: string | null;
  status: "pending" | "accepted" | "denied";
  created_at: string;
};
type VoteRightsRow = {
  vote_item_id: string;
  user_id: string;
  vote_value: "yes" | "no";
  statement: string;
};
type EuTimerSlotKey =
  | (typeof EU_PARLIAMENT_PARTY_KEYS)[number]
  | "total_time"
  | "poi_poc_time"
  | "speaker_time";
type EuTimerTag =
  | "moderated caucus"
  | "unmoderated caucus"
  | "consultation"
  | "pois and pocs"
  | "party timer"
  | "speaker timer";
const EU_TIMER_SLOT_ORDER: EuTimerSlotKey[] = [
  ...EU_PARLIAMENT_PARTY_KEYS,
  "total_time",
  "poi_poc_time",
  "speaker_time",
];
const EU_TIMER_TAG_OPTIONS: EuTimerTag[] = [
  "moderated caucus",
  "unmoderated caucus",
  "consultation",
  "pois and pocs",
  "party timer",
  "speaker timer",
];
function defaultEuTimerMeta(): Record<EuTimerSlotKey, { name: string; tag: EuTimerTag }> {
  return {
    s_and_d: { name: EU_PARTY_LABELS.s_and_d, tag: "party timer" },
    epp: { name: EU_PARTY_LABELS.epp, tag: "party timer" },
    renew: { name: EU_PARTY_LABELS.renew, tag: "party timer" },
    left: { name: EU_PARTY_LABELS.left, tag: "party timer" },
    green: { name: EU_PARTY_LABELS.green, tag: "party timer" },
    c_and_r: { name: EU_PARTY_LABELS.c_and_r, tag: "party timer" },
    patriots: { name: EU_PARTY_LABELS.patriots, tag: "party timer" },
    independents: { name: EU_PARTY_LABELS.independents, tag: "party timer" },
    total_time: { name: "Total time", tag: "consultation" },
    poi_poc_time: { name: "POI / POC time", tag: "pois and pocs" },
    speaker_time: { name: "Speaker time", tag: "speaker timer" },
  };
}
function normalizeEuTimerMeta(
  raw: unknown
): Record<EuTimerSlotKey, { name: string; tag: EuTimerTag }> {
  const base = defaultEuTimerMeta();
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Record<string, unknown>;
  for (const slot of EU_TIMER_SLOT_ORDER) {
    const slotRaw = source[slot];
    if (!slotRaw || typeof slotRaw !== "object") continue;
    const slotObj = slotRaw as Record<string, unknown>;
    const nextName = typeof slotObj.name === "string" ? slotObj.name.trim() : "";
    const nextTag = typeof slotObj.tag === "string" ? slotObj.tag : "";
    if (nextName) base[slot].name = nextName;
    if ((EU_TIMER_TAG_OPTIONS as string[]).includes(nextTag)) {
      base[slot].tag = nextTag as EuTimerTag;
    }
  }
  return base;
}

function isEuTimerMetaCacheError(message: string | null | undefined): boolean {
  const m = String(message ?? "");
  return /schema cache/i.test(m) && /eu_timer_meta/i.test(m) && /timers/i.test(m);
}
type DisciplinaryRow = {
  allocation_id: string;
  voting_rights_lost: boolean;
  speaking_rights_suspended: boolean;
  removed_from_committee: boolean;
  warning_count: number;
  strike_count: number;
};

/** Dashboard splits session tools across routes; committee room uses `"all"`. */
export type SessionFloorSection =
  | "motions"
  | "timer"
  | "announcements"
  | "speakers"
  | "roll-call"
  | "all";

export function SessionControlClient({
  conferenceId,
  conferenceTitle,
  debateConferenceId: debateConferenceIdProp,
  canonicalConferenceId: canonicalConferenceIdProp,
  rosterConferenceIds,
  debateTopicOptions,
  activeSection = "all",
}: {
  conferenceId: string;
  conferenceTitle: string;
  /** Live floor / motions / timers (`conferences.id`). Defaults to `conferenceId`. */
  debateConferenceId?: string;
  /** Canonical committee row for synced topic selection. */
  canonicalConferenceId?: string;
  /** Sibling topic rows: merged roster + roll scope. */
  rosterConferenceIds?: string[];
  debateTopicOptions?: { id: string; label: string }[];
  /** Default `"all"` keeps a single scroll (e.g. committee room). */
  activeSection?: SessionFloorSection;
}) {
  const tTopics = useTranslations("agendaTopics");
  const tTopicUi = useTranslations("chairTopicTabs");
  const tTimer = useTranslations("views.session.timerPage");
  const tSessionControl = useTranslations("sessionControlClient");
  const locale = useLocale();
  const supabase = createClient();
  const rosterConferenceIdList = useMemo(() => {
    if (rosterConferenceIds?.length) return rosterConferenceIds;
    return [conferenceId];
  }, [conferenceId, rosterConferenceIds]);
  const rollAttendanceButtons: {
    value: RollAttendance;
    label: string;
    title: string;
  }[] = useMemo(
    () => [
      {
        value: "present_abstain",
        label: tSessionControl("rollPresent"),
        title: tSessionControl("rollPresentTitle"),
      },
      {
        value: "present_voting",
        label: tSessionControl("rollPresentVoting"),
        title: tSessionControl("rollPresentVotingTitle"),
      },
      {
        value: "absent",
        label: tSessionControl("rollAbsent"),
        title: tSessionControl("rollAbsent"),
      },
    ],
    [tSessionControl]
  );
  const rosterKey = useMemo(() => rosterConferenceIdList.slice().sort().join(","), [rosterConferenceIdList]);
  const displayCountry = useCallback(
    (country: string | null | undefined) => localizeCountryName(country, locale) || country || "—",
    [locale]
  );
  const canonicalConferenceId = canonicalConferenceIdProp ?? conferenceId;
  const initialDebateConferenceId = debateConferenceIdProp ?? conferenceId;
  const floorConferenceId = useLiveDebateConferenceId(
    supabase,
    initialDebateConferenceId,
    canonicalConferenceId,
    rosterConferenceIdList
  );
  const [allocations, setAllocations] = useState<Alloc[]>([]);
  const [isCrisisCommitteeSession, setIsCrisisCommitteeSession] = useState(false);
  const [roll, setRoll] = useState<RollRow[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [daisBody, setDaisBody] = useState("");
  const [daisFormat, setDaisFormat] = useState<"plain" | "markdown">("markdown");
  const [daisPublishAt, setDaisPublishAt] = useState("");
  const [daisEditingId, setDaisEditingId] = useState<string | null>(null);
  const [daisEditBody, setDaisEditBody] = useState("");
  const [daisEditFormat, setDaisEditFormat] = useState<"plain" | "markdown">("markdown");
  const [daisEditPublishAt, setDaisEditPublishAt] = useState("");
  const [pauseEvents, setPauseEvents] = useState<PauseEvent[]>([]);
  const [pauseReasonDraft, setPauseReasonDraft] = useState("");
  const [timerWorkflowTab, setTimerWorkflowTab] = useState<"setup" | "clock" | "notes" | "log">("setup");
  const [currentSpeakerQueueRow, setCurrentSpeakerQueueRow] = useState<CurrentSpeakerQueueRow | null>(null);
  const [speechNoteDraft, setSpeechNoteDraft] = useState("");
  const [speechNotesRecent, setSpeechNotesRecent] = useState<ChairSpeechNoteRow[]>([]);
  const [timer, setTimer] = useState({
    current: "",
    next: "",
    leftM: "5",
    leftS: "0",
    totalM: "5",
    totalS: "0",
    perSpeakerMode: false,
    isRunning: true,
    /** general_floor = vote_item_id null; motion_vote = bind to selected open-for-voting motion */
    purpose: "general_floor" as "general_floor" | "motion_vote",
    boundVoteItemId: "",
    /** Delegate-visible preset label (e.g. GSL 60s). */
    floorLabel: "",
  });
  const [openVotingMotions, setOpenVotingMotions] = useState<MotionRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [openMotion, setOpenMotion] = useState<MotionRow | null>(null);
  const [recentMotions, setRecentMotions] = useState<MotionRow[]>([]);
  const [motionAudit, setMotionAudit] = useState<MotionAudit[]>([]);
  const [motionTally, setMotionTally] = useState({ yes: 0, no: 0, total: 0 });
  const [motionVoteByUser, setMotionVoteByUser] = useState<Record<string, "yes" | "no" | "abstain">>({});
  const [motionWorkflowTab, setMotionWorkflowTab] = useState<
    "setup" | "floor" | "draft" | "votes" | "history"
  >("setup");
  const [motionDraft, setMotionDraft] = useState({
    vote_type: "motion" as VoteType,
    procedure_code: null as string | null,
    title: "",
    description: "",
    must_vote: false,
    procedure_resolution_id: null as string | null,
    procedure_clause_ids: [] as string[],
    motioner_allocation_id: null as string | null,
    moderated_total_minutes: "",
    moderated_speaker_seconds: "",
    unmoderated_total_minutes: "",
    consultation_total_minutes: "",
    amendment_kind: "friendly" as "friendly" | "unfriendly",
    amendment_debate_seconds: "45",
  });
  const [resolutions, setResolutions] = useState<ResolutionRow[]>([]);
  const [resolutionClauses, setResolutionClauses] = useState<ClauseRow[]>([]);
  const [sessionPoints, setSessionPoints] = useState<SessionPointRow[]>([]);
  const [pointDraftCode, setPointDraftCode] = useState<SessionPointCode>("parliamentary_inquiry");
  const [pointDraftDetail, setPointDraftDetail] = useState("");
  const [pointDraftAllocationId, setPointDraftAllocationId] = useState("");
  const [voteRightsByUserId, setVoteRightsByUserId] = useState<Record<string, VoteRightsRow>>({});
  const [disciplineByAllocationId, setDisciplineByAllocationId] = useState<Record<string, DisciplinaryRow>>({});
  const [speakerListChairPrompt, setSpeakerListChairPrompt] = useState<SpeakerListChairPromptKind | null>(
    null
  );
  /** After dismissing the GSL save reminder, do not re-open on the next save until the floor label changes. */
  const suppressGslSavePromptRef = useRef(false);
  const speakersSectionRef = useRef<HTMLElement | null>(null);
  const [motionFloorOpen, setMotionFloorOpen] = useState(false);
  const [pendingStatedMotions, setPendingStatedMotions] = useState<MotionRow[]>([]);
  const [caucusPrecedence, setCaucusPrecedence] = useState<CaucusDisruptivenessPrecedence>("consultation_first");
  const [procedureProfile, setProcedureProfile] = useState<"default" | "eu_parliament">("default");
  const [isEuGuidedWorkflow, setIsEuGuidedWorkflow] = useState(false);
  const [euSessionPhase, setEuSessionPhase] = useState<EuSessionPhase>("roll_call");
  const [agendaTopicsRemaining, setAgendaTopicsRemaining] = useState<AgendaTopic[]>([]);
  const [agendaTopicsUsedNames, setAgendaTopicsUsedNames] = useState<string[]>([]);

  const { timer: liveTimerRow, remaining: liveRemaining } = useConferenceTimer(
    floorConferenceId,
    openMotion?.id ?? null,
    true
  );

  useEffect(() => {
    if (timer.purpose !== "motion_vote") return;
    if (timer.boundVoteItemId.trim()) return;
    if (openVotingMotions.length !== 1) return;
    const onlyId = openVotingMotions[0]!.id;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimer((t) => (t.boundVoteItemId === "" ? { ...t, boundVoteItemId: onlyId } : t));
  }, [timer.purpose, timer.boundVoteItemId, openVotingMotions]);

  const votingCallOrder = useMemo(
    () =>
      sortAllocationsByDisplayCountry(
        allocations.filter((a) => {
          if (!a.user_id) return false;
          const role = a.userRole?.toString().trim().toLowerCase();
          if (role === "chair") return false;
          const countryKey = a.country.trim().toLowerCase();
          return (
            countryKey !== DAIS_SEAT_HEAD_CHAIR.toLowerCase() &&
            countryKey !== DAIS_SEAT_CO_CHAIR.toLowerCase() &&
            countryKey !== "co chair"
          );
        })
      ),
    [allocations]
  );

  const rollAttendanceByAllocationId = useMemo(() => {
    const m = new Map<string, RollAttendance>();
    for (const r of roll) {
      m.set(r.allocation_id, r.attendance);
    }
    return m;
  }, [roll]);

  const quorumStatus = useMemo(() => {
    const present = membersPresentForMajorityDenominator(
      rollAttendanceByAllocationId,
      votingCallOrder.map((a) => a.id)
    );
    const required = Math.ceil((votingCallOrder.length * 2) / 3);
    return {
      present,
      required,
      hasQuorum: votingCallOrder.length === 0 ? false : present >= required,
    };
  }, [rollAttendanceByAllocationId, votingCallOrder]);

  const procedurePresets = useMemo(() => {
    const base: {
      code: string | null;
      label: string;
      title?: string;
    }[] = [
      { code: null as string | null, label: tSessionControl("presetCustom") },
      {
        code: "extend_opening_speech",
        label: tSessionControl("presetExtendOpeningSpeech"),
        title: tSessionControl("presetExtendOpeningSpeech"),
      },
      {
        code: "open_debate",
        label: tSessionControl("presetOpenDebate"),
        title: tSessionControl("presetOpenDebate"),
      },
      {
        code: "open_gsl",
        label: tSessionControl("presetOpenGsl"),
        title: tSessionControl("presetOpenGsl"),
      },
      {
        code: "for_against_speeches",
        label: tSessionControl("presetForAgainst"),
        title: tSessionControl("presetForAgainstTitle"),
      },
      { code: "close_debate", label: tSessionControl("presetCloseDebate"), title: tSessionControl("presetCloseDebate") },
      { code: "exclude_public", label: tSessionControl("presetExcludePublic"), title: tSessionControl("presetExcludePublic") },
      { code: "silent_prayer", label: tSessionControl("presetSilentPrayerMeditation"), title: tSessionControl("presetSilentPrayerMotionTitle") },
      { code: "roll_call_vote", label: tSessionControl("presetRollCallVote"), title: tSessionControl("presetRollCallVote") },
      { code: "minute_silent", label: tSessionControl("presetMinuteSilentPrayer"), title: tSessionControl("presetSilentPrayerMotionTitle") },
      { code: "unmoderated_caucus", label: tSessionControl("presetUnmoderatedCaucus"), title: tSessionControl("presetUnmoderatedCaucusTitle") },
      { code: "moderated_caucus", label: tSessionControl("presetModeratedCaucus"), title: tSessionControl("presetModeratedCaucusTitle") },
      { code: "consultation", label: tSessionControl("presetConsultation"), title: tSessionControl("presetConsultationTitle") },
      { code: "cabinet_meeting", label: tSessionControl("presetCabinetMeeting"), title: tSessionControl("presetCabinetMeetingTitle") },
      { code: "shadow_meeting", label: tSessionControl("presetShadowMeeting"), title: tSessionControl("presetShadowMeetingTitle") },
      { code: "adjourn", label: tSessionControl("presetAdjournSession"), title: tSessionControl("presetAdjournSessionTitle") },
      { code: "suspend", label: tSessionControl("presetSuspendSession"), title: tSessionControl("presetSuspendSessionTitle") },
      { code: "divide_question", label: tSessionControl("presetDivideQuestion"), title: tSessionControl("presetDivideQuestionTitle") },
      { code: "clause_by_clause", label: tSessionControl("presetClauseByClause"), title: tSessionControl("presetClauseByClauseTitle") },
      { code: "amendment", label: tSessionControl("presetAmendments"), title: tSessionControl("presetAmendmentTitle") },
    ];

    // Hide set-agenda when there isn't at least 2 agenda topics left to choose from.
    // But keep it visible if the chair is currently editing a set-agenda motion.
    if (agendaTopicsRemaining.length > 1 || motionDraft.procedure_code === "set_agenda") {
      base.splice(1, 0, { code: "set_agenda", label: tSessionControl("presetSetAgenda"), title: "" });
    }
    return base;
  }, [agendaTopicsRemaining.length, motionDraft.procedure_code, tSessionControl]);

  const ropMajorityForDraft = useMemo(
    () => ropRequiredMajority(motionDraft.vote_type, motionDraft.procedure_code, procedureProfile),
    [motionDraft.vote_type, motionDraft.procedure_code, procedureProfile]
  );
  const motionDraftValidationError = useMemo(
    () => validateMotionDraft(motionDraft),
    [motionDraft]
  );

  const selectedResolutionClauses = useMemo(() => {
    if (!motionDraft.procedure_resolution_id) return [];
    return resolutionClauses.filter((c) => c.resolution_id === motionDraft.procedure_resolution_id);
  }, [motionDraft.procedure_resolution_id, resolutionClauses]);

  const agendaUsedNameSet = useMemo(() => {
    return new Set(agendaTopicsUsedNames.map((n) => n.trim()).filter(Boolean));
  }, [agendaTopicsUsedNames]);

  const setAgendaTopicOptions = useMemo(() => {
    if (motionDraft.procedure_code !== "set_agenda") return agendaTopicsRemaining;
    const cur = motionDraft.title.trim();
    if (!cur) return agendaTopicsRemaining;
    if (agendaTopicsRemaining.some((t) => (t.name ?? "").trim() === cur)) return agendaTopicsRemaining;
    return [...agendaTopicsRemaining, { id: "current", name: cur }];
  }, [agendaTopicsRemaining, motionDraft.procedure_code, motionDraft.title]);

  const euPartyAllocationPreview = useMemo(() => {
    if (procedureProfile !== "eu_parliament") return null;
    if (motionDraft.procedure_code !== "moderated_caucus" && motionDraft.procedure_code !== "consultation") {
      return null;
    }
    const totalMinutes =
      motionDraft.procedure_code === "moderated_caucus"
        ? Number(motionDraft.moderated_total_minutes)
        : Number(motionDraft.consultation_total_minutes);
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
    return calculateEuPartyTimeAllocation({
      totalMinutes,
      mode: motionDraft.procedure_code === "moderated_caucus" ? "moderated" : "consultation",
    });
  }, [
    motionDraft.procedure_code,
    motionDraft.moderated_total_minutes,
    motionDraft.consultation_total_minutes,
    procedureProfile,
  ]);
  const [euTimerSlots, setEuTimerSlots] = useState<Record<EuTimerSlotKey, number>>(() => ({
    s_and_d: 0,
    epp: 0,
    renew: 0,
    left: 0,
    green: 0,
    c_and_r: 0,
    patriots: 0,
    independents: 0,
    total_time: 0,
    poi_poc_time: 0,
    speaker_time: 0,
  }));
  const [euTimerMeta, setEuTimerMeta] = useState<
    Record<EuTimerSlotKey, { name: string; tag: EuTimerTag }>
  >(() => defaultEuTimerMeta());
  const [supportsEuTimerMeta, setSupportsEuTimerMeta] = useState(true);
  const euTimerSeedRef = useRef("");
  const euTimerSlotLabel = useCallback((slot: EuTimerSlotKey) => {
    if (slot in EU_PARTY_LABELS) {
      return EU_PARTY_LABELS[slot as keyof typeof EU_PARTY_LABELS];
    }
    if (slot === "total_time") return "Total time";
    if (slot === "poi_poc_time") return "POI / POC time";
    return "Speaker time";
  }, []);
  useEffect(() => {
    if (procedureProfile !== "eu_parliament" || !euPartyAllocationPreview) return;
    const speakerSeconds =
      motionDraft.procedure_code === "moderated_caucus"
        ? Math.max(0, Number(motionDraft.moderated_speaker_seconds) || 0)
        : 0;
    const seed = [
      floorConferenceId,
      motionDraft.procedure_code,
      motionDraft.moderated_total_minutes,
      motionDraft.consultation_total_minutes,
      motionDraft.moderated_speaker_seconds,
      euPartyAllocationPreview.speechSeconds,
      euPartyAllocationPreview.inquirySeconds,
    ].join("|");
    if (euTimerSeedRef.current === seed) return;
    euTimerSeedRef.current = seed;
    setEuTimerSlots((prev) => {
      const next = { ...prev };
      for (const partyKey of EU_PARLIAMENT_PARTY_KEYS) {
        next[partyKey] =
          euPartyAllocationPreview.breakdown.find((b) => b.party === partyKey)?.totalSeconds ?? 0;
      }
      next.total_time =
        euPartyAllocationPreview.speechSeconds + euPartyAllocationPreview.inquirySeconds;
      next.poi_poc_time = euPartyAllocationPreview.inquirySeconds;
      next.speaker_time = speakerSeconds;
      return next;
    });
  }, [
    euPartyAllocationPreview,
    floorConferenceId,
    motionDraft.consultation_total_minutes,
    motionDraft.moderated_speaker_seconds,
    motionDraft.moderated_total_minutes,
    motionDraft.procedure_code,
    procedureProfile,
  ]);

  function setEuTimerSlotSeconds(slot: EuTimerSlotKey, seconds: number) {
    setEuTimerSlots((prev) => ({ ...prev, [slot]: Math.max(0, seconds) }));
  }

  function setEuTimerSlotMeta(
    slot: EuTimerSlotKey,
    patch: Partial<{ name: string; tag: EuTimerTag }>
  ) {
    setEuTimerMeta((prev) => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        ...patch,
      },
    }));
  }

  function applyEuTimerSlotToFloor(slot: EuTimerSlotKey) {
    const seconds = Math.max(0, euTimerSlots[slot] ?? 0);
    if (seconds <= 0) {
      setMsg("Set a positive time for this EU timer first.");
      return;
    }
    const minutes = Math.floor(seconds / 60);
    const remainderSeconds = seconds % 60;
    const slotName = euTimerMeta[slot]?.name?.trim() || euTimerSlotLabel(slot);
    const slotTag = euTimerMeta[slot]?.tag?.trim() || "party timer";
    const nextLabel = `${slotName} (${slotTag})`;
    setTimer((prev) => ({
      ...prev,
      floorLabel: nextLabel,
      leftM: String(minutes),
      leftS: String(remainderSeconds),
      totalM: String(minutes),
      totalS: String(remainderSeconds),
      perSpeakerMode: slot === "speaker_time" ? true : prev.perSpeakerMode,
    }));
    setMsg(`Loaded EU timer: ${nextLabel}. Save timer to publish.`);
  }

  function parseModeratedTiming(description: string | null | undefined): {
    totalMinutes: string;
    speakerSeconds: string;
  } {
    const d = String(description ?? "");
    const total = d.match(/total\s+(\d+)\s*min/i)?.[1] ?? "";
    const speaker = d.match(/speaker\s+(\d+)\s*s/i)?.[1] ?? "";
    return { totalMinutes: total, speakerSeconds: speaker };
  }

  function stripTimingLineFromDescription(raw: string) {
    return raw
      .replace(/(?:^|\n)Timing:\s*total\s+\d+\s*min(?:,\s*speaker\s+\d+\s*s)?\s*$/i, "")
      .trim();
  }

  function withModeratedTimingInDescription(draft: typeof motionDraft) {
    if (draft.procedure_code === "moderated_caucus") {
      const base = stripTimingLineFromDescription(draft.description);
      const timing = `Timing: total ${draft.moderated_total_minutes} min, speaker ${draft.moderated_speaker_seconds}s`;
      return base ? `${base}\n${timing}` : timing;
    }
    if (draft.procedure_code === "unmoderated_caucus") {
      const base = stripTimingLineFromDescription(draft.description);
      const timing = `Timing: total ${draft.unmoderated_total_minutes} min`;
      return base ? `${base}\n${timing}` : timing;
    }
    if (draft.procedure_code === "consultation") {
      const base = stripTimingLineFromDescription(draft.description);
      const timing = `Timing: total ${draft.consultation_total_minutes} min`;
      return base ? `${base}\n${timing}` : timing;
    }
    if (draft.procedure_code === "amendment") {
      const base = draft.description.trim();
      const kindLine =
        draft.amendment_kind === "unfriendly"
          ? `Amendment type: unfriendly (${draft.amendment_debate_seconds}s for/against speeches)`
          : "Amendment type: friendly";
      return base ? `${base}\n${kindLine}` : kindLine;
    }
    return draft.description.trim() || null;
  }

  function validateMotionDraft(draft: typeof motionDraft): string | null {
    if (draft.procedure_code === "moderated_caucus") {
      if (!draft.title.trim()) {
        return "Moderated caucus requires a topic.";
      }
      const total = Number(draft.moderated_total_minutes);
      const speaker = Number(draft.moderated_speaker_seconds);
      if (!Number.isFinite(total) || total <= 0) {
        return "Moderated caucus requires total time (minutes).";
      }
      if (!Number.isFinite(speaker) || speaker <= 0) {
        return "Moderated caucus requires speaker time (seconds).";
      }
    }
    if (draft.procedure_code === "unmoderated_caucus") {
      const total = Number(draft.unmoderated_total_minutes);
      if (!Number.isFinite(total) || total <= 0) {
        return "Unmoderated caucus requires total time (minutes).";
      }
    }
    if (draft.procedure_code === "consultation") {
      if (!draft.title.trim()) {
        return "Consultation requires a topic or purpose.";
      }
      const total = Number(draft.consultation_total_minutes);
      if (!Number.isFinite(total) || total <= 0) {
        return "Consultation requires total time (minutes).";
      }
    }
    if (draft.procedure_code === "set_agenda") {
      const title = draft.title.trim();
      if (!title) return "Select an agenda topic.";
      // Allow editing an already-stated/past set-agenda motion even if the remaining list is exhausted.
      if (agendaTopicsRemaining.length <= 1 && !agendaUsedNameSet.has(title)) {
        return "Motion to Set the Agenda is unavailable for this committee (not enough topics remaining).";
      }
    }
    if (
      motionRequiresClauseTargets(draft.procedure_code) &&
      (!draft.procedure_resolution_id || draft.procedure_clause_ids.length === 0)
    ) {
      return "Select a resolution and at least one clause for this procedural motion.";
    }
    if (
      motionRequiresResolutionOnly(draft.procedure_code) &&
      !draft.procedure_resolution_id
    ) {
      return "Select a resolution for this motion.";
    }
    if (draft.procedure_code === "amendment") {
      if (draft.amendment_kind !== "friendly" && draft.amendment_kind !== "unfriendly") {
        return "Select amendment type (friendly or unfriendly).";
      }
      if (draft.amendment_kind === "unfriendly") {
        const debateSeconds = Number(draft.amendment_debate_seconds);
        if (!Number.isFinite(debateSeconds) || debateSeconds < 30 || debateSeconds > 60) {
          return "Unfriendly amendment debate time must be between 30 and 60 seconds.";
        }
      }
    }
    if (
      (draft.procedure_code === "open_debate" || draft.procedure_code === "for_against_speeches") &&
      draft.procedure_resolution_id
    ) {
      const target = resolutions.find((r) => r.id === draft.procedure_resolution_id);
      if (target) {
        const mainCount = (target.main_submitters ?? []).length;
        const coCount = (target.co_submitters ?? []).length;
        const signatoryCount = (target.signatories ?? []).length;
        const minSignatories = Math.max(1, Math.ceil(votingCallOrder.length * 0.15));
        if (mainCount < 2 || coCount < 2) {
          return "Draft resolution readiness: requires at least 2 main submitters and 2 co-submitters.";
        }
        if (signatoryCount < minSignatories) {
          return `Draft resolution readiness: requires at least ${minSignatories} signatories (15% of committee).`;
        }
      }
    }
    return null;
  }

  useEffect(() => {
    suppressGslSavePromptRef.current = false;
  }, [timer.floorLabel]);

  useEffect(() => {
    if (!speakerListChairPrompt) return;
    const id = requestAnimationFrame(() => {
      speakersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [speakerListChairPrompt]);

  function dismissSpeakerListPrompt() {
    setSpeakerListChairPrompt((kind) => {
      if (kind === "gsl") suppressGslSavePromptRef.current = true;
      return null;
    });
  }

  async function persistEuSessionPhase(nextPhase: EuSessionPhase) {
    const { error } = await supabase.from("procedure_states").upsert({
      conference_id: floorConferenceId,
      eu_session_phase: nextPhase,
      eu_last_phase_change_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setMsg(error.message);
      return false;
    }
    setEuSessionPhase(nextPhase);
    return true;
  }

  function confirmEuPhaseOverride(procedureCode: string | null): boolean {
    if (!isEuGuidedWorkflow) return true;
    if (isProcedureCodeRecommendedInEuPhase(euSessionPhase, procedureCode)) return true;
    return window.confirm(
      [
        `This motion is unusual for the current EU phase: ${euSessionPhaseLabel(euSessionPhase)}.`,
        "",
        "Proceed anyway? This override is logged only in the motion history.",
      ].join("\n")
    );
  }

  const refresh = useCallback(async () => {
    const motionSelect =
      "id, conference_id, vote_type, procedure_code, procedure_resolution_id, procedure_clause_ids, title, description, must_vote, required_majority, motioner_allocation_id, open_for_voting, created_at, closed_at";

    const [
      { data: psRow },
      { data: confRow },
      { data: allocs },
      { data: r },
      { data: ann },
      { data: t },
      { data: unclosedRows },
      { data: setAgendaClosedRows },
      { data: recentClosedRows },
      { data: resolutionRows },
      { data: clauseRows },
      { data: pauseRows },
      { data: sqCurrentRow },
      { data: pointRows },
      { data: disciplinaryRows },
    ] =
      await Promise.all([
        supabase
          .from("procedure_states")
          .select("state, current_vote_item_id, debate_closed, motion_floor_open, eu_session_phase")
          .eq("conference_id", floorConferenceId)
          .maybeSingle(),
        supabase
          .from("conferences")
          .select("consultation_before_moderated_caucus, event_id, committee, procedure_profile, eu_guided_workflow_enabled")
          .eq("id", floorConferenceId)
          .maybeSingle(),
        supabase
          .from("allocations")
          .select("id, country, user_id, conference_id")
          .in("conference_id", rosterConferenceIdList)
          .order("country"),
        supabase
          .from("roll_call_entries")
          .select("allocation_id, conference_id, present, attendance, allocations(country)")
          .in("conference_id", rosterConferenceIdList)
          .order("allocation_id"),
        supabase
          .from("dais_announcements")
          .select("id, body, created_at, body_format, is_pinned, publish_at")
          .eq("conference_id", floorConferenceId)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(24),
        supabase.from("timers").select("*").eq("conference_id", floorConferenceId).maybeSingle(),
        supabase.from("vote_items").select(motionSelect).eq("conference_id", floorConferenceId).is("closed_at", null),
        supabase
          .from("vote_items")
          .select("title")
          .eq("conference_id", floorConferenceId)
          .eq("procedure_code", "set_agenda")
          .not("closed_at", "is", null)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("vote_items")
          .select(motionSelect)
          .eq("conference_id", floorConferenceId)
          .not("closed_at", "is", null)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("resolutions")
          .select("id, google_docs_url, main_submitters, co_submitters, signatories")
          .eq("conference_id", floorConferenceId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("resolution_clauses")
          .select("id, resolution_id, clause_number, clause_text")
          .eq("conference_id", floorConferenceId)
          .order("clause_number", { ascending: true })
          .limit(500),
        supabase
          .from("timer_pause_events")
          .select("id, reason, created_at")
          .eq("conference_id", floorConferenceId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("speaker_queue_entries")
          .select("id, allocation_id, label")
          .eq("conference_id", floorConferenceId)
          .eq("status", "current")
          .maybeSingle(),
        supabase
          .from("chair_session_points")
          .select("id, conference_id, raised_by_allocation_id, point_code, detail, status, created_at")
          .eq("conference_id", floorConferenceId)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("chair_delegate_discipline")
          .select(
            "allocation_id, voting_rights_lost, speaking_rights_suspended, removed_from_committee, warning_count, strike_count"
          )
          .eq("conference_id", floorConferenceId)
          .limit(500),
      ]);

    const allocRows = (allocs as Alloc[]) ?? [];
    const sortedByFloor = [...allocRows].sort((a, b) => {
      const ap = a.conference_id === floorConferenceId ? 0 : 1;
      const bp = b.conference_id === floorConferenceId ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (a.country ?? "").localeCompare(b.country ?? "");
    });
    const allocUserIds = [
      ...new Set(sortedByFloor.map((a) => a.user_id).filter((id): id is string => Boolean(id))),
    ];
    const { data: allocProfiles } =
      allocUserIds.length > 0
        ? await supabase.from("profiles").select("id, role").in("id", allocUserIds)
        : { data: [] as { id: string; role: string | null }[] };
    const roleByProfileId = new Map((allocProfiles ?? []).map((p) => [p.id, p.role ?? null]));
    const allocationsWithRoles = sortedByFloor.map((a) => ({
      ...a,
      userRole: a.user_id ? roleByProfileId.get(a.user_id) ?? null : null,
    }));
    const dedupedAllocs = dedupeAllocationsByUserId(sortAllocationsByDisplayCountry(allocationsWithRoles));
    const allowedAllocIds = new Set(dedupedAllocs.map((a) => a.id));
    setAllocations(dedupedAllocs);
    const rollMapped = (
      (r as (Omit<RollRow, "attendance"> & { attendance?: string | null; conference_id?: string })[]) ?? []
    ).map(
      (row) =>
        ({
          ...row,
          conference_id: row.conference_id ?? conferenceId,
          attendance:
            parseRollAttendance(row.attendance) ??
            (row.present === true ? "present_voting" : "absent"),
        }) satisfies RollRow
    );
    setRoll(rollMapped.filter((row) => allowedAllocIds.has(row.allocation_id)));
    setAnnouncements((ann as Announcement[]) ?? []);
    setPauseEvents((pauseRows as PauseEvent[]) ?? []);
    setCurrentSpeakerQueueRow((sqCurrentRow as CurrentSpeakerQueueRow | null) ?? null);
    setSessionPoints((pointRows as SessionPointRow[]) ?? []);
    const dMap: Record<string, DisciplinaryRow> = {};
    for (const row of (disciplinaryRows as DisciplinaryRow[] | null) ?? []) {
      dMap[row.allocation_id] = row;
    }
    setDisciplineByAllocationId(dMap);
    const ps = psRow as {
      motion_floor_open?: boolean;
      debate_closed?: boolean;
      state?: string;
      current_vote_item_id?: string | null;
      eu_session_phase?: string | null;
    } | null;
    setMotionFloorOpen(!!ps?.motion_floor_open);
    setEuSessionPhase(parseEuSessionPhase(ps?.eu_session_phase));

    const confForAgenda = confRow as {
      consultation_before_moderated_caucus?: boolean;
      event_id?: string | null;
      committee?: string | null;
      procedure_profile?: string | null;
      eu_guided_workflow_enabled?: boolean | null;
    } | null;
    const normalizedProcedureProfile = isEuParliamentProcedure(confForAgenda?.procedure_profile)
      ? "eu_parliament"
      : "default";
    setProcedureProfile(normalizedProcedureProfile);
    const precedence: CaucusDisruptivenessPrecedence =
      confForAgenda?.consultation_before_moderated_caucus === false ? "moderated_first" : "consultation_first";
    setCaucusPrecedence(precedence);
    setIsCrisisCommitteeSession(isCrisisCommittee(confForAgenda?.committee ?? null));
    setIsEuGuidedWorkflow(
      normalizedProcedureProfile === "eu_parliament" &&
        confForAgenda?.eu_guided_workflow_enabled === true
    );

    const agendaTopicsAllResolved: AgendaTopic[] = [];
    if (confForAgenda?.event_id && confForAgenda.committee) {
      const { data: topicRows } = await supabase
        .from("conferences")
        .select("id, name")
        .eq("event_id", confForAgenda.event_id)
        .eq("committee", confForAgenda.committee)
        .order("created_at", { ascending: true });
      agendaTopicsAllResolved.push(...(((topicRows as AgendaTopic[]) ?? []).filter((t) => (t.name ?? "").trim().length > 0)));
    }

    const usedAgendaNames = new Set<string>();
    const unclosed = (unclosedRows as MotionRow[]) ?? [];
    for (const m of unclosed) {
      if (m.procedure_code !== "set_agenda") continue;
      const name = (m.title ?? "").trim();
      if (name) usedAgendaNames.add(name);
    }
    for (const r of (setAgendaClosedRows as { title?: string | null }[] | null) ?? []) {
      const name = (r.title ?? "").trim();
      if (name) usedAgendaNames.add(name);
    }

    const remaining = agendaTopicsAllResolved.filter(
      (t) => !usedAgendaNames.has((t.name ?? "").trim())
    );
    setAgendaTopicsRemaining(remaining);
    setAgendaTopicsUsedNames(Array.from(usedAgendaNames));

    const openForVotingList = unclosed.filter((row) => row.open_for_voting === true);
    setOpenVotingMotions(openForVotingList);
    const open = openForVotingList[0] ?? null;
    const pendingRaw = unclosed.filter((row) => row.open_for_voting === false);
    setPendingStatedMotions(sortMotionsMostDisruptiveFirst(pendingRaw, precedence, normalizedProcedureProfile));
    setOpenMotion(open);
    setRecentMotions((recentClosedRows as MotionRow[]) ?? []);
    setResolutions((resolutionRows as ResolutionRow[]) ?? []);
    const rightsVoteIds = new Set<string>();
    for (const row of openForVotingList) rightsVoteIds.add(row.id);
    for (const row of (recentClosedRows as MotionRow[]) ?? []) rightsVoteIds.add(row.id);
    if (rightsVoteIds.size > 0) {
      const { data: rightsRows } = await supabase
        .from("vote_rights_statements")
        .select("vote_item_id, user_id, vote_value, statement")
        .in("vote_item_id", Array.from(rightsVoteIds));
      const rightsMap: Record<string, VoteRightsRow> = {};
      for (const row of (rightsRows as VoteRightsRow[]) ?? []) {
        rightsMap[`${row.vote_item_id}:${row.user_id}`] = row;
      }
      setVoteRightsByUserId(rightsMap);
    } else {
      setVoteRightsByUserId({});
    }
    setResolutionClauses((clauseRows as ClauseRow[]) ?? []);
    if (open) {
      const parsedTiming = parseModeratedTiming(open.description);
      const isMod = open.procedure_code === "moderated_caucus";
      const isUnmod = open.procedure_code === "unmoderated_caucus";
      const isConsult = open.procedure_code === "consultation";
      setMotionDraft({
        vote_type: open.vote_type,
        procedure_code: open.procedure_code,
        title: open.title ?? "",
        description: open.description ?? "",
        must_vote: open.must_vote,
        procedure_resolution_id: open.procedure_resolution_id,
        procedure_clause_ids: open.procedure_clause_ids ?? [],
        motioner_allocation_id: open.motioner_allocation_id ?? null,
        moderated_total_minutes: isMod ? parsedTiming.totalMinutes : "",
        moderated_speaker_seconds: isMod ? parsedTiming.speakerSeconds : "",
        unmoderated_total_minutes: isUnmod ? parsedTiming.totalMinutes : "",
        consultation_total_minutes: isConsult ? parsedTiming.totalMinutes : "",
        amendment_kind: "friendly",
        amendment_debate_seconds: "45",
      });
    }

    const motionId = open?.id ?? null;
    if (motionId) {
      const [{ data: openVotes }, { data: auditRows }] = await Promise.all([
        supabase.from("votes").select("value, user_id").eq("vote_item_id", motionId),
        supabase
          .from("motion_audit_events")
          .select("id, event_type, created_at, actor_profile_id, metadata")
          .eq("vote_item_id", motionId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const rows = (openVotes ?? []) as VoteCountRow[];
      const counted = rows.filter((v) => v.value === "yes" || v.value === "no");
      const yes = counted.filter((v) => v.value === "yes").length;
      const no = counted.filter((v) => v.value === "no").length;
      setMotionTally({ yes, no, total: counted.length });
      const vm: Record<string, "yes" | "no" | "abstain"> = {};
      for (const r of rows) {
        if (r.value === "yes" || r.value === "no" || r.value === "abstain") {
          vm[r.user_id] = r.value;
        }
      }
      setMotionVoteByUser(vm);
      setMotionAudit((auditRows as MotionAudit[]) ?? []);
    } else {
      setMotionTally({ yes: 0, no: 0, total: 0 });
      setMotionVoteByUser({});
      setMotionAudit([]);
    }

    if (t) {
      const tl = t.time_left_seconds ?? 0;
      const tt = t.total_time_seconds ?? 0;
      const tr = t as {
        per_speaker_mode?: boolean | null;
        is_running?: boolean | null;
        vote_item_id?: string | null;
        eu_timer_meta?: unknown;
      };
      const vid = tr.vote_item_id ?? null;
      const floorLabel = (t as { floor_label?: string | null }).floor_label ?? "";
      setTimer({
        current: t.current_speaker ?? "",
        next: t.next_speaker ?? "",
        leftM: String(Math.floor(tl / 60)),
        leftS: String(tl % 60),
        totalM: String(Math.floor(tt / 60)),
        totalS: String(tt % 60),
        perSpeakerMode: !!tr.per_speaker_mode,
        isRunning: tr.is_running !== false,
        purpose: vid ? "motion_vote" : "general_floor",
        boundVoteItemId: vid ?? "",
        floorLabel: floorLabel.trim(),
      });
      if (supportsEuTimerMeta) {
        setEuTimerMeta(normalizeEuTimerMeta(tr.eu_timer_meta));
      }
    } else {
      setEuTimerMeta(defaultEuTimerMeta());
    }
  }, [supabase, floorConferenceId, rosterConferenceIdList, rosterKey, conferenceId, supportsEuTimerMeta]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel(`chair-session-${floorConferenceId}-${rosterKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "roll_call_entries" },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timers" },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vote_items" },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "motion_audit_events" },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "procedure_states",
          filter: `conference_id=eq.${floorConferenceId}`,
        },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dais_announcements",
          filter: `conference_id=eq.${floorConferenceId}`,
        },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "speaker_queue_entries",
          filter: `conference_id=eq.${floorConferenceId}`,
        },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conferences", filter: `id=eq.${floorConferenceId}` },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chair_delegate_discipline",
          filter: `conference_id=eq.${floorConferenceId}`,
        },
        () => void refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, floorConferenceId, rosterKey, refresh]);

  const loadChairSpeechNotes = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("chair_speech_notes")
      .select("id, speaker_label, content, allocation_id, created_at, updated_at")
      .eq("conference_id", floorConferenceId)
      .eq("chair_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25);
    if (!error && data) setSpeechNotesRecent(data as ChairSpeechNoteRow[]);
  }, [supabase, floorConferenceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChairSpeechNotes();
  }, [loadChairSpeechNotes]);

  useEffect(() => {
    const ch = supabase
      .channel(`chair-speech-notes-${floorConferenceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chair_speech_notes",
          filter: `conference_id=eq.${floorConferenceId}`,
        },
        () => void loadChairSpeechNotes()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, floorConferenceId, loadChairSpeechNotes]);

  function parseTime(m: string, s: string) {
    const mi = Math.max(0, parseInt(m, 10) || 0);
    const se = Math.max(0, parseInt(s, 10) || 0);
    return mi * 60 + se;
  }

  function saveTimer() {
    let voteItemIdToSave: string | null = null;
    if (timer.purpose === "motion_vote") {
      const id = timer.boundVoteItemId.trim();
      if (!id) {
        setMsg("Select which open motion this timer applies to.");
        return;
      }
      if (!openVotingMotions.some((m) => m.id === id)) {
        setMsg("That selection is not an open vote anymore. Choose again or use general floor.");
        return;
      }
      voteItemIdToSave = id;
    }

    startTransition(async () => {
      let left = parseTime(timer.leftM, timer.leftS);
      let total = parseTime(timer.totalM, timer.totalS);
      if (left <= 0 && total <= 0) {
        setMsg("Set speaker time and/or total time: at least one must be greater than zero.");
        return;
      }
      if (total <= 0) total = left > 0 ? left : 60;
      let cappedToTotal = false;
      if (left > total) {
        left = total;
        cappedToTotal = true;
      }
      const payloadBase = {
        conference_id: floorConferenceId,
        current_speaker: timer.current.trim() || null,
        next_speaker: timer.next.trim() || null,
        time_left_seconds: left,
        total_time_seconds: total,
        vote_item_id: voteItemIdToSave,
        per_speaker_mode: timer.perSpeakerMode,
        is_running: timer.isRunning,
        floor_label: timer.floorLabel.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const firstAttempt = await supabase.from("timers").upsert(
        supportsEuTimerMeta ? { ...payloadBase, eu_timer_meta: euTimerMeta } : payloadBase,
        { onConflict: "conference_id" }
      );
      let error = firstAttempt.error;
      let fallbackWithoutMeta = false;
      if (error && supportsEuTimerMeta && isEuTimerMetaCacheError(error.message)) {
        setSupportsEuTimerMeta(false);
        const retry = await supabase.from("timers").upsert(payloadBase, { onConflict: "conference_id" });
        error = retry.error;
        fallbackWithoutMeta = !retry.error;
      }
      setMsg(
        error
          ? error.message
          : fallbackWithoutMeta
          ? `${tTimer("saved")} (EU timer names/tags will sync after database migrations are applied.)`
          : cappedToTotal
          ? tTimer("savedCapped")
          : tTimer("saved")
      );
      if (
        !error &&
        !timer.perSpeakerMode &&
        floorLabelLooksLikeGsl(timer.floorLabel) &&
        !suppressGslSavePromptRef.current
      ) {
        setSpeakerListChairPrompt((prev) => (prev === "moderated_passed" ? prev : "gsl"));
      }
      setTimer((t) => ({
        ...t,
        leftM: String(Math.floor(left / 60)),
        leftS: String(left % 60),
        totalM: String(Math.floor(total / 60)),
        totalS: String(total % 60),
      }));
      void refresh();
    });
  }

  function stopFloorTimer() {
    if (!liveTimerRow) {
      setMsg("Save the timer once so there is a row to pause.");
      return;
    }
    if (!timer.isRunning) {
      setMsg(tTimer("alreadyPaused"));
      return;
    }
    const frozenLeft = Math.max(0, Math.round(liveRemaining));
    const reason = pauseReasonDraft.trim() || "Paused by chair";
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: logErr } = await supabase.from("timer_pause_events").insert({
        conference_id: floorConferenceId,
        reason,
        created_by: user?.id ?? null,
      });
      if (logErr) {
        setMsg(logErr.message);
        return;
      }
      const { error } = await supabase
        .from("timers")
        .update({
          time_left_seconds: frozenLeft,
          is_running: false,
          current_pause_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_id", floorConferenceId);
      setMsg(error ? error.message : tTimer("pausedForCommittee"));
      void refresh();
    });
  }

  function startFloorTimer() {
    if (!liveTimerRow) {
      setMsg("Save the timer once before starting the clock.");
      return;
    }
    if (timer.isRunning) {
      setMsg(tTimer("alreadyRunning"));
      return;
    }
    startTransition(async () => {
      const { error } = await supabase
        .from("timers")
        .update({
          is_running: true,
          current_pause_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_id", floorConferenceId);
      setMsg(error ? error.message : tTimer("runningForCommittee"));
      void refresh();
    });
  }

  function recordDelegateVoteForAllocation(
    allocation: Alloc,
    value: "yes" | "no" | "abstain",
    withRights = false
  ) {
    if (!activeMotionForRecordedVotes) {
      setMsg("No motion open for voting.");
      return;
    }
    if (!allocation.user_id) {
      setMsg("This placard has no delegate account — vote cannot be recorded.");
      return;
    }

    const attendance = rollAttendanceByAllocationId.get(allocation.id) ?? "absent";
    const discipline = disciplineByAllocationId[allocation.id];
    if (discipline?.voting_rights_lost) {
      setMsg("This delegate lost voting rights due to disciplinary strike(s).");
      return;
    }
    const abstainAllowedByVoteType =
      activeMotionForRecordedVotes.vote_type === "resolution" ||
      activeMotionForRecordedVotes.vote_type === "amendment";
    const canAbstain = abstainAllowedByVoteType && attendance !== "present_voting";
    if (value === "abstain" && !canAbstain) {
      setMsg("Abstain is only available for resolutions/amendments when roll is not Present and voting.");
      return;
    }
    const uid = allocation.user_id;
    const voteItemId = activeMotionForRecordedVotes.id;
    let rightsStatement: string | null = null;
    if (withRights) {
      if (value !== "yes" && value !== "no") {
        setMsg("Vote with rights is only available for Yes/No.");
        return;
      }
      const drafted = window.prompt(
        `Statement for ${displayCountry(allocation.country)} (${value.toUpperCase()} with rights):`,
        ""
      );
      if (drafted === null) return;
      if (!drafted.trim()) {
        setMsg("A statement is required for vote with rights.");
        return;
      }
      rightsStatement = drafted.trim();
    }
    startTransition(async () => {
      const { error } = await supabase.from("votes").upsert(
        { vote_item_id: voteItemId, user_id: uid, value },
        { onConflict: "vote_item_id,user_id" }
      );
      if (error) {
        setMsg(error.message);
        return;
      }
      if (rightsStatement && (value === "yes" || value === "no")) {
        const { error: rightsError } = await supabase.from("vote_rights_statements").upsert(
          {
            vote_item_id: voteItemId,
            user_id: uid,
            vote_value: value,
            statement: rightsStatement,
          },
          { onConflict: "vote_item_id,user_id" }
        );
        if (rightsError) {
          setMsg(rightsError.message);
          return;
        }
      } else {
        await supabase
          .from("vote_rights_statements")
          .delete()
          .eq("vote_item_id", voteItemId)
          .eq("user_id", uid);
      }
      setMsg(null);
      void refresh();
    });
  }

  function clearDelegateVoteForAllocation(allocation: Alloc) {
    if (!activeMotionForRecordedVotes) {
      setMsg("No motion open for voting.");
      return;
    }
    if (!allocation.user_id) return;
    const voteItemId = activeMotionForRecordedVotes.id;
    startTransition(async () => {
      const { error } = await supabase
        .from("votes")
        .delete()
        .eq("vote_item_id", voteItemId)
        .eq("user_id", allocation.user_id);
      if (error) {
        setMsg(error.message);
        return;
      }
      await supabase
        .from("vote_rights_statements")
        .delete()
        .eq("vote_item_id", voteItemId)
        .eq("user_id", allocation.user_id);
      setMsg(null);
      void refresh();
    });
  }

  function addSessionPoint() {
    const detail = pointDraftDetail.trim();
    startTransition(async () => {
      const { error } = await supabase.from("chair_session_points").insert({
        conference_id: floorConferenceId,
        raised_by_allocation_id: pointDraftAllocationId || null,
        point_code: pointDraftCode,
        detail: detail || null,
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      setPointDraftDetail("");
      setPointDraftAllocationId("");
      setMsg("Point logged.");
      void refresh();
    });
  }

  function setSessionPointStatus(pointId: string, status: "accepted" | "denied") {
    startTransition(async () => {
      const { error } = await supabase
        .from("chair_session_points")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", pointId)
        .eq("conference_id", floorConferenceId);
      if (error) {
        setMsg(error.message);
        return;
      }
      setMsg(`Point ${status}.`);
      void refresh();
    });
  }

  function advanceSpeakerAndResetClock() {
    if (!timer.perSpeakerMode) {
      setMsg("Turn on per-speaker time first, then save the timer.");
      return;
    }
    startTransition(async () => {
      const rows = await fetchSpeakerQueue(supabase, floorConferenceId);
      const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
      const curIdx = sorted.findIndex((r) => r.status === "current");
      const currentRow = curIdx >= 0 ? sorted[curIdx] : null;
      const nextWaiting = sorted.find((r, i) => r.status === "waiting" && (!currentRow || i > curIdx));
      const firstWaiting = sorted.find((r) => r.status === "waiting");

      const nextCurrent = nextWaiting ?? firstWaiting;
      if (!nextCurrent) {
        setMsg("No waiting speakers in the queue to advance to.");
        return;
      }

      if (currentRow) {
        await supabase.from("speaker_queue_entries").update({ status: "done" }).eq("id", currentRow.id);
      }
      await supabase.from("speaker_queue_entries").update({ status: "current" }).eq("id", nextCurrent.id);

      const nextIdx = sorted.indexOf(nextCurrent);
      const afterNext = sorted.slice(nextIdx + 1).find((r) => r.status === "waiting");
      const cap = Math.max(1, parseTime(timer.totalM, timer.totalS) || parseTime(timer.leftM, timer.leftS) || 60);
      const curLabel = nextCurrent.label?.trim() || "—";
      const nextLabel = afterNext?.label?.trim() || "";

      const voteItemIdToSave =
        timer.purpose === "motion_vote" && timer.boundVoteItemId.trim()
          ? timer.boundVoteItemId.trim()
          : null;

      const { error } = await supabase.from("timers").upsert(
        {
          conference_id: floorConferenceId,
          current_speaker: curLabel,
          next_speaker: nextLabel || null,
          time_left_seconds: cap,
          total_time_seconds: cap,
          vote_item_id: voteItemIdToSave,
          per_speaker_mode: true,
          is_running: true,
          floor_label: timer.floorLabel.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "conference_id" }
      );

      setTimer((prev) => ({
        ...prev,
        current: curLabel,
        next: nextLabel,
        leftM: String(Math.floor(cap / 60)),
        leftS: String(cap % 60),
        totalM: String(Math.floor(cap / 60)),
        totalS: String(cap % 60),
        perSpeakerMode: true,
        isRunning: true,
        floorLabel: prev.floorLabel,
      }));
      setMsg(error ? error.message : "Advanced speaker and reset per-speaker clock.");
      void refresh();
    });
  }

  function saveChairSpeechNote() {
    const text = speechNoteDraft.trim();
    if (!text) {
      setMsg("Write something before saving a speech note.");
      return;
    }
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const queueAlloc = currentSpeakerQueueRow?.allocation_id ?? null;
      const queueCountry = queueAlloc
        ? displayCountry(allocations.find((a) => a.id === queueAlloc)?.country ?? null)
        : null;
      const timerLine = timer.current.trim();
      const speakerLabel =
        timerLine ||
        currentSpeakerQueueRow?.label?.trim() ||
        queueCountry ||
        "—";
      const { error } = await supabase.from("chair_speech_notes").insert({
        conference_id: floorConferenceId,
        chair_user_id: user.id,
        allocation_id: queueAlloc,
        speaker_label: speakerLabel,
        content: text,
      });
      setMsg(error ? error.message : "Speech note saved.");
      if (!error) {
        setSpeechNoteDraft("");
        void loadChairSpeechNotes();
      }
    });
  }

  function deleteChairSpeechNote(noteId: string) {
    startTransition(async () => {
      const { error } = await supabase.from("chair_speech_notes").delete().eq("id", noteId);
      setMsg(error ? error.message : "Speech note deleted.");
      if (!error) void loadChairSpeechNotes();
    });
  }

  function postDais() {
    const body = daisBody.trim();
    if (!body) return;
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const publishAtIso = daisPublishAt.trim() ? new Date(daisPublishAt).toISOString() : null;
      const { error } = await supabase.from("dais_announcements").insert({
        conference_id: floorConferenceId,
        body,
        created_by: user.id,
        body_format: daisFormat,
        publish_at: publishAtIso,
        is_pinned: false,
      });
      if (!error) {
        setDaisBody("");
        setDaisPublishAt("");
      }
      setMsg(error ? error.message : "Announcement posted.");
      void refresh();
    });
  }

  function setDaisPinned(announcementId: string, pinned: boolean) {
    startTransition(async () => {
      if (pinned) {
        await supabase
          .from("dais_announcements")
          .update({ is_pinned: false })
          .eq("conference_id", floorConferenceId);
        const { error } = await supabase
          .from("dais_announcements")
          .update({ is_pinned: true })
          .eq("id", announcementId);
        setMsg(error ? error.message : "Pinned for the committee floor.");
      } else {
        const { error } = await supabase
          .from("dais_announcements")
          .update({ is_pinned: false })
          .eq("id", announcementId);
        setMsg(error ? error.message : "Unpinned.");
      }
      void refresh();
    });
  }

  function beginEditDais(a: Announcement) {
    setDaisEditingId(a.id);
    setDaisEditBody(a.body);
    setDaisEditFormat(a.body_format === "markdown" ? "markdown" : "plain");
    setDaisEditPublishAt(isoToDatetimeLocalValue(a.publish_at ?? null));
  }

  function cancelEditDais() {
    setDaisEditingId(null);
    setDaisEditBody("");
    setDaisEditPublishAt("");
  }

  function saveDaisEdit() {
    if (!daisEditingId) return;
    const body = daisEditBody.trim();
    if (!body) {
      setMsg("Announcement body cannot be empty.");
      return;
    }
    const publishAtIso = daisEditPublishAt.trim() ? new Date(daisEditPublishAt).toISOString() : null;
    startTransition(async () => {
      const { error } = await supabase
        .from("dais_announcements")
        .update({
          body,
          body_format: daisEditFormat,
          publish_at: publishAtIso,
        })
        .eq("id", daisEditingId)
        .eq("conference_id", floorConferenceId);
      if (!error) cancelEditDais();
      setMsg(error ? error.message : "Announcement updated.");
      void refresh();
    });
  }

  function deleteDaisAnnouncement(id: string) {
    if (
      !window.confirm("Delete this announcement permanently? This cannot be undone.")
    ) {
      return;
    }
    startTransition(async () => {
      if (daisEditingId === id) cancelEditDais();
      const { error } = await supabase
        .from("dais_announcements")
        .delete()
        .eq("id", id)
        .eq("conference_id", floorConferenceId);
      setMsg(error ? error.message : "Announcement deleted.");
      void refresh();
    });
  }

  function initRollCall() {
    startTransition(async () => {
      const floorAllocations = allocations.filter((a) => a.conference_id === floorConferenceId);
      const rows = floorAllocations.map((a) => ({
        conference_id: a.conference_id,
        allocation_id: a.id,
        attendance: "absent" as const,
      }));
      if (!rows.length) {
        setMsg("No allocations to add.");
        return;
      }
      const { data: existing } = await supabase
        .from("roll_call_entries")
        .select("allocation_id")
        .eq("conference_id", floorConferenceId);
      const have = new Set((existing ?? []).map((r) => r.allocation_id));
      const newRows = rows.filter((r) => !have.has(r.allocation_id));
      if (!newRows.length) {
        setMsg("Roll call already has a row for every allocation.");
        void refresh();
        return;
      }
      const { error } = await supabase.from("roll_call_entries").insert(newRows);
      setMsg(error ? error.message : `Added ${newRows.length} roll call row(s).`);
      void refresh();
    });
  }

  function setRollAttendanceForRow(allocationId: string, attendance: RollAttendance) {
    const row = roll.find((x) => x.allocation_id === allocationId);
    if (row?.attendance === attendance) return;
    startTransition(async () => {
      const rollConferenceId =
        row?.conference_id ??
        allocations.find((a) => a.id === allocationId)?.conference_id ??
        floorConferenceId;
      await supabase
        .from("roll_call_entries")
        .update({ attendance, updated_at: new Date().toISOString() })
        .eq("conference_id", rollConferenceId)
        .eq("allocation_id", allocationId);
      void refresh();
    });
  }

  type MotionDraftState = typeof motionDraft;

  function createMotion(draftOverride?: MotionDraftState) {
    const draft = draftOverride ?? motionDraft;
    const draftError = validateMotionDraft(draft);
    if (draftError) return setMsg(draftError);
    if (!confirmEuPhaseOverride(draft.procedure_code)) return;
    if (!quorumStatus.hasQuorum) {
      const proceed = window.confirm(
        `Quorum not met: ${quorumStatus.present}/${votingCallOrder.length} present (need ${quorumStatus.required}). Proceed anyway and save this motion?`
      );
      if (!proceed) {
        setMsg(
          `Quorum not met: ${quorumStatus.present}/${votingCallOrder.length} present (need ${quorumStatus.required}).`
        );
        return;
      }
    }
    if (openMotion) {
      setMsg("Close the current motion before opening another.");
      return;
    }
    if (motionFloorOpen) {
      setMsg(
        "The motion floor is open for statements. Close the floor and use Record stated motion, or close the floor first to create a single open vote."
      );
      return;
    }
    if (pendingStatedMotions.length > 0) {
      setMsg(
        "Stated motions are waiting to be voted. Use Begin voting (RoP order) or withdraw them before using Create and open motion."
      );
      return;
    }
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open, state, current_vote_item_id")
        .eq("conference_id", floorConferenceId)
        .maybeSingle();
      const debateClosed = psRow?.debate_closed ?? false;
      const motionFloor = psRow?.motion_floor_open ?? false;

      const { data: inserted, error } = await supabase
        .from("vote_items")
        .insert({
        conference_id: floorConferenceId,
        vote_type: draft.vote_type,
          procedure_code: draft.procedure_code,
          procedure_resolution_id: draft.procedure_resolution_id,
          procedure_clause_ids: draft.procedure_clause_ids,
        title: draft.title.trim() || null,
        description: withModeratedTimingInDescription(draft),
        must_vote: draft.must_vote,
        required_majority: ropRequiredMajority(draft.vote_type, draft.procedure_code, procedureProfile),
        motioner_allocation_id: draft.motioner_allocation_id || null,
        open_for_voting: true,
        })
        .select("id")
        .maybeSingle();

      setMsg(error ? error.message : "Motion created and opened.");
      if (!error && inserted?.id) {
        await supabase.from("procedure_states").upsert({
          conference_id: floorConferenceId,
          state: "voting_procedure",
          current_vote_item_id: inserted.id,
          debate_closed: debateClosed,
          motion_floor_open: motionFloor,
          updated_at: new Date().toISOString(),
        });
        setMotionDraft({
          vote_type: "motion",
          procedure_code: null,
          title: "",
          description: "",
          must_vote: false,
          procedure_resolution_id: null,
          procedure_clause_ids: [],
          motioner_allocation_id: null,
          moderated_total_minutes: "",
          moderated_speaker_seconds: "",
          unmoderated_total_minutes: "",
          consultation_total_minutes: "",
          amendment_kind: "friendly",
          amendment_debate_seconds: "45",
        });
      }
      void refresh();
    });
  }

  function saveMotionEdits() {
    if (!openMotion) return;
    const draftError = validateMotionDraft(motionDraft);
    if (draftError) return setMsg(draftError);
    startTransition(async () => {
      const { error } = await supabase
        .from("vote_items")
        .update({
          vote_type: motionDraft.vote_type,
          procedure_code: motionDraft.procedure_code,
          procedure_resolution_id: motionDraft.procedure_resolution_id,
          procedure_clause_ids: motionDraft.procedure_clause_ids,
          title: motionDraft.title.trim() || null,
          description: withModeratedTimingInDescription(motionDraft),
          must_vote: motionDraft.must_vote,
          required_majority: ropRequiredMajority(
            motionDraft.vote_type,
            motionDraft.procedure_code,
            procedureProfile
          ),
          motioner_allocation_id: motionDraft.motioner_allocation_id || null,
        })
        .eq("id", openMotion.id);
      setMsg(error ? error.message : "Motion updated.");
      void refresh();
    });
  }

  function closeMotion() {
    if (!openMotion) return;
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open")
        .eq("conference_id", floorConferenceId)
        .maybeSingle();
      const debateClosed = psRow?.debate_closed ?? false;
      const motionFloor = psRow?.motion_floor_open ?? false;

      const { error } = await supabase
        .from("vote_items")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", openMotion.id);
      setMsg(error ? error.message : "Motion closed.");
      if (!error) {
        const membersPresent = membersPresentForMajorityDenominator(
          rollAttendanceByAllocationId,
          votingCallOrder.map((a) => a.id)
        );
        const passes =
          openMotion.vote_type === "motion"
            ? didProceduralMotionPassAgainstRollPresent(
                openMotion.required_majority,
                motionTally.yes,
                membersPresent
              )
            : didMotionPass(openMotion.required_majority, motionTally.yes, motionTally.total);

        const hasClauseTargets =
          !!openMotion.procedure_resolution_id &&
          Array.isArray(openMotion.procedure_clause_ids) &&
          openMotion.procedure_clause_ids.length > 0;
        if (hasClauseTargets) {
          const outcomeResult = await recordClauseVoteOutcomesAction({
            voteItemId: openMotion.id,
            resolutionId: openMotion.procedure_resolution_id as string,
            clauseIds: openMotion.procedure_clause_ids,
            passed: passes,
            removeClauseTargetsOnFail: true,
            procedureCode: openMotion.procedure_code,
          });
          if (!outcomeResult.ok) {
            setMsg(outcomeResult.error);
            void refresh();
            return;
          }
        }

        let nextDebateClosed = debateClosed;
        if (openMotion.procedure_code === "close_debate") {
          nextDebateClosed = passes;
        }
        if (openMotion.procedure_code === "open_debate") {
          // Allow chairs to return to debate if explicitly reopened.
          nextDebateClosed = !passes ? debateClosed : false;
        }

        const nextState = nextDebateClosed ? "voting_procedure" : "debate_open";
        await supabase.from("procedure_states").upsert({
          conference_id: floorConferenceId,
          state: nextState,
          current_vote_item_id: null,
          debate_closed: nextDebateClosed,
          motion_floor_open: motionFloor,
          updated_at: new Date().toISOString(),
        });

        if (passes && openMotion.procedure_code === "moderated_caucus") {
          setSpeakerListChairPrompt("moderated_passed");
        }
        if (passes && openMotion.procedure_code === "open_gsl") {
          setSpeakerListChairPrompt("gsl");
        }
        if (isEuGuidedWorkflow && passes) {
          if (openMotion.procedure_code === "set_agenda") {
            await persistEuSessionPhase("opening_speeches");
          } else if (openMotion.procedure_code === "cabinet_meeting") {
            await persistEuSessionPhase("cabinet_meeting");
          } else if (openMotion.procedure_code === "shadow_meeting") {
            await persistEuSessionPhase("shadow_meeting");
          } else if (
            openMotion.procedure_code === "moderated_caucus" ||
            openMotion.procedure_code === "consultation" ||
            openMotion.procedure_code === "unmoderated_caucus"
          ) {
            await persistEuSessionPhase("formal_debate");
          } else if (
            openMotion.procedure_code === "open_debate" ||
            openMotion.procedure_code === "for_against_speeches"
          ) {
            await persistEuSessionPhase("resolution_debate");
          } else if (openMotion.procedure_code === "close_debate") {
            await persistEuSessionPhase("voting_procedure");
          } else if (openMotion.procedure_code === "adjourn") {
            await persistEuSessionPhase("adjourned");
          }
        }
        if (isEuGuidedWorkflow && openMotion.vote_type === "resolution") {
          await persistEuSessionPhase("closing_statements");
        }
      }
      void refresh();
    });
  }

  function reopenMotion(voteItemId: string) {
    startTransition(async () => {
      const { data: blocking } = await supabase
        .from("vote_items")
        .select("id")
        .eq("conference_id", floorConferenceId)
        .is("closed_at", null)
        .eq("open_for_voting", true)
        .maybeSingle();
      if (blocking && blocking.id !== voteItemId) {
        setMsg("Another motion is already open for voting. Close it before reopening this one.");
        return;
      }

      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open")
        .eq("conference_id", floorConferenceId)
        .maybeSingle();
      const debateClosed = psRow?.debate_closed ?? false;
      const motionFloor = psRow?.motion_floor_open ?? false;

      const { error } = await supabase
        .from("vote_items")
        .update({ closed_at: null, open_for_voting: true })
        .eq("id", voteItemId);
      setMsg(error ? error.message : "Motion reopened.");
      if (!error) {
        await supabase.from("procedure_states").upsert({
          conference_id: floorConferenceId,
          state: "voting_procedure",
          current_vote_item_id: voteItemId,
          debate_closed: debateClosed,
          motion_floor_open: motionFloor,
          updated_at: new Date().toISOString(),
        });
      }
      void refresh();
    });
  }

  function openMotionFloorForStatements() {
    if (
      isEuGuidedWorkflow &&
      (euSessionPhase === "voting_procedure" ||
        euSessionPhase === "closing_statements" ||
        euSessionPhase === "adjourned")
    ) {
      setMsg(`Motion floor is unavailable during ${euSessionPhaseLabel(euSessionPhase)}.`);
      return;
    }
    if (openMotion) {
      setMsg("Close the current vote before opening the motion floor for statements.");
      return;
    }
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open, state, current_vote_item_id")
        .eq("conference_id", floorConferenceId)
        .maybeSingle();
      const { error } = await supabase.from("procedure_states").upsert({
        conference_id: floorConferenceId,
        state: (psRow?.state as string) ?? "debate_open",
        current_vote_item_id: psRow?.current_vote_item_id ?? null,
        debate_closed: psRow?.debate_closed ?? false,
        motion_floor_open: true,
        updated_at: new Date().toISOString(),
      });
      setMsg(error ? error.message : "Motion floor open — record each stated motion below.");
      void refresh();
    });
  }

  function closeMotionFloorForStatements() {
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open, state, current_vote_item_id")
        .eq("conference_id", floorConferenceId)
        .maybeSingle();
      const { error } = await supabase.from("procedure_states").upsert({
        conference_id: floorConferenceId,
        state: (psRow?.state as string) ?? "debate_open",
        current_vote_item_id: psRow?.current_vote_item_id ?? null,
        debate_closed: psRow?.debate_closed ?? false,
        motion_floor_open: false,
        updated_at: new Date().toISOString(),
      });
      setMsg(error ? error.message : "Motion floor closed for statements.");
      void refresh();
    });
  }

  function recordStatedMotion(draftOverride?: MotionDraftState) {
    const draft = draftOverride ?? motionDraft;
    if (!motionFloorOpen) {
      setMsg("Open the motion floor for statements first.");
      return;
    }
    if (openMotion) {
      setMsg("A motion is already open for voting. Close it before recording further statements.");
      return;
    }
    const draftError = validateMotionDraft(draft);
    if (draftError) return setMsg(draftError);
    if (!confirmEuPhaseOverride(draft.procedure_code)) return;
    if (!quorumStatus.hasQuorum) {
      const proceed = window.confirm(
        `Quorum not met: ${quorumStatus.present}/${votingCallOrder.length} present (need ${quorumStatus.required}). Proceed anyway and record this stated motion?`
      );
      if (!proceed) {
        setMsg(
          `Quorum not met: ${quorumStatus.present}/${votingCallOrder.length} present (need ${quorumStatus.required}).`
        );
        return;
      }
    }
    startTransition(async () => {
      const { error } = await supabase.from("vote_items").insert({
        conference_id: floorConferenceId,
        vote_type: draft.vote_type,
        procedure_code: draft.procedure_code,
        procedure_resolution_id: draft.procedure_resolution_id,
        procedure_clause_ids: draft.procedure_clause_ids,
        title: draft.title.trim() || null,
        description: withModeratedTimingInDescription(draft),
        must_vote: draft.must_vote,
        required_majority: ropRequiredMajority(draft.vote_type, draft.procedure_code, procedureProfile),
        motioner_allocation_id: draft.motioner_allocation_id || null,
        open_for_voting: false,
      });
      setMsg(error ? error.message : "Stated motion recorded (not yet open for voting).");
      if (!error) {
        setMotionDraft({
          vote_type: "motion",
          procedure_code: null,
          title: "",
          description: "",
          must_vote: false,
          procedure_resolution_id: null,
          procedure_clause_ids: [],
          motioner_allocation_id: null,
          moderated_total_minutes: "",
          moderated_speaker_seconds: "",
          unmoderated_total_minutes: "",
          consultation_total_minutes: "",
          amendment_kind: "friendly",
          amendment_debate_seconds: "45",
        });
      }
      void refresh();
    });
  }

  function startGuidedMotionFlow() {
    const options = procedurePresets.filter((p) => p.code !== null);
    const pickRaw = window.prompt(
      [
        tSessionControl("guidedStepChooseProcedure"),
        ...options.map((p, i) => `${i + 1}. ${p.label}`),
      ].join("\n")
    );
    if (!pickRaw) return;
    const pick = Number(pickRaw);
    if (!Number.isFinite(pick) || pick < 1 || pick > options.length) {
      setMsg(tSessionControl("invalidProcedureSelection"));
      return;
    }
    const selected = options[pick - 1]!;
    const procedureCode = selected.code;

    let titleTrimmed = "";
    if (procedureCode === "set_agenda") {
      const topics = agendaTopicsRemaining.filter((t) => (t.name ?? "").trim().length > 0);
      if (topics.length === 0) {
        setMsg("No agenda topics available for this committee.");
        return;
      }
      const pickTopicRaw = window.prompt(
        [
          "Step 2/5: Choose agenda topic (enter number).",
          ...topics.map((t, i) => `${i + 1}. ${String(t.name).trim()}`),
        ].join("\n"),
        "1"
      );
      if (!pickTopicRaw) return;
      const pickTopic = Number(pickTopicRaw);
      if (!Number.isFinite(pickTopic) || pickTopic < 1 || pickTopic > topics.length) {
        setMsg("Invalid agenda topic selection.");
        return;
      }
      titleTrimmed = String(topics[pickTopic - 1]!.name ?? "").trim();
    } else {
      const titlePrompt =
        procedureCode === "consultation"
          ? "Step 2/5: Topic / purpose"
          : procedureCode === "moderated_caucus"
            ? "Step 2/5: Topic"
            : procedureCode === "unmoderated_caucus"
              ? "Step 2/5: Topic (optional)"
              : "Step 2/5: Motion title (optional)";
      const titleInput = window.prompt(titlePrompt, selected.title ?? selected.label);
      if (titleInput === null) return;
      titleTrimmed = titleInput.trim();
      if (!titleTrimmed) {
        if (procedureCode === "consultation") {
          setMsg("Consultation requires a topic or purpose.");
          return;
        }
        if (procedureCode === "moderated_caucus") {
          setMsg("Topic is required.");
          return;
        }
      }
    }

    const motionerInput = window.prompt(
      [
        "Step 3/5: Motioner (optional, enter number or leave blank).",
        "0. Not specified",
        ...allocations.map((a, i) => `${i + 1}. ${displayCountry(a.country)}`),
      ].join("\n"),
      "0"
    );
    let motionerId: string | null = null;
    if (motionerInput && motionerInput.trim() !== "" && motionerInput.trim() !== "0") {
      const idx = Number(motionerInput);
      if (Number.isFinite(idx) && idx >= 1 && idx <= allocations.length) {
        motionerId = allocations[idx - 1]!.id;
      }
    }

    let description = window.prompt("Step 4/5: Description / notes (optional)", "") ?? "";
    if (
      procedureCode === "moderated_caucus" ||
      procedureCode === "unmoderated_caucus" ||
      procedureCode === "consultation"
    ) {
      const totalRequired =
        procedureCode === "moderated_caucus" ||
        procedureCode === "unmoderated_caucus" ||
        procedureCode === "consultation";
      const totalMinutes = window.prompt(
        `Timing: total minutes${totalRequired ? " (required)" : ""}`,
        "10"
      );
      if (procedureCode === "moderated_caucus" && (!totalMinutes || Number(totalMinutes) <= 0)) {
        setMsg("Moderated caucus requires total time (minutes).");
        return;
      }
      if (procedureCode === "unmoderated_caucus" && (!totalMinutes || Number(totalMinutes) <= 0)) {
        setMsg("Unmoderated caucus requires total time (minutes).");
        return;
      }
      if (procedureCode === "consultation" && (!totalMinutes || Number(totalMinutes) <= 0)) {
        setMsg("Consultation requires total time (minutes).");
        return;
      }
      if (totalMinutes && Number(totalMinutes) > 0) {
        let timing = `Timing: total ${totalMinutes} min`;
        if (procedureCode === "moderated_caucus") {
          const speakerSeconds = window.prompt("Timing: speaker seconds (required)", "60");
          if (!speakerSeconds || Number(speakerSeconds) <= 0) {
            setMsg("Moderated caucus requires speaker time (seconds).");
            return;
          }
          timing += `, speaker ${speakerSeconds}s`;
        }
        description = description.trim() ? `${description.trim()}\n${timing}` : timing;
      }
    }

    let resolutionId: string | null = null;
    let clauseIds: string[] = [];
    if (motionRequiresResolutionOnly(procedureCode) || motionRequiresClauseTargets(procedureCode)) {
      if (resolutions.length === 0) {
        setMsg("No resolutions available for this motion.");
        return;
      }
      const resPick = window.prompt(
        [
          "Step 5/5: Select target resolution (number).",
          ...resolutions.map((r, i) => `${i + 1}. ${r.id.slice(0, 8)} ${r.google_docs_url ? `(${r.google_docs_url})` : ""}`),
        ].join("\n")
      );
      const rIdx = Number(resPick);
      if (!Number.isFinite(rIdx) || rIdx < 1 || rIdx > resolutions.length) {
        setMsg("Resolution selection is required.");
        return;
      }
      resolutionId = resolutions[rIdx - 1]!.id;

      if (motionRequiresClauseTargets(procedureCode)) {
        const clauses = resolutionClauses.filter((c) => c.resolution_id === resolutionId);
        if (clauses.length === 0) {
          setMsg("No clauses available for selected resolution.");
          return;
        }
        const clausePick = window.prompt(
          [
            "Choose clause numbers (comma-separated indexes).",
            ...clauses.map((c, i) => `${i + 1}. Clause ${c.clause_number}: ${c.clause_text.slice(0, 60)}...`),
          ].join("\n")
        );
        if (!clausePick) {
          setMsg("At least one clause is required.");
          return;
        }
        const picked = clausePick
          .split(",")
          .map((x) => Number(x.trim()))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= clauses.length)
          .map((n) => clauses[n - 1]!.id);
        clauseIds = Array.from(new Set(picked));
        if (clauseIds.length === 0) {
          setMsg("At least one clause is required.");
          return;
        }
      }
    }

    const nextDraft: MotionDraftState = {
      vote_type: "motion",
      procedure_code: procedureCode,
      title: titleTrimmed,
      description: description.trim(),
      must_vote: false,
      procedure_resolution_id: resolutionId,
      procedure_clause_ids: clauseIds,
      motioner_allocation_id: motionerId,
      moderated_total_minutes:
        procedureCode === "moderated_caucus"
          ? (description.match(/total\s+(\d+)\s*min/i)?.[1] ?? "")
          : "",
      moderated_speaker_seconds:
        procedureCode === "moderated_caucus"
          ? (description.match(/speaker\s+(\d+)\s*s/i)?.[1] ?? "")
          : "",
      unmoderated_total_minutes:
        procedureCode === "unmoderated_caucus"
          ? (description.match(/total\s+(\d+)\s*min/i)?.[1] ?? "")
          : "",
      consultation_total_minutes:
        procedureCode === "consultation"
          ? (description.match(/total\s+(\d+)\s*min/i)?.[1] ?? "")
          : "",
      amendment_kind: "friendly",
      amendment_debate_seconds: "45",
    };

    setMotionDraft(nextDraft);

    if (motionFloorOpen) {
      if (window.confirm("Record this as a stated motion now?")) {
        recordStatedMotion(nextDraft);
        return;
      }
      setMsg("Guided draft loaded. Motion floor is open — click Record stated motion when ready.");
      return;
    }

    if (window.confirm("Create and open this motion for voting now?")) {
      createMotion(nextDraft);
      return;
    }
    setMsg("Guided draft loaded. Review and click Create and open motion when ready.");
  }

  function beginVotingInDisruptivenessOrder() {
    if (
      isEuGuidedWorkflow &&
      euSessionPhase !== "formal_debate" &&
      euSessionPhase !== "resolution_debate" &&
      euSessionPhase !== "voting_procedure"
    ) {
      const proceed = window.confirm(
        `EU guided phase is ${euSessionPhaseLabel(euSessionPhase)}. Begin voting anyway?`
      );
      if (!proceed) return;
    }
    if (!quorumStatus.hasQuorum) {
      setMsg(
        `Quorum not met: ${quorumStatus.present}/${votingCallOrder.length} present (need ${quorumStatus.required}).`
      );
      return;
    }
    if (motionFloorOpen) {
      setMsg("Close the motion floor for statements before beginning votes.");
      return;
    }
    if (openMotion) {
      setMsg("A motion is already open for voting.");
      return;
    }
    const ordered = sortMotionsMostDisruptiveFirst(pendingStatedMotions, caucusPrecedence, procedureProfile);
    if (!ordered.length) {
      setMsg("No stated motions are waiting to be voted on.");
      return;
    }
    const first = ordered[0];
    startTransition(async () => {
      const { data: psRow } = await supabase
        .from("procedure_states")
        .select("debate_closed, motion_floor_open, state, current_vote_item_id")
        .eq("conference_id", floorConferenceId)
        .maybeSingle();
      const { error: uErr } = await supabase
        .from("vote_items")
        .update({ open_for_voting: true })
        .eq("id", first.id)
        .eq("open_for_voting", false);
      if (uErr) {
        setMsg(uErr.message);
        void refresh();
        return;
      }
      const { error: pErr } = await supabase.from("procedure_states").upsert({
        conference_id: floorConferenceId,
        state: "voting_procedure",
        current_vote_item_id: first.id,
        debate_closed: psRow?.debate_closed ?? false,
        motion_floor_open: false,
        eu_session_phase: isEuGuidedWorkflow ? "voting_procedure" : undefined,
        eu_last_phase_change_at: isEuGuidedWorkflow ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      });
      setMsg(
        pErr
          ? pErr.message
          : `Opened for voting: ${first.title ?? "Motion"} (most disruptive of the pending set).`
      );
      void refresh();
    });
  }

  function withdrawStatedMotion(voteItemId: string) {
    startTransition(async () => {
      const { error } = await supabase
        .from("vote_items")
        .delete()
        .eq("id", voteItemId)
        .eq("conference_id", floorConferenceId)
        .eq("open_for_voting", false);
      setMsg(error ? error.message : "Stated motion removed.");
      void refresh();
    });
  }

  /** Deletes an open-for-voting or closed motion; pending stated motions use {@link withdrawStatedMotion}. */
  function deleteMotionAsChair(voteItemId: string) {
    startTransition(async () => {
      const { data: row, error: fetchErr } = await supabase
        .from("vote_items")
        .select("open_for_voting, closed_at")
        .eq("id", voteItemId)
        .eq("conference_id", floorConferenceId)
        .maybeSingle();

      if (fetchErr) {
        setMsg(fetchErr.message);
        void refresh();
        return;
      }
      if (!row) {
        setMsg("Motion not found.");
        void refresh();
        return;
      }

      const isPendingStated = row.closed_at === null && row.open_for_voting === false;
      if (isPendingStated) {
        setMsg("Remove pending stated motions with Withdraw in the list above.");
        void refresh();
        return;
      }

      const isLiveOpen = row.closed_at === null && row.open_for_voting === true;
      let psRow: {
        debate_closed?: boolean;
        motion_floor_open?: boolean;
        current_vote_item_id?: string | null;
      } | null = null;
      if (isLiveOpen) {
        const { data: ps } = await supabase
          .from("procedure_states")
          .select("debate_closed, motion_floor_open, current_vote_item_id")
          .eq("conference_id", floorConferenceId)
          .maybeSingle();
        psRow = ps;
      }

      const { error: delErr } = await supabase
        .from("vote_items")
        .delete()
        .eq("id", voteItemId)
        .eq("conference_id", floorConferenceId);

      if (delErr) {
        setMsg(delErr.message);
        void refresh();
        return;
      }

      if (isLiveOpen && psRow?.current_vote_item_id === voteItemId) {
        const { error: psErr } = await supabase.from("procedure_states").upsert({
          conference_id: floorConferenceId,
          state: psRow.debate_closed ? "voting_procedure" : "debate_open",
          current_vote_item_id: null,
          debate_closed: psRow.debate_closed ?? false,
          motion_floor_open: psRow.motion_floor_open ?? false,
          updated_at: new Date().toISOString(),
        });
        if (psErr) {
          setMsg(psErr.message);
          void refresh();
          return;
        }
      }

      setMsg("Motion deleted.");
      void refresh();
    });
  }

  const surfaceCard =
    "rounded-xl border border-white/15 bg-black/25 p-3 text-brand-navy shadow-sm backdrop-blur-sm";
  const surfaceLabel = "text-xs font-medium uppercase tracking-wide text-brand-muted";
  const surfaceInputCore =
    "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-brand-navy shadow-inner placeholder:text-brand-muted/60 focus:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/40";
  const surfaceField = `mt-1 ${surfaceInputCore}`;
  const surfaceFieldSm =
    "rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-brand-navy shadow-inner focus:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/40";
  const surfaceSubpanel = "space-y-3 rounded-lg border border-white/15 bg-black/20 p-3 text-brand-navy";
  const surfaceInset =
    "max-h-36 space-y-1 overflow-y-auto rounded border border-white/15 bg-black/30 p-2 text-xs text-brand-navy";

  const show = (id: Exclude<SessionFloorSection, "all">) =>
    activeSection === "all" || activeSection === id;
  const activeMotionForRecordedVotes = useMemo(() => {
    const boundId = timer.boundVoteItemId.trim();
    if (boundId) {
      return openVotingMotions.find((m) => m.id === boundId) ?? null;
    }
    return openMotion;
  }, [openMotion, openVotingMotions, timer.boundVoteItemId]);

  return (
    <div className="space-y-10">
      <p className="text-sm text-brand-muted">{conferenceTitle}</p>
      {(debateTopicOptions?.length ?? 0) > 1 ? (
        <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-3 space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
            {tSessionControl("liveDebateTopic")}
          </p>
          <div className="flex flex-wrap gap-2">
            {(debateTopicOptions ?? []).map((t) => {
              const isActive = floorConferenceId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={pending || isActive}
                  onClick={() => {
                    startTransition(async () => {
                      const r = await setActiveDebateTopicAction(t.id);
                      if (r.error) setMsg(r.error);
                      else setMsg(null);
                    });
                  }}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-60",
                    isActive
                      ? "border-brand-accent/60 bg-brand-accent/20 text-brand-navy font-medium"
                      : "border-white/20 bg-black/25 text-brand-navy hover:bg-black/20",
                  ].join(" ")}
                  aria-pressed={isActive}
                >
                  {translateAgendaTopicLabel(tTopics, t.label)}
                </button>
              );
            })}
          </div>
          <p className="max-w-2xl text-xs text-brand-muted">
            {tTopicUi("sessionControlHint")}
          </p>
        </div>
      ) : null}
      {msg && (
        <p className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-brand-navy shadow-sm">
          {msg}
        </p>
      )}

      {show("motions") ? (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-brand-navy">{tSessionControl("motionControl")}</h3>
          <HelpButton title={tSessionControl("motionControl")}>
            {tSessionControl("motionControlHelp")}
          </HelpButton>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["setup", tSessionControl("tabSetup")],
              ["floor", tSessionControl("tabFloorQueue")],
              ["draft", tSessionControl("tabDraftMotion")],
              ["votes", tSessionControl("tabRecordVotes")],
              ["history", tSessionControl("tabHistory")],
            ] as const
          ).map(([id, label]) => {
            const active = motionWorkflowTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMotionWorkflowTab(id)}
                className={[
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-brand-accent/60 bg-brand-accent/20 text-brand-navy"
                    : "border-white/20 bg-black/25 text-brand-muted hover:text-brand-navy hover:bg-black/20",
                ].join(" ")}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
        {motionWorkflowTab === "setup" ? (
          <>
        <p className="text-xs text-brand-muted">{tSessionControl("chairOnlyVotingHelp")}</p>
        <p className="text-xs text-brand-muted">
          Quorum gate:{" "}
          <span className="font-medium text-brand-navy">
            {quorumStatus.present}/{votingCallOrder.length}
          </span>{" "}
          present on roll (need{" "}
          <span className="font-medium text-brand-navy">{quorumStatus.required}</span>, two-thirds).
        </p>
        {isEuGuidedWorkflow ? (
          <div className="rounded-lg border border-brand-accent/35 bg-brand-accent/10 px-3 py-2.5 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-navy">
              {tSessionControl("euGuidedPhase")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-brand-accent/40 bg-brand-accent/15 px-2 py-1 text-sm font-medium text-brand-navy">
                {euSessionPhaseLabel(euSessionPhase)}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const next = previousEuSessionPhase(euSessionPhase);
                  if (next === euSessionPhase) return;
                  startTransition(async () => {
                    const ok = await persistEuSessionPhase(next);
                    if (ok) setMsg(`EU phase moved back to ${euSessionPhaseLabel(next)}.`);
                    void refresh();
                  });
                }}
                className="rounded-lg border border-white/20 bg-black/25 px-2.5 py-1.5 text-xs font-medium text-brand-navy disabled:opacity-50"
              >
                Previous phase
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const next = nextEuSessionPhase(euSessionPhase);
                  if (next === euSessionPhase) return;
                  startTransition(async () => {
                    const ok = await persistEuSessionPhase(next);
                    if (ok) setMsg(`EU phase advanced to ${euSessionPhaseLabel(next)}.`);
                    void refresh();
                  });
                }}
                className="rounded-lg border border-brand-accent/45 bg-brand-accent/15 px-2.5 py-1.5 text-xs font-medium text-brand-navy disabled:opacity-50"
              >
                Advance phase
              </button>
              {euSessionPhase === "voting_procedure" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const ok = await persistEuSessionPhase("closing_statements");
                      if (!ok) return;
                      setTimer((t) => ({
                        ...t,
                        floorLabel: "EU closing statements (60s)",
                        totalM: "1",
                        totalS: "0",
                        leftM: "1",
                        leftS: "0",
                        perSpeakerMode: true,
                      }));
                      setMsg("Closing statements started (default 60 seconds). Save timer to publish.");
                      void refresh();
                    });
                  }}
                  className="rounded-lg border border-brand-accent/45 bg-brand-accent/20 px-2.5 py-1.5 text-xs font-medium text-brand-navy disabled:opacity-50"
                >
                  Start closing statements
                </button>
              ) : null}
            </div>
            <p className="text-xs text-brand-muted">
              {tSessionControl("euGuidedPhaseHint")}
            </p>
          </div>
        ) : null}
          </>
        ) : null}
        <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">{tSessionControl("pointsWorkflow")}</p>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
            <select
              value={pointDraftCode}
              onChange={(e) => setPointDraftCode(e.target.value as SessionPointCode)}
              className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-brand-navy"
            >
              <option value="poi">{tSessionControl("pointOfInformation")}</option>
              <option value="poc">{tSessionControl("pointOfClarification")}</option>
              <option value="parliamentary_inquiry">{tSessionControl("parliamentaryInquiry")}</option>
              <option value="order">{tSessionControl("pointOfOrder")}</option>
              <option value="personal_privilege">{tSessionControl("personalPrivilege")}</option>
              <option value="right_of_reply">{tSessionControl("rightOfReply")}</option>
              <option value="fact_check">{tSessionControl("factCheck")}</option>
            </select>
            <select
              value={pointDraftAllocationId}
              onChange={(e) => setPointDraftAllocationId(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-brand-navy"
            >
              <option value="">{tSessionControl("raisedByOptional")}</option>
              {votingCallOrder.map((a) => (
                <option key={a.id} value={a.id}>
                  {displayCountry(a.country)}
                </option>
              ))}
            </select>
            <input
              value={pointDraftDetail}
              onChange={(e) => setPointDraftDetail(e.target.value)}
              placeholder={tSessionControl("detailOptional")}
              className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-brand-navy"
            />
            <button
              type="button"
              disabled={pending}
              onClick={addSessionPoint}
              className="rounded-lg border border-brand-accent/45 bg-brand-accent/15 px-2.5 py-1.5 text-xs font-medium text-brand-navy disabled:opacity-50"
            >
              {tSessionControl("logPoint")}
            </button>
          </div>
          {sessionPoints.length > 0 ? (
            <div className="max-h-28 overflow-y-auto space-y-1 rounded border border-white/12 bg-black/25 p-2">
              {sessionPoints.slice(0, 8).map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-navy">
                  <span>
                    <span className="font-medium">{p.point_code.replaceAll("_", " ")}</span>
                    {p.detail ? ` — ${p.detail}` : ""}
                  </span>
                  {p.status === "pending" ? (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setSessionPointStatus(p.id, "accepted")}
                        className="rounded border border-emerald-500/40 px-1.5 py-0.5 text-[10px]"
                      >
                        {tSessionControl("accept")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSessionPointStatus(p.id, "denied")}
                        className="rounded border border-rose-500/40 px-1.5 py-0.5 text-[10px]"
                      >
                        {tSessionControl("deny")}
                      </button>
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-brand-muted">{p.status}</span>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className={`${surfaceCard} space-y-3`}>
          {motionWorkflowTab === "floor" ? (
            <>
          <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 space-y-2">
            <p className="text-sm font-medium text-brand-navy">
              Motion floor:{" "}
              <span className={motionFloorOpen ? "text-amber-300" : "text-brand-muted"}>
                {motionFloorOpen ? "open for statements" : "closed"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending || !!openMotion}
                onClick={startGuidedMotionFlow}
                className="px-3 py-2 rounded-lg border border-brand-accent/50 bg-brand-accent/15 text-brand-navy text-sm font-medium hover:bg-brand-accent/25 disabled:opacity-50"
              >
                Add motion (guided)
              </button>
              <button
                type="button"
                disabled={pending || !!openMotion || motionFloorOpen}
                onClick={openMotionFloorForStatements}
                className="px-3 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium disabled:opacity-50"
              >
                Open floor for motion statements
              </button>
              <button
                type="button"
                disabled={pending || !motionFloorOpen}
                onClick={closeMotionFloorForStatements}
                className="px-3 py-2 rounded-lg border border-white/25 bg-black/25 text-brand-navy text-sm font-medium hover:bg-black/20 disabled:opacity-50"
              >
                Close floor (statements ended)
              </button>
              <button
                type="button"
                disabled={
                  pending ||
                  !motionFloorOpen ||
                  !!openMotion ||
                  !!motionDraftValidationError
                }
                onClick={() => recordStatedMotion()}
                className="rounded-lg border border-amber-500/50 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
              >
                Record stated motion
              </button>
              <button
                type="button"
                disabled={
                  pending || motionFloorOpen || !!openMotion || pendingStatedMotions.length === 0
                }
                onClick={beginVotingInDisruptivenessOrder}
                className="px-3 py-2 rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
              >
                {tSessionControl("beginVotingMostDisruptive")}
              </button>
            </div>
          </div>

          {pendingStatedMotions.length > 0 ? (
            <div className="rounded-lg border border-white/12 bg-black/25 px-3 py-2 space-y-2">
              <p className={surfaceLabel}>{tSessionControl("pendingVoteOrderMostDisruptive")}</p>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-brand-navy">
                {pendingStatedMotions.map((m, i) => (
                  <li key={m.id} className="pl-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-medium">#{i + 1}</span> — {m.title || tSessionControl("untitled")}
                        <span className="text-brand-muted/70 text-xs block sm:inline sm:ml-2">
                          ({m.procedure_code ?? m.vote_type}, RoP priority{" "}
                          {motionDisruptivenessScore(
                            m.vote_type,
                            m.procedure_code,
                            caucusPrecedence,
                            procedureProfile
                          )})
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => withdrawStatedMotion(m.id)}
                        className="text-xs text-red-700 font-medium hover:underline shrink-0"
                      >
                        {tSessionControl("withdraw")}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
            </>
          ) : null}

          {motionWorkflowTab === "draft" ? (
            <>
          <label className="text-sm text-brand-navy">
            <span className="flex items-center justify-between gap-2">
              <span className={surfaceLabel}>{tSessionControl("procedurePreset")}</span>
              <HelpButton title={tSessionControl("procedurePreset")}>
                {tSessionControl("procedurePresetHelp")}
              </HelpButton>
            </span>
            <select
              className={surfaceField}
              value={motionDraft.procedure_code ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const code = raw === "" ? null : raw;
                const preset = procedurePresets.find((p) => p.code === code);
                setMotionDraft((d) => ({
                  ...d,
                  procedure_code: code,
                  vote_type: "motion",
                  title:
                    code === "set_agenda"
                      ? agendaTopicsRemaining[0]?.name ?? ""
                      : preset?.title ?? d.title,
                  procedure_resolution_id: code === "set_agenda" ? null : d.procedure_resolution_id,
                  procedure_clause_ids: code === "set_agenda" ? [] : d.procedure_clause_ids,
                  moderated_total_minutes: code === "moderated_caucus" ? d.moderated_total_minutes : "",
                  moderated_speaker_seconds: code === "moderated_caucus" ? d.moderated_speaker_seconds : "",
                  unmoderated_total_minutes: code === "unmoderated_caucus" ? d.unmoderated_total_minutes : "",
                  consultation_total_minutes: code === "consultation" ? d.consultation_total_minutes : "",
                  amendment_kind: code === "amendment" ? d.amendment_kind : "friendly",
                  amendment_debate_seconds: code === "amendment" ? d.amendment_debate_seconds : "45",
                }));
              }}
            >
              {procedurePresets.map((p) => (
                <option key={String(p.code ?? "custom")} value={p.code ?? ""}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {motionRequiresClauseTargets(motionDraft.procedure_code) ||
          motionRequiresResolutionOnly(motionDraft.procedure_code) ? (
            <div className={surfaceSubpanel}>
              <label className="text-sm block">
                <span className={surfaceLabel}>{tSessionControl("targetResolution")}</span>
                <select
                  className={surfaceField}
                  value={motionDraft.procedure_resolution_id ?? ""}
                  onChange={(e) =>
                    setMotionDraft((d) => ({
                      ...d,
                      procedure_resolution_id: e.target.value || null,
                      procedure_clause_ids: [],
                    }))
                  }
                >
                  <option value="">{tSessionControl("selectResolution")}</option>
                  {resolutions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.google_docs_url ? `Resolution ${r.id.slice(0, 8)} (${r.google_docs_url})` : `Resolution ${r.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </label>

              {motionRequiresClauseTargets(motionDraft.procedure_code) ? (
                <div className="space-y-1">
                  <p className={surfaceLabel}>{tSessionControl("targetClauses")}</p>
                  <div className={surfaceInset}>
                    {selectedResolutionClauses.length === 0 ? (
                      <p className="text-xs text-brand-muted">{tSessionControl("noClausesFound")}</p>
                    ) : (
                      selectedResolutionClauses.map((c) => {
                        const checked = motionDraft.procedure_clause_ids.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-start gap-2 text-xs cursor-pointer text-brand-navy">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setMotionDraft((d) => {
                                  if (e.target.checked) {
                                    return { ...d, procedure_clause_ids: [...d.procedure_clause_ids, c.id] };
                                  }
                                  return {
                                    ...d,
                                    procedure_clause_ids: d.procedure_clause_ids.filter((x) => x !== c.id),
                                  };
                                });
                              }}
                            />
                            <span className="line-clamp-2">
                              {tSessionControl("clause")} {c.clause_number}: {c.clause_text}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm text-brand-navy">
              <span className={surfaceLabel}>{tSessionControl("type")}</span>
              <select
                className={surfaceField}
                value={motionDraft.vote_type}
                onChange={(e) =>
                  setMotionDraft((d) => ({ ...d, vote_type: e.target.value as VoteType }))
                }
              >
                <option value="motion">{tSessionControl("motion")}</option>
                <option value="amendment">{tSessionControl("amendment")}</option>
                <option value="resolution">{tSessionControl("resolution")}</option>
              </select>
            </label>
            <div className="text-sm text-brand-navy rounded-lg border border-white/15 bg-black/20 px-3 py-2">
              <span className={surfaceLabel}>{tSessionControl("requiredMajorityRop")}</span>
              <p className="mt-1 font-semibold text-brand-navy">{formatVoteMajorityLabel(ropMajorityForDraft)}</p>
              <p className="text-xs text-brand-muted mt-1 leading-snug">
                {tSessionControl("majorityHelp")}
              </p>
            </div>
          </div>
          {motionDraft.procedure_code === "set_agenda" ? (
            <label className="text-sm block text-brand-navy">
              <span className={surfaceLabel}>{tSessionControl("agendaTopicCommittee")}</span>
              <select
                className={surfaceField}
                value={motionDraft.title}
                onChange={(e) => setMotionDraft((d) => ({ ...d, title: e.target.value }))}
              >
                {setAgendaTopicOptions.length === 0 ? (
                  <option value="">{tSessionControl("noTopicsAvailable")}</option>
                ) : null}
                {setAgendaTopicOptions
                  .filter((t) => (t.name ?? "").trim().length > 0)
                  .map((t) => {
                    const name = (t.name ?? "").trim();
                    return (
                      <option key={t.id} value={name}>
                        {name}
                      </option>
                    );
                  })}
              </select>
            </label>
          ) : (
            <label className="text-sm block text-brand-navy">
              <span className={surfaceLabel}>
                {motionDraft.procedure_code === "consultation"
                  ? tSessionControl("topicPurpose")
                  : motionDraft.procedure_code === "moderated_caucus"
                    ? tSessionControl("topic")
                    : motionDraft.procedure_code === "unmoderated_caucus"
                      ? tSessionControl("topicOptional")
                      : tSessionControl("titleOptional")}
              </span>
              <input
                className={surfaceField}
                value={motionDraft.title}
                onChange={(e) => setMotionDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder={
                  motionDraft.procedure_code === "moderated_caucus"
                    ? tSessionControl("moderatedCaucusTopic")
                    : motionDraft.procedure_code === "unmoderated_caucus"
                      ? tSessionControl("unmoderatedCaucusTopicOptional")
                      : motionDraft.procedure_code === "consultation"
                        ? tSessionControl("consultationPurposePlaceholder")
                        : tSessionControl("motionTitleOptional")
                }
              />
            </label>
          )}
          {motionDraft.procedure_code === "moderated_caucus" ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm block text-brand-navy">
                <span className={surfaceLabel}>{tSessionControl("totalTimeMinutes")}</span>
                <input
                  type="number"
                  min={1}
                  className={surfaceField}
                  value={motionDraft.moderated_total_minutes}
                  onChange={(e) =>
                    setMotionDraft((d) => ({ ...d, moderated_total_minutes: e.target.value }))
                  }
                  placeholder={tSessionControl("minutesPlaceholder")}
                />
              </label>
              <label className="text-sm block text-brand-navy">
                <span className={surfaceLabel}>{tSessionControl("speakerTimeSeconds")}</span>
                <input
                  type="number"
                  min={1}
                  className={surfaceField}
                  value={motionDraft.moderated_speaker_seconds}
                  onChange={(e) =>
                    setMotionDraft((d) => ({ ...d, moderated_speaker_seconds: e.target.value }))
                  }
                  placeholder={tSessionControl("secondsPlaceholder")}
                />
              </label>
            </div>
          ) : motionDraft.procedure_code === "unmoderated_caucus" ? (
            <label className="text-sm block text-brand-navy">
              <span className={surfaceLabel}>{tSessionControl("totalTimeMinutes")}</span>
              <input
                type="number"
                min={1}
                className={surfaceField}
                value={motionDraft.unmoderated_total_minutes}
                onChange={(e) =>
                  setMotionDraft((d) => ({ ...d, unmoderated_total_minutes: e.target.value }))
                }
                placeholder={tSessionControl("minutesPlaceholder")}
              />
            </label>
          ) : motionDraft.procedure_code === "consultation" ? (
            <label className="text-sm block text-brand-navy">
              <span className={surfaceLabel}>{tSessionControl("totalTimeMinutes")}</span>
              <input
                type="number"
                min={1}
                className={surfaceField}
                value={motionDraft.consultation_total_minutes}
                onChange={(e) =>
                  setMotionDraft((d) => ({ ...d, consultation_total_minutes: e.target.value }))
                }
                placeholder={tSessionControl("minutesPlaceholder")}
              />
            </label>
          ) : motionDraft.procedure_code === "amendment" ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm block text-brand-navy">
                <span className={surfaceLabel}>{tSessionControl("amendmentType")}</span>
                <select
                  className={surfaceField}
                  value={motionDraft.amendment_kind}
                  onChange={(e) =>
                    setMotionDraft((d) => ({
                      ...d,
                      amendment_kind: e.target.value as "friendly" | "unfriendly",
                    }))
                  }
                >
                  <option value="friendly">{tSessionControl("friendly")}</option>
                  <option value="unfriendly">{tSessionControl("unfriendly")}</option>
                </select>
              </label>
              {motionDraft.amendment_kind === "unfriendly" ? (
                <label className="text-sm block text-brand-navy">
                  <span className={surfaceLabel}>{tSessionControl("debateTimePerSideSeconds")}</span>
                  <input
                    type="number"
                    min={30}
                    max={60}
                    className={surfaceField}
                    value={motionDraft.amendment_debate_seconds}
                    onChange={(e) =>
                      setMotionDraft((d) => ({ ...d, amendment_debate_seconds: e.target.value }))
                    }
                    placeholder={tSessionControl("debateSecondsPlaceholder")}
                  />
                </label>
              ) : null}
            </div>
          ) : null}
          {euPartyAllocationPreview ? (
            <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-navy">
                EU party time guide
              </p>
              <p className="mt-1 text-xs text-brand-muted">
                Speech pool:{" "}
                <span className="font-medium text-brand-navy">
                  {formatSecondsAsMinSec(euPartyAllocationPreview.speechSeconds)}
                </span>
                {motionDraft.procedure_code === "moderated_caucus" ? (
                  <>
                    {" "}
                    | POI/PoC pool:{" "}
                    <span className="font-medium text-brand-navy">
                      {formatSecondsAsMinSec(euPartyAllocationPreview.inquirySeconds)}
                    </span>
                  </>
                ) : null}
              </p>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {EU_PARLIAMENT_PARTY_KEYS.map((partyKey) => {
                  const row = euPartyAllocationPreview.breakdown.find((b) => b.party === partyKey);
                  if (!row) return null;
                  return (
                    <p key={partyKey} className="text-xs text-brand-navy">
                      <span className="font-medium">{EU_PARTY_LABELS[partyKey]}:</span>{" "}
                      {formatSecondsAsMinSec(row.totalSeconds)}
                    </p>
                  );
                })}
              </div>
            </div>
          ) : null}
          <label className="text-sm block text-brand-navy">
            <span className="flex items-center justify-between gap-2">
              <span className={surfaceLabel}>{tSessionControl("motioner")}</span>
              <HelpButton title={tSessionControl("motioner")}>
                {tSessionControl("motionerHelp")}
              </HelpButton>
            </span>
            <select
              className={surfaceField}
              value={motionDraft.motioner_allocation_id ?? ""}
              onChange={(e) =>
                setMotionDraft((d) => ({
                  ...d,
                  motioner_allocation_id: e.target.value || null,
                }))
              }
            >
              <option value="">{tSessionControl("notSpecified")}</option>
              {allocations.map((a) => (
                <option key={a.id} value={a.id}>
                  {displayCountry(a.country)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block text-brand-navy">
            <span className={surfaceLabel}>{tSessionControl("description")}</span>
            <textarea
              className={`${surfaceInputCore} mt-1 min-h-[72px]`}
              value={motionDraft.description}
              onChange={(e) => setMotionDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </label>
          <label className="text-sm inline-flex items-center gap-2 text-brand-navy">
            <input
              type="checkbox"
              checked={motionDraft.must_vote}
              onChange={(e) => setMotionDraft((d) => ({ ...d, must_vote: e.target.checked }))}
            />
            {tSessionControl("mustVote")}
            <HelpButton title={tSessionControl("mustVote")}>
              {tSessionControl("mustVoteHelp")}
            </HelpButton>
          </label>
          <div className="flex flex-wrap gap-2">
            {!openMotion ? (
              <button
                type="button"
                disabled={
                  pending || !!motionDraftValidationError
                }
                onClick={() => createMotion()}
                className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium"
              >
                {tSessionControl("createAndOpenMotion")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={saveMotionEdits}
                  className="px-4 py-2 rounded-lg border border-white/25 bg-white/10 text-brand-navy text-sm font-medium hover:bg-white/20 disabled:opacity-50"
                >
                  {tSessionControl("saveEdits")}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={closeMotion}
                  className="px-4 py-2 rounded-lg border border-red-600 bg-red-50 text-red-900 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  {tSessionControl("closeMotion")}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        tSessionControl("deleteMotionConfirm")
                      )
                    ) {
                      return;
                    }
                    if (openMotion) deleteMotionAsChair(openMotion.id);
                  }}
                  className="px-4 py-2 rounded-lg border border-red-800 bg-red-950/40 text-red-100 text-sm font-medium hover:bg-red-950/60 disabled:opacity-50"
                >
                  {tSessionControl("deleteMotion")}
                </button>
              </>
            )}
          </div>
          {motionDraftValidationError ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">{motionDraftValidationError}</p>
          ) : null}
            </>
          ) : null}
          {motionWorkflowTab === "votes" ? (
            <>
          <div className="text-xs text-brand-muted font-medium">
            {tSessionControl("tallyLine", {
              yes: motionTally.yes,
              no: motionTally.no,
              total: motionTally.total,
            })}
            <span className="mt-1 block font-normal text-[0.65rem] leading-snug">
              {tSessionControl("ballotsHelp")}
            </span>
          </div>

          {activeMotionForRecordedVotes ? (
            <div className={surfaceSubpanel}>
              <p className={surfaceLabel}>
                <span className="inline-flex items-center gap-1.5">
                  {tSessionControl("recordVotesLabel")} —{" "}
                  {activeMotionForRecordedVotes?.title?.trim() || tSessionControl("currentMotion")}
                  <HelpButton title={tSessionControl("recordVotesLabel")}>
                    {tSessionControl("recordVotesHelp")}
                  </HelpButton>
                </span>
              </p>
              <p className="text-sm text-brand-muted">
                {tSessionControl("delegatesCannotVoteHelp")}
              </p>
              <p className="text-xs text-brand-muted">
                {tSessionControl("delegateRollForMotion")}:{" "}
                <span className="font-medium text-brand-navy">{votingCallOrder.length}</span>
              </p>
              {votingCallOrder.length === 0 ? (
                <p className="text-sm text-brand-muted">{tSessionControl("noDelegatesSeatedYet")}</p>
              ) : (
                <div className="max-h-[26rem] overflow-y-auto space-y-2 pr-1">
                  {votingCallOrder.map((call) => {
                    const rollA = rollAttendanceByAllocationId.get(call.id);
                    const rollLabel = rollAttendanceRollLabel(rollA);
                    const recorded = call.user_id ? motionVoteByUser[call.user_id] : undefined;
                    const discipline = disciplineByAllocationId[call.id];
                    const rights =
                      call.user_id
                        ? voteRightsByUserId[`${activeMotionForRecordedVotes.id}:${call.user_id}`]
                        : null;
                    const supportsVoteWithRights =
                      activeMotionForRecordedVotes.procedure_code === "roll_call_vote";
                    const abstainAllowedByVoteType =
                      activeMotionForRecordedVotes?.vote_type === "resolution" ||
                      activeMotionForRecordedVotes?.vote_type === "amendment";
                    const canAbstain = abstainAllowedByVoteType && (rollA ?? "absent") !== "present_voting";
                    return (
                      <div
                        key={call.id}
                        className="rounded-lg border border-white/12 bg-black/25 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-brand-navy">{displayCountry(call.country)}</p>
                            <p className="text-xs text-brand-muted mt-0.5">
                              Roll: {rollLabel} · Recorded:{" "}
                              <span className="font-medium text-brand-navy">
                                {recorded === "yes"
                                  ? tSessionControl("yes")
                                  : recorded === "no"
                                    ? tSessionControl("no")
                                    : recorded === "abstain"
                                      ? tSessionControl("abstain")
                                      : "—"}
                              </span>
                            </p>
                            {rights ? (
                              <p className="mt-1 text-xs text-brand-muted">
                                {rights.vote_value.toUpperCase()} with rights:{" "}
                                <span className="text-brand-navy">{rights.statement}</span>
                              </p>
                            ) : null}
                            {discipline?.strike_count ? (
                              <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                                Discipline: {discipline.warning_count} warning(s), {discipline.strike_count} strike(s)
                                {discipline.voting_rights_lost ? " · voting disabled" : ""}
                                {discipline.speaking_rights_suspended ? " · speaking suspended" : ""}
                                {discipline.removed_from_committee ? " · removed" : ""}
                              </p>
                            ) : null}
                            {!call.user_id ? (
                              <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">
                                No delegate account on this placard.
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={pending || !call.user_id || discipline?.voting_rights_lost}
                              onClick={() => recordDelegateVoteForAllocation(call, "yes")}
                              className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                            >
                              Yes
                            </button>
                            {supportsVoteWithRights ? (
                              <button
                                type="button"
                                disabled={pending || !call.user_id || discipline?.voting_rights_lost}
                                onClick={() => recordDelegateVoteForAllocation(call, "yes", true)}
                                className="rounded-lg border border-brand-accent/45 bg-brand-accent/10 px-3 py-1.5 text-xs font-medium text-brand-navy disabled:opacity-50"
                              >
                                Yes with rights
                              </button>
                            ) : null}
                            {canAbstain ? (
                              <button
                                type="button"
                                disabled={pending || !call.user_id || discipline?.voting_rights_lost}
                                onClick={() => recordDelegateVoteForAllocation(call, "abstain")}
                                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                              >
                                Abstain
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={pending || !call.user_id || discipline?.voting_rights_lost}
                              onClick={() => recordDelegateVoteForAllocation(call, "no")}
                              className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                            >
                              No
                            </button>
                            {supportsVoteWithRights ? (
                              <button
                                type="button"
                                disabled={pending || !call.user_id || discipline?.voting_rights_lost}
                                onClick={() => recordDelegateVoteForAllocation(call, "no", true)}
                                className="rounded-lg border border-rose-500/45 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-brand-navy disabled:opacity-50"
                              >
                                No with rights
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={pending || !call.user_id || discipline?.voting_rights_lost}
                              onClick={() => clearDelegateVoteForAllocation(call)}
                              className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-white/15 disabled:opacity-50"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
            </>
          ) : null}
        </div>

        {motionWorkflowTab === "history" ? (
          <>
        <div className={surfaceCard}>
          <p className={`${surfaceLabel} mb-2 tracking-wider`}>{tSessionControl("auditTimeline")}</p>
          {motionAudit.length === 0 ? (
            <p className="text-sm text-brand-muted">{tSessionControl("noAuditEvents")}</p>
          ) : (
            <ul className="space-y-1 text-sm text-brand-navy">
              {motionAudit.map((e) => (
                <li key={e.id}>
                  <span className="capitalize font-medium">{e.event_type}</span>{" "}
                  <span className="text-brand-muted">({new Date(e.created_at).toLocaleString()})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={surfaceCard}>
          <p className={`${surfaceLabel} mb-2 tracking-wider`}>{tSessionControl("recentMotions")}</p>
          <ul className="space-y-2 text-sm text-brand-navy">
            {recentMotions.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {m.title || tSessionControl("untitled")}{" "}
                  <span className="text-brand-muted">({tSessionControl("closed")})</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={pending || !!openMotion}
                    onClick={() => reopenMotion(m.id)}
                    className="text-xs text-amber-700 font-medium hover:underline disabled:opacity-50"
                  >
                    {tSessionControl("reopen")}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete “${m.title || "Untitled"}” permanently? This removes the closed motion from the record.`
                        )
                      ) {
                        return;
                      }
                      deleteMotionAsChair(m.id);
                    }}
                    className="text-xs text-red-700 font-medium hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
          </>
        ) : null}
      </section>
      ) : null}

      {show("timer") ? (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-brand-navy">{tTimer("title")}</h3>
          <HelpButton title={tTimer("controlsTitle")}>
            {tTimer("controlsHelp")}
          </HelpButton>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["setup", tTimer("tabSetup")],
              ["clock", tTimer("tabClock")],
              ["notes", tTimer("tabNotes")],
              ["log", tTimer("tabLog")],
            ] as const
          ).map(([id, label]) => {
            const active = timerWorkflowTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTimerWorkflowTab(id)}
                className={[
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-brand-accent/60 bg-brand-accent/20 text-brand-navy"
                    : "border-white/20 bg-black/25 text-brand-muted hover:text-brand-navy hover:bg-black/20",
                ].join(" ")}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className={`${surfaceCard} space-y-3`}>
          <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-3 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-navy">
              EU Parliament timer board (11 timers)
            </p>
            <p className="text-xs text-brand-muted">
              One timer per party, plus Total time, POI/POC time, and Speaker time. Use Apply to
              copy a row into the live timer fields on the Clock tab (speaker time / Save timer).
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {EU_TIMER_SLOT_ORDER.map((slot) => {
                const slotSeconds = Math.max(0, euTimerSlots[slot] ?? 0);
                const slotMinutes = Math.floor(slotSeconds / 60);
                const slotRemainder = slotSeconds % 60;
                return (
                  <div
                    key={slot}
                    className="rounded-md border border-brand-navy/15 bg-white/70 px-3 py-2"
                  >
                    <p className="text-xs font-medium text-brand-navy">{euTimerSlotLabel(slot)}</p>
                    <div className="mt-1 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-brand-muted">
                        Name
                        <input
                          className={`mt-1 w-full ${surfaceFieldSm}`}
                          value={euTimerMeta[slot]?.name ?? ""}
                          onChange={(e) => setEuTimerSlotMeta(slot, { name: e.target.value })}
                          placeholder={euTimerSlotLabel(slot)}
                        />
                      </label>
                      <label className="text-xs text-brand-muted">
                        Tag
                        <select
                          className={`mt-1 w-full ${surfaceFieldSm}`}
                          value={euTimerMeta[slot]?.tag ?? "party timer"}
                          onChange={(e) =>
                            setEuTimerSlotMeta(slot, {
                              tag: e.target.value as EuTimerTag,
                            })
                          }
                        >
                          {EU_TIMER_TAG_OPTIONS.map((tag) => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <div className="flex items-center gap-1">
                        <input
                          className={`w-14 ${surfaceFieldSm}`}
                          inputMode="numeric"
                          value={String(slotMinutes)}
                          onChange={(e) =>
                            setEuTimerSlotSeconds(slot, parseTime(e.target.value, String(slotRemainder)))
                          }
                        />
                        <span className="text-xs text-brand-muted">
                          {tSessionControl("unitMinutesShort")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          className={`w-14 ${surfaceFieldSm}`}
                          inputMode="numeric"
                          value={String(slotRemainder)}
                          onChange={(e) =>
                            setEuTimerSlotSeconds(slot, parseTime(String(slotMinutes), e.target.value))
                          }
                        />
                        <span className="text-xs text-brand-muted">
                          {tSessionControl("unitSecondsShort")}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ml-auto rounded-md border border-brand-navy/20 bg-white px-2.5 py-1 text-xs font-medium text-brand-navy hover:bg-brand-cream"
                        onClick={() => applyEuTimerSlotToFloor(slot)}
                      >
                        {tSessionControl("apply")}
                      </button>
                    </div>
                    <p className="mt-1 text-[0.65rem] text-brand-muted">
                      {formatSecondsAsMinSec(slotSeconds)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          {timerWorkflowTab === "setup" ? (
            <>
          <p className="text-sm text-brand-muted">
            {tTimer("setupHelp")}
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="block text-sm text-brand-navy min-w-[12rem]">
              <span className={surfaceLabel}>{tTimer("namedPreset")}</span>
              <select
                className={`${surfaceField} mt-1`}
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const p = BUILTIN_TIMER_PRESETS.find((x) => x.id === id);
                  if (!p) return;
                  const f = presetToTimerFields(p);
                  setTimer((t) => ({ ...t, ...f }));
                  suppressGslSavePromptRef.current = false;
                  if (isGslTimerPresetId(id)) {
                    setSpeakerListChairPrompt((prev) => (prev === "moderated_passed" ? prev : "gsl"));
                  } else if (isModeratedCaucusTimerPresetId(id)) {
                    setSpeakerListChairPrompt((prev) => (prev === "moderated_passed" ? prev : "moderated_timer"));
                  }
                }}
              >
                <option value="">{tTimer("applyPreset")}</option>
                {BUILTIN_TIMER_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block flex-1 min-w-[10rem] text-sm text-brand-navy">
              <span className={surfaceLabel}>{tTimer("floorLabelDelegates")}</span>
              <input
                className={`${surfaceField} mt-1`}
                placeholder={tTimer("floorLabelPlaceholder")}
                value={timer.floorLabel}
                onChange={(e) => setTimer((t) => ({ ...t, floorLabel: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-sm text-brand-navy">
            <span className={surfaceLabel}>{tTimer("timerPurpose")}</span>
            <select
              className={`${surfaceField} mt-1`}
              value={timer.purpose}
              onChange={(e) => {
                const v = e.target.value as "general_floor" | "motion_vote";
                setTimer((t) => ({
                  ...t,
                  purpose: v,
                  boundVoteItemId: v === "general_floor" ? "" : t.boundVoteItemId,
                }));
              }}
            >
              <option value="general_floor">{tTimer("purposeGeneralFloor")}</option>
              <option value="motion_vote">{tTimer("purposeMotionVote")}</option>
            </select>
          </label>
          {timer.purpose === "motion_vote" ? (
            <label className="block text-sm text-brand-navy">
              <span className={surfaceLabel}>{tTimer("openMotionForVoting")}</span>
              <select
                className={`${surfaceField} mt-1`}
                value={timer.boundVoteItemId}
                onChange={(e) => setTimer((t) => ({ ...t, boundVoteItemId: e.target.value }))}
              >
                <option value="">{tTimer("selectMotion")}</option>
                {openVotingMotions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title?.trim() || tTimer("untitled")} · {m.vote_type}
                    {m.procedure_code ? ` (${m.procedure_code})` : ""}
                  </option>
                ))}
              </select>
              {openVotingMotions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">
                  {tTimer("noOpenMotionWarning")}
                </p>
              ) : null}
            </label>
          ) : null}
            </>
          ) : null}
          {timerWorkflowTab === "clock" ? (
            <>
          <p className="text-sm text-brand-navy">
            <span className={surfaceLabel}>{tTimer("clock")}</span>{" "}
            <span className="font-medium">{timer.isRunning ? tTimer("running") : tTimer("paused")}</span>
            {!liveTimerRow ? (
              <span className="text-brand-muted font-normal"> — {tTimer("saveToEnablePauseStart")}</span>
            ) : null}
          </p>
          <label className="block text-sm text-brand-navy">
            <span className={surfaceLabel}>{tTimer("pauseReasonLogged")}</span>
            <input
              className={`${surfaceField} mt-1`}
              placeholder={tTimer("pauseReasonPlaceholder")}
              value={pauseReasonDraft}
              onChange={(e) => setPauseReasonDraft(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !liveTimerRow || !timer.isRunning}
              onClick={stopFloorTimer}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-navy/20 bg-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cream disabled:opacity-50"
            >
              <Pause className="h-4 w-4 shrink-0" aria-hidden />
              {tTimer("pauseClock")}
            </button>
            <button
              type="button"
              disabled={pending || !liveTimerRow || timer.isRunning}
              onClick={startFloorTimer}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-navy/20 bg-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cream disabled:opacity-50"
            >
              <Play className="h-4 w-4 shrink-0" aria-hidden />
              {tTimer("startClock")}
            </button>
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-brand-navy">
            <input
              type="checkbox"
              className="mt-1 rounded border-brand-line"
              checked={timer.perSpeakerMode}
              onChange={(e) => setTimer((t) => ({ ...t, perSpeakerMode: e.target.checked }))}
            />
            <span>
              <span className="font-medium">{tTimer("perSpeakerTitle")}</span>
              <span className="block text-brand-muted text-xs mt-0.5">
                {tTimer("perSpeakerHelp")}
              </span>
            </span>
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm text-brand-navy">
              <span className={surfaceLabel}>{tTimer("currentSpeaker")}</span>
              <input
                className={surfaceField}
                value={timer.current}
                onChange={(e) => setTimer((t) => ({ ...t, current: e.target.value }))}
              />
            </label>
            <label className="block text-sm text-brand-navy">
              <span className={surfaceLabel}>{tTimer("nextSpeaker")}</span>
              <input
                className={surfaceField}
                value={timer.next}
                onChange={(e) => setTimer((t) => ({ ...t, next: e.target.value }))}
              />
            </label>
          </div>
            </>
          ) : null}

          {timerWorkflowTab === "notes" ? (
          <div className="rounded-lg border border-white/15 bg-black/20 p-3 space-y-3 text-brand-navy">
            <div>
              <p className={surfaceLabel}>{tTimer("speechNotesCurrentSpeaker")}</p>
              <p className="text-xs text-brand-muted mt-1 leading-snug">
                {tTimer("speechNotesHelp")}
              </p>
            </div>
            <div className="text-sm rounded-md border border-white/10 bg-black/25 px-3 py-2 space-y-1">
              <p>
                <span className="text-brand-muted">{tTimer("timerFloorLabel")} </span>
                <span className="font-medium">{timer.current.trim() || "—"}</span>
              </p>
              {currentSpeakerQueueRow ? (
                <p>
                  <span className="text-brand-muted">{tTimer("speakerListCurrent")} </span>
                  <span className="font-medium">
                    {currentSpeakerQueueRow.allocation_id
                      ? displayCountry(
                          allocations.find((a) => a.id === currentSpeakerQueueRow.allocation_id)?.country ??
                            currentSpeakerQueueRow.label ??
                            "—"
                        )
                      : (currentSpeakerQueueRow.label ?? "—")}
                  </span>
                </p>
              ) : (
                <p className="text-brand-muted text-xs">{tTimer("noCurrentDelegation")}</p>
              )}
            </div>
            <label className="block text-sm">
              <span className={surfaceLabel}>{tTimer("note")}</span>
              <textarea
                className={`${surfaceInputCore} mt-1 min-h-[88px]`}
                value={speechNoteDraft}
                onChange={(e) => setSpeechNoteDraft(e.target.value)}
                placeholder={tTimer("notePlaceholder")}
              />
            </label>
            <button
              type="button"
              disabled={pending || !speechNoteDraft.trim()}
              onClick={saveChairSpeechNote}
              className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {tTimer("saveSpeechNote")}
            </button>
            {speechNotesRecent.length > 0 ? (
              <div className="border-t border-white/10 pt-3 space-y-2">
                <p className={surfaceLabel}>{tTimer("recentNotes")}</p>
                <ul className="max-h-48 overflow-y-auto space-y-2 text-sm">
                  {speechNotesRecent.map((n) => (
                    <li key={n.id} className="rounded-md border border-white/10 bg-black/20 p-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-medium text-brand-navy">{n.speaker_label}</span>
                        <button
                          type="button"
                          className="text-xs text-red-700 hover:underline dark:text-red-300 shrink-0"
                          disabled={pending}
                          onClick={() => deleteChairSpeechNote(n.id)}
                        >
                          {tTimer("delete")}
                        </button>
                      </div>
                      <p className="text-xs text-brand-muted mt-0.5">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-brand-navy/90">{n.content}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          ) : null}

          {timerWorkflowTab === "clock" ? (
          <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <label className="text-sm text-brand-navy min-w-[10rem]">
              <span className={surfaceLabel}>{tTimer("speakerTimeRemaining")}</span>
              <span className="block text-[0.65rem] font-normal normal-case text-brand-muted mt-0.5">
                {timer.perSpeakerMode ? tTimer("remainingHelpPerSpeaker") : tTimer("remainingHelpNormal")}
              </span>
              <div className="flex gap-1 mt-1 items-center">
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  inputMode="numeric"
                  value={timer.leftM}
                  onChange={(e) => setTimer((t) => ({ ...t, leftM: e.target.value }))}
                />
                <span className="py-2 text-brand-muted text-sm">{tSessionControl("unitMinutesShort")}</span>
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  inputMode="numeric"
                  value={timer.leftS}
                  onChange={(e) => setTimer((t) => ({ ...t, leftS: e.target.value }))}
                />
                <span className="py-2 text-brand-muted text-sm">{tSessionControl("unitSecondsShort")}</span>
              </div>
            </label>
            <label className="text-sm text-brand-navy min-w-[10rem]">
              <span className={surfaceLabel}>{tTimer("totalTime")}</span>
              <span className="block text-[0.65rem] font-normal normal-case text-brand-muted mt-0.5">
                {timer.perSpeakerMode
                  ? tTimer("totalHelpPerSpeaker")
                  : tTimer("totalHelpNormal")}
              </span>
              <div className="flex gap-1 mt-1 items-center">
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  inputMode="numeric"
                  value={timer.totalM}
                  onChange={(e) => setTimer((t) => ({ ...t, totalM: e.target.value }))}
                />
                <span className="py-2 text-brand-muted text-sm">{tSessionControl("unitMinutesShort")}</span>
                <input
                  className={`w-14 ${surfaceFieldSm}`}
                  inputMode="numeric"
                  value={timer.totalS}
                  onChange={(e) => setTimer((t) => ({ ...t, totalS: e.target.value }))}
                />
                <span className="py-2 text-brand-muted text-sm">{tSessionControl("unitSecondsShort")}</span>
              </div>
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={saveTimer}
              className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {tTimer("saveTimer")}
            </button>
            {timer.perSpeakerMode ? (
              <button
                type="button"
                disabled={pending}
                onClick={advanceSpeakerAndResetClock}
                className="px-4 py-2 rounded-lg border border-brand-navy/20 bg-white text-brand-navy text-sm font-medium hover:bg-brand-cream disabled:opacity-50"
              >
                {tTimer("advanceSpeakerReset")}
              </button>
            ) : null}
          </div>
          </div>
          ) : null}
          {timerWorkflowTab === "log" ? (
            pauseEvents.length > 0 ? (
              <div className="border-t border-white/12 pt-3">
                <p className={`${surfaceLabel} mb-2`}>{tTimer("recentPauseLog")}</p>
                <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs text-brand-navy/85">
                  {pauseEvents.map((ev) => (
                    <li key={ev.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                      <time className="shrink-0 text-brand-muted" dateTime={ev.created_at}>
                        {new Date(ev.created_at).toLocaleString()}
                      </time>
                      <span>{ev.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-brand-muted">{tTimer("noPauseEvents")}</p>
            )
          ) : (
            <p className="text-xs text-brand-muted">
              {tTimer("openPauseLogHint")}
            </p>
          )}
        </div>
      </section>
      ) : null}

      {show("announcements") ? (
      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-brand-navy">{tSessionControl("daisAnnouncements")}</h3>
        <div className={`${surfaceCard} space-y-3`}>
          <p className="text-sm text-brand-muted">{tSessionControl("daisAnnouncementsHelp")}</p>
          <label className="block text-sm text-brand-navy">
            <span className={surfaceLabel}>{tSessionControl("message")}</span>
            <textarea
              className={`${surfaceInputCore} mt-1 min-h-[100px] font-mono text-sm`}
              placeholder={tSessionControl("messageToCommittee")}
              value={daisBody}
              onChange={(e) => setDaisBody(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="block text-sm text-brand-navy">
              <span className={surfaceLabel}>{tSessionControl("format")}</span>
              <select
                className={`${surfaceField} mt-1`}
                value={daisFormat}
                onChange={(e) => setDaisFormat(e.target.value as "plain" | "markdown")}
              >
                <option value="markdown">{tSessionControl("markdown")}</option>
                <option value="plain">{tSessionControl("plainText")}</option>
              </select>
            </label>
            <label className="block text-sm text-brand-navy min-w-[12rem]">
              <span className={surfaceLabel}>{tSessionControl("publishAtOptional")}</span>
              <input
                type="datetime-local"
                className={`${surfaceField} mt-1`}
                value={daisPublishAt}
                onChange={(e) => setDaisPublishAt(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={postDais}
            className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {tSessionControl("post")}
          </button>
          <ul className="text-sm space-y-3 border-t border-white/12 pt-3 text-brand-navy/85">
            {announcements.map((a) => {
              const fmt = a.body_format === "markdown" ? "markdown" : "plain";
              const scheduled =
                a.publish_at && !Number.isNaN(new Date(a.publish_at).getTime())
                  ? new Date(a.publish_at) > new Date()
                  : false;
              const editing = daisEditingId === a.id;
              return (
                <li key={a.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <time className="text-brand-muted" dateTime={a.created_at}>
                      {new Date(a.created_at).toLocaleString()}
                    </time>
                    {a.is_pinned ? (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-semibold text-amber-950 dark:text-amber-100">
                        {tSessionControl("pinned")}
                      </span>
                    ) : null}
                    {scheduled ? (
                      <span className="rounded bg-brand-accent/100/15 px-1.5 py-0.5 text-brand-navy dark:text-brand-accent-bright">
                        {tSessionControl("scheduled")} {new Date(a.publish_at!).toLocaleString()}
                      </span>
                    ) : null}
                    <span className="text-brand-muted">
                      {fmt === "markdown" ? tSessionControl("markdown") : tSessionControl("plain")}
                    </span>
                  </div>
                  {editing ? (
                    <div className="space-y-3">
                      <textarea
                        className={`${surfaceInputCore} min-h-[100px] w-full font-mono text-sm`}
                        value={daisEditBody}
                        onChange={(e) => setDaisEditBody(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-4">
                        <label className="block text-sm text-brand-navy">
                          <span className={surfaceLabel}>{tSessionControl("format")}</span>
                          <select
                            className={`${surfaceField} mt-1`}
                            value={daisEditFormat}
                            onChange={(e) => setDaisEditFormat(e.target.value as "plain" | "markdown")}
                          >
                            <option value="markdown">{tSessionControl("markdown")}</option>
                            <option value="plain">{tSessionControl("plainText")}</option>
                          </select>
                        </label>
                        <label className="block text-sm text-brand-navy min-w-[12rem]">
                          <span className={surfaceLabel}>{tSessionControl("publishAt")}</span>
                          <input
                            type="datetime-local"
                            className={`${surfaceField} mt-1`}
                            value={daisEditPublishAt}
                            onChange={(e) => setDaisEditPublishAt(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={saveDaisEdit}
                          className="rounded-lg bg-brand-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {tSessionControl("saveChanges")}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={cancelEditDais}
                          className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-white/10 disabled:opacity-50"
                        >
                          {tSessionControl("cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <DaisAnnouncementBody body={a.body} format={fmt} />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {a.is_pinned ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setDaisPinned(a.id, false)}
                            className="text-xs font-medium text-brand-navy underline hover:no-underline disabled:opacity-50"
                          >
                            {tSessionControl("unpin")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setDaisPinned(a.id, true)}
                            className="text-xs font-medium text-brand-navy underline hover:no-underline disabled:opacity-50"
                          >
                            {tSessionControl("pinToFloor")}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => beginEditDais(a)}
                          className="text-xs font-medium text-brand-navy underline hover:no-underline disabled:opacity-50"
                        >
                          {tSessionControl("edit")}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => deleteDaisAnnouncement(a.id)}
                          className="text-xs font-medium text-red-800 underline hover:no-underline dark:text-red-300 disabled:opacity-50"
                        >
                          {tSessionControl("delete")}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      ) : null}

      {show("speakers") ? (
        <ChairSpeakerQueuePanel
          ref={speakersSectionRef}
          conferenceId={floorConferenceId}
          allocations={allocations}
          variant="session"
          isCrisisCommittee={isCrisisCommitteeSession}
          speakerListPromptKind={speakerListChairPrompt}
          onDismissSpeakerListPrompt={dismissSpeakerListPrompt}
          onNotify={(text) => setMsg(text)}
        />
      ) : null}

      {show("roll-call") ? (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-brand-navy">
            ✅ {tSessionControl("rollCallTracker")}
          </h3>
          <HelpButton title={tSessionControl("rollCallTracker")}>
            {tSessionControl("rollCallHelp")}
          </HelpButton>
        </div>
        <p className="text-sm text-brand-muted">{tSessionControl("rollCallIntro")}</p>
        <div className={`${surfaceCard} space-y-4`}>
          <button
            type="button"
            disabled={pending}
            onClick={initRollCall}
            className="px-4 py-2 rounded-lg border border-white/25 bg-white/10 text-brand-navy text-sm font-medium hover:bg-white/20 disabled:opacity-50"
          >
            {tSessionControl("initializeRowsAllAllocations")}
          </button>
          {roll.length === 0 ? (
            <p className="text-sm text-brand-muted">
              {tSessionControl("noRollRowsYet")}
            </p>
          ) : (
            <>
              <div>
                <h4 className="font-display text-base font-semibold text-brand-navy">👥 {tSessionControl("delegates")}</h4>
                <p className="mt-1 text-sm text-brand-muted">
                  {tSessionControl("delegateRollStatusHint")}
                </p>
              </div>
              <ul className="space-y-3 text-sm text-brand-navy">
                {roll.map((r) => {
                  const emb = r.allocations;
                  const row = Array.isArray(emb) ? emb[0] : emb;
                  const country = displayCountry(row?.country ?? r.allocation_id.slice(0, 8));
                  const att = r.attendance;
                  return (
                    <li
                      key={r.allocation_id}
                      className="flex flex-col gap-2 rounded-lg border border-white/12 bg-black/15 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium shrink-0">{country}</span>
                      <div
                        className="flex flex-wrap gap-1.5"
                        role="group"
                        aria-label={tSessionControl("rollCallForCountry", { country })}
                      >
                        {rollAttendanceButtons.map((opt) => {
                          const active = att === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              title={opt.title}
                              disabled={pending}
                              onClick={() => setRollAttendanceForRow(r.allocation_id, opt.value)}
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 sm:text-sm ${
                                active
                                  ? "border-brand-accent/70 bg-brand-accent/25 text-brand-navy shadow-sm"
                                  : "border-white/20 bg-white/5 text-brand-navy/90 hover:bg-white/15"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>
      ) : null}
    </div>
  );
}
