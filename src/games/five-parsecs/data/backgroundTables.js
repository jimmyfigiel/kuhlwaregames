import { rollD100, findByRoll } from "./tableUtils";

export const BACKGROUND_TABLE = [
  { rollMin: 1, rollMax: 4, name: "Peaceful, High-Tech Colony", statModifiers: { savvy: 1 }, resources: [{ type: "credits", amount: "1D6" }], startingRolls: [] },
  { rollMin: 5, rollMax: 9, name: "Giant, Overcrowded, Dystopian City", statModifiers: { speed: 1 }, resources: [], startingRolls: [] },
  { rollMin: 10, rollMax: 13, name: "Low-Tech Colony", statModifiers: {}, resources: [], startingRolls: [{ type: "lowTechWeapon", count: 1, label: "+1 Low-tech Weapon" }] },
  { rollMin: 14, rollMax: 17, name: "Mining Colony", statModifiers: { toughness: 1 }, resources: [], startingRolls: [] },
  { rollMin: 18, rollMax: 21, name: "Military Brat", statModifiers: { combatSkill: 1 }, resources: [], startingRolls: [] },
  { rollMin: 22, rollMax: 25, name: "Space Station", statModifiers: {}, resources: [], startingRolls: [{ type: "gear", count: 1, label: "+1 Gear" }] },
  { rollMin: 26, rollMax: 29, name: "Military Outpost", statModifiers: { reactions: 1 }, resources: [], startingRolls: [] },
  { rollMin: 30, rollMax: 34, name: "Drifter", statModifiers: {}, resources: [], startingRolls: [{ type: "gear", count: 1, label: "+1 Gear" }] },
  { rollMin: 35, rollMax: 39, name: "Lower Megacity Class", statModifiers: {}, resources: [], startingRolls: [{ type: "lowTechWeapon", count: 1, label: "+1 Low-tech Weapon" }] },
  { rollMin: 40, rollMax: 42, name: "Wealthy Merchant Family", statModifiers: {}, resources: [{ type: "credits", amount: "2D6" }], startingRolls: [] },
  { rollMin: 43, rollMax: 46, name: "Frontier Gang", statModifiers: { combatSkill: 1 }, resources: [], startingRolls: [] },
  { rollMin: 47, rollMax: 49, name: "Religious Cult", statModifiers: {}, resources: [{ type: "patron", count: 1 }, { type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 50, rollMax: 52, name: "War-Torn Hell-Hole", statModifiers: { reactions: 1 }, resources: [], startingRolls: [{ type: "militaryWeapon", count: 1, label: "+1 Military Weapon" }] },
  { rollMin: 53, rollMax: 55, name: "Tech Guild", statModifiers: { savvy: 1 }, resources: [{ type: "credits", amount: "1D6" }], startingRolls: [{ type: "highTechWeapon", count: 1, label: "+1 High-tech Weapon" }] },
  { rollMin: 56, rollMax: 59, name: "Subjugated Colony on Alien World", statModifiers: {}, resources: [], startingRolls: [{ type: "gadget", count: 1, label: "+1 Gadget" }] },
  { rollMin: 60, rollMax: 64, name: "Long-Term Space Mission", statModifiers: { savvy: 1 }, resources: [], startingRolls: [] },
  { rollMin: 65, rollMax: 68, name: "Research Outpost", statModifiers: { savvy: 1 }, resources: [], startingRolls: [{ type: "gadget", count: 1, label: "+1 Gadget" }] },
  { rollMin: 69, rollMax: 72, name: "Primitive or Regressed World", statModifiers: { toughness: 1 }, resources: [], startingRolls: [{ type: "lowTechWeapon", count: 1, label: "+1 Low-tech Weapon" }] },
  { rollMin: 73, rollMax: 76, name: "Orphan Utility Program", statModifiers: {}, resources: [{ type: "patron", count: 1 }, { type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 77, rollMax: 80, name: "Isolationist Enclave", statModifiers: {}, resources: [{ type: "questRumor", count: 2 }], startingRolls: [] },
  { rollMin: 81, rollMax: 84, name: "Comfortable Megacity Class", statModifiers: {}, resources: [{ type: "credits", amount: "1D6" }], startingRolls: [] },
  { rollMin: 85, rollMax: 89, name: "Industrial World", statModifiers: {}, resources: [], startingRolls: [{ type: "gear", count: 1, label: "+1 Gear" }] },
  { rollMin: 90, rollMax: 93, name: "Bureaucrat", statModifiers: {}, resources: [{ type: "credits", amount: "1D6" }], startingRolls: [] },
  { rollMin: 94, rollMax: 97, name: "Wasteland Nomads", statModifiers: { reactions: 1 }, resources: [], startingRolls: [{ type: "lowTechWeapon", count: 1, label: "+1 Low-tech Weapon" }] },
  { rollMin: 98, rollMax: 100, name: "Alien Culture", statModifiers: {}, resources: [], startingRolls: [{ type: "highTechWeapon", count: 1, label: "+1 High-tech Weapon" }] },
];

export function rollBackground() { const roll = rollD100(); return { roll, result: findByRoll(BACKGROUND_TABLE, roll) }; }
