/** Checklist copy aligned with [SEAMUNs chair dashboard](https://thedashboard.seamuns.site/chair) prep & flow sections. */

export type ChairPrepSection = {
  id: string;
  title: string;
  items: { id: string; label: string }[];
};

export const CHAIR_PREP_SECTIONS: ChairPrepSection[] = [
  {
    id: "rules",
    title: "Rules & procedure",
    items: [
      { id: "rop", label: "Read and understand committee rules of procedure" },
      { id: "parliamentary", label: "Review parliamentary procedure (motions, points, voting)" },
      { id: "speaking-times", label: "Confirm speaking times and time limits" },
      { id: "quorum", label: "Know quorum and voting requirements" },
    ],
  },
  {
    id: "topic",
    title: "Committee & topic",
    items: [
      { id: "research", label: "Research committee topic and background" },
      { id: "study-guide", label: "Read study guide and key documents" },
      { id: "dashboard-topic", label: "Set committee name and topic in dashboard" },
      { id: "agenda", label: "Prepare session agenda and flow" },
    ],
  },
  {
    id: "room",
    title: "Room & tech",
    items: [
      { id: "digital-room", label: "Set up digital room (delegates list, placards)" },
      { id: "tech-check", label: "Tech check: platform, audio, screen share" },
      { id: "backup", label: "Have backup plan if tech fails" },
    ],
  },
  {
    id: "materials",
    title: "Materials & logistics",
    items: [
      { id: "roll-plan", label: "Prepare roll call list and attendance" },
      { id: "speakers-plan", label: "Plan speakers list management" },
      { id: "templates", label: "Prepare common motions / points (if using templates)" },
      { id: "timing", label: "Confirm session start time and breaks" },
    ],
  },
  {
    id: "crisis",
    title: "Crisis (if applicable)",
    items: [
      { id: "crisis-slides", label: "Review crisis elements and update slides" },
      { id: "crisis-cues", label: "Plan crisis speaker order / cues" },
      { id: "crisis-paths", label: "Prepare crisis pathways and facts" },
    ],
  },
  {
    id: "team",
    title: "Team & communication",
    items: [
      { id: "co-chairs", label: "Coordinate with co-chair(s) on roles" },
      { id: "staff", label: "Confirm staff / dais support and cues" },
      { id: "delegate-brief", label: "Prepare brief for delegates (rules, timing)" },
    ],
  },
];

export const CHAIR_FLOW_ITEMS: { id: string; label: string }[] = [
  { id: "roll-call", label: "Roll call" },
  { id: "open-floor", label: "Open the floor (points & motions)" },
  { id: "recognize", label: "Recognize motions" },
  { id: "vote-1", label: "Vote on motion(s)" },
  { id: "engage", label: "Engage in chosen motion or move to GSL" },
  { id: "open-again", label: "Open the floor again" },
  { id: "recognize-repeat", label: "Recognize motions (repeat as needed)" },
  { id: "vote-2", label: "Vote on motion(s)" },
  { id: "cycle", label: "Continue cycle (engage motion / GSL → open floor)" },
];
