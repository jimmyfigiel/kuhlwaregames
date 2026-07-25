// Core rulebook enemy generation tables (5PFH Rulebook pp.93-107), transcribed verbatim.

// ─── Enemy Encounter Category Table (p.93) ──────────────────────────────────
// Roll D100 against the column matching the mission type to pick a category,
// then roll D100 again on that category's subtable for the specific enemy.
export const ENEMY_ENCOUNTER_CATEGORY_TABLE = [
  { category: "criminalElements", opportunity: [1, 30], patron: [1, 25], quest: [1, 15], unknownRival: [1, 50] },
  { category: "hiredMuscle", opportunity: [31, 60], patron: [26, 60], quest: [16, 40], unknownRival: [51, 80] },
  { category: "interestedParties", opportunity: [61, 80], patron: [61, 75], quest: [41, 70], unknownRival: [81, 100] },
  { category: "rovingThreats", opportunity: [81, 100], patron: [76, 100], quest: [71, 100], unknownRival: null },
];

export function rollEnemyCategory(roll, missionColumn) {
  const row = ENEMY_ENCOUNTER_CATEGORY_TABLE.find((r) => {
    const range = r[missionColumn];
    return range && roll >= range[0] && roll <= range[1];
  });
  return row?.category || "criminalElements";
}

// Each enemy row: min/max (D100), name, numbers (modifier to opponent count),
// panic (array of Morale-bail values), speed (inches), combatSkill, toughness,
// ai (code), weapon ({ roll, specialist } columns into ENEMY_WEAPON_TABLE, or
// fixed: "Weapon Name" for creatures with natural/fixed weapons), notes, rules.

export const CRIMINAL_ELEMENTS_TABLE = {
  id: "criminalElements",
  label: "Criminal Elements",
  intro: "When setting up, roll 1D6. On 1-3, that many bonus credits are paid if you Hold the Field. When rolling to see if a defeated group becomes a Rival, roll 2D6 — a 1 on either die means you've acquired them as Rivals; a 1 on both means they hate you (Rivals AND +1 to numbers encountered in all battles).",
  rows: [
    { min: 1, max: 10, name: "Gangers", numbers: 2, panic: [1, 2], speed: 4, combatSkill: 0, toughness: 3, ai: "A", weapon: { roll: 1, specialist: "A" }, rules: ["Leg it: When a ganger is hit by a shot, they retreat 3\" away from the shooter."] },
    { min: 11, max: 19, name: "Punks", numbers: 3, panic: [1, 2, 3], speed: 4, combatSkill: 0, toughness: 3, ai: "A", weapon: { roll: 1, specialist: "A" }, rules: ["Careless: +1 to Seize the Initiative.", "Bad shots: their shooting only Hits on a natural 6."] },
    { min: 20, max: 27, name: "Raiders", numbers: 1, panic: [1, 2], speed: 4, combatSkill: 1, toughness: 3, ai: "A", weapon: { roll: 2, specialist: "A" }, rules: ["Scavengers: roll twice on the Battlefield Finds Table."] },
    { min: 28, max: 34, name: "Cultists", numbers: 2, panic: [1], speed: 4, combatSkill: 0, toughness: 3, ai: "A", weapon: { roll: 1, specialist: "A" }, rules: ["Intrigue: roll 2D6, +1 if you killed a Lieutenant/Unique Individual; on a 9+, gain a Quest Rumor."] },
    { min: 35, max: 43, name: "Psychos", numbers: 2, panic: [1], speed: 6, combatSkill: 0, toughness: 4, ai: "R", weapon: { roll: 1, specialist: "B" }, rules: ["Bad shots: their shooting only Hits on a natural 6.", "Always carry a Blade in addition to any other weapon."] },
    { min: 44, max: 48, name: "Brat Gang", numbers: 2, panic: [1, 2, 3], speed: 5, combatSkill: 0, toughness: 4, ai: "A", weapon: { roll: 2, specialist: "C" }, rules: ["Careless: +1 to Seize the Initiative.", "6+ Saving Throw."] },
    { min: 49, max: 51, name: "Gene Renegades", numbers: 1, panic: [1, 2], speed: 5, combatSkill: 0, toughness: 4, ai: "C", weapon: { roll: 1, specialist: "B" }, rules: ["Alert: -1 to Seize the Initiative."] },
    { min: 52, max: 57, name: "Anarchists", numbers: 2, panic: [1, 2], speed: 5, combatSkill: 0, toughness: 3, ai: "A", weapon: { roll: 2, specialist: "B" }, rules: ["Stubborn: ignore the first casualty of the battle for Morale."] },
    { min: 58, max: 64, name: "Pirates", numbers: 2, panic: [1, 2, 3], speed: 5, combatSkill: 0, toughness: 4, ai: "A", weapon: { roll: 2, specialist: "A" }, rules: ["Loot: gain an extra Loot roll if Holding the Field."] },
    { min: 65, max: 71, name: "K'Erin Outlaws", numbers: 1, panic: [1], speed: 4, combatSkill: 1, toughness: 4, ai: "A", weapon: { roll: 2, specialist: "A" }, rules: ["Stubborn: ignore the first casualty of the battle for Morale."] },
    { min: 72, max: 79, name: "Skulker Brigands", numbers: 3, panic: [1, 2], speed: 6, combatSkill: 0, toughness: 3, ai: "C", weapon: { roll: 1, specialist: "B" }, rules: ["Alert: -1 to Seize the Initiative.", "Scavengers: roll twice on the Battlefield Finds Table."] },
    { min: 80, max: 83, name: "Tech Gangers", numbers: 1, panic: [1, 2], speed: 4, combatSkill: 0, toughness: 5, ai: "T", weapon: { roll: 3, specialist: "C" }, rules: ["Loot: gain an extra Loot roll if Holding the Field.", "6+ Saving Throw."] },
    { min: 84, max: 90, name: "Starport Scum", numbers: 3, panic: [1, 2, 3], speed: 4, combatSkill: 0, toughness: 3, ai: "D", weapon: { roll: 1, specialist: "A" }, rules: ["Friday Night Warriors: when a scum is slain, allies within 6\" retreat a standard move directly back toward their own battlefield edge."] },
    { min: 91, max: 94, name: "Hulker Gang", numbers: 0, panic: [1], speed: 4, combatSkill: 1, toughness: 5, ai: "A", weapon: { roll: 1, specialist: "A" }, rules: ["Ferocious: +1 to Brawling rolls when initiating combat.", "Aggro: if Hit by a shot and surviving, immediately moves 1\" toward the shooter."] },
    { min: 95, max: 100, name: "Gun Slingers", numbers: 1, panic: [1, 2], speed: 4, combatSkill: 1, toughness: 3, ai: "T", weapon: { roll: 1, specialist: "B" }, rules: ["Trick shot: a natural 6 when shooting allows an additional shot against the same or another target within 2\"."] },
  ],
};

export const HIRED_MUSCLE_TABLE = {
  id: "hiredMuscle",
  label: "Hired Muscle",
  intro: "Being paid professionals, you are -1 to any attempt to Seize the Initiative against Hired Muscle (cumulative with any modifiers listed below).",
  seizeInitiativeModifier: -1,
  rows: [
    { min: 1, max: 14, name: "Unknown Mercs", numbers: 0, panic: [1, 2], speed: 5, combatSkill: 1, toughness: 4, ai: "T", weapon: { roll: 2, specialist: "B" }, rules: ["Let's just call it a day: if down to 1-2 figures, they accept ending the fight at the end of any round — neither side Holds the Field."] },
    { min: 15, max: 26, name: "Enforcers", numbers: 0, panic: [1, 2], speed: 4, combatSkill: 1, toughness: 4, ai: "T", weapon: { roll: 2, specialist: "A" }, rules: ["Cop killer: if fought as Rivals, add +2 to their numbers."] },
    { min: 27, max: 34, name: "Guild Troops", numbers: 0, panic: [1, 2], speed: 4, combatSkill: 1, toughness: 4, ai: "T", weapon: { roll: 2, specialist: "C" }, rules: ["Intrigue: roll 2D6, +1 if you killed a Lieutenant/Unique Individual; on a 9+, gain a Quest Rumor."] },
    { min: 35, max: 39, name: "Roid-gangers", numbers: 1, panic: [1], speed: 4, combatSkill: 0, toughness: 5, ai: "A", weapon: { roll: 1, specialist: "A" }, rules: ["Careless: +1 to Seize the Initiative."] },
    { min: 40, max: 42, name: "Black Ops Team", numbers: 0, panic: [1], speed: 6, combatSkill: 2, toughness: 5, ai: "T", weapon: { roll: 3, specialist: "A" }, rules: ["Tough fight: a random survivor gains +1 XP."] },
    { min: 43, max: 46, name: "War Bots", numbers: 0, panic: [], speed: 3, combatSkill: 1, toughness: 4, ai: "A", weapon: { roll: 3, specialist: "C" }, rules: ["Fearless: never affected by Morale.", "5+ Saving Throw."] },
    { min: 47, max: 50, name: "Secret Agents", numbers: 0, panic: [1, 2], speed: 5, combatSkill: 1, toughness: 4, ai: "C", weapon: { roll: 2, specialist: "C" }, rules: ["Loot: gain an extra Loot roll if Holding the Field.", "Intrigue: roll 2D6, +1 if you killed a Lieutenant/Unique Individual; on a 9+, gain a Quest Rumor."] },
    { min: 51, max: 53, name: "Assassins", numbers: 0, panic: [1], speed: 6, combatSkill: 2, toughness: 3, ai: "A", weapon: { roll: 1, specialist: "B" }, rules: ["Gruesome: characters rolling for post-battle Injuries apply a -5 to the roll.", "Tough fight: a random survivor gains +1 XP."] },
    { min: 54, max: 59, name: "Feral Mercenaries", numbers: 2, panic: [1, 2], speed: 5, combatSkill: 0, toughness: 4, ai: "A", weapon: { roll: 2, specialist: "B" }, rules: ["Quick feet: add +1\" to the distance for any Dash move."] },
    { min: 60, max: 64, name: "Skulker Mercenaries", numbers: 3, panic: [1, 2], speed: 7, combatSkill: 0, toughness: 3, ai: "C", weapon: { roll: 2, specialist: "C" }, rules: ["Alert: -1 to Seize the Initiative.", "Scavengers: roll twice on the Battlefield Finds Table."] },
    { min: 65, max: 74, name: "Corporate Security", numbers: 1, panic: [1, 2], speed: 4, combatSkill: 1, toughness: 4, ai: "D", weapon: { roll: 2, specialist: "B" }, rules: ["6+ Saving Throw."] },
    { min: 75, max: 79, name: "Unity Grunts", numbers: 1, panic: [1], speed: 5, combatSkill: 1, toughness: 4, ai: "T", weapon: { roll: 2, specialist: "C" }, rules: ["6+ Saving Throw."] },
    { min: 80, max: 85, name: "Security Bots", numbers: 1, panic: [], speed: 3, combatSkill: 0, toughness: 5, ai: "D", weapon: { roll: 2, specialist: "A" }, rules: ["Careless: +1 to Seize the Initiative.", "Fearless: never affected by Morale.", "6+ Saving Throw."] },
    { min: 86, max: 90, name: "Black Dragon Mercs", numbers: 1, panic: [1, 2], speed: 5, combatSkill: 1, toughness: 4, ai: "T", weapon: { roll: 2, specialist: "C" }, rules: ["Stubborn: ignore the first casualty of the battle for Morale."] },
    { min: 91, max: 95, name: "Rage Lizard Mercs", numbers: 0, panic: [1, 2], speed: 4, combatSkill: 1, toughness: 5, ai: "T", weapon: { roll: 3, specialist: "B" }, rules: ["Up close: if within 1\" of terrain, add +1 to Brawling rolls."] },
    { min: 96, max: 100, name: "Blood Storm Mercs", numbers: 0, panic: [1], speed: 4, combatSkill: 1, toughness: 4, ai: "A", weapon: { roll: 2, specialist: "B" }, rules: ["Ferocious: +1 to Brawling rolls when initiating combat."] },
  ],
};

export const INTERESTED_PARTIES_TABLE = {
  id: "interestedParties",
  label: "Interested Parties",
  intro: "Add +1 when rolling for Unique Individuals. During Quest missions, when rolling for the number of opponents, reroll any die scoring a 1 once.",
  uniqueIndividualModifier: 1,
  rows: [
    { min: 1, max: 6, name: "Renegade Soldiers", numbers: 1, panic: [1, 2], speed: 4, combatSkill: 1, toughness: 5, ai: "T", weapon: { roll: 2, specialist: "B" }, rules: ["Grudge: if encountered as Rivals, they bring one additional figure."] },
    { min: 7, max: 13, name: "Bounty Hunters", numbers: 0, panic: [1, 2], speed: 5, combatSkill: 1, toughness: 4, ai: "T", weapon: { roll: 1, specialist: "B" }, rules: ["Intrigue: roll 2D6, +1 if you killed a Lieutenant/Unique Individual; on a 9+, gain a Quest Rumor."] },
    { min: 14, max: 18, name: "Abandoned", numbers: 1, panic: [1, 2, 3], speed: 4, combatSkill: 0, toughness: 3, ai: "A", weapon: { roll: 1, specialist: "A" }, rules: ["Careless: +1 to Seize the Initiative.", "Cowardly: Lieutenants are affected by Morale dice."] },
    { min: 19, max: 27, name: "Vigilantes", numbers: 1, panic: [1, 2], speed: 4, combatSkill: 0, toughness: 4, ai: "A", weapon: { roll: 2, specialist: "A" }, rules: ["Persistent: if encountered as Rivals, all rolls to remove them from Rival status are at -1."] },
    { min: 28, max: 35, name: "Isolationists", numbers: 1, panic: [1, 2], speed: 4, combatSkill: 0, toughness: 3, ai: "C", weapon: { roll: 1, specialist: "A" }, rules: ["Dogged: if reduced to only 1-2 figures, they become Fearless and will not flee."] },
    { min: 36, max: 41, name: "Zealots", numbers: 2, panic: [1], speed: 5, combatSkill: 0, toughness: 4, ai: "A", weapon: { roll: 1, specialist: "A" }, rules: ["Ferocious: +1 to Brawling rolls when initiating combat."] },
    { min: 42, max: 48, name: "Mutants", numbers: 3, panic: [1, 2, 3], speed: 4, combatSkill: 0, toughness: 5, ai: "A", weapon: { roll: 1, specialist: "A" }, rules: ["Cowardly: Lieutenants are affected by Morale dice."] },
    { min: 49, max: 52, name: "Primitives", numbers: 2, panic: [1, 2], speed: 6, combatSkill: 1, toughness: 3, ai: "A", weapon: { fixed: "Blade", specialistFixed: "Brutal Melee Weapon" }, rules: ["Going medieval: instead of normal weapons, each carries a Blade. Specialists carry a Brutal Melee Weapon."] },
    { min: 53, max: 56, name: "Precursor Exiles", numbers: 0, panic: [1, 2], speed: 6, combatSkill: 1, toughness: 4, ai: "T", weapon: { roll: 3, specialist: "B" }, rules: ["Prediction: you cannot Seize the Initiative."] },
    { min: 57, max: 63, name: "K'Erin Colonists", numbers: 1, panic: [1], speed: 5, combatSkill: 1, toughness: 4, ai: "A", weapon: { roll: 2, specialist: "A" }, rules: ["Stubborn: ignore the first casualty of the battle for Morale.", "Invasion Threat."], invasionThreat: true },
    { min: 64, max: 68, name: "Swift War Squad", numbers: 2, panic: [1], speed: 6, combatSkill: 0, toughness: 3, ai: "A", weapon: { roll: 1, specialist: "B" }, rules: ["Unpredictable: Seize the Initiative roll is always unmodified."] },
    { min: 69, max: 72, name: "Soulless Task Force", numbers: 0, panic: [1], speed: 4, combatSkill: 2, toughness: 5, ai: "T", weapon: { roll: 3, specialist: "C" }, rules: ["6+ Saving Throw."] },
    { min: 73, max: 76, name: "Tech Zealots", numbers: 1, panic: [1, 2], speed: 5, combatSkill: 0, toughness: 5, ai: "A", weapon: { roll: 3, specialist: "C" }, rules: ["Loot: gain an extra Loot roll if Holding the Field.", "6+ Saving Throw."] },
    { min: 77, max: 83, name: "Colonial Militia", numbers: 1, panic: [1, 2], speed: 4, combatSkill: 0, toughness: 3, ai: "C", weapon: { roll: 2, specialist: "B" }, rules: ["Home field advantage: always count as being in Cover if on their third of the table and not within 12\" of the shooter."] },
    { min: 84, max: 88, name: "Planetary Nomads", numbers: 2, panic: [1, 2], speed: 6, combatSkill: 0, toughness: 3, ai: "C", weapon: { roll: 2, specialist: "A" }, rules: ["Alert: -1 to Seize the Initiative."] },
    { min: 89, max: 100, name: "Salvage Team", numbers: 1, panic: [1, 2, 3], speed: 4, combatSkill: 0, toughness: 4, ai: "C", weapon: { roll: 2, specialist: "B" }, rules: ["Scavengers: roll twice on the Battlefield Finds Table."] },
  ],
};

export const ROVING_THREATS_TABLE = {
  id: "rovingThreats",
  label: "Roving Threats",
  intro: "Enemies from this list never become Rivals, and are never accompanied by Unique Individuals unless the campaign difficulty is Insanity.",
  neverRival: true,
  noUniqueIndividual: true,
  rows: [
    { min: 1, max: 4, name: "Converted Acquisition", numbers: 1, panic: [], speed: 4, combatSkill: 0, toughness: 5, ai: "A", weapon: { roll: 2, specialist: "A" }, rules: ["Careless: +1 to Seize the Initiative.", "Built-in: always count as stationary when firing.", "Invasion Threat — test at +1.", "6+ Saving Throw."], invasionThreat: true },
    { min: 5, max: 12, name: "Converted Infiltrators", numbers: 0, panic: [], speed: 4, combatSkill: 0, toughness: 4, ai: "A", weapon: { roll: 1, specialist: "A" }, rules: ["Invasion Threat.", "6+ Saving Throw."], invasionThreat: true },
    { min: 13, max: 18, name: "Abductor Raiders", numbers: 3, panic: [1], speed: 4, combatSkill: 0, toughness: 3, ai: "A", weapon: { roll: 2, specialist: "A" }, rules: ["Invasion Threat."], invasionThreat: true },
    { min: 19, max: 28, name: "Swarm Brood", numbers: 2, panic: [], speed: 6, combatSkill: 1, toughness: 4, ai: "B", weapon: { fixed: "Claws", damage: 1 }, rules: ["Pack hunters: all Brawls initiated by Swarm are resolved at the end of the Enemy Actions phase; Swarm will always attempt to gang up on prey where possible.", "Invasion Threat."], invasionThreat: true },
    { min: 29, max: 34, name: "Haywire Robots", numbers: 2, panic: [], speed: 3, combatSkill: 0, toughness: 4, ai: "R", weapon: { fixed: "Smash", damage: 0 }, rules: ["Careless: +1 to Seize the Initiative.", "6+ Saving Throw."] },
    { min: 35, max: 44, name: "Razor Lizards", numbers: 2, panic: [1, 2], speed: 6, combatSkill: 1, toughness: 3, ai: "B", weapon: { fixed: "Fangs", damage: 0 }, rules: ["Needle fangs: Armor Saving Throws are ignored."] },
    { min: 45, max: 56, name: "Sand Runners", numbers: 1, panic: [1, 2], speed: 7, combatSkill: 0, toughness: 3, ai: "B", weapon: { fixed: "Fangs", damage: 1 }, rules: ["Leap: if they end a move within 3\" of a Human, they may leap into contact as a Free Action."] },
    { min: 57, max: 63, name: "Void Rippers", numbers: 0, panic: [1, 2], speed: 5, combatSkill: 1, toughness: 5, ai: "R", weapon: { fixed: "Fangs", damage: 0 }, rules: ["Gruesome: characters rolling for post-battle Injuries apply a -5 to the roll."] },
    { min: 64, max: 69, name: "Krorg", numbers: 0, panic: [], speed: 5, combatSkill: 2, toughness: 6, ai: "R", weapon: { fixed: "Claws", damage: 2 }, rules: ["Ferocious: +1 to Brawling rolls when initiating combat.", "Easy targets: +1 when firing at this enemy.", "5+ Saving Throw.", "Tough fight: a random survivor gains +1 XP."] },
    { min: 70, max: 78, name: "Large Bugs", numbers: 2, panic: [1], speed: 5, combatSkill: 1, toughness: 5, ai: "R", weapon: { fixed: "Mandibles", damage: 1 }, rules: ["Easy targets: +1 when firing at this enemy.", "Stubborn: ignore the first casualty of the battle for Morale."] },
    { min: 79, max: 84, name: "Carnivore Chasers", numbers: 2, panic: [1, 2], speed: 6, combatSkill: 0, toughness: 4, ai: "B", weapon: { fixed: "Fangs", damage: 0 }, rules: ["Alert: -1 to Seize the Initiative."] },
    { min: 85, max: 97, name: "Vent Crawlers", numbers: 0, panic: [], speed: 6, combatSkill: 2, toughness: 5, ai: "R", weapon: { fixed: "Claws", damage: 0 }, rules: ["Fate worse than death: if the post-battle Injury roll is death, the character cannot be saved and no rerolls are possible for any reason."] },
    { min: 98, max: 100, name: "Distorts", numbers: 0, panic: [], speed: 4, combatSkill: 0, toughness: 4, ai: "B", weapon: { fixed: "Touch", damage: 3 }, rules: ["Stubborn: ignore the first casualty of the battle for Morale.", "Shimmer: move through terrain and solid obstacles.", "When slain, roll 1D6 — on a 5-6, another Distort is placed 1D6\" further away."] },
  ],
};

export const ENEMY_CATEGORY_TABLES = {
  criminalElements: CRIMINAL_ELEMENTS_TABLE,
  hiredMuscle: HIRED_MUSCLE_TABLE,
  interestedParties: INTERESTED_PARTIES_TABLE,
  rovingThreats: ROVING_THREATS_TABLE,
};

// ─── Enemy Weapons Table (p.104) ────────────────────────────────────────────
// Basic troops roll 1D6 on the WEAPON column indicated by the enemy's numeric
// weapon code (1, 2, or 3). Specialists roll 1D6 on the SPECIALIST column
// indicated by the enemy's letter code (A, B, or C). Index 0 = roll of 1.
export const ENEMY_WEAPON_TABLE = {
  1: ["Scrap pistol", "Hand gun", "Colony rifle", "Military rifle", "Scrap pistol + Blade", "Shotgun"],
  2: ["Colony rifle", "Military rifle", "Military rifle", "Military rifle", "Hand laser", "Infantry laser"],
  3: ["Hand laser", "Hand laser", "Infantry laser", "Infantry laser", "Blast rifle", "Blast rifle"],
};

export const ENEMY_SPECIALIST_WEAPON_TABLE = {
  A: ["Power claw", "Shotgun", "Auto rifle", "Clingfire pistol", "Hunting rifle", "Hand gun + Ripper sword"],
  B: ["Marksman's rifle", "Auto rifle", "Shell gun", "Hand flamer", "Rattle gun", "Rattle gun"],
  C: ["Marksman's rifle", "Shell gun", "Fury rifle", "Plasma rifle", "Plasma rifle", "Hyper blaster"],
};

export function rollEnemyWeapon(weaponColumn) {
  const rollValue = Math.ceil(Math.random() * 6);
  return ENEMY_WEAPON_TABLE[weaponColumn]?.[rollValue - 1] || "Hand gun";
}

export function rollEnemySpecialistWeapon(specialistColumn) {
  const rollValue = Math.ceil(Math.random() * 6);
  return ENEMY_SPECIALIST_WEAPON_TABLE[specialistColumn]?.[rollValue - 1] || "Auto rifle";
}

// ─── Unique Individuals Table (p.105-107) ───────────────────────────────────
export const UNIQUE_INDIVIDUALS_TABLE = {
  id: "uniqueIndividuals",
  label: "Unique Individuals",
  rows: [
    { min: 1, max: 6, name: "Enemy Bruiser", speed: null, combatSkill: null, toughness: 1, ai: "G", luck: 0, weapons: ["Power Claw"], notes: "A particularly unpleasant-looking individual. (Uses the base enemy's Speed/Combat Skill; Toughness +1.)" },
    { min: 7, max: 12, name: "Enemy Heavy", speed: null, combatSkill: null, toughness: null, ai: "D", luck: 0, weapons: ["Rattle Gun"], notes: "The enemy has opted to bring some additional firepower." },
    { min: 13, max: 17, name: "Enemy Boss", speed: null, combatSkill: 1, toughness: 1, ai: null, luck: 1, weapons: ["Hand Cannon", "Brutal Melee"], notes: "Bosses reduce Panic range by 1, but when slain, an extra Morale die must be rolled. Uses the base enemy's AI type." },
    { min: 18, max: 22, name: "Hired Killer", speed: 5, combatSkill: 1, toughness: 5, ai: "A", luck: 1, weapons: ["Machine Pistol", "Blade"], notes: "Will murder for credits." },
    { min: 23, max: 25, name: "Corporate Spook", speed: 5, combatSkill: 1, toughness: 4, ai: "C", luck: 1, weapons: ["Hand Laser"], notes: "If all other enemies are slain or Bail, the Spook Bails as well. If the Spook is slain, you automatically receive a Corporate Rival." },
    { min: 26, max: 30, name: "Bounty Tracker", speed: 5, combatSkill: 1, toughness: 5, ai: "A", luck: 1, weapons: ["Shotgun", "Blade"], notes: "Someone is willing to pay money to have you brought in, whole or in pieces." },
    { min: 31, max: 35, name: "Callous Merc", speed: 4, combatSkill: 2, toughness: 5, ai: "T", luck: 1, weapons: ["Infantry Laser", "Blade"], notes: "Bitter and disillusioned mercenaries sometimes strike out on their own." },
    { min: 36, max: 41, name: "Freelancer", speed: 4, combatSkill: 1, toughness: 4, ai: "T", luck: 1, weapons: ["Hand Cannon", "Blade"], notes: "If slain in a Brawl, you may roll on the Loot Table and claim the item for use immediately." },
    { min: 42, max: 44, name: "Secret Agent", speed: 6, combatSkill: 2, toughness: 4, ai: "A", luck: 1, weapons: ["Hand Laser", "Glare Sword"], notes: "Target: randomly select a crew member; the agent moves toward and attacks them, only firing at other targets if in the way or the priority target isn't visible. May fire at the priority target even if not closest." },
    { min: 45, max: 48, name: "Hulker Brawler", speed: 4, combatSkill: 1, toughness: 6, ai: "A", luck: 0, weapons: ["Hand Cannon", "Brutal Melee"], notes: "Melee fighter: +1 to Combat Skill when Brawling." },
    { min: 49, max: 53, name: "Gun Slinger", speed: 5, combatSkill: 1, toughness: 4, ai: "T", luck: 1, weapons: ["Machine Pistol"], notes: "Sharp shooter: +1 to Combat Skill when shooting." },
    { min: 54, max: 56, name: "Engineer Tech", speed: 6, combatSkill: 1, toughness: 4, ai: "C", luck: 1, weapons: ["Blast Pistol"], notes: "A quiet alien species fascinated with technology and gadgetry." },
    { min: 57, max: 61, name: "Mutant Bruiser", speed: 4, combatSkill: 1, toughness: 5, ai: "G", luck: 1, weapons: ["Shotgun", "Brutal Melee"], notes: "Ferocious: +1 to Brawling rolls when initiating combat." },
    { min: 62, max: 65, name: "Precursor Wanderer", speed: 7, combatSkill: 2, toughness: 4, ai: "A", luck: 1, weapons: ["Infantry Laser", "Glare Sword"], notes: "One with the Flow: moves before the Quick Actions phase.", saveThrow: "6+" },
    { min: 66, max: 69, name: "Hakshan Investigator", speed: 5, combatSkill: 0, toughness: 4, ai: "D", luck: 1, weapons: ["Plasma Rifle"], notes: "Odd, suited aliens that trek the galaxy in search of something vitally important to their species." },
    { min: 70, max: 75, name: "K'Erin Warrior", speed: 5, combatSkill: 2, toughness: 5, ai: "A", luck: 1, weapons: ["Machine Pistol", "Ripper Sword"], notes: "A noble alien warrior seeking adventure." },
    { min: 76, max: 79, name: "Nomad Scout", speed: 6, combatSkill: 1, toughness: 4, ai: "D", luck: 0, weapons: ["Marksman's Rifle"], notes: "Concealed: always counts as being in Cover when fired upon." },
    { min: 80, max: 82, name: "Cyborg Merc", speed: 7, combatSkill: 2, toughness: 6, ai: "T", luck: 1, weapons: ["Auto Rifle", "Power Claw"], notes: "Mercenary stuffed full of cybernetic enhancements.", saveThrow: "6+" },
    { min: 83, max: 85, name: "Rogue Psionic", speed: 4, combatSkill: 0, toughness: 4, ai: "C", luck: 3, weapons: ["Hand Gun"], notes: "Self-taught psionics are a substantial asset in a gun battle." },
    { min: 86, max: 91, name: "Gene Dog", speed: 6, combatSkill: 1, toughness: 4, ai: "G", luck: 0, weapons: ["Fangs"], damage: 0, notes: "Loyal: when owner or Dog moves into a Brawl, it isn't resolved until both have acted. If the owner is slain, the Dog becomes Fearless and attacks anyone within 8\". Bails if all other enemies are slain or Bailed." },
    { min: 92, max: 96, name: "Sand Runner", speed: 7, combatSkill: 0, toughness: 3, ai: "G", luck: 0, weapons: ["Fangs"], damage: 1, notes: "These fierce lizards can make surprisingly loyal companions." },
    { min: 97, max: 100, name: "Mk II Security Bot", speed: 4, combatSkill: 2, toughness: 5, ai: "G", luck: 0, weapons: ["Fury Rifle"], notes: "Targeting AI: may fire twice per round at the two closest visible targets.", saveThrow: "6+" },
  ],
};

// ─── Number of Opponents (p.92-94) ──────────────────────────────────────────
// crewSize: the campaign's chosen crew size (4, 5, or 6+).
export function rollOpponentDice(crewSize) {
  if (crewSize <= 4) {
    const a = Math.ceil(Math.random() * 6);
    const b = Math.ceil(Math.random() * 6);
    return { rolls: [a, b], picked: Math.min(a, b), mode: "lower of 2D6" };
  }
  if (crewSize === 5) {
    const a = Math.ceil(Math.random() * 6);
    return { rolls: [a], picked: a, mode: "1D6" };
  }
  const a = Math.ceil(Math.random() * 6);
  const b = Math.ceil(Math.random() * 6);
  return { rolls: [a, b], picked: Math.max(a, b), mode: "higher of 2D6" };
}

// AI type codes (p.93)
export const AI_TYPE_LABELS = {
  A: "Aggressive",
  C: "Cautious",
  D: "Defensive",
  G: "Guardian",
  R: "Rampage",
  T: "Tactical",
  B: "Beast",
};
