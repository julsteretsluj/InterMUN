// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { FwcDirectiveType } from "@/lib/fwc/types";

/** RoP in-game clock (pages 91–92). */
export const FWC_IN_GAME_SCALE =
  "2 Real Hours = 12 In-Universe Hours (1 Real Hour = 6 In-Universe Hours)";

const TYPE_PLACEHOLDER = "[Personal Directive / Cabinet Directive / Rapid Action / Crisis Update]";
const NAME_PLACEHOLDER = "[Insert Name & Portfolio]";
const GRID_PLACEHOLDER = "[E.g., B2–C4, H3, J10–K11]";
const ACTION_PLACEHOLDER = "[Insert Text of Directive or Pathway]";
const TIME_PLACEHOLDER = "[Morning / Afternoon / Evening]";

/**
 * Exact Backroom Crisis Director prompt from the FWC RoP (pp. 91–92),
 * covering 1980s tech, spatial/MP, portfolio, evidence/meters, and committee flow.
 */
export const FWC_BACKROOM_CRISIS_DIRECTOR_PROMPT = `You are acting as the Backroom Crisis Director for a high-intensity crisis committee set in 1980s Hawkins, Indiana. Your task is to rigorously evaluate a proposed [DELEGATE DIRECTIVE / CRISIS PATHWAY / CRISIS UPDATE] against realistic committee constraints, established lore, and mechanical feasibility before the Chair team approves or resolves it.

INPUT DATA FOR EVALUATION
• Type: ${TYPE_PLACEHOLDER}
• Submitting Delegate / Entity: ${NAME_PLACEHOLDER}
• Primary Target Grid Coordinate(s): ${GRID_PLACEHOLDER}
• Proposed Action / Narrative Escalation: ${ACTION_PLACEHOLDER}
• In-Game Time of Day Block: ${TIME_PLACEHOLDER}
• In-Game Scale: ${FWC_IN_GAME_SCALE}

EVALUATION MATRIX
Evaluate the input across the following five criteria, scoring each from 1 to 5 (1 = Unrealistic/Broken, 5 = Highly Realistic/Seamless):

1. REALISM & 1980s TECHNOLOGICAL CONSTRAINTS (1–5)
   • Does the action align with available 1980s technology (rotary phones, analog radio frequencies, paper logs, local emergency dispatches)?
   • Does it avoid anachronisms or overly modern surveillance/telecommunications?

2. SPATIAL & MOVEMENT FEASIBILITY (1–5)
   • Does the targeted grid coordinate match the real-world or Upside Down location on the Hawkins tactical map?
   • Is physical travel or asset deployment plausible within the current in-game time block (1 real hour = 6 in-game hours)?
   • Does it account for Movement Point (MP) terrain costs (e.g., Forest = 2 MP, Spore Cloud = 3 MP)?

3. PORTFOLIO & ASSET AUTHORITY (1–5)
   • Does the delegate or entity possess the specific clearance (e.g., Level 4 Clearance), resources, or jurisdiction to execute this?
   • If joint assets are required, were they properly authorized?

4. NARRATIVE LEVERAGE & EVIDENCE INTEGRATION (1–5)
   • Does this action utilize or generate verifiable evidence (e.g., wiretap tapes, lab reports, map telemetry)?
   • Does it trigger logical dynamic consequences, crisis meter shifts (e.g., Psionic Activity, Rift Widening), or backroom responses?

5. COMMITTEE FLOW & BALANCE (1–5)
   • Does this action keep the committee competitive without instantly neutralizing major narrative threads or soft-locking other delegates?

REQUIRED OUTPUT FORMAT FOR CHAIRS
• OVERALL VERDICT: [APPROVED / APPROVED WITH CONDITIONS / REJECTED / NEEDS REVISION]
  VIABILITY SCORE: [ _ / 25]
• STRENGTHS:
  - [Brief bullet points on why this works well]
• REALISM & LOGISTICAL FLAWS:
  - [Brief bullet points on any coordinate misalignments, tech violations, or timing impossibilities]
• RECOMMENDED BACKROOM RESOLUTION / FEEDBACK (If Approved):
  - In-Game Time of Resolution: [E.g., Resolves at the start of Afternoon Block]
  - Evidence / Intelligence Output: [Exact item, document, or coordinate leak generated]
  - Map & Meter Impact: [Specific grid status or risk meter changes]
• CHAIR REVISION GUIDANCE (If Rejected/Needs Revision):
  - [1–2 sentences explaining what the delegate must adjust to make the directive feasible]`;

export const FWC_DIRECTIVE_TYPE_PROMPT_LABEL: Record<FwcDirectiveType, string> = {
  personal: "Personal Directive",
  joint: "Joint Directive",
  cabinet: "Cabinet Directive",
  press_release: "Press Release",
  rapid_crisis_action: "Rapid Action",
};

export type FwcEvaluationPromptDirective = {
  directiveType: FwcDirectiveType;
  submitterName: string;
  /** Portfolio / powers line (character catalog `powersAndAssets` or a shorter seat label). */
  portfolio?: string | null;
  targetGrid?: string | null;
  requestBody?: string | null;
  assetsAndPowers?: string | null;
  reason?: string | null;
  timeOfDayBlock?: string | null;
};

function fillLine(haystack: string, placeholder: string, value: string | null | undefined): string {
  const next = (value ?? "").trim();
  if (!next) return haystack;
  return haystack.replace(placeholder, next);
}

function composeSubmitter(directive: FwcEvaluationPromptDirective): string {
  const name = directive.submitterName.trim();
  const portfolio = (directive.portfolio ?? "").trim();
  if (name && portfolio) return `${name} — ${portfolio}`;
  return name || portfolio;
}

function composeAction(directive: FwcEvaluationPromptDirective): string {
  const parts = [
    (directive.requestBody ?? "").trim(),
    (directive.assetsAndPowers ?? "").trim()
      ? `Assets & Powers: ${directive.assetsAndPowers!.trim()}`
      : "",
    (directive.reason ?? "").trim() ? `Reason: ${directive.reason!.trim()}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

/** Fill the RoP INPUT DATA placeholders from a submitted directive. */
export function fillFwcEvaluationPrompt(directive: FwcEvaluationPromptDirective): string {
  let prompt = FWC_BACKROOM_CRISIS_DIRECTOR_PROMPT;
  prompt = fillLine(prompt, TYPE_PLACEHOLDER, FWC_DIRECTIVE_TYPE_PROMPT_LABEL[directive.directiveType]);
  prompt = fillLine(prompt, NAME_PLACEHOLDER, composeSubmitter(directive));
  prompt = fillLine(prompt, GRID_PLACEHOLDER, directive.targetGrid);
  prompt = fillLine(prompt, ACTION_PLACEHOLDER, composeAction(directive));
  prompt = fillLine(prompt, TIME_PLACEHOLDER, directive.timeOfDayBlock);
  return prompt;
}
