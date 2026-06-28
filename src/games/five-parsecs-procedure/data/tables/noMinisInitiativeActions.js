// No-Minis Initiative Actions verbatim from 5PFH Compendium p.68
export const NO_MINIS_INITIATIVE_ACTIONS = [
  {
    id: "scout-for-locations",
    label: "Scout for Locations",
    description: "Select a suspected Location that becomes known to the crew. This action is not possible in the first game round.",
    battlefieldTest: {
      target: 6,
      modifiers: [
        { condition: "Move speed is 5\" or above", bonus: +1 },
      ],
    },
    notInRoundOne: true,
  },
  {
    id: "move-up",
    label: "Move Up",
    description: "The character moves to any known Location that does not already have a character present. If a character is at a Location currently, they may opt to move to the general battle space instead.",
    battlefieldTest: null,
  },
  {
    id: "carry-out-task",
    label: "Carry Out Task",
    description: "This is typically used for achieving objectives. The character must be at the correct Location to do so. If the scenario requires a die roll to be made for an action, the crew member may carry it out now. The character may still fight normally if engaged in combat this battle round.",
    battlefieldTest: { target: null, note: "Dependent on the scenario." },
    scenarioDependent: true,
  },
  {
    id: "charge",
    label: "Charge",
    description: "Select a random Enemy. After selecting them, you may choose to engage them in a Brawl which is resolved immediately. Roll 1D6 — if the result is above your character movement speed, the enemy may fire upon you at 6\" range, counting as Cover. Add +1 to test if Move speed is 5\" or above. Add +1 for use of special movement device. If you decide not to engage, nothing happens.",
    battlefieldTest: {
      target: 6,
      modifiers: [
        { condition: "Move speed is 5\" or above", bonus: +1 },
        { condition: "Using a special movement device", bonus: +1 },
      ],
    },
    extraRoll: "1D6 vs Move speed to check if enemy fires first",
  },
  {
    id: "optimal-shot",
    label: "Optimal Shot",
    description: "Select a random Enemy. You may engage them in a Firefight at any range up to the maximum for your weapon. Both characters will fire at the selected range, with the crew member firing first. A character unable to fire at the selected range does not fire, and remains available in the Firefight step. If the Enemy fires as part of this combat, they cannot be selected as an attacker in the Firefight step later this battle round.",
    battlefieldTest: {
      target: 7,
      modifiers: [
        { condition: "Using a Heavy weapon", bonus: -1 },
      ],
    },
  },
  {
    id: "support",
    label: "Support",
    description: "Select a crew member. If that crew member is engaged in combat during this round, the Supporting character may opt to be engaged instead. Once this action has been taken, it lasts until the Supporting character is engaged in combat for any reason. A character could potentially Support multiple allies at once; all Supports clear once any of them is engaged.",
    battlefieldTest: null,
  },
  {
    id: "take-cover",
    label: "Take Cover",
    description: "The character takes Cover status for Firefights (all shots to and from the character hit only on a natural 6) until they take a Move Up action or enter a Brawl. If an Enemy with a Brawling weapon engages a Cover character, it is resolved as a normal Brawl (any weapon may be used) and the Cover character cannot fire.",
    battlefieldTest: {
      target: 6,
      modifiers: [
        { condition: "Currently at a Location", bonus: -1 },
      ],
    },
  },
  {
    id: "keep-distance",
    label: "Keep Distance",
    description: "The character can only be targeted this round by enemies whose weapon range exceeds 12\". If targeted, both sides may only use weapons with range over 12\".",
    battlefieldTest: {
      target: 6,
      modifiers: [
        { condition: "Move speed is 5\" or above", bonus: +1 },
      ],
    },
  },
];

export const NO_MINIS_INITIATIVE_ACTIONS_BY_ID = Object.fromEntries(
  NO_MINIS_INITIATIVE_ACTIONS.map((a) => [a.id, a])
);

export function makeInitiativeActionTable() {
  return {
    id: "no-minis-initiative-actions",
    title: "Initiative Actions",
    dice: null,
    sides: null,
    entries: NO_MINIS_INITIATIVE_ACTIONS.map((action, index) => ({
      min: index + 1,
      max: index + 1,
      label: action.label,
      value: action.id,
      text: action.description,
      battlefieldTest: action.battlefieldTest,
      notInRoundOne: action.notInRoundOne || false,
      scenarioDependent: action.scenarioDependent || false,
      extraRoll: action.extraRoll || null,
    })),
  };
}
