// Deployment Conditions — Rulebook p.88
// Roll D100, use column matching mission type
export const DEPLOYMENT_CONDITIONS = {
  id: "deploymentConditions",
  title: "Deployment Conditions",
  dice: "D100",
  sides: 100,
  columns: ["opportunity", "rival", "quest"],
  columnLabels: {
    opportunity: "Opportunity / Patron",
    rival: "Rival",
    quest: "Quest",
  },
  // entries keyed by condition id; roll ranges per column
  entries: [
    {
      id: "no-condition",
      label: "No Condition",
      text: "No special deployment conditions apply.",
      ranges: { opportunity: [1, 40], rival: [1, 10], quest: [1, 5] },
    },
    {
      id: "small-encounter",
      label: "Small Encounter",
      text: "A random crew member must sit out this fight. Reduce enemy numbers by -1 (-2 if they initially outnumber you).",
      ranges: { opportunity: [41, 45], rival: [11, 15], quest: [6, 10] },
    },
    {
      id: "poor-visibility",
      label: "Poor Visibility",
      text: "Maximum visibility is 1D6+8\". Reroll at the start of each round.",
      ranges: { opportunity: [46, 50], rival: [16, 20], quest: [11, 25] },
      requiresRoll: true,
      rollFormula: "1D6+8",
      rollLabel: "Visibility (inches)",
    },
    {
      id: "brief-engagement",
      label: "Brief Engagement",
      text: "At the end of each round, roll 2D6. If the roll is equal to or below the round number, the game ends inconclusively.",
      ranges: { opportunity: [51, 55], rival: [21, 25], quest: [26, 30] },
    },
    {
      id: "toxic-environment",
      label: "Toxic Environment",
      text: "Whenever a combatant is Stunned, roll 1D6+Savvy skill (0 for enemies). Failure to roll a 4+ becomes a casualty.",
      ranges: { opportunity: [56, 60], rival: [26, 30], quest: [31, 40] },
    },
    {
      id: "surprise-encounter",
      label: "Surprise Encounter",
      text: "The enemy can't act in the first round.",
      ranges: { opportunity: [61, 65], rival: [31, 45], quest: [41, 50] },
    },
    {
      id: "delayed",
      label: "Delayed",
      text: "2 random crew members won't start on the table. At the end of each round, roll 1D6: If the roll is equal to or below the round number, they may be placed at any point of your own battlefield edge.",
      ranges: { opportunity: [66, 75], rival: [46, 50], quest: [51, 60] },
    },
    {
      id: "slippery-ground",
      label: "Slippery Ground",
      text: "All movement at ground level is -1 Speed.",
      ranges: { opportunity: [76, 80], rival: [51, 60], quest: [61, 65] },
    },
    {
      id: "bitter-struggle",
      label: "Bitter Struggle",
      text: "Enemy Morale is +1.",
      ranges: { opportunity: [81, 85], rival: [61, 75], quest: [66, 80] },
    },
    {
      id: "caught-off-guard",
      label: "Caught Off Guard",
      text: "Your squad all act in the Slow Actions phase in Round 1.",
      ranges: { opportunity: [86, 90], rival: [76, 90], quest: [81, 90] },
    },
    {
      id: "gloomy",
      label: "Gloomy",
      text: "Maximum visibility is 9\". Characters that fire can be fired upon at any range, however.",
      ranges: { opportunity: [91, 100], rival: [91, 100], quest: [91, 100] },
    },
  ],
};

// Notable Sights — Rulebook p.89
// Roll D100, use column matching mission type. Item placed 2D6+2" in random direction from center.
export const NOTABLE_SIGHTS = {
  id: "notableSights",
  title: "Notable Sights",
  dice: "D100",
  sides: 100,
  columns: ["opportunity", "rival", "quest"],
  columnLabels: {
    opportunity: "Opportunity / Patron",
    rival: "Rival",
    quest: "Quest",
  },
  entries: [
    {
      id: "nothing-special",
      label: "Nothing Special",
      text: "No notable sight is present.",
      ranges: { opportunity: [1, 20], rival: [1, 40], quest: [1, 10] },
    },
    {
      id: "documentation",
      label: "Documentation",
      text: "Gain a Quest Rumor.",
      ranges: { opportunity: [21, 30], rival: [41, 50], quest: [11, 25] },
    },
    {
      id: "priority-target",
      label: "Priority Target",
      text: "Select a random enemy figure. Add +1 to their Toughness. If they are slain, gain 1D3 credits.",
      ranges: { opportunity: [31, 40], rival: [51, 60], quest: [26, 35] },
      requiresRoll: true,
      rollFormula: "1D3",
      rollLabel: "Credits if slain",
    },
    {
      id: "loot-cache",
      label: "Loot Cache",
      text: "Roll once on the Loot Table (p.131).",
      ranges: { opportunity: [41, 50], rival: [61, 70], quest: [36, 50] },
    },
    {
      id: "shiny-bits",
      label: "Shiny Bits",
      text: "Gain 1 credit.",
      ranges: { opportunity: [51, 60], rival: [71, 75], quest: [51, 55] },
    },
    {
      id: "really-shiny-bits",
      label: "Really Shiny Bits",
      text: "Gain 2 credits.",
      ranges: { opportunity: [61, 70], rival: [76, 80], quest: [56, 65] },
    },
    {
      id: "person-of-interest",
      label: "Person of Interest",
      text: "Gain +1 story point.",
      ranges: { opportunity: [71, 80], rival: [81, 90], quest: [66, 80] },
    },
    {
      id: "peculiar-item",
      label: "Peculiar Item",
      text: "Gain +2 XP.",
      ranges: { opportunity: [81, 90], rival: [91, 95], quest: [81, 90] },
    },
    {
      id: "curious-item",
      label: "Curious Item",
      text: "Roll 1D6. On a 1-4, it can be sold for 1 credit. On a 5-6, roll on the Loot Table (p.131).",
      ranges: { opportunity: [91, 100], rival: [96, 100], quest: [91, 100] },
      requiresRoll: true,
      rollFormula: "1D6",
      rollLabel: "Curious item check",
    },
  ],
};

// Battle Events — Rulebook pp.116-117
// Optional. Roll at end of Round 2 and Round 4. D100.
export const BATTLE_EVENTS = {
  id: "battleEvents",
  title: "Battle Events",
  dice: "D100",
  sides: 100,
  note: "Optional. Roll at the end of Round 2 and Round 4.",
  entries: [
    {
      min: 1, max: 5,
      label: "Renewed Efforts",
      text: "The enemy is making a concerted effort to push you back. For the rest of the battle, after all enemy figures have acted, select a random figure that may immediately take a second Move and second Combat Action.",
    },
    {
      min: 6, max: 9,
      label: "Enemy Reinforcements",
      text: "An additional 2 enemy figures arrive at the center of the opposing battlefield edge. One is armed as a Specialist (if applicable to the enemy type).",
    },
    {
      min: 10, max: 13,
      label: "Change of Plans",
      text: "The enemy switches to the Cautious AI type for the rest of the battle. If they were already Cautious, they instead switch to Tactical AI. Enemies with no ranged attacks are unaffected by this event.",
    },
    {
      min: 14, max: 16,
      label: "Lost Heart",
      text: "The enemy has had enough of this fight. At the end of the next round, they will leave the field.",
    },
    {
      min: 17, max: 20,
      label: "Seized the Moment",
      text: "Select a crew member who may move and act in both the Quick and Slow Actions phases next round.",
    },
    {
      min: 21, max: 26,
      label: "Critters!",
      text: "Place 1D3 Vent Crawlers (p.102) in the center of the table, and move each of them 1D6\" in a random direction. At the beginning of the Enemy Actions phase, they will move towards the nearest figure and attack, regardless of which side the figure is on. If you are already fighting Vent Crawlers, this is bad news, as they are of course part of the enemy brood.",
      requiresRoll: true,
      rollFormula: "1D3",
      rollLabel: "Number of Vent Crawlers",
    },
    {
      min: 27, max: 30,
      label: "Ammo Fault",
      text: "Select a random figure in your crew. If they fired a weapon last round, it cannot be used for the rest of the battle. If they did not, select a random carried weapon, which can be fired only once this battle.",
    },
    {
      min: 31, max: 34,
      label: "Visibility Change",
      text: "If visibility is currently reduced, increase the vision range by +1D6\". If visibility is currently unlimited, reduce it to 1D6+6\".",
      requiresRoll: true,
      rollFormula: "1D6",
      rollLabel: "Visibility change (inches)",
    },
    {
      min: 35, max: 38,
      label: "Tougher Than Expected",
      text: "Select a random enemy figure. They receive +1 Toughness (to a maximum of 6) and remove all current stun markers on that figure.",
    },
    {
      min: 39, max: 42,
      label: "Snap Shot",
      text: "Select a figure in your crew. They may fire a weapon immediately. If the weapon is a Pistol, it Hits automatically. If not, it Hits on a natural 6.",
    },
    {
      min: 43, max: 46,
      label: "Cunning Plan",
      text: "In the next round, do not roll for Initiative. Each of your crew acts in the Quick or Slow Actions phase as you prefer.",
    },
    {
      min: 47, max: 50,
      label: "Possible Reinforcements",
      text: "Place 3 markers evenly spaced along the opposing battlefield edge. At the start of the Enemy Actions phase next round, select a random marker, and roll 1D6. On a 5-6, a new basic enemy figure is placed on the marker, otherwise it is removed. Roll once per round until they are all gone. If a crew member moves within 3\" of a marker, it is removed instantly.",
    },
    {
      min: 51, max: 54,
      label: "Clock Is Running Out",
      text: "At the end of the next round and each round thereafter, roll 1D6. On a 6, the game ends immediately, and you are unable to complete any objectives. You will not count as Holding the Field unless you clear the table of enemies before this happens.",
    },
    {
      min: 55, max: 60,
      label: "Environmental Hazard",
      text: "Select a random terrain feature. Any figure currently in, on, or within 1\" of the feature must roll 1D6+Savvy and achieve a 5+ (enemies roll 1D6 and must roll a 4+) or take a Damage +1 Hit, ignoring any Armor Saving Throws. The feature is safe afterwards.",
    },
    {
      min: 61, max: 65,
      label: "A Desperate Plan",
      text: "A random figure in your crew cannot act next round, but instead select another figure of choice that may act in both the Quick and Slow Actions phases.",
    },
    {
      min: 66, max: 70,
      label: "A Moment of Hesitation",
      text: "Next round, select a single figure that acts in the Quick Actions phase (if any Feral are in the squad, you must select a Feral). All other figures acts in the Slow Actions phase.",
    },
    {
      min: 71, max: 73,
      label: "Fumbled Grenade",
      text: "A random enemy fumbles a grenade. The figure in question runs 6\" in a random direction and is then Stunned. Every figure, crew and enemy within 4\" of the initial position will immediately run 4\" directly away. The grenade then goes off harmlessly. If the enemy is one that would not use grenades, nothing happens.",
    },
    {
      min: 74, max: 77,
      label: "Back Up",
      text: "If you have spare crew not taking part in the battle, you may have one crew member arrive. Place them on the center of your own battlefield edge.",
    },
    {
      min: 78, max: 80,
      label: "Enemy VIP",
      text: "A Unique Individual immediately joins the enemy force. Place them on the center of their battlefield edge.",
    },
    {
      min: 81, max: 85,
      label: "Fog Cloud",
      text: "A dense cloud of fog envelops the center of the table for the rest of the battle. It extends 6\" in every direction and blocks all visibility past 2\".",
    },
    {
      min: 86, max: 89,
      label: "Lost!",
      text: "A random crew member loses their way and misses the rest of the battle. Remove the figure from the battlefield. They rejoin you safely afterwards, looking a bit sheepish. Ignore this event if you are currently outnumbered.",
    },
    {
      min: 90, max: 93,
      label: "I Found Something!",
      text: "Randomly select a crew member, then place a marker 1D6\" from them in a random direction. The enemy will ignore it. If any crew member moves into contact and spends a non-Combat Action, roll for a Loot item (p.131) and claim it for use immediately.",
      requiresRoll: true,
      rollFormula: "1D6",
      rollLabel: "Marker distance (inches)",
    },
    {
      min: 94, max: 97,
      label: "Looks Valuable",
      text: "Randomly select a crew member, then place a marker 1D6\" from them in a random direction. The enemy will ignore it. If any crew member moves into contact and spends a non-Combat Action, obtain 1D3 credits.",
      requiresRoll: true,
      rollFormula: "1D6",
      rollLabel: "Marker distance (inches)",
    },
    {
      min: 98, max: 100,
      label: "You Want Me to Check That Out?",
      text: "Select a random crew member. They may opt to go check out something they saw. If they do, they are removed from the battle. After the battle ends, they may roll once on the Loot table (p.131). If you opt not to go, you cannot send a different character, and the chance is lost.",
    },
  ],
};

export function getDeploymentConditionForRoll(roll, missionType = "opportunity") {
  const col = missionType === "patron" ? "opportunity" : missionType;
  return DEPLOYMENT_CONDITIONS.entries.find((e) => {
    const range = e.ranges[col] || e.ranges.opportunity;
    return range && roll >= range[0] && roll <= range[1];
  }) || DEPLOYMENT_CONDITIONS.entries[0];
}

export function getNotableSightForRoll(roll, missionType = "opportunity") {
  const col = missionType === "patron" ? "opportunity" : missionType;
  return NOTABLE_SIGHTS.entries.find((e) => {
    const range = e.ranges[col] || e.ranges.opportunity;
    return range && roll >= range[0] && roll <= range[1];
  }) || NOTABLE_SIGHTS.entries[0];
}

export function getBattleEventForRoll(roll) {
  return BATTLE_EVENTS.entries.find((e) => roll >= e.min && roll <= e.max) || BATTLE_EVENTS.entries[0];
}
