import { BACKGROUND_TABLE } from "./backgroundTables";
import { MOTIVATION_TABLE } from "./motivationTables";
import { CLASS_TABLE } from "./classTables";
import { EQUIPMENT_ROLL_TABLES } from "./startingEquipmentTables";
import { SHIP_TABLE } from "./shipTables";

export const ABILITY_LIMITS = [
  { ability: "Reactions", key: "reactions", startingValue: 1, maximumValue: 6 },
  { ability: "Speed", key: "speed", startingValue: 4, maximumValue: 8 },
  { ability: "Combat Skill", key: "combatSkill", startingValue: 0, maximumValue: 5 },
  { ability: "Toughness", key: "toughness", startingValue: 3, maximumValue: 6 },
  { ability: "Savvy", key: "savvy", startingValue: 0, maximumValue: 5 },
];

export const BASIC_CREW_TYPE_TABLE = [
  { rollMin: 1, rollMax: 60, name: "Baseline Human", profileKey: "baselineHuman", notes: "Roll Background, Motivation, and Class." },
  { rollMin: 61, rollMax: 80, name: "Primary Alien", profileKey: "primaryAlien", nextTableId: "primaryAlienType", notes: "Roll on the Primary Alien Subtable, then Background, Motivation, and Class." },
  { rollMin: 81, rollMax: 90, name: "Bot", profileKey: "bot", notes: "Use the Standard Bot profile. Do not roll Background, Motivation, or Class." },
  { rollMin: 91, rollMax: 100, name: "Strange Character", profileKey: "strangeCharacter", nextTableId: "strangeCharacterType", notes: "Roll on the Strange Character Subtable." },
];

export const PRIMARY_ALIEN_TABLE = [
  { rollMin: 1, rollMax: 20, name: "Engineer", profileKey: "engineer" },
  { rollMin: 21, rollMax: 40, name: "K’Erin", profileKey: "kerin" },
  { rollMin: 41, rollMax: 55, name: "Soulless", profileKey: "soulless" },
  { rollMin: 56, rollMax: 70, name: "Precursor", profileKey: "precursor" },
  { rollMin: 71, rollMax: 90, name: "Feral", profileKey: "feral" },
  { rollMin: 91, rollMax: 100, name: "Swift", profileKey: "swift" },
];

export const STRANGE_CHARACTER_TABLE = [
  { rollMin: 1, rollMax: 2, name: "De-converted", profileKey: "deConverted" },
  { rollMin: 3, rollMax: 8, name: "Unity Agent", profileKey: "unityAgent" },
  { rollMin: 9, rollMax: 17, name: "Mysterious Past", profileKey: "mysteriousPast" },
  { rollMin: 18, rollMax: 22, name: "Hakshan", profileKey: "hakshan" },
  { rollMin: 23, rollMax: 27, name: "Stalker", profileKey: "stalker" },
  { rollMin: 28, rollMax: 34, name: "Hulker", profileKey: "hulker" },
  { rollMin: 35, rollMax: 41, name: "Hopeful Rookie", profileKey: "hopefulRookie" },
  { rollMin: 42, rollMax: 47, name: "Genetic Uplift", profileKey: "geneticUplift" },
  { rollMin: 48, rollMax: 53, name: "Mutant", profileKey: "mutant" },
  { rollMin: 54, rollMax: 58, name: "Assault Bot", profileKey: "assaultBot" },
  { rollMin: 59, rollMax: 62, name: "Manipulator", profileKey: "manipulator" },
  { rollMin: 63, rollMax: 67, name: "Primitive", profileKey: "primitive" },
  { rollMin: 68, rollMax: 73, name: "Feeler", profileKey: "feeler" },
  { rollMin: 74, rollMax: 79, name: "Emo-suppressed", profileKey: "emoSuppressed" },
  { rollMin: 80, rollMax: 85, name: "Minor Alien", profileKey: "minorAlien" },
  { rollMin: 86, rollMax: 87, name: "Traveler", profileKey: "traveler" },
  { rollMin: 88, rollMax: 93, name: "Empath", profileKey: "empath" },
  { rollMin: 94, rollMax: 100, name: "Bio-upgrade", profileKey: "bioUpgrade" },
];

const HUMAN_STATS = { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 };
const HUMAN_MAX = { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 };

function profile({ name, category, stats = HUMAN_STATS, notes = "", nextRolls = ["background", "motivation", "class"], specialRules = [] }) {
  return {
    name,
    category,
    startingStats: stats,
    maxStats: HUMAN_MAX,
    nextRolls,
    specialRules,
    notes,
  };
}

export const CREW_TYPE_PROFILES = {
  baselineHuman: profile({ name: "Baseline Human", category: "Human", notes: "Only character type that can exceed 1 point of Luck." }),
  bot: profile({ name: "Standard Bot", category: "Bot", stats: { reactions: 2, speed: 4, combatSkill: 1, toughness: 4, savvy: 2, luck: 0 }, nextRolls: [], notes: "Bots do not roll Background, Motivation, or Class. 6+ armor save. Bots do not earn XP and cannot use implants or consumables." }),
  engineer: profile({ name: "Engineer", category: "Primary Alien", stats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 2, savvy: 1, luck: 0 }, notes: "+1 to repair damaged items. Toughness can never exceed 4." }),
  kerin: profile({ name: "K’Erin", category: "Primary Alien", stats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 4, savvy: 0, luck: 0 }, notes: "Roll twice in Brawling and choose the better die. Must move to engage an enemy in Brawling if within base movement speed." }),
  soulless: profile({ name: "Soulless", category: "Primary Alien", stats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 4, savvy: 1, luck: 0 }, notes: "6+ armor save. Cannot use consumables or implants. Use Bot Injury table. Earn XP normally." }),
  precursor: profile({ name: "Precursor", category: "Primary Alien", stats: { reactions: 1, speed: 5, combatSkill: 0, toughness: 2, savvy: 0, luck: 0 }, notes: "When subject to a Character Event, roll 2 events and pick one, or spend 1 story point after rolling to avoid the event." }),
  feral: profile({ name: "Feral", category: "Primary Alien", notes: "If a Feral takes part in battle, ignore enemy-imposed penalties to Seize the Initiative. A single 1 on Reaction Roll must be given to a Feral if possible." }),
  swift: profile({ name: "Swift", category: "Primary Alien", stats: { reactions: 1, speed: 5, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 }, notes: "Can glide downward and leap gaps up to 4”. When firing a multi-shot weapon, all shots must go at the same target." }),
  deConverted: profile({ name: "De-converted", category: "Strange Character", notes: "6+ armor save. Up to 3 implants. Savvy can never be improved. Motivation is always Revenge.", nextRolls: ["background", "class"] }),
  unityAgent: profile({ name: "Unity Agent", category: "Strange Character", stats: { reactions: 2, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 }, notes: "Call in a Favor once per campaign turn. Motivation is always Order.", nextRolls: ["background", "class"] }),
  mysteriousPast: profile({ name: "Mysterious Past", category: "Strange Character", notes: "Create as Baseline Human, but roll twice on Background. Ignore bonus story points from Background, Motivation, or Class.", nextRolls: ["background", "background", "motivation", "class"] }),
  hakshan: profile({ name: "Hakshan", category: "Strange Character", notes: "Roll normally and automatically has the Truth motivation." }),
  stalker: profile({ name: "Stalker", category: "Strange Character", notes: "May teleport as Alternative Movement. Roll 1D6” and reposition within that distance. Can be improved twice for 4 XP each." }),
  hulker: profile({ name: "Hulker", category: "Strange Character", stats: { reactions: 1, speed: 4, combatSkill: 1, toughness: 5, savvy: 0, luck: 0 }, notes: "Shooting Combat Skill is always treated as +0. Ignores Clumsy and Heavy. Technician/Scientist/Hacker class results become Primitive." }),
  hopefulRookie: profile({ name: "Hopeful Rookie", category: "Strange Character", notes: "Baseline Human. Begin with 1 Luck and gain 1 bonus XP in games where they do not become a casualty. First casualty without Luck removes all Luck permanently." }),
  geneticUplift: profile({ name: "Genetic Uplift", category: "Strange Character", stats: { reactions: 2, speed: 5, combatSkill: 1, toughness: 4, savvy: 1, luck: 0 }, notes: "Ignore Background credit gains. Crew receives 1 additional Rival." }),
  mutant: profile({ name: "Mutant", category: "Strange Character", notes: "Baseline Human. Cannot perform Recruit or Find a Patron tasks. Background is always Lower Megacity Class.", nextRolls: ["motivation", "class"] }),
  assaultBot: profile({ name: "Assault Bot", category: "Strange Character", stats: { reactions: 2, speed: 4, combatSkill: 1, toughness: 4, savvy: 0, luck: 0 }, nextRolls: [], notes: "As Bot, but Savvy is +0 and cannot be upgraded. Ignores Clumsy and Heavy. 5+ armor save." }),
  manipulator: profile({ name: "Manipulator", category: "Strange Character", stats: { reactions: 2, speed: 4, combatSkill: 0, toughness: 3, savvy: 1, luck: 0 }, notes: "Cannot voluntarily enter Brawl. May fire 2 Pistols. On story point gains, each Manipulator rolls 1D6; each 6 grants +1 story point. Background is Bureaucrat.", nextRolls: ["motivation", "class"] }),
  primitive: profile({ name: "Primitive", category: "Strange Character", notes: "Baseline Human. Cannot benefit from gun sights or fire above 8” range. All Melee weapons count as Elegant. Background is Primitive or Regressed World.", nextRolls: ["motivation", "class"] }),
  feeler: profile({ name: "Feeler", category: "Strange Character", notes: "Baseline Human. Roll twice on Motivation and receive both benefits. If they fight another crew member, they leave permanently.", nextRolls: ["background", "motivation", "motivation", "class"] }),
  emoSuppressed: profile({ name: "Emo-suppressed", category: "Strange Character", notes: "Baseline Human. Never voluntarily leaves. May ignore events requiring fights. Can never receive Luck. Motivation is Survival.", nextRolls: ["background", "class"] }),
  minorAlien: profile({ name: "Minor Alien", category: "Strange Character", notes: "Baseline Human. Reduce bonus credits or story points from Background/Motivation/Class by 1. Roll 1D6 for an ability with XP upgrade cost reduced by 1." }),
  traveler: profile({ name: "Traveler", category: "Strange Character", stats: { reactions: 3, speed: 4, combatSkill: 0, toughness: 4, savvy: 2, luck: 0 }, notes: "Begin with +2 story points and 2 Quest Rumors. +2” Speed when moving directly away from visible enemy. After battle: 2 disappears and gain 2 story points; 11-12 receive a Quest. Motivation is Truth.", nextRolls: ["background", "class"] }),
  empath: profile({ name: "Empath", category: "Strange Character", notes: "Baseline Human. +1 when sent on Recruit or Find a Patron tasks. Loses this ability if given implants." }),
  bioUpgrade: profile({ name: "Bio-upgrade", category: "Strange Character", notes: "Baseline Human. May have up to 4 implants and benefit from 2 of the same implant. Bonus credits from Background/Motivation/Class are reduced by 2." }),
};

export const CREW_CREATION_TABLES = [
  { id: "basicCrewType", title: "Step 1: Basic Crew Type", dice: "D100", columns: ["roll", "result", "notes"], rows: BASIC_CREW_TYPE_TABLE },
  { id: "primaryAlienType", title: "Primary Alien Subtable", dice: "D100", columns: ["roll", "result"], rows: PRIMARY_ALIEN_TABLE },
  { id: "strangeCharacterType", title: "Strange Character Subtable", dice: "D100", columns: ["roll", "result"], rows: STRANGE_CHARACTER_TABLE },
  { id: "background", title: "Background Table", dice: "D100", columns: ["roll", "result", "effect", "resources", "startingRolls"], rows: BACKGROUND_TABLE },
  { id: "motivation", title: "Motivation Table", dice: "D100", columns: ["roll", "result", "effect", "resources", "startingRolls"], rows: MOTIVATION_TABLE },
  { id: "class", title: "Class Table", dice: "D100", columns: ["roll", "result", "effect", "resources", "startingRolls"], rows: CLASS_TABLE },
  ...EQUIPMENT_ROLL_TABLES.map((table) => ({ id: table.id, title: table.title, dice: table.dice, columns: ["roll", "result"], rows: table.rows })),
  { id: "ship", title: "Ship Table", dice: "D100", columns: ["roll", "ship", "debt", "hull", "traits"], rows: SHIP_TABLE },
];
