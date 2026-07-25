// Shared core combat math (5PFH Rulebook p.44-47: To Hit, Resolving Hits, Brawling, Saving
// Throws, Luck), reused by No-Minis Firefight resolution.

import { WEAPONS_TABLE } from "../data/equipment/equipmentCatalog";
import { rollDie } from "./postBattleHelpers";

export function findWeaponData(name) {
  const target = String(name || "").trim().toLowerCase();
  return WEAPONS_TABLE.find((w) => w.name.toLowerCase() === target) || null;
}

export function isMeleeOnly(weaponName) {
  const data = findWeaponData(weaponName);
  return !data || data.range === "Brawl";
}

export function parseRangeInches(weaponName) {
  const data = findWeaponData(weaponName);
  if (!data || data.range === "Brawl" || !data.range) return 0;
  const match = String(data.range).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function getCrewWeapons(state, crewMemberId) {
  const equipment = state?.crewLog?.crewDetails?.[crewMemberId]?.equipment || [];
  return equipment.filter((item) => item.category === "weapon" && !item.damaged && !item.destroyed).map((item) => item.name);
}

export function pickBestRangedWeapon(weaponNames) {
  const ranged = weaponNames.filter((name) => !isMeleeOnly(name));
  if (ranged.length === 0) return null;
  return ranged.reduce((best, name) => (parseRangeInches(name) > parseRangeInches(best) ? name : best), ranged[0]);
}

export function pickBestMeleeWeapon(weaponNames) {
  const melee = weaponNames.filter((name) => {
    const data = findWeaponData(name);
    return data && (data.range === "Brawl" || (data.traits || []).includes("Pistol"));
  });
  if (melee.length === 0) return null;
  return melee.reduce((best, name) => {
    const bestData = findWeaponData(best);
    const data = findWeaponData(name);
    return Number(data?.damage || 0) > Number(bestData?.damage || 0) ? name : best;
  }, melee[0]);
}

// To Hit: 1D6 + Combat Skill vs target number. Returns { roll, total, hit }.
export function resolveToHit({ combatSkill = 0, targetNumber = 6 }) {
  const roll = rollDie(6);
  const total = roll + Number(combatSkill || 0);
  return { roll, total, hit: total >= targetNumber };
}

// Resolving a Hit: 1D6 + Damage vs Toughness (or natural 6). Saving Throw and Luck applied
// after. Returns { roll, total, wouldBeCasualty, savedByArmor, savedByLuck, casualty, stunned }.
export function resolveDamage({ damage = 0, toughness = 3, saveThrow = null, piercing = false, luck = 0 }) {
  const roll = rollDie(6);
  const total = roll + Number(damage || 0);
  const wouldBeCasualty = roll === 6 || total >= Number(toughness || 0);

  if (!wouldBeCasualty) {
    return { roll, total, wouldBeCasualty: false, savedByArmor: false, savedByLuck: false, casualty: false, stunned: true };
  }

  let savedByArmor = false;
  if (saveThrow && !piercing) {
    const saveRoll = rollDie(6);
    savedByArmor = saveRoll >= saveThrow;
  }

  if (savedByArmor) {
    return { roll, total, wouldBeCasualty: true, savedByArmor: true, savedByLuck: false, casualty: false, stunned: true };
  }

  if (luck > 0) {
    return { roll, total, wouldBeCasualty: true, savedByArmor: false, savedByLuck: true, casualty: false, stunned: false };
  }

  return { roll, total, wouldBeCasualty: true, savedByArmor: false, savedByLuck: false, casualty: true, stunned: false };
}

// Brawling: 1D6 + Combat Skill (+2 Melee weapon / +1 Pistol), natural 6 = bonus Hit on
// opponent, natural 1 = opponent gets a bonus Hit. Loser takes a Hit (or both, on a draw).
export function resolveBrawl({ aCombatSkill = 0, aWeaponBonus = 0, bCombatSkill = 0, bWeaponBonus = 0 }) {
  const aRoll = rollDie(6);
  const bRoll = rollDie(6);
  const aTotal = aRoll + Number(aCombatSkill || 0) + aWeaponBonus;
  const bTotal = bRoll + Number(bCombatSkill || 0) + bWeaponBonus;

  const aHitsB = aRoll === 6 || bRoll === 1 || aTotal > bTotal;
  const bHitsA = bRoll === 6 || aRoll === 1 || bTotal > aTotal || aTotal === bTotal;

  return { aRoll, bRoll, aTotal, bTotal, aHitsB, bHitsA };
}

export function getWeaponDamage(weaponName) {
  const data = findWeaponData(weaponName);
  return Number(data?.damage || 0);
}

export function weaponHasTrait(weaponName, trait) {
  const data = findWeaponData(weaponName);
  return Boolean(data?.traits?.includes(trait));
}

export function weaponBonusForBrawl(weaponName) {
  const data = findWeaponData(weaponName);
  if (!data) return 0;
  if (data.range === "Brawl") return 2;
  if ((data.traits || []).includes("Pistol")) return 1;
  return 0;
}
