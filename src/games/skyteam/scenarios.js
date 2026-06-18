// src/games/skyteam/scenarios.js
//
// All SkyTeam approach scenarios.
// All values are PLACEHOLDERS — verify each against physical cards.
//
// traffic[i]   = static airplane tokens on space i (0–3)
// dies[i]      = number of traffic die icons on space i (0, 1, or 2)
//               rolled at the start of each round the plane is on that space
// axisPaths[i] = 5-element boolean array for the 5 axis positions on space i:
//               index: [0,   1,   2,    3,   4  ]
//               axis:  [-2,  -1,  0,   +1,  +2  ]
//               label: [P2,  P1, Lvl, CP1, CP2  ]  (P=Pilot, CP=Co-Pilot)
//               true  = triangle on card (safe to fly through)
//               false = X on card (crash if axis is at this position when advancing)
//               null / omit = all triangles (no restriction, used on simple approaches)
//
// All three arrays cover the 6 sky spaces only (not the airport).
// Helpers for common patterns:
const ALL_CLEAR  = [true,  true,  true,  true,  true ];  // all triangles
const NO_CENTER  = [true,  true,  false, true,  true ];  // center X, tilts OK
const RIGHT_ONLY = [false, false, false, true,  true ];  // only right tilts OK
const LEFT_ONLY  = [true,  true,  false, false, false];  // only left tilts OK

function makeSpaces(traffic, dies = [], axisPaths = []) {
  return [
    ...traffic.map((t, i) => ({
      id: `space-${i}`,
      label: i === 0 ? "Current" : String(i),
      kind: "sky",
      traffic: t,
      trafficDie: dies[i] || 0,
      axisPaths: axisPaths[i] ?? ALL_CLEAR,
    })),
    { id: "airport", label: "Airport", kind: "airport", traffic: 0, trafficDie: 0, axisPaths: ALL_CLEAR },
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
