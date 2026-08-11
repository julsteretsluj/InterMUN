// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Chair-facing crisis notes & prompts derived from the active committee
 * (chamber label, agenda topic, and allocation seat labels).
 */

export type CrisisNoteKind = "brief" | "prompt" | "pathway" | "cue";

export type CrisisNoteItem = {
  id: string;
  kind: CrisisNoteKind;
  title: string;
  body: string;
};

export type CrisisSeatPrompt = {
  seat: string;
  prompts: string[];
};

export type CrisisNotesPack = {
  chamberLabel: string;
  topicLabel: string;
  formatLabel: "Character crisis" | "Council crisis" | "Crisis";
  subjectTags: string[];
  briefing: CrisisNoteItem[];
  prompts: CrisisNoteItem[];
  pathways: CrisisNoteItem[];
  seatPrompts: CrisisSeatPrompt[];
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function committeeFamily(committee: string | null | undefined): "fwc" | "unsc" | "other" {
  const u = (committee ?? "").toUpperCase().replace(/\s+/g, " ");
  if (/\bFWC\b/.test(u)) return "fwc";
  if (/\bUNSC\b/.test(u)) return "unsc";
  return "other";
}

function topicHints(topic: string): string[] {
  const t = normalize(topic);
  const tags: string[] = [];
  if (/peacekeep|medical support|medical/.test(t)) tags.push("peacekeeping", "medical support");
  if (/psychic|psychokinetic|gifted|mind|weaponization/.test(t)) tags.push("psychic tech", "containment");
  if (/child|minor|rehabilitation|experiment/.test(t)) tags.push("child protection", "rehab");
  if (/non-proliferation|containment|protocol/.test(t)) tags.push("protocols", "non-proliferation");
  if (/harm|protection/.test(t)) tags.push("harm prevention");
  return tags;
}

function seatShortName(seat: string): string {
  const beforeParen = seat.split("(")[0]?.trim() || seat.trim();
  return beforeParen || seat.trim();
}

function isP5(seat: string): boolean {
  const n = normalize(seat);
  return (
    n === "china" ||
    n === "france" ||
    n === "russia" ||
    n === "united kingdom" ||
    n === "uk" ||
    n === "united states" ||
    n === "usa" ||
    n === "us"
  );
}

function fwcSeatPrompts(seat: string, subject: string[]): string[] {
  const n = normalize(seat);
  const short = seatShortName(seat);
  const childFocus = subject.includes("child protection") || subject.includes("rehab");
  const weaponFocus = subject.includes("psychic tech") || subject.includes("non-proliferation");

  if (/eleven|011|jane ives/.test(n)) {
    return [
      `Ask ${short}: what safeguards would you demand before any lab contact with gifted minors?`,
      childFocus
        ? `Cue ${short} to describe lived harm from experimentation without turning debate into fan fiction.`
        : `Prompt ${short} on whether psychic ability should be treated as a weapon, a right, or both.`,
    ];
  }
  if (/hopper/.test(n)) {
    return [
      `Have ${short} push for local accountability vs federal/agency secrecy.`,
      `Ask what emergency powers ${short} would accept — and what bright lines they refuse.`,
    ];
  }
  if (/joyce|byers/.test(n)) {
    return [
      `Invite ${short} to recenter families and missing-persons urgency over geopolitics.`,
      `Ask ${short} what “rehabilitation” looks like when trust in labs is broken.`,
    ];
  }
  if (/brenner/.test(n)) {
    return [
      `Pressure ${short}: justify past methods, or concede a new oversight regime.`,
      `Use ${short} as the voice of institutional continuity — then force a concession on consent.`,
    ];
  }
  if (/owens/.test(n)) {
    return [
      `Ask ${short} to draft a medical/ethics protocol delegates can vote on tonight.`,
      `Cue ${short} to broker between science and community safety.`,
    ];
  }
  if (/vecna|creel|001/.test(n)) {
    return [
      `Contain ${short}: recognize motives without rewarding domination narratives.`,
      weaponFocus
        ? `Ask the room: what containment protocol applies if ${short}’s capabilities proliferate?`
        : `Use ${short} to stress-test whether “rehabilitation” is credible for high-threat actors.`,
    ];
  }
  if (/kali|008/.test(n)) {
    return [
      `Ask ${short} about solidarity among gifted people vs state control.`,
      `Prompt ${short} on illusion/misdirection as metaphor for propaganda and cover-ups.`,
    ];
  }
  if (/frazier|sullivan|kgb|colonel/.test(n)) {
    return [
      `Have ${short} table a hard security option (raid, quarantine, intel share) for the room to critique.`,
      `Ask ${short}: what evidence standard is enough to act — and who is harmed by waiting?`,
    ];
  }

  return [
    `Ask ${short} for one concrete directive the chamber can adopt in the next 10 minutes.`,
    `Prompt ${short}: name the actor most responsible for the current escalation — and why.`,
  ];
}

function unscSeatPrompts(seat: string, subject: string[]): string[] {
  const short = seatShortName(seat);
  const p5 = isP5(seat);
  const peacekeeping = subject.includes("peacekeeping") || subject.includes("medical support");

  if (p5) {
    return [
      peacekeeping
        ? `Ask ${short} (P5): will you accept standardized ROE / medical support mandates that constrain national caveats?`
        : `Ask ${short} (P5): what Chapter VII tools are on / off the table for this crisis?`,
      `Pressure ${short} on veto signaling: what text would you block, and what compromise avoids it?`,
    ];
  }

  return [
    peacekeeping
      ? `Invite ${short} to propose a troop-contributing / host-state safeguard for medical support.`
      : `Ask ${short} for a regional angle the P5 are under-weighting.`,
    `Cue ${short} to draft one operative clause (who / what / by when) for a draft resolution.`,
  ];
}

function buildFwcPack(topic: string, seats: string[], subject: string[]): Omit<CrisisNotesPack, "chamberLabel" | "topicLabel"> {
  const childFocus = subject.includes("child protection");
  const weaponFocus = subject.includes("psychic tech") || subject.includes("non-proliferation");

  return {
    formatLabel: "Character crisis",
    subjectTags: subject.length ? subject : ["character-driven crisis"],
    briefing: [
      {
        id: "fwc-brief-1",
        kind: "brief",
        title: "Chamber lens",
        body: "FWC runs on characters with conflicting duties — lab science, local policing, family, intel services, and gifted survivors. Keep injects personal and timed; let blocs form around ethics vs security.",
      },
      {
        id: "fwc-brief-2",
        kind: "brief",
        title: "Subject matter lock",
        body: childFocus
          ? "Agenda centers harm to gifted minors: experimentation, consent, rehabilitation, and who controls the labs. Every crisis update should force a choice between secrecy, care, and accountability."
          : weaponFocus
            ? "Agenda centers weaponization of the mind: containment, non-proliferation, and international protocols. Escalations should test dual-use research, export controls, and who gets to define “threat.”"
            : `Stay tied to the agenda: “${topic}”. Prefer injects that reopen that question rather than side quests.`,
      },
      {
        id: "fwc-brief-3",
        kind: "brief",
        title: "Facilitation note",
        body: "Prefer short public updates + private notes. After each inject, demand one directive, one coalition, or one procedural move — don’t let the room only react emotionally.",
      },
    ],
    prompts: [
      {
        id: "fwc-prompt-1",
        kind: "prompt",
        title: "Opening heat",
        body: "A sealed facility reports an unauthorized contact event. Who speaks first — science, security, or family advocates — and what do they demand before any joint statement?",
      },
      {
        id: "fwc-prompt-2",
        kind: "prompt",
        title: "Evidence fight",
        body: "Conflicting intel arrives: one file blames a foreign program, another blames domestic overreach. Ask the chamber which source they trust and what verification they require.",
      },
      {
        id: "fwc-prompt-3",
        kind: "prompt",
        title: "Ethics trap",
        body: childFocus
          ? "A rehabilitation center asks for volunteers among gifted minors “for monitoring only.” Force a yes/no with safeguards written on the board."
          : "A dual-use research exemption is proposed for “defensive psychic tech.” Who drafts the red lines?",
      },
      {
        id: "fwc-prompt-4",
        kind: "prompt",
        title: "Clock pressure",
        body: "Give the room 8 minutes: produce a 3-bullet public communiqué or admit they cannot agree. Narrate the political cost of silence.",
      },
    ],
    pathways: [
      {
        id: "fwc-path-care",
        kind: "pathway",
        title: "Care & truth pathway",
        body: "If family/survivor seats dominate: leak survivor testimony → demand independent inquiry → freeze experiments → draft rehab standards → decide whether labs reopen under civilian oversight.",
      },
      {
        id: "fwc-path-sec",
        kind: "pathway",
        title: "Security pathway",
        body: "If intel/military seats dominate: quarantine order → cross-border blame → containment draft → risk of rights backlash → force a sunset clause or oversight board.",
      },
      {
        id: "fwc-path-split",
        kind: "pathway",
        title: "Split chamber pathway",
        body: "If deadlocked: release two competing directives; require a moderated caucus to merge one operative paragraph; escalate with a public “failure to act” headline if they stall.",
      },
    ],
    seatPrompts: seats.map((seat) => ({
      seat,
      prompts: fwcSeatPrompts(seat, subject),
    })),
  };
}

function buildUnscPack(topic: string, seats: string[], subject: string[]): Omit<CrisisNotesPack, "chamberLabel" | "topicLabel"> {
  const peacekeeping = subject.includes("peacekeeping") || subject.includes("medical support");

  return {
    formatLabel: "Council crisis",
    subjectTags: subject.length ? subject : ["security council crisis"],
    briefing: [
      {
        id: "unsc-brief-1",
        kind: "brief",
        title: "Chamber lens",
        body: "UNSC crises turn on P5 leverage, elected-member drafting, and whether the room chooses Chapter VI tools, Chapter VII force, or a weak press statement. Keep national interests visible.",
      },
      {
        id: "unsc-brief-2",
        kind: "brief",
        title: "Subject matter lock",
        body: peacekeeping
          ? "Agenda centers standardizing peacekeeping and medical support. Injects should stress caveats, host-state consent, CASEVAC, and unequal burden-sharing among TCCs."
          : `Stay tied to the agenda: “${topic}”. Tie each update to mandate language, not just battlefield color.`,
      },
      {
        id: "unsc-brief-3",
        kind: "brief",
        title: "Facilitation note",
        body: "After each update: ask for a draft element (PP or OP), a procedural motion, or a clear veto warning. Name the silent P5 if they coast.",
      },
    ],
    prompts: [
      {
        id: "unsc-prompt-1",
        kind: "prompt",
        title: "Field flash",
        body: peacekeeping
          ? "A peacekeeping contingent reports delayed medical evacuation under conflicting national caveats. Who owns the failure — mandate, TCC, or Secretariat logistics?"
          : "Breaking incident in theatre: casualties rising. Demand a Council response within one speakers’ list cycle.",
      },
      {
        id: "unsc-prompt-2",
        kind: "prompt",
        title: "Mandate fight",
        body: "Secretariat circulates two mandate options: light monitoring vs robust protection with medical support standards. Force sponsors for each.",
      },
      {
        id: "unsc-prompt-3",
        kind: "prompt",
        title: "Veto weather",
        body: "One P5 privately signals a veto on any language naming a party. Ask elected members how they rewrite to keep substance without the tripwire.",
      },
      {
        id: "unsc-prompt-4",
        kind: "prompt",
        title: "Burden share",
        body: peacekeeping
          ? "A major TCC threatens drawdown unless medical support and reimbursement standards are written into the resolution. Clock a 10-minute informal."
          : "A regional member demands a timeline and reporting cycle. Make the P5 answer on the record.",
      },
    ],
    pathways: [
      {
        id: "unsc-path-pr",
        kind: "pathway",
        title: "Presidential statement pathway",
        body: "If unity is fragile: PRST on concern → request SG report → technical medical/peacekeeping annex → revisit operative resolution next session.",
      },
      {
        id: "unsc-path-res",
        kind: "pathway",
        title: "Resolution pathway",
        body: "If sponsors exist: draft OP on standards + reporting → negotiate caveats language → test veto → pass thin text or split into PRST + letter.",
      },
      {
        id: "unsc-path-deadlock",
        kind: "pathway",
        title: "Deadlock pathway",
        body: "If blocked: public explanation of vote → Arria-style discussion cue → press stakeout prompts → keep debate alive without empty consensus.",
      },
    ],
    seatPrompts: seats.map((seat) => ({
      seat,
      prompts: unscSeatPrompts(seat, subject),
    })),
  };
}

function buildGenericPack(topic: string, seats: string[], subject: string[]): Omit<CrisisNotesPack, "chamberLabel" | "topicLabel"> {
  return {
    formatLabel: "Crisis",
    subjectTags: subject.length ? subject : ["committee crisis"],
    briefing: [
      {
        id: "gen-brief-1",
        kind: "brief",
        title: "Chamber lens",
        body: "Run short injects, then force a decision: directive, coalition, or procedural move. Keep the agenda topic on the wall.",
      },
      {
        id: "gen-brief-2",
        kind: "brief",
        title: "Subject matter lock",
        body: `Anchor every update to: “${topic}”.`,
      },
    ],
    prompts: [
      {
        id: "gen-prompt-1",
        kind: "prompt",
        title: "Escalation beat",
        body: "New facts arrive that contradict the last consensus. Ask who changes position and who digs in.",
      },
      {
        id: "gen-prompt-2",
        kind: "prompt",
        title: "Decision beat",
        body: "Give eight minutes for a written response the public (or press) could read.",
      },
    ],
    pathways: [
      {
        id: "gen-path-1",
        kind: "pathway",
        title: "Cooperate → fracture → repair",
        body: "Shared statement → spoilers defect → forced renegotiation with a narrower operative ask.",
      },
    ],
    seatPrompts: seats.map((seat) => {
      const short = seatShortName(seat);
      return {
        seat,
        prompts: [
          `Ask ${short} for one concrete next step tied to the agenda.`,
          `Prompt ${short}: who must they persuade before the next update lands?`,
        ],
      };
    }),
  };
}

export function buildCrisisNotesPack(input: {
  committee: string | null | undefined;
  topicName: string | null | undefined;
  tagline?: string | null;
  seats: string[];
}): CrisisNotesPack {
  const chamberLabel = (input.committee ?? "").trim() || "Committee";
  const topicLabel = (input.topicName ?? "").trim() || "Active agenda topic";
  const seats = [...new Set(input.seats.map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  const subject = topicHints(topicLabel);
  const family = committeeFamily(chamberLabel);

  const core =
    family === "fwc"
      ? buildFwcPack(topicLabel, seats, subject)
      : family === "unsc"
        ? buildUnscPack(topicLabel, seats, subject)
        : buildGenericPack(topicLabel, seats, subject);

  if (input.tagline?.trim()) {
    core.briefing = [
      {
        id: "tagline",
        kind: "brief",
        title: "Committee tagline",
        body: input.tagline.trim(),
      },
      ...core.briefing,
    ];
  }

  return {
    chamberLabel,
    topicLabel,
    ...core,
  };
}
