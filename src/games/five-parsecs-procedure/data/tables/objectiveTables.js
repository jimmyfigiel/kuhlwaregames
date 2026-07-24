// Core rulebook mission objective tables (5PFH Rulebook pp.89-92), transcribed verbatim.

export const OBJECTIVE_TYPES = {
  access: {
    label: "Access",
    text: "Reach a computer console in the exact center of the battlefield, then gain access with a roll of 1D6+Savvy, scoring 6+. A Combat Action is required per attempt; up to two characters may attempt per round. Soulless may attempt within 6\". Engineer or Bot crew add +1. A natural 1 hardens the system; a second natural 1 during the battle fails the mission (Engineers ignore natural 1s). Once accessed, you Win. If you drive off all enemies, you must still roll to access, using any remaining crew member.",
  },
  acquire: {
    label: "Acquire",
    text: "An item needed for the Quest is at the center of the table. A crew member must move into contact, take a Combat Action, then move off the table. If the carrier becomes a casualty, roll 1D6: on a 1 the item is destroyed, otherwise it can be picked up with a Combat Action at the location they fell. If you drive off the enemy, you can pick up the item at your leisure.",
  },
  defend: {
    label: "Defend",
    text: "Drive off the enemy. To Win, you must Hold the Field. If the opposing AI is normally Cautious, Defensive, or Tactical, change it to Aggressive. Add +1 when determining enemy numbers.",
  },
  deliver: {
    label: "Deliver",
    text: "A crew member of your choosing carries a package that must be delivered to the exact center of the table, requiring a Combat Action. If the carrier becomes a casualty, roll 1D6: on a 1 the item is destroyed, otherwise it can be picked up with a Combat Action at the location they fell. If you drive off all enemies, you Win as long as the package is undamaged.",
  },
  eliminate: {
    label: "Eliminate",
    text: "A random enemy figure is the target. Kill them to Win. If the target would Bail, place a marker and leave them in place — for the next round they cannot move but may shoot/fight normally. If not killed in that round, they escape and the mission fails.",
  },
  fightOff: {
    label: "Fight Off",
    text: "No objective other than driving off the enemy. To Win, you must Hold the Field.",
  },
  moveThrough: {
    label: "Move Through",
    text: "You Win if at least 2 crew members move off the opposing battlefield edge. If you drive off all enemies, you Win as long as you have at least 2 crew members remaining.",
  },
  patrol: {
    label: "Patrol",
    text: "Tally the large terrain features on the table and randomly select 3. A crew member must end a move within 2\" of each. Once all 3 are checked, you Win. If you drive off the enemy, do this at your leisure.",
  },
  protect: {
    label: "Protect",
    text: "You're accompanied by a VIP (Reactions 1 / 4\" / +0 / Toughness 3), unarmed, never initiates a Brawl but defends normally, cannot be given equipment. VIP sets up 12\" from center; enemy sets up 12\" from center on their side. If the VIP spends a full round within 3\" of the center, you Win (an extra 2 credits if achieved within the first 4 rounds).",
  },
  secure: {
    label: "Secure",
    text: "End 2 consecutive rounds with crew within 2\" of the center of the table (a crew member with an enemy within 6\" doesn't count). Once achieved, you Win. If you drive off the opposition, complete it at your leisure.",
  },
  search: {
    label: "Search",
    text: "Put a token on each medium/large terrain feature (assume 5 suspected Locations in No-Minis). A character in contact may search as a Combat Action — 1D6, a 5+ finds the item and you Win. If every location fails, the item isn't on the battlefield and the mission cannot be Won. If you drive the enemy away, roll all remaining locations at once.",
  },
};

export const OPPORTUNITY_OBJECTIVE_TABLE = {
  id: "opportunityObjective",
  label: "Opportunity Mission Objectives",
  dice: "D10",
  rows: [
    { min: 1, max: 2, objective: "moveThrough" },
    { min: 3, max: 4, objective: "deliver" },
    { min: 5, max: 6, objective: "access" },
    { min: 7, max: 8, objective: "patrol" },
    { min: 9, max: 10, objective: "fightOff" },
  ],
};

export const QUEST_OBJECTIVE_TABLE = {
  id: "questObjective",
  label: "Quest Mission Objectives",
  dice: "D10",
  rows: [
    { min: 1, max: 2, objective: "moveThrough" },
    { min: 3, max: 4, objective: "search" },
    { min: 5, max: 6, objective: "defend" },
    { min: 7, max: 8, objective: "acquire" },
    { min: 9, max: 10, objective: "fightOff" },
  ],
};

export const PATRON_OBJECTIVE_TABLE = {
  id: "patronObjective",
  label: "Patron Mission Objectives",
  dice: "D10",
  rows: [
    { min: 1, max: 2, objective: "deliver" },
    { min: 3, max: 3, objective: "eliminate" },
    { min: 4, max: 5, objective: "moveThrough" },
    { min: 6, max: 7, objective: "secure" },
    { min: 8, max: 8, objective: "protect" },
    { min: 9, max: 10, objective: "fightOff" },
  ],
};

export const OBJECTIVE_TABLES_BY_MISSION_TYPE = {
  opportunity: OPPORTUNITY_OBJECTIVE_TABLE,
  quest: QUEST_OBJECTIVE_TABLE,
  patron: PATRON_OBJECTIVE_TABLE,
};

// Rival Attack Type table (p.91) — the "battle circumstances" roll for Rival missions.
export const RIVAL_ATTACK_TABLE = {
  id: "rivalAttack",
  label: "Rival Attack Types",
  dice: "D10",
  rows: [
    { min: 1, max: 1, type: "ambush", label: "Ambush", text: "Deploy one crew member less than standard, and cannot roll to Seize the Initiative." },
    { min: 2, max: 3, type: "broughtFriends", label: "Brought Friends", text: "Add 1 additional enemy." },
    { min: 4, max: 7, type: "showdown", label: "Showdown", text: "A straight-up fight. No modifications." },
    { min: 8, max: 8, type: "assault", label: "Assault", text: "Add one additional enemy figure. Your crew must all set up in or adjacent to a building. If you fail to Hold the Field, lose 1D3 credits." },
    { min: 9, max: 10, type: "raid", label: "Raid", text: "If you fail to Hold the Field, your ship takes 1D6+1 Hull Point damage." },
  ],
};
