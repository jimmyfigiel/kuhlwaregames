import {
  WEAPONS_TABLE,
  GUN_MODS_TABLE,
  GUN_SIGHTS_TABLE,
  CONSUMABLES_TABLE,
  PROTECTION_TABLE,
  IMPLANTS_TABLE,
  UTILITY_DEVICES_TABLE,
  ONBOARD_ITEMS_TABLE,
} from "../equipment/equipmentCatalog.js";
import { rollD100, findByRoll } from "./tableUtils.js";

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

const WEAPON_ALIASES = {
  handgun: "hand gun",
  duelingpistol: "duelling pistol",
  brutalmeleeweapon: "brutal melee weapon",
  marksmanrifle: "marksman’s rifle",
};

function findCatalogItemByName(tables, name) {
  const wanted = normalizeName(WEAPON_ALIASES[normalizeName(name)] || name);
  return tables.flat().find((item) => normalizeName(item.name) === wanted) || null;
}

export const STARTING_EQUIPMENT_RULES = {
  title: "Starting Equipment",
  description: "Equipment includes weapons, gear, and gadgets. Any equipment obtained from these tables can be issued and distributed to characters as desired.",
  baseRolls: [
    { tableId: "militaryWeapon", count: 3, label: "3 rolls on the Military Weapon Table", notes: "For each crew member who rolled at least one Savvy increase, one Military Weapon roll may be taken on the High-tech Weapon Table instead." },
    { tableId: "lowTechWeapon", count: 3, label: "3 rolls on the Low-tech Weapon Table", notes: "" },
    { tableId: "gear", count: 1, label: "1 roll on the Gear Table", notes: "" },
    { tableId: "gadget", count: 1, label: "1 roll on the Gadget Table", notes: "" },
  ],
  credits: { basePerCrewMember: 1, recruitedLaterBonus: 1 },
};

export const LOW_TECH_WEAPON_TABLE = [
  { rollMin: 1, rollMax: 15, name: "Handgun" },
  { rollMin: 16, rollMax: 35, name: "Scrap Pistol" },
  { rollMin: 36, rollMax: 40, name: "Machine Pistol" },
  { rollMin: 41, rollMax: 65, name: "Colony Rifle" },
  { rollMin: 66, rollMax: 75, name: "Shotgun" },
  { rollMin: 76, rollMax: 80, name: "Hunting Rifle" },
  { rollMin: 81, rollMax: 95, name: "Blade" },
  { rollMin: 96, rollMax: 100, name: "Brutal Melee Weapon" },
];

export const MILITARY_WEAPON_TABLE = [
  { rollMin: 1, rollMax: 25, name: "Military Rifle" },
  { rollMin: 26, rollMax: 45, name: "Infantry Laser" },
  { rollMin: 46, rollMax: 50, name: "Marksman’s Rifle" },
  { rollMin: 51, rollMax: 60, name: "Needle Rifle" },
  { rollMin: 61, rollMax: 75, name: "Auto Rifle" },
  { rollMin: 76, rollMax: 80, name: "Rattle Gun" },
  { rollMin: 81, rollMax: 95, name: "Boarding Saber" },
  { rollMin: 96, rollMax: 100, name: "Shatter Axe" },
];

export const HIGH_TECH_WEAPON_TABLE = [
  { rollMin: 1, rollMax: 5, name: "Dueling Pistol" },
  { rollMin: 6, rollMax: 15, name: "Hand Cannon" },
  { rollMin: 16, rollMax: 30, name: "Hand Laser" },
  { rollMin: 31, rollMax: 45, name: "Beam Pistol" },
  { rollMin: 46, rollMax: 55, name: "Infantry Laser" },
  { rollMin: 56, rollMax: 70, name: "Blast Pistol" },
  { rollMin: 71, rollMax: 80, name: "Blast Rifle" },
  { rollMin: 81, rollMax: 85, name: "Plasma Rifle" },
  { rollMin: 86, rollMax: 100, name: "Glare Sword" },
];

export const GEAR_TABLE = [
  { rollMin: 1, rollMax: 4, name: "Assault Blade" },
  { rollMin: 5, rollMax: 10, name: "Beam Light" },
  { rollMin: 11, rollMax: 15, name: "Bipod" },
  { rollMin: 16, rollMax: 20, name: "Booster Pills" },
  { rollMin: 21, rollMax: 24, name: "Camo Cloak" },
  { rollMin: 25, rollMax: 28, name: "Combat Armor" },
  { rollMin: 29, rollMax: 33, name: "Communicator" },
  { rollMin: 34, rollMax: 37, name: "Concealed Blade" },
  { rollMin: 38, rollMax: 42, name: "Fake ID" },
  { rollMin: 43, rollMax: 46, name: "Fixer" },
  { rollMin: 47, rollMax: 52, name: "Frag Vest" },
  { rollMin: 53, rollMax: 57, name: "Grapple Launcher" },
  { rollMin: 58, rollMax: 61, name: "Hazard Suit" },
  { rollMin: 62, rollMax: 65, name: "Laser Sight" },
  { rollMin: 66, rollMax: 69, name: "Loaded Dice" },
  { rollMin: 70, rollMax: 75, name: "Med-patch" },
  { rollMin: 76, rollMax: 81, name: "Nano-doc" },
  { rollMin: 82, rollMax: 85, name: "Purifier" },
  { rollMin: 86, rollMax: 89, name: "Scanner Bot" },
  { rollMin: 90, rollMax: 92, name: "Sector Permit" },
  { rollMin: 93, rollMax: 96, name: "Steel Boots" },
  { rollMin: 97, rollMax: 100, name: "Tracker Sight" },
];

export const GADGET_TABLE = [
  { rollMin: 1, rollMax: 4, name: "AI Companion" },
  { rollMin: 5, rollMax: 9, name: "Analyzer" },
  { rollMin: 10, rollMax: 13, name: "Battle Visor" },
  { rollMin: 14, rollMax: 17, name: "Boosted Arm" },
  { rollMin: 18, rollMax: 21, name: "Boosted Leg" },
  { rollMin: 22, rollMax: 24, name: "Cyber Hand" },
  { rollMin: 25, rollMax: 27, name: "Displacer" },
  { rollMin: 28, rollMax: 31, name: "Distraction Bot" },
  { rollMin: 32, rollMax: 36, name: "Duplicator" },
  { rollMin: 37, rollMax: 41, name: "Insta-Wall" },
  { rollMin: 42, rollMax: 46, name: "Jump Belt" },
  { rollMin: 47, rollMax: 50, name: "Nerve Adjuster" },
  { rollMin: 51, rollMax: 55, name: "Repair Bot" },
  { rollMin: 56, rollMax: 60, name: "Scanner Bot" },
  { rollMin: 61, rollMax: 65, name: "Screen Generator" },
  { rollMin: 66, rollMax: 69, name: "Seeker Sight" },
  { rollMin: 70, rollMax: 73, name: "Shock Attachment" },
  { rollMin: 74, rollMax: 79, name: "Snooper Bot" },
  { rollMin: 80, rollMax: 83, name: "Sonic Emitter" },
  { rollMin: 84, rollMax: 89, name: "Stabilizer" },
  { rollMin: 90, rollMax: 93, name: "Stealth Gear" },
  { rollMin: 94, rollMax: 100, name: "Stim-pack" },
];

export const WEAPON_ROLL_TABLES = [
  { id: "lowTechWeapon", title: "Low-tech Weapon Table", dice: "D100", rows: LOW_TECH_WEAPON_TABLE },
  { id: "militaryWeapon", title: "Military Weapon Table", dice: "D100", rows: MILITARY_WEAPON_TABLE },
  { id: "highTechWeapon", title: "High-tech Weapon Table", dice: "D100", rows: HIGH_TECH_WEAPON_TABLE },
];

export const EQUIPMENT_ROLL_TABLES = [
  ...WEAPON_ROLL_TABLES,
  { id: "gear", title: "Gear Table", dice: "D100", rows: GEAR_TABLE },
  { id: "gadget", title: "Gadget Table", dice: "D100", rows: GADGET_TABLE },
];

export const EQUIPMENT_ROLL_TABLES_BY_ID = EQUIPMENT_ROLL_TABLES.reduce((lookup, table) => {
  lookup[table.id] = table;
  return lookup;
}, {});

export function rollOnEquipmentTable(tableId) {
  const table = EQUIPMENT_ROLL_TABLES_BY_ID[tableId];
  if (!table) return { tableId, tableTitle: "", roll: null, result: null, error: `Unknown table: ${tableId}` };
  const roll = rollD100();
  return { tableId, tableTitle: table.title, roll, result: findByRoll(table.rows, roll), error: "" };
}

export function getCatalogItemForEquipmentRoll(rollResult) {
  const name = rollResult?.result?.name || "";
  if (!name) return null;

  if (["lowTechWeapon", "militaryWeapon", "highTechWeapon"].includes(rollResult.tableId)) {
    return { kind: "weapon", item: findCatalogItemByName([WEAPONS_TABLE], name) };
  }

  return {
    kind: "gear",
    item: findCatalogItemByName([GUN_MODS_TABLE, GUN_SIGHTS_TABLE, CONSUMABLES_TABLE, PROTECTION_TABLE, IMPLANTS_TABLE, UTILITY_DEVICES_TABLE, ONBOARD_ITEMS_TABLE], name),
  };
}

export function createEquipmentRecordFromEquipmentRoll({ rollResult, roomId, crewId, playerId, locationType = "stash", crewMemberId = "" }) {
  const catalog = getCatalogItemForEquipmentRoll(rollResult);
  const item = catalog?.item;
  const timestamp = nowIso();
  const name = item?.name || rollResult?.result?.name || "Unknown Equipment";
  const base = {
    equipmentId: makeId("equipment"),
    roomId,
    crewId,
    equipmentTemplateId: "",
    name,
    category: catalog?.kind === "weapon" ? "weapon" : "gear",
    subtype: rollResult?.tableTitle || "",
    quantity: 1,
    locationType,
    crewMemberId,
    damaged: false,
    destroyed: false,
    sourceTableId: rollResult?.tableId || "",
    sourceTableTitle: rollResult?.tableTitle || "",
    sourceRoll: rollResult?.roll || "",
    weapon: { range: "", shots: 0, damage: 0, traits: [], mods: [], sight: "" },
    armor: { armorValue: "", save: "", traits: [] },
    gear: { effect: item?.effect || "", uses: "", traits: [] },
    consumable: { singleUse: false, freeAction: false, carriedByCrew: true, usableFromStash: false, cannotUseSpecies: [], duplicateUseBenefit: true },
    implant: { permanent: false, removable: true, maxPerCharacter: 0, cannotUseSpecies: [] },
    utility: { maxPerCharacter: 0 },
    onboard: { carriedByCrew: true, usedFromShip: false, campaignTurnItem: false, singleUse: false, cannotUseSpecies: [] },
    notes: rollResult?.tableTitle ? `${rollResult.tableTitle} roll ${rollResult.roll}` : "",
    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };

  if (catalog?.kind === "weapon" && item) {
    return { ...base, weapon: { range: item.range, shots: item.shots, damage: item.damage, traits: [...(item.traits || [])], mods: [], sight: "" } };
  }

  if (item && PROTECTION_TABLE.includes(item)) {
    return { ...base, category: "protection", subtype: item.type || base.subtype, armor: { armorValue: item.save || "", save: item.save || "", traits: item.type ? [item.type] : [] } };
  }

  if (item && IMPLANTS_TABLE.includes(item)) {
    return { ...base, category: "implant", implant: { permanent: true, removable: false, maxPerCharacter: 2, cannotUseSpecies: ["Bot", "Soulless"] } };
  }

  if (item && UTILITY_DEVICES_TABLE.includes(item)) {
    return { ...base, category: "utility", subtype: "Utility Device", utility: { maxPerCharacter: 3 } };
  }

  if (item && ONBOARD_ITEMS_TABLE.includes(item)) {
    return { ...base, category: "onboard", subtype: "On-board Item", onboard: { carriedByCrew: false, usedFromShip: true, campaignTurnItem: true, singleUse: Boolean(item.singleUse), cannotUseSpecies: [...(item.cannotUseSpecies || [])] } };
  }

  if (item && GUN_MODS_TABLE.includes(item)) return { ...base, category: "gear", subtype: "Gun Mod" };
  if (item && GUN_SIGHTS_TABLE.includes(item)) return { ...base, category: "gear", subtype: "Gun Sight" };
  if (item && CONSUMABLES_TABLE.includes(item)) return { ...base, category: "consumable", consumable: { ...base.consumable, singleUse: true, freeAction: true, usableFromStash: true } };

  return base;
}
