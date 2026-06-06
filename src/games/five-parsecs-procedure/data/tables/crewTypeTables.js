import { buildCharacterCreationRollCommands, makeQueueCrewMemberTableResultUpdateCommandsCommand } from "./characterCreationTables";

function makeTableRollCommand({ id, title, table, saveTo, crewMemberId, crewMemberNumber, resultKind }) {
  return {
    id,
    type: "tableRoll",
    title,
    table,
    saveTo,
    afterSelectionCommands: [
      makeQueueCrewMemberTableResultUpdateCommandsCommand({
        crewMemberId,
        crewMemberNumber,
        sourcePath: saveTo,
        resultKind,
      }),
    ],
    buttonText: "Select",
    rollButtonText: "Roll with App Dice",
    pauseAfter: false,
    visible: true,
  };
}

function tableRow({ rollMin, rollMax, name, profileKey, notes = "", nextTableId = null, followUpCommands = [] }) {
  return {
    min: rollMin,
    max: rollMax,
    label: name,
    value: profileKey || name,
    profileKey,
    description: notes,
    nextTableId,
    followUpCommands,
  };
}

export const crewTypeProfiles = {
  baselineHuman: {
    name: "Baseline Human",
    category: "Human",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Only character type that can exceed 1 point of Luck.",
  },
  bot: {
    name: "Standard Bot",
    category: "Bot",
    startingStats: { reactions: 2, speed: 4, combatSkill: 1, toughness: 4, savvy: 2, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: [],
    saves: [{ type: "armor", level: "6+", source: "Standard Bot" }],
    specialRules: [],
    notes: "Bots do not roll Background, Motivation, or Class. 6+ armor save. Bots do not earn XP and cannot use implants or consumables.",
  },
  engineer: {
    name: "Engineer",
    category: "Primary Alien",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 2, savvy: 1, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "+1 to repair damaged items. Toughness can never exceed 4.",
  },
  kerin: {
    name: "K’Erin",
    category: "Primary Alien",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 4, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Roll twice in Brawling and choose the better die. Must move to engage an enemy in Brawling if within base movement speed.",
  },
  soulless: {
    name: "Soulless",
    category: "Primary Alien",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 4, savvy: 1, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    saves: [{ type: "armor", level: "6+", source: "Soulless" }],
    specialRules: [],
    notes: "6+ armor save. Cannot use consumables or implants. Use Bot Injury table. Earn XP normally.",
  },
  precursor: {
    name: "Precursor",
    category: "Primary Alien",
    startingStats: { reactions: 1, speed: 5, combatSkill: 0, toughness: 2, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "When subject to a Character Event, roll 2 events and pick one, or spend 1 story point after rolling to avoid the event.",
  },
  feral: {
    name: "Feral",
    category: "Primary Alien",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "If a Feral takes part in battle, ignore enemy-imposed penalties to Seize the Initiative. A single 1 on Reaction Roll must be given to a Feral if possible.",
  },
  swift: {
    name: "Swift",
    category: "Primary Alien",
    startingStats: { reactions: 1, speed: 5, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Can glide downward and leap gaps up to 4”. When firing a multi-shot weapon, all shots must go at the same target.",
  },
  deConverted: {
    name: "De-converted",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "class"],
    saves: [{ type: "armor", level: "6+", source: "De-converted" }],
    specialRules: [],
    notes: "6+ armor save. Up to 3 implants. Savvy can never be improved. Motivation is always Revenge.",
  },
  unityAgent: {
    name: "Unity Agent",
    category: "Strange Character",
    startingStats: { reactions: 2, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "class"],
    specialRules: [],
    notes: "Call in a Favor once per campaign turn. Motivation is always Order.",
  },
  mysteriousPast: {
    name: "Mysterious Past",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "background", "motivation", "class"],
    specialRules: [],
    notes: "Create as Baseline Human, but roll twice on Background. Ignore bonus story points from Background, Motivation, or Class.",
  },
  hakshan: {
    name: "Hakshan",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Roll normally and automatically has the Truth motivation.",
  },
  stalker: {
    name: "Stalker",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "May teleport as Alternative Movement. Roll 1D6” and reposition within that distance. Can be improved twice for 4 XP each.",
  },
  hulker: {
    name: "Hulker",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 1, toughness: 5, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Shooting Combat Skill is always treated as +0. Ignores Clumsy and Heavy. Technician/Scientist/Hacker class results become Primitive.",
  },
  hopefulRookie: {
    name: "Hopeful Rookie",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 1 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Baseline Human. Begin with 1 Luck and gain 1 bonus XP in games where they do not become a casualty. First casualty without Luck removes all Luck permanently.",
  },
  geneticUplift: {
    name: "Genetic Uplift",
    category: "Strange Character",
    startingStats: { reactions: 2, speed: 5, combatSkill: 1, toughness: 4, savvy: 1, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Ignore Background credit gains. Crew receives 1 additional Rival.",
  },
  mutant: {
    name: "Mutant",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["motivation", "class"],
    specialRules: [],
    notes: "Baseline Human. Cannot perform Recruit or Find a Patron tasks. Background is always Lower Megacity Class.",
  },
  assaultBot: {
    name: "Assault Bot",
    category: "Strange Character",
    startingStats: { reactions: 2, speed: 4, combatSkill: 1, toughness: 4, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: [],
    saves: [{ type: "armor", level: "5+", source: "Assault Bot" }],
    specialRules: [],
    notes: "As Bot, but Savvy is +0 and cannot be upgraded. Ignores Clumsy and Heavy. 5+ armor save.",
  },
  manipulator: {
    name: "Manipulator",
    category: "Strange Character",
    startingStats: { reactions: 2, speed: 4, combatSkill: 0, toughness: 3, savvy: 1, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["motivation", "class"],
    specialRules: [],
    notes: "Cannot voluntarily enter Brawl. May fire 2 Pistols. On story point gains, each Manipulator rolls 1D6; each 6 grants +1 story point. Background is Bureaucrat.",
  },
  primitive: {
    name: "Primitive",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["motivation", "class"],
    specialRules: [],
    notes: "Baseline Human. Cannot benefit from gun sights or fire above 8” range. All Melee weapons count as Elegant. Background is Primitive or Regressed World.",
  },
  feeler: {
    name: "Feeler",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "motivation", "class"],
    specialRules: [],
    notes: "Baseline Human. Roll twice on Motivation and receive both benefits. If they fight another crew member, they leave permanently.",
  },
  emoSuppressed: {
    name: "Emo-suppressed",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "class"],
    specialRules: [],
    notes: "Baseline Human. Never voluntarily leaves. May ignore events requiring fights. Can never receive Luck. Motivation is Survival.",
  },
  minorAlien: {
    name: "Minor Alien",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Baseline Human. Reduce bonus credits or story points from Background/Motivation/Class by 1. Roll 1D6 for an ability with XP upgrade cost reduced by 1.",
  },
  traveler: {
    name: "Traveler",
    category: "Strange Character",
    startingStats: { reactions: 3, speed: 4, combatSkill: 0, toughness: 4, savvy: 2, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "class"],
    specialRules: [],
    notes: "Begin with +2 story points and 2 Quest Rumors. +2” Speed when moving directly away from visible enemy. After battle: 2 disappears and gain 2 story points; 11-12 receive a Quest. Motivation is Truth.",
  },
  empath: {
    name: "Empath",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Baseline Human. +1 when sent on Recruit or Find a Patron tasks. Loses this ability if given implants.",
  },
  bioUpgrade: {
    name: "Bio-upgrade",
    category: "Strange Character",
    startingStats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    maxStats: { reactions: 6, speed: 8, combatSkill: 5, toughness: 6, savvy: 5 },
    nextRolls: ["background", "motivation", "class"],
    specialRules: [],
    notes: "Baseline Human. May have up to 4 implants and benefit from 2 of the same implant. Bonus credits from Background/Motivation/Class are reduced by 2.",
  },
};

export const primaryAlienTable = {
  id: "primaryAlienType",
  title: "Primary Alien Subtable",
  dice: "D100",
  sides: 100,
  columns: ["roll", "result"],
  entries: [
    tableRow({ rollMin: 1, rollMax: 20, name: "Engineer", profileKey: "engineer" }),
    tableRow({ rollMin: 21, rollMax: 40, name: "K’Erin", profileKey: "kerin" }),
    tableRow({ rollMin: 41, rollMax: 55, name: "Soulless", profileKey: "soulless" }),
    tableRow({ rollMin: 56, rollMax: 70, name: "Precursor", profileKey: "precursor" }),
    tableRow({ rollMin: 71, rollMax: 90, name: "Feral", profileKey: "feral" }),
    tableRow({ rollMin: 91, rollMax: 100, name: "Swift", profileKey: "swift" }),
  ],
};

export const strangeCharacterTable = {
  id: "strangeCharacterType",
  title: "Strange Character Subtable",
  dice: "D100",
  sides: 100,
  columns: ["roll", "result"],
  entries: [
    tableRow({ rollMin: 1, rollMax: 2, name: "De-converted", profileKey: "deConverted" }),
    tableRow({ rollMin: 3, rollMax: 8, name: "Unity Agent", profileKey: "unityAgent" }),
    tableRow({ rollMin: 9, rollMax: 17, name: "Mysterious Past", profileKey: "mysteriousPast" }),
    tableRow({ rollMin: 18, rollMax: 22, name: "Hakshan", profileKey: "hakshan" }),
    tableRow({ rollMin: 23, rollMax: 27, name: "Stalker", profileKey: "stalker" }),
    tableRow({ rollMin: 28, rollMax: 34, name: "Hulker", profileKey: "hulker" }),
    tableRow({ rollMin: 35, rollMax: 41, name: "Hopeful Rookie", profileKey: "hopefulRookie" }),
    tableRow({ rollMin: 42, rollMax: 47, name: "Genetic Uplift", profileKey: "geneticUplift" }),
    tableRow({ rollMin: 48, rollMax: 53, name: "Mutant", profileKey: "mutant" }),
    tableRow({ rollMin: 54, rollMax: 58, name: "Assault Bot", profileKey: "assaultBot" }),
    tableRow({ rollMin: 59, rollMax: 62, name: "Manipulator", profileKey: "manipulator" }),
    tableRow({ rollMin: 63, rollMax: 67, name: "Primitive", profileKey: "primitive" }),
    tableRow({ rollMin: 68, rollMax: 73, name: "Feeler", profileKey: "feeler" }),
    tableRow({ rollMin: 74, rollMax: 79, name: "Emo-suppressed", profileKey: "emoSuppressed" }),
    tableRow({ rollMin: 80, rollMax: 85, name: "Minor Alien", profileKey: "minorAlien" }),
    tableRow({ rollMin: 86, rollMax: 87, name: "Traveler", profileKey: "traveler" }),
    tableRow({ rollMin: 88, rollMax: 93, name: "Empath", profileKey: "empath" }),
    tableRow({ rollMin: 94, rollMax: 100, name: "Bio-upgrade", profileKey: "bioUpgrade" }),
  ],
};

function withProfileDetails(entry) {
  const profile = crewTypeProfiles[entry.profileKey];

  if (!profile) {
    return entry;
  }

  return {
    ...entry,
    category: profile.category,
    startingStats: profile.startingStats,
    maxStats: profile.maxStats,
    nextRolls: profile.nextRolls,
    saves: profile.saves,
    specialRules: profile.specialRules,
    description: entry.description || profile.notes,
  };
}

function attachProfiles(table) {
  return {
    ...table,
    entries: table.entries.map(withProfileDetails),
  };
}

function buildFollowUpCommandsForProfile({ crewMemberId, crewMemberNumber, profileKey }) {
  const profile = crewTypeProfiles[profileKey];
  const nextRolls = Array.isArray(profile?.nextRolls) ? profile.nextRolls : [];

  return buildCharacterCreationRollCommands({
    crewMemberId,
    crewMemberNumber,
    rollTypes: nextRolls,
    includeFinalize: true,
  });
}

function attachFollowUpsToProfileEntries({ table, crewMemberId, crewMemberNumber }) {
  return {
    ...table,
    entries: table.entries.map((entry) => ({
      ...entry,
      followUpCommands: buildFollowUpCommandsForProfile({
        crewMemberId,
        crewMemberNumber,
        profileKey: entry.profileKey,
      }),
    })),
  };
}

export function buildCrewTypeTableForCrewMember({ crewMemberId, crewMemberNumber }) {
  const detailBasePath = `crewLog.crewDetails.${crewMemberId}`;

  return attachProfiles({
    id: "basicCrewType",
    title: "Step 1: Basic Crew Type",
    dice: "D100",
    sides: 100,
    columns: ["roll", "result", "notes"],
    entries: [
      tableRow({
        rollMin: 1,
        rollMax: 60,
        name: "Baseline Human",
        profileKey: "baselineHuman",
        notes: "Roll Background, Motivation, and Class.",
        followUpCommands: buildFollowUpCommandsForProfile({
          crewMemberId,
          crewMemberNumber,
          profileKey: "baselineHuman",
        }),
      }),
      tableRow({
        rollMin: 61,
        rollMax: 80,
        name: "Primary Alien",
        profileKey: "primaryAlien",
        notes: "Roll on the Primary Alien Subtable, then Background, Motivation, and Class.",
        nextTableId: "primaryAlienType",
        followUpCommands: [
          makeTableRollCommand({
            id: `${crewMemberId}-primary-alien-table`,
            title: `Crew Member ${crewMemberNumber}: Primary Alien`,
            table: attachFollowUpsToProfileEntries({
              table: attachProfiles(primaryAlienTable),
              crewMemberId,
              crewMemberNumber,
            }),
            saveTo: `${detailBasePath}.primaryAlien`,
            crewMemberId,
            crewMemberNumber,
            resultKind: "primaryAlien",
          }),
        ],
      }),
      tableRow({
        rollMin: 81,
        rollMax: 90,
        name: "Bot",
        profileKey: "bot",
        notes: "Use the Standard Bot profile. Do not roll Background, Motivation, or Class.",
        followUpCommands: buildFollowUpCommandsForProfile({
          crewMemberId,
          crewMemberNumber,
          profileKey: "bot",
        }),
      }),
      tableRow({
        rollMin: 91,
        rollMax: 100,
        name: "Strange Character",
        profileKey: "strangeCharacter",
        notes: "Roll on the Strange Character Subtable.",
        nextTableId: "strangeCharacterType",
        followUpCommands: [
          makeTableRollCommand({
            id: `${crewMemberId}-strange-character-table`,
            title: `Crew Member ${crewMemberNumber}: Strange Character`,
            table: attachFollowUpsToProfileEntries({
              table: attachProfiles(strangeCharacterTable),
              crewMemberId,
              crewMemberNumber,
            }),
            saveTo: `${detailBasePath}.strangeCharacter`,
            crewMemberId,
            crewMemberNumber,
            resultKind: "strangeCharacter",
          }),
        ],
      }),
    ],
  });
}
