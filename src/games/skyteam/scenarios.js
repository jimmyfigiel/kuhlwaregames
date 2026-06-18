// src/games/skyteam/scenarios.js
//
// All SkyTeam approach scenarios.
// Traffic values are PLACEHOLDERS — verify each against physical cards.
// Format: [space-0, space-1, space-2, space-3, space-4, space-5, airport]
//         space-0 = starting position (plane begins here), airport = destination.
// Each number = traffic count on that space (0–3).

function makeSpaces(traffic) {
  return [
    ...traffic.map((t, i) => ({
      id: `space-${i}`,
      label: i === 0 ? "Current" : String(i),
      kind: "sky",
      traffic: t,
    })),
    { id: "airport", label: "Airport", kind: "airport", traffic: 0 },
  ];
}

export const SCENARIOS = [
  // ── LHR — London Heathrow ──────────────────────────────────────
  {
    id: "lhr-a",
    code: "LHR",
    airport: "London Heathrow",
    side: "A",
    difficulty: "beginner",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 1, 2, 1]), // ⚠ placeholder
  },
  {
    id: "lhr-b",
    code: "LHR",
    airport: "London Heathrow",
    side: "B",
    difficulty: "intermediate",
    notes: "",
    spaces: makeSpaces([0, 1, 1, 2, 1, 0]), // ⚠ placeholder
  },

  // ── HND — Tokyo Haneda ─────────────────────────────────────────
  {
    id: "hnd-a",
    code: "HND",
    airport: "Tokyo Haneda",
    side: "A",
    difficulty: "advanced",
    notes: "Special wind conditions on some spaces",
    spaces: makeSpaces([0, 1, 1, 2, 1, 1]), // ⚠ placeholder
  },
  {
    id: "hnd-b",
    code: "HND",
    airport: "Tokyo Haneda",
    side: "B",
    difficulty: "intermediate",
    notes: "Special wind conditions on some spaces",
    spaces: makeSpaces([0, 0, 1, 1, 2, 0]), // ⚠ placeholder
  },

  // ── OSL — Oslo Gardermoen ──────────────────────────────────────
  {
    id: "osl-a",
    code: "OSL",
    airport: "Oslo Gardermoen",
    side: "A",
    difficulty: "advanced",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 2, 1, 1]), // ⚠ placeholder
  },
  {
    id: "osl-b",
    code: "OSL",
    airport: "Oslo Gardermoen",
    side: "B",
    difficulty: "initiation",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 0, 1, 0]), // ⚠ placeholder
  },

  // ── PBH — Paro, Bhutan ────────────────────────────────────────
  {
    id: "pbh-a",
    code: "PBH",
    airport: "Paro",
    side: "A",
    difficulty: "expert",
    notes: "Visibility and wind special conditions",
    spaces: makeSpaces([0, 1, 2, 2, 2, 1]), // ⚠ placeholder
  },
  {
    id: "pbh-b",
    code: "PBH",
    airport: "Paro",
    side: "B",
    difficulty: "advanced",
    notes: "Visibility and wind special conditions",
    spaces: makeSpaces([0, 1, 1, 2, 1, 1]), // ⚠ placeholder
  },

  // ── ATL — Atlanta Hartsfield-Jackson ──────────────────────────
  {
    id: "atl-a",
    code: "ATL",
    airport: "Atlanta Hartsfield-Jackson",
    side: "A",
    difficulty: "beginner",
    notes: "Crosswind condition",
    spaces: makeSpaces([0, 0, 1, 1, 1, 1]), // ⚠ placeholder
  },
  {
    id: "atl-b",
    code: "ATL",
    airport: "Atlanta Hartsfield-Jackson",
    side: "B",
    difficulty: "initiation",
    notes: "Crosswind condition",
    spaces: makeSpaces([0, 0, 0, 1, 1, 0]), // ⚠ placeholder
  },

  // ── PRG — Prague Václav Havel ─────────────────────────────────
  {
    id: "prg-a",
    code: "PRG",
    airport: "Prague Václav Havel",
    side: "A",
    difficulty: "beginner",
    notes: "",
    spaces: makeSpaces([0, 1, 1, 0, 1, 0]), // ⚠ placeholder
  },
  {
    id: "prg-b",
    code: "PRG",
    airport: "Prague Václav Havel",
    side: "B",
    difficulty: "initiation",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 0, 0, 0]), // ⚠ placeholder
  },

  // ── KEF — Keflavik, Iceland ───────────────────────────────────
  {
    id: "kef-a",
    code: "KEF",
    airport: "Keflavik",
    side: "A",
    difficulty: "expert",
    notes: "Ice and visibility conditions",
    spaces: makeSpaces([0, 2, 2, 1, 2, 1]), // ⚠ placeholder
  },
  {
    id: "kef-b",
    code: "KEF",
    airport: "Keflavik",
    side: "B",
    difficulty: "beginner",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 1, 1, 0]), // ⚠ placeholder
  },

  // ── YUL — Montréal-Trudeau ────────────────────────────────────
  {
    id: "yul-a",
    code: "YUL",
    airport: "Montréal-Trudeau",
    side: "A",
    difficulty: "intermediate",
    notes: "",
    spaces: makeSpaces([0, 1, 2, 0, 1, 0]), // ✓ verified from game
  },
  {
    id: "yul-b",
    code: "YUL",
    airport: "Montréal-Trudeau",
    side: "B",
    difficulty: "initiation",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 0, 0, 0]), // ⚠ placeholder
  },

  // ── KUL — Kuala Lumpur International ─────────────────────────
  {
    id: "kul-a",
    code: "KUL",
    airport: "Kuala Lumpur",
    side: "A",
    difficulty: "expert",
    notes: "Special tropical conditions",
    spaces: makeSpaces([0, 2, 1, 2, 2, 1]), // ⚠ placeholder
  },
  {
    id: "kul-b",
    code: "KUL",
    airport: "Kuala Lumpur",
    side: "B",
    difficulty: "beginner",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 1, 1, 0]), // ⚠ placeholder
  },

  // ── TGU — Tegucigalpa Toncontin ───────────────────────────────
  {
    id: "tgu-a",
    code: "TGU",
    airport: "Tegucigalpa Toncontin",
    side: "A",
    difficulty: "advanced",
    notes: "Challenging short approach",
    spaces: makeSpaces([0, 1, 1, 2, 1, 1]), // ⚠ placeholder
  },
  {
    id: "tgu-b",
    code: "TGU",
    airport: "Tegucigalpa Toncontin",
    side: "B",
    difficulty: "beginner",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 1, 0, 0]), // ⚠ placeholder
  },

  // ── GIG — Rio de Janeiro Galeão ───────────────────────────────
  {
    id: "gig-a",
    code: "GIG",
    airport: "Rio de Janeiro Galeão",
    side: "A",
    difficulty: "advanced",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 2, 2, 1]), // ⚠ placeholder
  },
  {
    id: "gig-b",
    code: "GIG",
    airport: "Rio de Janeiro Galeão",
    side: "B",
    difficulty: "beginner",
    notes: "",
    spaces: makeSpaces([0, 0, 1, 1, 0, 0]), // ⚠ placeholder
  },
];

export const SCENARIO_MAP = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

export const DIFFICULTY_ORDER = ["initiation", "beginner", "intermediate", "advanced", "expert"];

export const DIFFICULTY_LABELS = {
  initiation:   "Initiation",
  beginner:     "Beginner",
  intermediate: "Intermediate",
  advanced:     "Advanced",
  expert:       "Expert",
};

export const DIFFICULTY_COLORS = {
  initiation:   "#6b7b93",
  beginner:     "#b8860b",
  intermediate: "#2e7d2e",
  advanced:     "#c0392b",
  expert:       "#1a1a1a",
};
