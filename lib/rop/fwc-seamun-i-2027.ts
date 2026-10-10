// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { CommitteeRopConfig, RopAssetDef, RopPowerDef } from "./types";

/**
 * FWC (Stranger Things) — SEAMUN I 2027 Rules of Procedure (WIP draft).
 *
 * Edit this file when the RoP changes. Section numbers refer to the RoP PDF
 * (short form ch. 1–5 and the long-form annexes).
 */

/** "Core Crisis Powers & Directives" mechanisms, one line each. */
const POWER_SUMMARIES: Record<string, string> = {
  media_blackout: "Intercepts local press, seizes broadcast equipment and imposes federal gag orders.",
  silence_directive: "Sends covert operatives to detain or silence whistleblowers and witnesses.",
  jurisdictional_override: "Uses DoE clearance to seize scenes, lock down facilities or countermand HPD.",
  red_breach: "Deep-cover Soviet operatives infiltrate American facilities.",
  tactical_assassination: "Grigori or a hit team eliminates or captures a key obstacle.",
  underground_supply: "Mobilizes Soviet gear, guards and drill equipment beneath Hawkins.",
  papas_authority: "MKUltra conditioning and paternal authority to suppress psychic subjects.",
  federal_sanction: "Washington contacts override local investigations and freeze warrants.",
  zone_clearance: "DoE bio-hazard teams and barriers isolate infection zones or portals.",
  interagency_compromise: "Federal channels broker terms between military, HPD and civilians.",
  medical_triage: "Medical and cognitive care for characters hit by Upside Down trauma.",
  whistleblower_protection: "Off-the-record channels shield witnesses from federal cleanup units.",
  remote_viewing: "Projects into the Void to track people across Hawkins or the Upside Down.",
  telekinetic_assault: "Telekinesis to crush vehicles, throw squads or breach blast doors.",
  rift_sealing: "Tears open or forces closed a gate between Hawkins and the Upside Down.",
  memories_of_love: "An emotional power surge that overrides an active psychic attack.",
  passive_remote_viewing: "Passive sensing through the Void; no directive slot used.",
  vecna_curse: "Invades a vulnerable mind through psychic projections.",
  hive_mind: "Commands Demogorgons, vines or spore clouds.",
  boundary_tear: "Forces open a structural gate to the Upside Down.",
  cognitive_manipulation: "Projects false updates or phantom threats into rival minds.",
  municipal_intercept: "HPD deputies secure scenes, impound vehicles or issue local warrants.",
  off_grid_recon: "Backwoods trails and local contacts for covert surveillance.",
  tactical_intervention: "Small-arms and improvised tactics to breach a site or rescue allies.",
  chiefs_mandate: "Deputizes citizens and holds press briefings to expose threats.",
  wall_of_lights: "Lights, phones and radios rigged to detect interdimensional activity.",
  grassroots_rally: "Civilian networks for evacuations, supplies or makeshift defence.",
  mothers_fury: "Publicly challenges cover-ups and refuses gag orders.",
  whistleblower_exposure: "Assembles evidence and testimony to leak to the press.",
  wall_of_lights_passive: "Passive monitoring through the Wall of Lights.",
  mind_mask: "Projects hallucinations into targeted minds.",
  guerrilla_sabotage: "Stealth and illusions to raid storage, evidence lockers or convoys.",
  retributive_strike: "Forces former MKUltra staff to confront their past through illusions.",
  sisterly_bond: "A telepathic link with Eleven to combine their powers.",
  clean_sweep: "Troops, APCs and roadblocks enforce a military quarantine.",
  tactical_search: "Strike teams, aerial recon and dogs hunt a high-value target.",
  signal_jamming: "Jamming trucks flood Hawkins with electromagnetic interference.",
  scorched_earth: "Artillery or flame strikes on anomaly epicentres.",
};

const P = (
  key: string,
  label: string,
  frequency: string,
  directiveTypes: readonly string[] = ["personal"],
  approvalNote?: string
): RopPowerDef => ({ key, label, frequency, directiveTypes, approvalNote, summary: POWER_SUMMARIES[key] });

/** Character-sheet assets, keyed by category. Keys are stable ids stored on directives. */
const assets = (
  property: readonly string[],
  supplies: readonly string[],
  allies: readonly string[]
): RopAssetDef[] => {
  const slug = (label: string) =>
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);
  const out: RopAssetDef[] = [];
  for (const [category, labels] of [
    ["property", property],
    ["supplies", supplies],
    ["allies", allies],
  ] as const) {
    for (const label of labels) out.push({ key: `${category}_${slug(label)}`, label, category });
  }
  return out;
};

export const FWC_SEAMUN_I_2027_ROP: CommitteeRopConfig = {
  id: "fwc_seamun_i_2027",
  title: "FWC — SEAMUN I 2027 Rules of Procedure",
  version: "WIP (3)",

  // Ch. 4 §21–22. Hierarchy: Suspension > Adjournment > Close/Open debate >
  // caucuses (Unmoderated, Consultation, Interrogation, then Moderated) > administrative.
  motions: [
    { code: "suspend", labelKey: "suspend", label: "Suspend session", majority: "simple", precedence: 100, phase: "any", requiredFields: [], delegateRaisable: true, noteKey: "suspendNotLast" },
    { code: "adjourn", labelKey: "adjourn", label: "Adjourn session", majority: "simple", precedence: 98, phase: "debate", requiredFields: [], delegateRaisable: true, noteKey: "adjournLastOnly" },
    { code: "close_debate", labelKey: "closeDebate", label: "Close debate", majority: "simple", precedence: 90, phase: "debate", requiredFields: [], delegateRaisable: true },
    { code: "open_debate", labelKey: "openDebate", label: "Open debate", majority: "simple", precedence: 90, phase: "debate", requiredFields: [], delegateRaisable: true },
    { code: "unmoderated_caucus", labelKey: "unmoderatedCaucus", label: "Unmoderated caucus", majority: "simple", precedence: 60, phase: "debate", requiredFields: ["totalMinutes"], delegateRaisable: true },
    { code: "consultation", labelKey: "consultation", label: "Consultation of the whole", majority: "simple", precedence: 56, phase: "debate", requiredFields: ["totalMinutes", "topic"], delegateRaisable: true },
    { code: "interrogation", labelKey: "interrogation", label: "Interrogation", majority: "simple", precedence: 54, phase: "debate", requiredFields: ["totalMinutes", "target"], delegateRaisable: true },
    { code: "moderated_caucus", labelKey: "moderatedCaucus", label: "Moderated caucus", majority: "simple", precedence: 50, phase: "debate", requiredFields: ["totalMinutes", "speakerSeconds", "topic"], delegateRaisable: true },
    { code: "set_agenda", labelKey: "setAgenda", label: "Set the agenda", majority: "2/3", precedence: 30, phase: "debate", requiredFields: ["agendaTopic"], delegateRaisable: true },
    { code: "extend_opening_speech", labelKey: "extendSpeech", label: "Extend speaker time", majority: "simple", precedence: 30, phase: "debate", requiredFields: ["speakerSeconds"], delegateRaisable: true },
    { code: "exclude_public", labelKey: "excludePublic", label: "Exclude the public", majority: "simple", precedence: 30, phase: "voting", requiredFields: [], delegateRaisable: true },
    { code: "open_gsl", labelKey: "openGsl", label: "Open the speakers list", majority: "simple", precedence: 30, phase: "debate", requiredFields: [], delegateRaisable: true },
    { code: "roll_call_vote", labelKey: "rollCallVote", label: "Roll call vote", majority: "simple", precedence: 28, phase: "voting", requiredFields: [], delegateRaisable: true },
    { code: "silent_prayer", labelKey: "silentPrayer", label: "Minute of silent prayer or meditation", majority: "simple", precedence: 20, phase: "debate", requiredFields: [], delegateRaisable: true },
    // Cabinet directives go to the floor through the directive queue, not as a raised motion.
    { code: "cabinet_directive", labelKey: "cabinetDirective", label: "Cabinet directive", majority: "simple", denominator: "all_members", precedence: 70, phase: "any", requiredFields: [], delegateRaisable: false },
  ],

  // Ch. 4 §23 + long-form points.
  points: [
    { code: "personal_privilege", labelKey: "personalPrivilege", label: "Point of Personal Privilege", interrupts: true, viaNote: false, chairDiscretion: false },
    { code: "order", labelKey: "order", label: "Point of Order", interrupts: true, viaNote: false, chairDiscretion: false },
    { code: "parliamentary_inquiry", labelKey: "parliamentaryInquiry", label: "Point of Parliamentary Inquiry", interrupts: false, viaNote: false, chairDiscretion: false },
    { code: "poi", labelKey: "information", label: "Point of Information", interrupts: false, viaNote: false, chairDiscretion: false },
    { code: "poc", labelKey: "clarification", label: "Point of Clarification", interrupts: false, viaNote: false, chairDiscretion: false },
    { code: "right_of_reply", labelKey: "rightOfReply", label: "Right of Reply", interrupts: false, viaNote: true, chairDiscretion: true },
    { code: "fact_check", labelKey: "factCheck", label: "Fact Check", interrupts: false, viaNote: false, chairDiscretion: false },
  ],

  motionRules: {
    motionsAllowAbstain: false,
    maxMotionsPerDelegatePerRound: 1,
    autoPassMinSeconds: 2,
  },

  // Ch. 2 §2 / long form §15: "50% of present + 1", "two-thirds of present + 1".
  voting: {
    formula: "fraction_plus_one",
    simpleFraction: 1 / 2,
    twoThirdsFraction: 2 / 3,
    presentVotingMayAbstainSubstantive: false,
  },

  speaking: {
    gslSeconds: 60,
    yields: [
      { code: "chair", labelKey: "yieldChair", label: "To the chair" },
      { code: "questions", labelKey: "yieldQuestions", label: "To points of information" },
      { code: "delegate", labelKey: "yieldDelegate", label: "To another delegate", noReyield: true },
    ],
  },

  // Ch. 3 §7 + "Directives" annex.
  directives: {
    types: [
      {
        key: "personal",
        labelKey: "personal",
        label: "Personal directive",
        summary: "Private action by one character using their own powers and assets. Judged in secret by the dais; outcome comes back by private note or as a later crisis.",
        minAuthors: 1,
        maxAuthors: 1,
        coAuthorsMustSign: false,
        pooledResources: false,
        acceptsPowerTypes: ["personal"],
        coAuthorNoun: "co-authors",
        requiredFields: ["title", "request", "characterPower", "assets", "resource", "reason"],
        maxRequestChars: 2000,
        anonymityAllowed: true,
        visibility: "authors",
        floorVote: null,
        publishOutcomeToFeed: false,
        queuePriority: 2,
        submitWindow: "any",
      },
      {
        key: "joint",
        labelKey: "joint",
        label: "Joint directive",
        summary: "2–5 characters pool their resources. Goes straight to the dais for execution — no floor vote.",
        minAuthors: 2,
        maxAuthors: 5,
        coAuthorsMustSign: true,
        pooledResources: true,
        acceptsPowerTypes: "any",
        coAuthorNoun: "co-signers",
        requiredFields: ["title", "request", "characterPower", "assets", "resource", "reason"],
        maxRequestChars: 2000,
        anonymityAllowed: true,
        visibility: "authors",
        floorVote: null,
        publishOutcomeToFeed: false,
        queuePriority: 2,
        submitWindow: "any",
      },
      {
        key: "cabinet",
        labelKey: "cabinet",
        label: "Cabinet directive",
        summary: "Formal order drafted in unmoderated caucus, sponsored by delegates, debated and passed by a simple majority of the whole committee. Mobilises municipal, federal or military resources.",
        minAuthors: 2,
        maxAuthors: null,
        coAuthorsMustSign: true,
        pooledResources: true,
        acceptsPowerTypes: "any",
        coAuthorNoun: "sponsors",
        requiredFields: ["title", "request", "assets", "resource", "reason"],
        maxRequestChars: 3000,
        anonymityAllowed: false,
        visibility: "committee",
        floorVote: { majority: "simple", denominator: "all_members" },
        publishOutcomeToFeed: true,
        queuePriority: 3,
        submitWindow: "any",
        draftingHintKey: "cabinetDraftingHint",
      },
      {
        key: "press_release",
        labelKey: "pressRelease",
        label: "Press release",
        summary: "Public announcement that shapes NPCs, civilian panic, or leaks / covers up secrets. Broadcast to the committee once the dais clears it.",
        minAuthors: 1,
        maxAuthors: 1,
        coAuthorsMustSign: false,
        pooledResources: false,
        acceptsPowerTypes: ["personal", "press_release"],
        coAuthorNoun: "co-authors",
        requiredFields: ["title", "request", "characterPower", "assets", "resource", "reason"],
        maxRequestChars: 2000,
        anonymityAllowed: true,
        visibility: "authors",
        floorVote: null,
        publishOutcomeToFeed: true,
        queuePriority: 2,
        submitWindow: "any",
      },
      {
        key: "rapid_crisis_action",
        labelKey: "rapidCrisisAction",
        label: "Rapid crisis action",
        summary: "Immediate defensive reaction during an active crisis breach. Judged right away by the dais; cannot be anonymised.",
        minAuthors: 1,
        maxAuthors: 1,
        coAuthorsMustSign: false,
        pooledResources: false,
        acceptsPowerTypes: ["personal", "rapid_crisis_action"],
        coAuthorNoun: "co-authors",
        requiredFields: ["title", "request", "characterPower", "reason"],
        maxRequestChars: 1200,
        anonymityAllowed: false,
        visibility: "authors",
        floorVote: null,
        publishOutcomeToFeed: false,
        queuePriority: 0,
        submitWindow: "active_crisis",
      },
    ],
    anonymityUsesPerSession: 1,
    finalDirective: { typeKey: "cabinet", perCabinetPerDay: 1 },
    blockingStatusKeys: ["paralysis", "incapacitated"],
  },

  crisis: {
    qaSeconds: 300,
    pathwayDecision: "plurality",
    movement: {
      oneRequestAtATime: true,
      editableWhileQueued: true,
      vehicleBonusTerrain: ["road_pavement"],
    },
    cabinets: [
      { key: "A", label: "Cabinet A · DoE / Hawkins Lab" },
      { key: "B", label: "Cabinet B · U.S. Military" },
      { key: "C", label: "Cabinet C · KGB / Soviet GRU" },
      { key: "D", label: "Cabinet D · Civilian resistance & HPD" },
      { key: "E", label: "Cabinet E · Dimensional & rogue" },
    ],
    // "Limitations" annex.
    frequencies: [
      { key: "per_day", label: "Once per crisis day", scope: "day", max: 1 },
      { key: "per_three_mod", label: "Once per 3 moderated caucuses", scope: "mod_caucus_window", max: 1, window: 3 },
      { key: "session_x1", label: "Once per crisis session", scope: "session", max: 1 },
      { key: "session_x2", label: "Up to 2 per crisis session", scope: "session", max: 2 },
      { key: "simulation_x2", label: "Max 2 per simulation", scope: "simulation", max: 2 },
      { key: "simulation_x1", label: "Once per simulation", scope: "simulation", max: 1 },
      { key: "unlimited", label: "Unlimited / passive", scope: "unlimited", max: 0 },
    ],
    statuses: [
      { key: "burnout", label: "Power burnout / exhaustion", effect: "Cannot use telekinetic powers next caucus cycle.", blocksDirectives: false, blocksMovement: false },
      { key: "paralysis", label: "Psychological paralysis", effect: "Cannot write or submit directives for 1 caucus cycle.", blocksDirectives: true, blocksMovement: false },
      { key: "distortion", label: "Cognitive distortion", effect: "Receives distorted information from the dais.", blocksDirectives: false, blocksMovement: false },
      { key: "incapacitated", label: "Incapacitated / detained", effect: "Directive capability stripped until rescued (1–2 crisis updates).", blocksDirectives: true, blocksMovement: true },
      { key: "exhaustion_spores", label: "Spore exhaustion", effect: "Reduced action success rate on later turns.", blocksDirectives: false, blocksMovement: false },
    ],
    globalMeters: [
      { key: "public_panic_exposure", label: "Public panic & exposure", min: 0, max: 100 },
      { key: "dimensional_breach_index", label: "Rift integrity (level)", min: 1, max: 5 },
      { key: "hive_strain_spore_density", label: "Hive strain & spore density", min: 0, max: 100 },
    ],
    characters: [
      {
        country: "Agent Connie Frazier",
        cabinet: "A",
        powers: [
          P("media_blackout", "Media Blackout & Narrative Hijacking", "per_day"),
          P("silence_directive", "Covert Elimination (Silence Directive)", "simulation_x2", ["personal", "joint"], "Needs Dr. Brenner's approval"),
          P("jurisdictional_override", "Jurisdictional Override", "per_three_mod"),
        ],
        assets: assets(
          ["Off-grid DoE surveillance posts", "Wiretap monitoring vans", "Sub-Level 1 access at Hawkins National Lab"],
          ["Government-grade wiretapping gear", "Suppressed sidearms", "Falsified press credentials", "Media gag-order documents"],
          ["Dr. Martin Brenner", "DoE Covert Strike Unit", "Federal disinformation specialists"]
        ),
        meters: [
          { key: "covert_secrecy", label: "Covert secrecy index", min: 0, max: 100, legacyColumn: "covert_secrecy_index" },
          { key: "target_neutralization", label: "Target neutralization", min: 0, max: 100 },
        ],
      },
      {
        country: "Colonel KGB",
        cabinet: "C",
        powers: [
          P("red_breach", "Covert Infiltration & Sabotage (Red Breach)", "session_x2"),
          P("tactical_assassination", "Tactical Assassination & Interrogation", "simulation_x2", ["personal"], "Needs head chair approval"),
          P("underground_supply", "Underground Base Supply & Reinforcements", "per_day"),
        ],
        assets: assets(
          ["Underground Soviet complex beneath Starcourt Mall", "Rural safehouses in Roane County"],
          ["High-grade Soviet military equipment", "Industrial portal drills", "Encrypted shortwave radios", "Suppressed automatic weapons"],
          ["General Stepanov", "Soviet Spetsnaz strike teams", "Clandestine Russian research personnel", "Underground supply drivers"]
        ),
        meters: [
          { key: "subterranean_footprint", label: "Subterranean operational footprint", min: 0, max: 100, legacyColumn: "subterranean_footprint" },
          { key: "sabotage_efficiency", label: "Sabotage efficiency", min: 0, max: 100 },
        ],
      },
      {
        country: "Dr. Martin Brenner",
        cabinet: "A",
        powers: [
          P("papas_authority", "Papa's Authority (Re-Conditioning)", "session_x1"),
          P("federal_sanction", "Federal Intelligence Sanction", "simulation_x2", ["joint"], "Needs federal/military co-signature"),
        ],
        assets: assets(
          ["Hawkins National Laboratory (full clearance)", "Isolation Tank Facility", "Rainbow Room archives"],
          ["Experimental MKUltra sedatives", "Psychokinetic monitoring telemetry", "Subject 001–011 research logs", "Biohazard containment suits"],
          ["Agent Connie Frazier", "Hawkins Lab medical board", "DoE elite security guards", "Government research directors"]
        ),
        meters: [
          { key: "subject_control", label: "Subject control & re-conditioning", min: 0, max: 100, legacyColumn: "subject_control_rating" },
          { key: "lab_containment", label: "Sub-level lab containment", min: 0, max: 100 },
        ],
      },
      {
        country: "Dr. Sam Owens",
        cabinet: "A",
        powers: [
          P("zone_clearance", "Bio-Hazard Isolation (Zone Clearance)", "per_day"),
          P("interagency_compromise", "Inter-Agency Compromise", "per_three_mod"),
          P("medical_triage", "Medical Triage & Cognitive Shielding", "session_x2"),
          P("whistleblower_protection", "De-escalation Whistleblower Protection", "simulation_x2"),
        ],
        assets: assets(
          ["DoE Field Office", "Hawkins Lab Bio-Containment Sector", "Environmental monitoring outposts"],
          ["Soil and spore sampling kits", "Bio-hazard burn equipment", "Emergency quarantine barriers", "Direct federal hotline to Washington"],
          ["DoE environmental response teams", "Military medical corps", "Pragmatist lab scientists", "Jim Hopper (working relationship)"]
        ),
        meters: [
          { key: "biohazard_mitigation", label: "Bio-hazard mitigation", min: 0, max: 100 },
          { key: "interagency_trust", label: "Inter-agency trust", min: 0, max: 100 },
        ],
      },
      {
        country: "Eleven (011/Jane Ives)",
        cabinet: "D",
        powers: [
          P("remote_viewing", "Remote Viewing (deep scan)", "session_x2"),
          P("telekinetic_assault", "Tactical Telekinetic Assault", "per_three_mod"),
          P("rift_sealing", "Dimensional Rift Sealing / Opening", "simulation_x2", ["personal", "joint"]),
          P("memories_of_love", "Memories of Love & Trauma", "simulation_x1"),
          P("passive_remote_viewing", "Passive Remote Viewing", "unlimited"),
        ],
        assets: assets(
          ["Hidden cabin in the Hawkins woods", "Makeshift isolation tank setups"],
          ["Eggo waffles", "Portable CB radio", "Sensory deprivation goggles", "Heavy winter jacket", "Stolen Hawkins Lab records"],
          ["Jim Hopper", "Joyce Byers", "The Hawkins Party (Mike, Dustin, Lucas, Will, Max)", "Dr. Sam Owens (situational)"]
        ),
        meters: [
          { key: "psychic_strain", label: "Psychic strain", min: 0, max: 100 },
          { key: "seal_success", label: "Dimensional seal success", min: 0, max: 100 },
        ],
      },
      {
        country: "Henry Creel (001/Vecna)",
        cabinet: "E",
        powers: [
          P("vecna_curse", "Mindscape Infiltration (Vecna Curse)", "per_day"),
          P("hive_mind", "Hive Mind Coordination", "per_three_mod"),
          P("boundary_tear", "Dimensional Gate Construction (Boundary Tear)", "simulation_x2", ["personal", "joint"]),
          P("cognitive_manipulation", "Cognitive Manipulation & Gaslighting", "session_x2"),
        ],
        assets: assets(
          ["The Creel House", "The Upside Down (Dimension X)", "Mind Flayer Hive Core"],
          ["Biological vine networks", "Dimensional portals", "Psychokinetic memory traps", "Spore clouds", "Psychic curse channels"],
          ["The Mind Flayer", "Demogorgons", "Demodogs", "The Flayed (mind-controlled hosts)"]
        ),
        meters: [
          { key: "trauma_harvest", label: "Mindscape trauma harvest", min: 0, max: 100 },
          { key: "hive_domain", label: "Hive mind domain expansion", min: 0, max: 100 },
        ],
      },
      {
        country: "Jim Hopper",
        cabinet: "D",
        powers: [
          P("municipal_intercept", "Municipal Intercept & Evidence Subpoena", "per_day"),
          P("off_grid_recon", "Off-the-Grid Reconnaissance", "session_x2"),
          P("tactical_intervention", "Tactical Intervention & Forceful Resistance", "per_three_mod", ["personal", "rapid_crisis_action"]),
          P("chiefs_mandate", "Small-Town Rally (Chief's Mandate)", "simulation_x2"),
        ],
        assets: assets(
          ["Hawkins Police Department HQ", "Chief's cruiser", "Isolated woodland cabin"],
          ["Service revolver", "Shotguns", "Police dispatch radio", "Search-and-rescue gear", "Municipal blueprints", "HPD evidence locker access"],
          ["Joyce Byers", "Eleven", "Deputy Callahan", "Officer Powell", "Murray Bauman"]
        ),
        meters: [
          { key: "municipal_safety", label: "Municipal safety", min: 0, max: 100 },
          { key: "jurisdictional_autonomy", label: "Jurisdictional autonomy", min: 0, max: 100 },
        ],
      },
      {
        country: "Joyce Byers",
        cabinet: "D",
        powers: [
          P("wall_of_lights", "Wall of Lights (active probe)", "session_x2"),
          P("grassroots_rally", "Grassroots Rally & Civilian Mobilization", "per_day"),
          P("mothers_fury", "Gaslighting Immunity (Mother's Fury)", "per_three_mod", ["personal", "press_release"]),
          P("whistleblower_exposure", "Unofficial Investigative Alliance", "simulation_x2", ["personal", "joint"]),
          P("wall_of_lights_passive", "Wall of Lights (passive monitoring)", "unlimited"),
        ],
        assets: assets(
          ["Byers Residence (Forest Hills)", "Melvald's General Store access"],
          ["Christmas lights", "Rotary phones", "Wall-drawn alphabet maps", "Broad-spectrum radio receivers", "Hunting rifles"],
          ["Jim Hopper", "Eleven", "Will Byers", "Jonathan Byers", "Murray Bauman"]
        ),
        meters: [
          { key: "truth_exposure", label: "Anomaly detection & truth exposure", min: 0, max: 100 },
          { key: "supply_network", label: "Civilian supply network", min: 0, max: 100 },
        ],
      },
      {
        country: "Kali Prasad (008)",
        cabinet: "E",
        powers: [
          P("mind_mask", "Sensory Illusion Casting (Mind Mask)", "per_day"),
          P("guerrilla_sabotage", "Guerrilla Sabotage & Heist Operations", "session_x2"),
          P("retributive_strike", "Retributive Strike", "per_three_mod"),
          P("sisterly_bond", "Sisterly Psychic Bond", "simulation_x2", ["personal", "joint"]),
        ],
        assets: assets(
          ["Abandoned Chicago industrial warehouse", "Modified getaway van"],
          ["Spray paint", "Masks", "Stolen handguns", "Street maps", "Forged identity papers", "Illusion-focus items"],
          ["Rogue vigilante crew (Axel, Dottie, Mick, Funhouse)", "Eleven (estranged sister)"]
        ),
        meters: [
          { key: "stealth_index", label: "Guerrilla stealth & evasion", min: 0, max: 100 },
          { key: "vengeance_score", label: "Retributive vengeance", min: 0, max: 100 },
        ],
      },
      {
        country: "Lt. Colonel Jack Sullivan",
        cabinet: "B",
        powers: [
          P("clean_sweep", "Martial Law (Operation Clean Sweep)", "per_day"),
          P("tactical_search", "Tactical Search & Neutralization", "session_x2"),
          P("signal_jamming", "Signal Jamming", "per_three_mod"),
          P("scorched_earth", "Scorched-Earth Ordnance", "simulation_x2", ["personal"], "Needs approval or a major crisis trigger"),
        ],
        assets: assets(
          ["U.S. Military command tent and base", "Mobile tactical units", "Martial law checkpoints around Hawkins"],
          ["Heavy military ordnance", "Armored personnel carriers", "Radio jamming arrays", "Anti-anomaly containment hardware"],
          ["U.S. Army Special Operations platoon", "Pentagon oversight board", "Military intelligence officers"]
        ),
        meters: [
          { key: "martial_law_dominance", label: "Martial law dominance", min: 0, max: 100 },
          { key: "threat_neutralization", label: "Threat neutralization", min: 0, max: 100 },
        ],
      },
    ],
    // "Inventory" annex.
    inventory: [
      { code: "PUB-01", cabinet: "public", category: "Facility", name: "Hawkins Police Headquarters", location: "B8", status: "Chief Jim Hopper / Operational" },
      { code: "PUB-02", cabinet: "public", category: "Logistics", name: "HPD Patrol Cruisers & Tactical Transport", location: "B8", status: "Hawkins Police Dept (HPD)" },
      { code: "PUB-03", cabinet: "public", category: "Logistics", name: "Municipal Fire & Emergency Medical Vehicles", location: "C6-D7", status: "Public / Unassigned" },
      { code: "PUB-04", cabinet: "public", category: "Commercial", name: "Bradley's Big Buy (Ration & Supply Depot)", location: "E6-F7", status: "Civilian Access / Intact" },
      { code: "PUB-05", cabinet: "public", category: "Commercial", name: "Starcourt Mall Commercial Hub", location: "D10-E11", status: "Civilian / Operational" },
      { code: "PUB-06", cabinet: "public", category: "Comms", name: "Hawkins Post Newspaper & Press Dispatch", location: "C6-D7", status: "Media Outlets / Subject to Gag Orders" },
      { code: "PUB-07", cabinet: "public", category: "Comms", name: "Civilian HAM Radio & CB Relay Towers", location: "F8-F12", status: "Civilian Network / Unsecured" },
      { code: "PUB-08", cabinet: "public", category: "Infrastructure", name: "Main Municipal Power Substation & Grid", location: "C6", status: "Municipal Utility / Active" },
      { code: "DOE-01", cabinet: "A", category: "Facility", name: "Hawkins National Lab (Sub-Levels 1-5 & Isolation Tank)", location: "B2-C4", status: "Restricted / Full Lab Access" },
      { code: "DOE-02", cabinet: "A", category: "Intel", name: "Subject 001-011 MKUltra Telemetry & Research Logs", location: "B2-C4", status: "Classified / Retained by Brenner" },
      { code: "DOE-03", cabinet: "A", category: "Logistics", name: "DoE Unmarked Wiretap & Surveillance Vans", location: "B2-C4", status: "Active Mobile Patrols" },
      { code: "DOE-04", cabinet: "A", category: "Tactical", name: "DoE Covert Strike Units", location: "B2-C4", status: "Operatives Available" },
      { code: "DOE-05", cabinet: "A", category: "Bio/Haz", name: "Environmental Bio-Hazard Quarantine & Burn Units", location: "B2-C4 / Field", status: "Assigned to Dr. Sam Owens" },
      { code: "DOE-06", cabinet: "A", category: "Comms", name: "Federal Emergency Hotline (Direct Link to Washington)", location: "Field Office", status: "Active / Executive Immunity" },
      { code: "MIL-01", cabinet: "B", category: "Facility", name: "U.S. Army Mobile Command Tent & Checkpoint Base", location: "Perimeter Checkpoints", status: "Operational" },
      { code: "MIL-02", cabinet: "B", category: "Logistics", name: "Armored Personnel Carriers & Armed Transport", location: "Perimeter Checkpoints", status: "Ready for Deployment" },
      { code: "MIL-03", cabinet: "B", category: "Comms", name: "Broad-Spectrum Radio-Jamming Truck Arrays", location: "Mobile Units", status: "Ready for Signal Jamming" },
      { code: "MIL-04", cabinet: "B", category: "Tactical", name: "U.S. Army Special Operations Platoon & Tracking Dogs", location: "Mobile Command", status: "Search & Neutralize Ready" },
      { code: "MIL-05", cabinet: "B", category: "Ordnance", name: "Heavy Artillery & Flamethrower Ordnance Units", location: "Mobile Command", status: "High Collateral Risk" },
      { code: "SOV-01", cabinet: "C", category: "Facility", name: "Subterranean Soviet Complex & Portal Research Sector", location: "J10-K11", status: "Secret / Subterranean Access" },
      { code: "SOV-02", cabinet: "C", category: "Tech", name: "Industrial-Grade Dimension Portal Drills", location: "J10-K11", status: "Operational / Requires Energy" },
      { code: "SOV-03", cabinet: "C", category: "Tactical", name: "Spetsnaz Deep-Cover Sabotage & Strike Squads", location: "Hidden Safehouses", status: "Infiltration Ready" },
      { code: "SOV-04", cabinet: "C", category: "Comms", name: "Encrypted Shortwave Military Radios & Intercept Units", location: "Complex / Safehouses", status: "Active" },
      { code: "CIV-01", cabinet: "D", category: "Facility", name: "Forest Hills Byers Residence & Wall-of-Lights Array", location: "D12", status: "Active Analog Link" },
      { code: "CIV-02", cabinet: "D", category: "Facility", name: "Hidden Woodland Cabin & Deprivation Tank Setup", location: "Outer Woods", status: "Concealed" },
      { code: "CIV-03", cabinet: "D", category: "Tactical", name: "HPD Service Armory", location: "B8", status: "Restricted to HPD Deputies" },
      { code: "CIV-04", cabinet: "D", category: "Comms", name: "Broad-Spectrum Radio Receivers & Portable CB Radios", location: "Byers Residence / Mobile", status: "Unmonitored" },
      { code: "CIV-05", cabinet: "D", category: "Supplies", name: "High-Concentration Industrial Salt & Goggles", location: "Byers / Cabin", status: "Deprivation Tank Prep" },
      { code: "DIM-01", cabinet: "E", category: "Facility", name: "The Creel House (Mindscape & Physical Core)", location: "H8", status: "Hive Mind Node" },
      { code: "DIM-02", cabinet: "E", category: "Biological", name: "Biological Tendril Vines & Spore Cloud Networks", location: "G1-L12", status: "Expands via Directives" },
      { code: "DIM-03", cabinet: "E", category: "Tactical", name: "Demogorgon & Demodog Hunting Packs", location: "Dimensional Rifts", status: "Subterranean / Surface Strike" },
      { code: "ROG-01", cabinet: "E", category: "Facility", name: "Abandoned Industrial Warehouse & Getaway Van", location: "Off-Grid / Mobile", status: "Rogue Vigilante Hideout" },
      { code: "ROG-02", cabinet: "E", category: "Intel", name: "Forged Identity Papers & Disguise Kits", location: "Getaway Van", status: "Assigned to Kali's Crew" },
    ],
    // Backroom prompt: "2 Real Hours = 12 In-Universe Hours". Start time and carry-over are not in the RoP.
    clock: {
      label: "Hawkins",
      startMinutes: 12 * 60,
      rate: 6,
      carryOverBetweenSessions: false,
      blocks: [
        { key: "night", label: "Night", fromMinutes: 0 },
        { key: "morning", label: "Morning", fromMinutes: 6 * 60 },
        { key: "afternoon", label: "Afternoon", fromMinutes: 12 * 60 },
        { key: "evening", label: "Evening", fromMinutes: 18 * 60 },
      ],
    },
  },
};
