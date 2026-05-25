import { rollD100, findByRoll } from "./tableUtils";

export const CLASS_TABLE = [
  { rollMin: 1, rollMax: 5, name: "Working Class", statModifiers: { savvy: 1, luck: 1 }, resources: [], startingRolls: [] },
  { rollMin: 6, rollMax: 9, name: "Technician", statModifiers: { savvy: 1 }, resources: [], startingRolls: [{ type: "gear", count: 1, label: "+1 Gear" }] },
  { rollMin: 10, rollMax: 13, name: "Scientist", statModifiers: { savvy: 1 }, resources: [], startingRolls: [{ type: "gadget", count: 1, label: "+1 Gadget" }] },
  { rollMin: 14, rollMax: 17, name: "Hacker", statModifiers: { savvy: 1 }, resources: [{ type: "rival", count: 1 }], startingRolls: [] },
  { rollMin: 18, rollMax: 22, name: "Soldier", statModifiers: { combatSkill: 1 }, resources: [{ type: "credits", amount: "1D6" }], startingRolls: [] },
  { rollMin: 23, rollMax: 27, name: "Mercenary", statModifiers: { combatSkill: 1 }, resources: [], startingRolls: [{ type: "militaryWeapon", count: 1, label: "+1 Military Weapon" }] },
  { rollMin: 28, rollMax: 32, name: "Agitator", statModifiers: {}, resources: [{ type: "rival", count: 1 }], startingRolls: [] },
  { rollMin: 33, rollMax: 36, name: "Primitive", statModifiers: { speed: 1 }, resources: [], startingRolls: [{ type: "lowTechWeapon", count: 1, label: "+1 Low-tech Weapon" }] },
  { rollMin: 37, rollMax: 40, name: "Artist", statModifiers: {}, resources: [{ type: "credits", amount: "1D6" }], startingRolls: [] },
  { rollMin: 41, rollMax: 44, name: "Negotiator", statModifiers: {}, resources: [{ type: "patron", count: 1 }, { type: "storyPoint", count: 1 }], startingRolls: [] },
  { rollMin: 45, rollMax: 49, name: "Trader", statModifiers: {}, resources: [{ type: "credits", amount: "2D6" }], startingRolls: [] },
  { rollMin: 50, rollMax: 54, name: "Starship Crew", statModifiers: { savvy: 1 }, resources: [], startingRolls: [] },
  { rollMin: 55, rollMax: 58, name: "Petty Criminal", statModifiers: { speed: 1 }, resources: [], startingRolls: [] },
  { rollMin: 59, rollMax: 63, name: "Ganger", statModifiers: { reactions: 1 }, resources: [], startingRolls: [{ type: "lowTechWeapon", count: 1, label: "+1 Low-tech Weapon" }] },
  { rollMin: 64, rollMax: 67, name: "Scoundrel", statModifiers: { speed: 1 }, resources: [], startingRolls: [] },
  { rollMin: 68, rollMax: 71, name: "Enforcer", statModifiers: { combatSkill: 1 }, resources: [{ type: "patron", count: 1 }], startingRolls: [] },
  { rollMin: 72, rollMax: 75, name: "Special Agent", statModifiers: { reactions: 1 }, resources: [{ type: "patron", count: 1 }], startingRolls: [{ type: "gadget", count: 1, label: "+1 Gadget" }] },
  { rollMin: 76, rollMax: 79, name: "Troubleshooter", statModifiers: { reactions: 1 }, resources: [], startingRolls: [{ type: "lowTechWeapon", count: 1, label: "+1 Low-tech Weapon" }] },
  { rollMin: 80, rollMax: 83, name: "Bounty Hunter", statModifiers: { speed: 1 }, resources: [{ type: "rumor", count: 1 }], startingRolls: [{ type: "lowTechWeapon", count: 1, label: "+1 Low-tech Weapon" }] },
  { rollMin: 84, rollMax: 88, name: "Nomad", statModifiers: {}, resources: [], startingRolls: [{ type: "gear", count: 1, label: "+1 Gear" }] },
  { rollMin: 89, rollMax: 92, name: "Explorer", statModifiers: {}, resources: [{ type: "xp", count: 2 }], startingRolls: [{ type: "gear", count: 1, label: "+1 Gear" }] },
  { rollMin: 93, rollMax: 96, name: "Punk", statModifiers: {}, resources: [{ type: "xp", count: 2 }, { type: "rival", count: 1 }], startingRolls: [] },
  { rollMin: 97, rollMax: 100, name: "Scavenger", statModifiers: {}, resources: [{ type: "rumor", count: 1 }], startingRolls: [{ type: "highTechWeapon", count: 1, label: "+1 High-tech Weapon" }] },
];

export function rollClass() { const roll = rollD100(); return { roll, result: findByRoll(CLASS_TABLE, roll) }; }
