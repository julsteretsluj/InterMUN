export type EuSessionPhase =
  | "roll_call"
  | "agenda"
  | "opening_speeches"
  | "cabinet_meeting"
  | "shadow_meeting"
  | "formal_debate"
  | "resolution_debate"
  | "voting_procedure"
  | "closing_statements"
  | "adjourned";

export const EU_SESSION_PHASE_ORDER: EuSessionPhase[] = [
  "roll_call",
  "agenda",
  "opening_speeches",
  "cabinet_meeting",
  "shadow_meeting",
  "formal_debate",
  "resolution_debate",
  "voting_procedure",
  "closing_statements",
  "adjourned",
];

export function parseEuSessionPhase(value: string | null | undefined): EuSessionPhase {
  const v = value?.toString().trim().toLowerCase();
  if (EU_SESSION_PHASE_ORDER.includes(v as EuSessionPhase)) return v as EuSessionPhase;
  return "roll_call";
}

export function euSessionPhaseLabel(phase: EuSessionPhase): string {
  switch (phase) {
    case "roll_call":
      return "Roll call";
    case "agenda":
      return "Agenda setting";
    case "opening_speeches":
      return "Opening speeches";
    case "cabinet_meeting":
      return "Cabinet meeting";
    case "shadow_meeting":
      return "Shadow meeting";
    case "formal_debate":
      return "Formal debate";
    case "resolution_debate":
      return "Resolution debate";
    case "voting_procedure":
      return "Voting procedure";
    case "closing_statements":
      return "Closing statements";
    case "adjourned":
      return "Adjourned";
  }
}

export function nextEuSessionPhase(current: EuSessionPhase): EuSessionPhase {
  const idx = EU_SESSION_PHASE_ORDER.indexOf(current);
  if (idx < 0 || idx === EU_SESSION_PHASE_ORDER.length - 1) return current;
  return EU_SESSION_PHASE_ORDER[idx + 1]!;
}

export function previousEuSessionPhase(current: EuSessionPhase): EuSessionPhase {
  const idx = EU_SESSION_PHASE_ORDER.indexOf(current);
  if (idx <= 0) return current;
  return EU_SESSION_PHASE_ORDER[idx - 1]!;
}

export function isProcedureCodeRecommendedInEuPhase(
  phase: EuSessionPhase,
  procedureCode: string | null
): boolean {
  if (!procedureCode) return true;
  const code = procedureCode.trim().toLowerCase();
  switch (phase) {
    case "roll_call":
      return code === "set_agenda";
    case "agenda":
      return code === "set_agenda";
    case "opening_speeches":
      return code === "extend_opening_speech" || code === "cabinet_meeting";
    case "cabinet_meeting":
      return code === "shadow_meeting" || code === "unmoderated_caucus" || code === "moderated_caucus";
    case "shadow_meeting":
      return code === "moderated_caucus" || code === "consultation" || code === "open_debate";
    case "formal_debate":
      return (
        code === "moderated_caucus" ||
        code === "consultation" ||
        code === "unmoderated_caucus" ||
        code === "open_debate" ||
        code === "for_against_speeches"
      );
    case "resolution_debate":
      return (
        code === "open_debate" ||
        code === "for_against_speeches" ||
        code === "amendment" ||
        code === "divide_question" ||
        code === "clause_by_clause" ||
        code === "close_debate"
      );
    case "voting_procedure":
      return code === "roll_call_vote" || code === "divide_question" || code === "clause_by_clause";
    case "closing_statements":
      return code === "adjourn" || code === "suspend";
    case "adjourned":
      return code === "adjourn";
  }
}
