// Core rulebook Post-Battle Activities tables (5PFH Rulebook p.119-130).
// Transcribed verbatim from the rulebook PDF.

export const BATTLEFIELD_FINDS_TABLE = {
  id: "battlefieldFinds",
  label: "Battlefield Finds Table",
  dice: "D100",
  rulesPage: 121,
  rows: [
    {
      min: 1,
      max: 15,
      title: "Weapon",
      resultType: "weapon",
      description:
        "Randomly select a slain (but not Bailed) enemy from the battle. You may keep any weapons they were carrying.",
    },
    {
      min: 16,
      max: 25,
      title: "Usable goods",
      resultType: "consumable",
      description:
        "Roll on the Consumables Table in the “Loot” chapter of the rules. You receive 1 dosage of the item indicated.",
    },
    {
      min: 26,
      max: 35,
      title: "Curious data stick / Invasion Evidence",
      resultType: "questRumorOrInvasionEvidence",
      description:
        "You obtain a Quest Rumor. If the enemy is an Invasion Threat, you instead find Invasion Evidence. Earn +1 credit, and add +1 when checking for Invasion in the next step.",
    },
    {
      min: 36,
      max: 45,
      title: "Starship part",
      resultType: "shipPartCredit",
      description: "Redeemable as equivalent to 2 credits only when installing a Starship Component.",
    },
    {
      min: 46,
      max: 60,
      title: "Personal trinket",
      resultType: "personalTrinket",
      description:
        "On each planet you visit in the future, roll 2D6. On a 9+ you find the owner and receive a Loot roll as payment.",
    },
    {
      min: 61,
      max: 75,
      title: "Debris",
      resultType: "debris",
      description: "1D3 credits’ worth on the scrap market.",
    },
    {
      min: 76,
      max: 90,
      title: "Vital info / Invasion Evidence",
      resultType: "vitalInfoOrInvasionEvidence",
      description:
        "Turn in this information to get a Corporate Patron automatically on this world. If the enemy is an Invasion Threat, you instead find Invasion Evidence; if so, earn +1 credit and add +1 when checking for Invasion in the next step.",
    },
    {
      min: 91,
      max: 100,
      title: "Nothing of value",
      resultType: "nothing",
      description: "...not one thing!",
    },
  ],
};

export const INJURY_TABLE = {
  id: "injuryTable",
  label: "Injury Table",
  dice: "D100",
  rulesPage: 122,
  rows: [
    {
      min: 1,
      max: 5,
      title: "Gruesome fate",
      resultType: "dead",
      sickBayTurns: 0,
      description: "Dead, and all carried equipment is damaged.",
    },
    {
      min: 6,
      max: 15,
      title: "Death or permanent injury",
      resultType: "dead",
      sickBayTurns: 0,
      description: "Dead, or removed from the campaign.",
    },
    {
      min: 16,
      max: 16,
      title: "Miraculous escape",
      resultType: "miraculousEscape",
      sickBayTurns: 0,
      description: "The character survives and receives +1 Luck, but all items carried are permanently lost.",
    },
    {
      min: 17,
      max: 30,
      title: "Equipment loss",
      resultType: "equipmentDamaged",
      sickBayTurns: 0,
      description: "Random carried item is damaged.",
    },
    {
      min: 31,
      max: 45,
      title: "Crippling wound",
      resultType: "cripplingWound",
      sickBayTurns: "1D6",
      description:
        "Require 1D6 credits of surgery immediately, or suffer -1 permanent reduction to highest of Speed or Toughness.",
    },
    {
      min: 46,
      max: 54,
      title: "Serious injury",
      resultType: "noLongTermEffect",
      sickBayTurns: "1D3+1",
      description: "No long-term effect.",
    },
    {
      min: 55,
      max: 80,
      title: "Minor injuries",
      resultType: "noLongTermEffect",
      sickBayTurns: 1,
      description: "No long-term effect.",
    },
    {
      min: 81,
      max: 95,
      title: "Knocked out",
      resultType: "noLongTermEffect",
      sickBayTurns: 0,
      description: "No long-term effect.",
    },
    {
      min: 96,
      max: 100,
      title: "School of hard knocks",
      resultType: "earnXp",
      sickBayTurns: 0,
      description: "Earn 1 XP.",
    },
  ],
};

export const BOT_INJURY_TABLE = {
  id: "botInjuryTable",
  label: "Bot Injury Table",
  dice: "D100",
  rulesPage: 122,
  rows: [
    {
      min: 1,
      max: 5,
      title: "Obliterated",
      resultType: "dead",
      repairTurns: 0,
      description: "Destroyed, and all carried equipment is damaged.",
    },
    {
      min: 6,
      max: 15,
      title: "Destroyed",
      resultType: "dead",
      repairTurns: 0,
      description: "Destroyed.",
    },
    {
      min: 16,
      max: 30,
      title: "Equipment loss",
      resultType: "equipmentDamaged",
      repairTurns: 0,
      description: "Random carried item is damaged.",
    },
    {
      min: 31,
      max: 45,
      title: "Severe damage",
      resultType: "noLongTermEffect",
      repairTurns: "1D6",
      description: "No long-term effect.",
    },
    {
      min: 46,
      max: 65,
      title: "Minor damage",
      resultType: "noLongTermEffect",
      repairTurns: 1,
      description: "No long-term effect.",
    },
    {
      min: 66,
      max: 100,
      title: "Just a few dents",
      resultType: "noLongTermEffect",
      repairTurns: 0,
      description: "No long-term effect.",
    },
  ],
};

// Ability Increase Table (p.123) — Character Upgrades purchased with XP.
export const ABILITY_INCREASE_TABLE = [
  { ability: "reactions", label: "Reactions", xpCost: 7, max: 6, maxLabel: "6" },
  { ability: "combatSkill", label: "Combat Skill", xpCost: 7, max: 5, maxLabel: "+5" },
  { ability: "speed", label: "Speed", xpCost: 5, max: 8, maxLabel: "8\"" },
  { ability: "savvy", label: "Savvy", xpCost: 5, max: 5, maxLabel: "+5" },
  { ability: "toughness", label: "Toughness", xpCost: 6, max: 6, maxLabel: "6" },
  { ability: "luck", label: "Luck", xpCost: 10, max: 1, maxHuman: 3, maxLabel: "1 (3 Human)" },
];

// Battle-result XP gains (p.123).
export const XP_GAIN_RULES = {
  casualty: 1,
  survivedNoWin: 2,
  survivedWon: 3,
  firstToInflictCasualty: 1,
  killedUniqueIndividual: 1,
  easyMode: 1,
  questFinale: 1,
};

// Advanced Training courses (p.124-126).
export const ADVANCED_TRAINING_COURSES = [
  {
    id: "pilotTraining",
    label: "Pilot Training",
    cost: 20,
    effect:
      "If a Starship Travel event calls for a Savvy test, you may roll 2D6, pick the better die and add +2 to the score.",
  },
  {
    id: "mechanicTraining",
    label: "Mechanic Training",
    cost: 15,
    effect:
      "If your ship is in need of Repairs, you may repair +1 Hull Point damage every campaign turn (meaning 2 points of damage are repaired per campaign turn). Engineers count any XP spent as double value for obtaining this.",
  },
  {
    id: "medicalSchool",
    label: "Medical School",
    cost: 20,
    effect:
      "After each battle, you may nominate a casualty that will roll twice on the Injury Table, picking the better result. This crew member must have been in the battle and must not have become a casualty. If your ship has a Shuttle, you can evac fast enough that this crew member can apply their skill even if they did not participate in the battle.",
  },
  {
    id: "merchantSchool",
    label: "Merchant School",
    cost: 10,
    effect:
      "When this crew member Trades, you may reroll one Trade roll each campaign turn. The new roll must be accepted and if the new roll offers a choice of whether to buy an item, you must accept. You may roll up all eligible Trade rolls before choosing what to reroll.",
  },
  {
    id: "securityTraining",
    label: "Security Training",
    cost: 10,
    effect:
      "If this crew member is part of your squad when fighting a battle, you may add +1 when rolling to Seize the Initiative. Ferals can obtain this training at -2 Cost.",
  },
  {
    id: "brokerTraining",
    label: "Broker Training",
    cost: 15,
    effect: "When rolling to obtain licenses, Advanced Training applications, or searching for Patrons, add +1 to the roll.",
  },
  {
    id: "botTechnician",
    label: "Bot Technician",
    cost: 10,
    effect:
      "All Bot upgrades cost 1 credit less. If a Bot or Soulless character must roll for a post-battle injury, you may roll twice, picking the better result.",
  },
];

// Campaign Events Table (p.126-127).
export const CAMPAIGN_EVENTS_TABLE = {
  id: "campaignEvents",
  label: "Campaign Events Table",
  dice: "D100",
  rulesPage: 126,
  rows: [
    {
      min: 1,
      max: 3,
      title: "You’ve met a friendly doc who doesn’t ask too many questions.",
      resultType: "reduceSickBay",
      description:
        "Select up to two crew members in Sick Bay and reduce their Recovery time by one campaign turn each. If they recover, they can act normally next campaign turn.",
    },
    {
      min: 4,
      max: 8,
      title: "The life support system on the ship needs upgrading badly.",
      resultType: "lifeSupportUpgrade",
      description:
        "Upgrading the life support system will cost 1D6 credits. The ship cannot be flown until this is paid. If your crew has an Engineer, modify the roll by -1.",
    },
    {
      min: 9,
      max: 12,
      title: "A chance meeting turns into a new ally.",
      resultType: "newAllyOrStoryPoint",
      description:
        "Roll up a new character and add them to the crew, OR add +1 story point. You may decide after rolling up the new character.",
    },
    {
      min: 13,
      max: 16,
      title: "You’ve made friends among the locals.",
      resultType: "addStoryPoints",
      amount: 1,
      description: "+1 story point.",
    },
    {
      min: 17,
      max: 20,
      title: "You managed to mouth off to the wrong people.",
      resultType: "addRival",
      description: "Add a Rival.",
    },
    {
      min: 21,
      max: 23,
      title: "An old nemesis has tracked you down.",
      resultType: "addTrackingRival",
      description:
        "Select a prior Rival, or roll up a new one. They will follow you from planet to planet until resolved and receive +1 when rolling for the number of enemies in a battle.",
    },
    {
      min: 24,
      max: 26,
      title: "A shady character offers you a deal.",
      resultType: "tradeAwayItem",
      description: "Give him any one item of equipment, then roll on the Trade Table.",
    },
    {
      min: 27,
      max: 30,
      title: "You sell off some cargo you acquired on the last planet.",
      resultType: "addCredits",
      amount: "1D6",
      description: "Earn 1D6 credits.",
    },
    {
      min: 31,
      max: 35,
      title: "One of the crew overheard something interesting.",
      resultType: "addRumors",
      amount: 1,
      description: "Add 1 Rumor.",
    },
    {
      min: 36,
      max: 38,
      title: "You’ve managed to settle some old “business”.",
      resultType: "removeRivalOrXp",
      description: "If you have any, you may remove one Rival of your choice. If you have no Rivals, your captain earns +1 XP instead.",
    },
    {
      min: 39,
      max: 41,
      title: "An admirer wants to come along.",
      resultType: "newBasicRecruit",
      description:
        "Gain a new crew member, if desired. They have only the base profile with no extra rolls, and bring no equipment. If your crew has any Feral members, the new member is also Feral.",
    },
    {
      min: 42,
      max: 44,
      title: "An alien merchant offers you some strange device.",
      resultType: "buyLootRoll",
      cost: 4,
      description: "If you want to buy it, pay 4 credits and then roll on the Loot Table.",
    },
    {
      min: 45,
      max: 48,
      title: "Equipment malfunction.",
      resultType: "damageRandomStashItem",
      description: "If there are any items in your Stash, a random item is damaged and must be Repaired.",
    },
    {
      min: 49,
      max: 51,
      title: "You’ve earned a bit of a bad reputation.",
      resultType: "loseRandomPatron",
      description: "If you know any Patrons on the current world, randomly select one that will no longer work with you. If you have no Patrons, shrug and move on.",
    },
    {
      min: 52,
      max: 56,
      title: "The tax man is taking an interest in your business conduct.",
      resultType: "taxMan",
      description: "Roll 2D6 and pay the higher die in credits. If you have insufficient credits your ship is impounded until you can pay.",
    },
    {
      min: 57,
      max: 59,
      title: "The crew has decided it’s time for a new person to be in charge.",
      resultType: "newCaptain",
      description:
        "Select a crew member to be the new captain. They immediately receive 3 XP. Roll 1D6. On a 1, the old captain leaves the campaign permanently, taking any items carried with them. If your crew has any K’Erin, one of them must be selected, or they will leave.",
    },
    {
      min: 60,
      max: 63,
      title: "You’ve made some business contacts.",
      resultType: "addPatron",
      description: "Add a new Patron to the list of those known.",
    },
    {
      min: 64,
      max: 66,
      title: "Recent events made for a good learning opportunity.",
      resultType: "allCrewXp",
      amount: 1,
      description: "Every crew member receives +1 XP.",
    },
    {
      min: 67,
      max: 70,
      title: "During routine maintenance, the gravitational adjuster got knocked out of alignment.",
      resultType: "hullDamage",
      amount: "1D6",
      description: "Your ship suffers 1D6 points of Hull Point damage.",
    },
    {
      min: 71,
      max: 74,
      title: "The crew spends a night drinking, watching movies, and playing cards.",
      resultType: "addStoryPoints",
      amount: 1,
      description: "+1 story point.",
    },
    {
      min: 75,
      max: 78,
      title: "You meet up with an old arms dealer contact who owes you a deal.",
      resultType: "chooseFreeWeapons",
      description: "Add your choice of 3 weapons from the following list: Hand Cannons, Military Rifles, Shotguns, or Machine Pistols.",
    },
    {
      min: 79,
      max: 81,
      title: "You renegotiate some old debts.",
      resultType: "renegotiateDebt",
      description: "If you currently owe money, reduce your debt by 1D6+1 credits. If you owe nothing, earn 2 credits for being prudent with your money.",
    },
    {
      min: 82,
      max: 84,
      title: "The sector news networks are awash with rumors of war.",
      resultType: "invasionRollBonus",
      description: "While you remain on this planet, any roll for Invasion is at +2.",
    },
    {
      min: 85,
      max: 88,
      title: "A bit of time on your hands.",
      resultType: "twoExplorationRolls",
      description: "The crew has a few days to do their own thing. Select two crew members at random and have each make a roll on the Exploration Table.",
    },
    {
      min: 89,
      max: 91,
      title: "You got noticed by someone you’d rather avoid.",
      resultType: "addRivalQuestBattle",
      description: "Add a Rival. If you currently are on a Quest, the next campaign turn is automatically a battle against the new Rival, and they will add +1 to the number of enemies.",
    },
    {
      min: 92,
      max: 94,
      title: "It’s time to go!",
      resultType: "stayAddsRival",
      description: "Whatever you did, every campaign turn you stay on this planet, you must add an additional Rival.",
    },
    {
      min: 95,
      max: 97,
      title: "Unity government says no ships are authorized to leave.",
      resultType: "grounded",
      turns: 2,
      description: "You cannot leave the planet during the next two campaign turns.",
    },
    {
      min: 98,
      max: 100,
      title: "In hindsight, it’ll make a great story.",
      resultType: "luckOrStoryPointForCasualty",
      description: "Select a crew member who was a casualty last battle. They receive +1 Luck. If nobody got hurt, receive +1 story point instead.",
    },
  ],
};

// Character Events Table (p.128-130). Rolled against a randomly-selected crew member.
export const CHARACTER_EVENTS_TABLE = {
  id: "characterEvents",
  label: "Character Events Table",
  dice: "D100",
  rulesPage: 128,
  rows: [
    {
      min: 1,
      max: 3,
      title: "All this endless violence is depressing you.",
      resultType: "refusesNextBattle",
      description: "The character refuses to participate in any battle during the next campaign turn (except an Invasion battle). Get +1 story point. K’Erin are unaffected.",
    },
    {
      min: 4,
      max: 6,
      title: "You have some business to attend to elsewhere.",
      resultType: "unavailableTwoTurns",
      description:
        "The character is unavailable for the next two campaign turns. They require no Upkeep during this time, and cannot be the target of any events. When they return, award them 1D6 XP, and roll once on the Loot Table. If the character is Swift, they never return but are replaced with a brand new Swift character rolled up normally.",
    },
    {
      min: 7,
      max: 10,
      title: "You make some local friends.",
      resultType: "characterXp",
      amount: 1,
      description: "The character earns +1 XP.",
    },
    {
      min: 11,
      max: 12,
      title: "You are starting to wonder if it is time to move on.",
      resultType: "mayLeaveIfSickBay",
      description: "If the character is currently in Sick Bay, roll 1D6. If the roll is equal or below the number of campaign turns of recovery left, they will decide to leave the crew.",
    },
    {
      min: 13,
      max: 15,
      title: "You get a letter from home.",
      resultType: "xpAndMaybeQuest",
      amount: 1,
      description: "The character earns +1 XP. Roll 1D6. On a 5-6 you immediately receive a Quest.",
    },
    {
      min: 16,
      max: 19,
      title: "You argue with the rest of the crew.",
      resultType: "refusesTasksNextTurn",
      description: "During the next campaign turn, the crew member refuses to do any tasks but will participate in battle normally.",
    },
    {
      min: 20,
      max: 23,
      title: "You get in a scrap with another crew member.",
      resultType: "brawlAnotherMember",
      description: "Randomly select another crew member and roll 1D6+Combat Skill for each. The lower score must spend one campaign turn in Sick Bay. On a draw, both go to Sick Bay. If a K’Erin is in the crew, you must fight them.",
    },
    {
      min: 24,
      max: 26,
      title: "The local food is sitting well with you.",
      resultType: "sickBayReliefOrXp",
      description: "If in Sick Bay, reduce your recovery time by one campaign turn. If not, earn +1 XP. Engineers receive no benefit from this.",
    },
    {
      min: 27,
      max: 29,
      title: "You are not sure you are really the same person any longer.",
      resultType: "rerollMotivation",
      description:
        "Roll on the Motivation Table and change to that motivation. You do not receive any items or resources, but if the new motivation would have any ability score bonuses, earn +1 XP for each +1 ability score you would have received normally. If you roll the current motivation, the character becomes particularly self-assured. Earn +1 story point.",
    },
    {
      min: 30,
      max: 33,
      title: "It is time for a make-over!",
      resultType: "cosmeticOnly",
      description: "The character changes their clothes, hair-style, or something else. This is only cosmetic.",
    },
    {
      min: 34,
      max: 38,
      title: "Overhear something useful.",
      resultType: "addQuestRumor",
      amount: 1,
      description: "Earn 1 Quest Rumor.",
    },
    {
      min: 39,
      max: 41,
      title: "Earn a little on the side.",
      resultType: "addCredits",
      amount: 2,
      description: "Receive +2 credits.",
    },
    {
      min: 42,
      max: 45,
      title: "Have a heart to heart talk with a crew member.",
      resultType: "bothMembersXp",
      amount: 1,
      description: "Select a random crew member. Both earn +1 XP.",
    },
    {
      min: 46,
      max: 48,
      title: "Time spent exercising is never wasted.",
      resultType: "characterXp",
      amount: 2,
      description: "Earn +2 XP.",
    },
    {
      min: 49,
      max: 51,
      title: "You pick up an unusual hobby.",
      resultType: "storyPointAndMaybeXp",
      description: "Earn +1 story point and the character talks about it constantly. If the character is Swift or Precursor, they also earn +2 XP.",
    },
    {
      min: 52,
      max: 55,
      title: "The scars tell the story.",
      resultType: "xpIfInjured",
      amount: 2,
      description: "If the character was injured in any way last or this campaign turn, they earn +2 XP.",
    },
    {
      min: 56,
      max: 59,
      title: "You’ve had time to reflect on your adventures.",
      resultType: "characterXp",
      amount: "1D3",
      description: "Earn +1D3 XP.",
    },
    {
      min: 60,
      max: 62,
      title: "You’ve made a real personal breakthrough.",
      resultType: "freeAbilityIncrease",
      description: "Select one ability score that has not been increased from its starting value when the character entered the campaign. It increases by +1 immediately.",
    },
    {
      min: 63,
      max: 66,
      title: "You get hurt while working on the ship.",
      resultType: "sickBayAndHullDamage",
      description: "Spend one campaign turn in Sick Bay, and the ship takes 1 Hull Point damage.",
    },
    {
      min: 67,
      max: 68,
      title: "You have finally found true love in this bleak universe.",
      resultType: "trueLove",
      description: "If the character’s motivation was True Love, they earn +1D6 XP. Regardless, get +1 story point.",
    },
    {
      min: 69,
      max: 71,
      title: "A personal enemy has tracked you down.",
      resultType: "addPersonalRival",
      description: "Add a Rival. If this character leaves your crew, the Rival also leaves.",
    },
    {
      min: 72,
      max: 75,
      title: "Someone has sent you a gift.",
      resultType: "lootRoll",
      description: "Roll once on the Loot Table.",
    },
    {
      min: 76,
      max: 78,
      title: "You feel great. Eating well must be paying off.",
      resultType: "ignoreNextInjuryRoll",
      description: "Next time this character would be forced to roll on the Injury Table, the roll is ignored. Engineers cannot benefit from this event.",
    },
    {
      min: 79,
      max: 82,
      title: "You know someone who knows someone.",
      resultType: "addPatron",
      description: "Add a Patron.",
    },
    {
      min: 83,
      max: 84,
      title: "Maybe you are leading a charmed existence?",
      resultType: "addLuck",
      amount: 1,
      description: "Add +1 Luck.",
    },
    {
      min: 85,
      max: 87,
      title: "You’ve put in a lot of hard work around here.",
      resultType: "repairHullOrItem",
      description: "Either repair 2 Hull Point damage or Repair one damaged item in the inventory. Engineers may do both.",
    },
    {
      min: 88,
      max: 91,
      title: "They don’t make them like they used to.",
      resultType: "damageCarriedItem",
      description: "A random item carried by the character is damaged, and must be Repaired before it can be used again. Engineers are not affected.",
    },
    {
      min: 92,
      max: 94,
      title: "Where did it go?",
      resultType: "loseCarriedItem",
      description: "A random item carried by the character has been lost. When rolling for a Character Event next campaign turn, roll 1D6+Savvy as well. On a 5+, the item turns up again, otherwise it is lost for good.",
    },
    {
      min: 95,
      max: 97,
      title: "A deep feeling of melancholy and despair is afflicting you.",
      resultType: "noXpNextTurn",
      description: "The character will earn no XP next campaign turn. K’Erin are not affected.",
    },
    {
      min: 98,
      max: 100,
      title: "You’ve had a lot of time to burn.",
      resultType: "extraActionNextTurn",
      description: "Next campaign turn, the character may perform an additional action, even if they are in Sick Bay.",
    },
  ],
};

// Galactic War Progress Table (p.126), 2D6, resolved per previously-Invaded world.
export const GALACTIC_WAR_PROGRESS_TABLE = [
  { min: 2, max: 4, result: "lostToUnity", label: "Lost to Unity", description: "The planet is lost to the invaders and cannot be visited again." },
  { min: 5, max: 7, result: "contested", label: "Contested", description: "No progress." },
  { min: 8, max: 9, result: "makingGround", label: "Making Ground", description: "Add +1 to all future rolls on this table for this world." },
  { min: 10, max: 99, result: "unityVictorious", label: "Unity Victorious", description: "The planet can now be visited again. Due to increased troop presence, all future Invasion Threat rolls on this world are at -2." },
];

export function findGalacticWarResult(roll) {
  return GALACTIC_WAR_PROGRESS_TABLE.find((row) => roll >= row.min && roll <= row.max) || null;
}
