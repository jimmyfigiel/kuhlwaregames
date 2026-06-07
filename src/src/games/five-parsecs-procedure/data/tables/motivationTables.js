import { rollD100, findByRoll } from "./tableUtils";

export const MOTIVATION_TABLE = [
  { rollMin: 1, rollMax: 8, name: "Wealth", statModifiers: {}, resources: [{ type: "credits", amount: "1D6" }], startingRolls: [] },
  { rollMin: 9, rollMax: 14, name: "Fame", statModifiers: {}, resources: [{ type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 15, rollMax: 19, name: "Glory", statModifiers: { combatSkill: 1 }, resources: [], startingRolls: [{ type: "militaryWeapon", count: 1, label: "+1 Military Weapon" }] },
  { rollMin: 20, rollMax: 26, name: "Survival", statModifiers: { toughness: 1 }, resources: [], startingRolls: [] },
  { rollMin: 27, rollMax: 32, name: "Escape", statModifiers: { speed: 1 }, resources: [], startingRolls: [] },
  { rollMin: 33, rollMax: 39, name: "Adventure", statModifiers: {}, resources: [{ type: "credits", amount: "1D6" }], startingRolls: [{ type: "lowTechWeapon", count: 1, label: "+1 Low-tech Weapon" }] },
  { rollMin: 40, rollMax: 44, name: "Truth", statModifiers: {}, resources: [{ type: "rumor", count: 1 }, { type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 45, rollMax: 49, name: "Technology", statModifiers: { savvy: 1 }, resources: [], startingRolls: [{ type: "gadget", count: 1, label: "+1 Gadget" }] },
  { rollMin: 50, rollMax: 56, name: "Discovery", statModifiers: { savvy: 1 }, resources: [], startingRolls: [{ type: "gear", count: 1, label: "+1 Gear" }] },
  { rollMin: 57, rollMax: 63, name: "Loyalty", statModifiers: {}, resources: [{ type: "patron", count: 1 }, { type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 64, rollMax: 69, name: "Revenge", statModifiers: {}, resources: [{ type: "xp", count: 2 }, { type: "rival", count: 1 }], startingRolls: [] },
  { rollMin: 70, rollMax: 74, name: "Romance", statModifiers: {}, resources: [{ type: "rumor", count: 1 }, { type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 75, rollMax: 79, name: "Faith", statModifiers: {}, resources: [{ type: "rumor", count: 1 }, { type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 80, rollMax: 84, name: "Political", statModifiers: {}, resources: [{ type: "patron", count: 1 }, { type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 85, rollMax: 90, name: "Power", statModifiers: {}, resources: [{ type: "xp", count: 2 }, { type: "rival", count: 1 }], startingRolls: [] },
  { rollMin: 91, rollMax: 95, name: "Order", statModifiers: {}, resources: [{ type: "patron", count: 1 }, { type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 96, rollMax: 100, name: "Freedom", statModifiers: {}, resources: [{ type: "xp", count: 2 }], startingRolls: [] },
];

export function rollMotivation() { const roll = rollD100(); return { roll, result: findByRoll(MOTIVATION_TABLE, roll) }; }
