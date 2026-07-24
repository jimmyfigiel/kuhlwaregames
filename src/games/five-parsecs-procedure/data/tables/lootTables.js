// Core rulebook Loot Table tree (5PFH Rulebook p.131-134), transcribed verbatim.
// Leaf items resolve against the existing equipment catalog (data/equipment/equipmentCatalog.js)
// by name — this file only adds the D100 roll ranges from the rulebook, it does not duplicate item data.

import {
  WEAPONS_TABLE,
  GUN_MODS_TABLE,
  GUN_SIGHTS_TABLE,
  CONSUMABLES_TABLE,
  PROTECTION_TABLE,
  IMPLANTS_TABLE,
  UTILITY_DEVICES_TABLE,
  ONBOARD_ITEMS_TABLE,
  catalogItemToEquipment,
} from "../equipment/equipmentCatalog";

function findByNameCI(list, name) {
  const target = String(name || "").trim().toLowerCase();
  return (list || []).find((item) => String(item.name || "").trim().toLowerCase() === target) || null;
}

// ─── leaf weapon subtables ──────────────────────────────────────────────────

export const SLUG_WEAPONS_SUBTABLE = {
  id: "slugWeapons",
  label: "Slug Weapons Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 5, title: "Hold Out Pistol", resultType: "item:weapons" },
    { min: 6, max: 13, title: "Hand Gun", resultType: "item:weapons" },
    { min: 14, max: 18, title: "Scrap Pistol", resultType: "item:weapons" },
    { min: 19, max: 26, title: "Machine Pistol", resultType: "item:weapons" },
    { min: 27, max: 32, title: "Duelling Pistol", resultType: "item:weapons" },
    { min: 33, max: 37, title: "Hand Cannon", resultType: "item:weapons" },
    { min: 38, max: 46, title: "Colony Rifle", resultType: "item:weapons" },
    { min: 47, max: 56, title: "Military Rifle", resultType: "item:weapons" },
    { min: 57, max: 65, title: "Shotgun", resultType: "item:weapons" },
    { min: 66, max: 70, title: "Flak Gun", resultType: "item:weapons" },
    { min: 71, max: 78, title: "Hunting Rifle", resultType: "item:weapons" },
    { min: 79, max: 83, title: "Marksman's Rifle", resultType: "item:weapons" },
    { min: 84, max: 92, title: "Auto Rifle", resultType: "item:weapons" },
    { min: 93, max: 100, title: "Rattle Gun", resultType: "item:weapons" },
  ],
};

export const ENERGY_WEAPONS_SUBTABLE = {
  id: "energyWeapons",
  label: "Energy Weapons Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 20, title: "Hand Laser", resultType: "item:weapons" },
    { min: 21, max: 35, title: "Beam Pistol", resultType: "item:weapons" },
    { min: 36, max: 55, title: "Infantry Laser", resultType: "item:weapons" },
    { min: 56, max: 70, title: "Blast Pistol", resultType: "item:weapons" },
    { min: 71, max: 90, title: "Blast Rifle", resultType: "item:weapons" },
    { min: 91, max: 100, title: "Hyper Blaster", resultType: "item:weapons" },
  ],
};

export const SPECIAL_WEAPONS_SUBTABLE = {
  id: "specialWeapons",
  label: "Special Weapons Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 20, title: "Needle Rifle", resultType: "item:weapons" },
    { min: 21, max: 45, title: "Plasma Rifle", resultType: "item:weapons" },
    { min: 46, max: 60, title: "Fury Rifle", resultType: "item:weapons" },
    { min: 61, max: 75, title: "Shell Gun", resultType: "item:weapons" },
    { min: 76, max: 90, title: "Cling Fire Pistol", resultType: "item:weapons" },
    { min: 91, max: 100, title: "Hand Flamer", resultType: "item:weapons" },
  ],
};

export const MELEE_WEAPONS_SUBTABLE = {
  id: "meleeWeapons",
  label: "Melee Weapons Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 20, title: "Blade", resultType: "item:weapons" },
    { min: 21, max: 40, title: "Brutal Melee Weapon", resultType: "item:weapons" },
    { min: 41, max: 55, title: "Boarding Saber", resultType: "item:weapons" },
    { min: 56, max: 75, title: "Ripper Sword", resultType: "item:weapons" },
    { min: 76, max: 85, title: "Shatter Axe", resultType: "item:weapons" },
    { min: 86, max: 90, title: "Power Claw", resultType: "item:weapons" },
    { min: 91, max: 95, title: "Glare Sword", resultType: "item:weapons" },
    { min: 96, max: 100, title: "Suppression Maul", resultType: "item:weapons" },
  ],
};

export const GRENADES_SUBTABLE = {
  id: "grenades",
  label: "Grenades Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 60, title: "Frakk Grenade", resultType: "item:weapons", quantity: 3, itemName: "Frakk grenade" },
    { min: 61, max: 100, title: "Dazzle Grenade", resultType: "item:weapons", quantity: 3, itemName: "Dazzle grenade" },
  ],
};

export const WEAPON_CATEGORY_SUBTABLE = {
  id: "weaponCategory",
  label: "Weapon Category Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 35, title: "Slug Weapons", resultType: "nextTable:slugWeapons" },
    { min: 36, max: 50, title: "Energy Weapons", resultType: "nextTable:energyWeapons" },
    { min: 51, max: 65, title: "Special Weapons", resultType: "nextTable:specialWeapons" },
    { min: 66, max: 85, title: "Melee Weapons", resultType: "nextTable:meleeWeapons" },
    { min: 86, max: 100, title: "Grenades", resultType: "nextTable:grenades" },
  ],
};

// ─── leaf gear subtables ────────────────────────────────────────────────────

export const GUN_MODS_SUBTABLE = {
  id: "gunMods",
  label: "Gun Mods Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 10, title: "Assault Blade", resultType: "gunMod" },
    { min: 11, max: 20, title: "Beam Light", resultType: "gunMod" },
    { min: 21, max: 35, title: "Bipod", resultType: "gunMod" },
    { min: 36, max: 55, title: "Hot Shot Pack", resultType: "gunMod" },
    { min: 56, max: 65, title: "Cyber-configurable Nano-sludge", resultType: "gunMod" },
    { min: 66, max: 80, title: "Stabilizer", resultType: "gunMod" },
    { min: 81, max: 90, title: "Shock Attachment", resultType: "gunMod" },
    { min: 91, max: 100, title: "Upgrade Kit", resultType: "gunMod" },
  ],
};

export const GUN_SIGHTS_SUBTABLE = {
  id: "gunSights",
  label: "Gun Sights Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 20, title: "Laser Sight", resultType: "gunSight" },
    { min: 21, max: 45, title: "Quality Sight", resultType: "gunSight" },
    { min: 46, max: 70, title: "Seeker Sight", resultType: "gunSight" },
    { min: 71, max: 85, title: "Tracker Sight", resultType: "gunSight" },
    { min: 86, max: 100, title: "Unity Battle Sight", resultType: "gunSight" },
  ],
};

export const PROTECTIVE_ITEMS_SUBTABLE = {
  id: "protectiveItems",
  label: "Protective Items Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 5, title: "Battle Dress", resultType: "item:protection" },
    { min: 6, max: 15, title: "Camo Cloak", resultType: "item:protection" },
    { min: 16, max: 40, title: "Combat Armor", resultType: "item:protection" },
    { min: 41, max: 50, title: "Deflector Field", resultType: "item:protection" },
    { min: 51, max: 65, title: "Flak Screen", resultType: "item:protection" },
    { min: 66, max: 75, title: "Flex-Armor", resultType: "item:protection" },
    { min: 76, max: 90, title: "Frag Vest", resultType: "item:protection" },
    { min: 91, max: 95, title: "Screen Generator", resultType: "item:protection" },
    { min: 96, max: 100, title: "Stealth Gear", resultType: "item:protection" },
  ],
};

export const UTILITY_ITEMS_SUBTABLE = {
  id: "utilityItems",
  label: "Utility Items Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 6, title: "Auto Sensor", resultType: "item:utility" },
    { min: 7, max: 11, title: "Battle Visor", resultType: "item:utility" },
    { min: 12, max: 17, title: "Communicator", resultType: "item:utility" },
    { min: 18, max: 23, title: "Concealed Blade", resultType: "item:utility" },
    { min: 24, max: 29, title: "Displacer", resultType: "item:utility" },
    { min: 30, max: 34, title: "Distraction Bot", resultType: "item:utility" },
    { min: 35, max: 38, title: "Grapple Launcher", resultType: "item:utility" },
    { min: 39, max: 43, title: "Grav Dampener", resultType: "item:utility" },
    { min: 44, max: 49, title: "Hazard Suit", resultType: "item:utility" },
    { min: 50, max: 54, title: "Hover Board", resultType: "item:utility" },
    { min: 55, max: 57, title: "Insta-Wall", resultType: "item:utility" },
    { min: 58, max: 63, title: "Jump Belt", resultType: "item:utility" },
    { min: 64, max: 70, title: "Motion Tracker", resultType: "item:utility" },
    { min: 71, max: 75, title: "Multi-Cutter", resultType: "item:utility" },
    { min: 76, max: 79, title: "Robo-rabbit's Foot", resultType: "item:utility" },
    { min: 80, max: 84, title: "Scanner Bot", resultType: "item:utility" },
    { min: 85, max: 89, title: "Snooper Bot", resultType: "item:utility" },
    { min: 90, max: 93, title: "Sonic Emitter", resultType: "item:utility" },
    { min: 94, max: 96, title: "Steel Boots", resultType: "item:utility" },
    { min: 97, max: 100, title: "Time Distorter", resultType: "item:utility" },
  ],
};

export const GEAR_SUBTABLE = {
  id: "gear",
  label: "Gear Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 20, title: "Gun Mods", resultType: "nextTable:gunMods" },
    { min: 21, max: 40, title: "Gun Sights", resultType: "nextTable:gunSights" },
    { min: 41, max: 75, title: "Protective Items", resultType: "nextTable:protectiveItems" },
    { min: 76, max: 100, title: "Utility Items", resultType: "nextTable:utilityItems" },
  ],
};

// ─── leaf odds-and-ends subtables ───────────────────────────────────────────

export const CONSUMABLES_SUBTABLE = {
  id: "consumables",
  label: "Consumables Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 20, title: "Booster Pills", resultType: "item:consumables" },
    { min: 21, max: 30, title: "Combat Serum", resultType: "item:consumables" },
    { min: 31, max: 40, title: "Kiranin Crystals", resultType: "item:consumables" },
    { min: 41, max: 55, title: "Rage Out", resultType: "item:consumables" },
    { min: 56, max: 70, title: "Still", resultType: "item:consumables" },
    { min: 71, max: 100, title: "Stim-pack", resultType: "item:consumables" },
  ],
};

export const IMPLANTS_SUBTABLE = {
  id: "implants",
  label: "Implants Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 10, title: "AI Companion", resultType: "item:implants" },
    { min: 11, max: 16, title: "Body Wire", resultType: "item:implants" },
    { min: 17, max: 28, title: "Boosted Arm", resultType: "item:implants" },
    { min: 29, max: 40, title: "Boosted Leg", resultType: "item:implants" },
    { min: 41, max: 50, title: "Cyber Hand", resultType: "item:implants" },
    { min: 51, max: 61, title: "Genetic Defenses", resultType: "item:implants" },
    { min: 62, max: 71, title: "Health Boost", resultType: "item:implants" },
    { min: 72, max: 79, title: "Nerve Adjuster", resultType: "item:implants" },
    { min: 80, max: 85, title: "Neural Optimization", resultType: "item:implants" },
    { min: 86, max: 94, title: "Night Sight", resultType: "item:implants" },
    { min: 95, max: 100, title: "Pain Suppressor", resultType: "item:implants" },
  ],
};

export const SHIP_ITEMS_SUBTABLE = {
  id: "shipItems",
  label: "Ship Items Subtable",
  dice: "D100",
  rows: [
    { min: 1, max: 4, title: "Analyzer", resultType: "item:onboard" },
    { min: 5, max: 11, title: "Colonist Ration Packs", resultType: "item:onboard" },
    { min: 12, max: 17, title: "Duplicator", resultType: "item:onboard" },
    { min: 18, max: 24, title: "Fake ID", resultType: "item:onboard" },
    { min: 25, max: 31, title: "Fixer", resultType: "item:onboard" },
    { min: 32, max: 34, title: "Genetic Reconfiguration Kit", resultType: "item:onboard" },
    { min: 35, max: 39, title: "Loaded Dice", resultType: "item:onboard" },
    { min: 40, max: 44, title: "Lucky Dice", resultType: "item:onboard" },
    { min: 45, max: 48, title: "Mk II Translator", resultType: "item:onboard" },
    { min: 49, max: 56, title: "Med-patch", resultType: "item:onboard" },
    { min: 57, max: 60, title: "Meditation Orb", resultType: "item:onboard" },
    { min: 61, max: 67, title: "Nano-doc", resultType: "item:onboard" },
    { min: 68, max: 71, title: "Novelty Stuffed Animal", resultType: "item:onboard" },
    { min: 72, max: 74, title: "Purifier", resultType: "item:onboard" },
    { min: 75, max: 78, title: "Repair Bot", resultType: "item:onboard" },
    { min: 79, max: 83, title: "Sector Permit", resultType: "item:onboard" },
    { min: 84, max: 91, title: "Spare Parts", resultType: "item:onboard" },
    { min: 92, max: 96, title: "Teach-Bot", resultType: "item:onboard" },
    { min: 97, max: 100, title: "Transcender", resultType: "item:onboard" },
  ],
};

export const ODDS_AND_ENDS_SUBTABLE = {
  id: "oddsAndEnds",
  label: "Odds and Ends Table",
  dice: "D100",
  rows: [
    { min: 1, max: 55, title: "Consumables (2 uses)", resultType: "nextTable:consumables", uses: 2 },
    { min: 56, max: 70, title: "Implants", resultType: "nextTable:implants" },
    { min: 71, max: 100, title: "Ship Items", resultType: "nextTable:shipItems" },
  ],
};

// ─── rewards subtable (not equipment) ───────────────────────────────────────

export const REWARDS_SUBTABLE = {
  id: "rewards",
  label: "Rewards Table",
  dice: "D100",
  rows: [
    { min: 1, max: 10, title: "Documents", resultType: "reward:rumors", amount: 1, description: "1 Rumor." },
    { min: 11, max: 20, title: "Data Files", resultType: "reward:rumors", amount: 2, description: "2 Rumors." },
    { min: 21, max: 25, title: "Scrap", resultType: "reward:credits", amount: 3, description: "3 credits." },
    { min: 26, max: 40, title: "Cargo Crate", resultType: "reward:credits", amount: "1D6", description: "1D6 credits." },
    { min: 41, max: 55, title: "Valuable Materials", resultType: "reward:credits", amount: "1D6+2", description: "1D6+2 credits." },
    { min: 56, max: 70, title: "Rare Substance", resultType: "reward:creditsHigherOf2D6", description: "Roll 2D6. Receive credits equal to the highest die." },
    { min: 71, max: 85, title: "Ship Parts", resultType: "reward:shipDiscount", amount: "1D6", description: "Discount your next ship component purchase by 1D6 credits." },
    { min: 86, max: 90, title: "Military Ship Part", resultType: "reward:shipDiscount", amount: "1D6+2", description: "Discount your next ship component purchase by 1D6+2 credits." },
    { min: 91, max: 95, title: "Mysterious Items", resultType: "reward:storyPoints", amount: 2, description: "2 story points." },
    { min: 96, max: 100, title: "Personal Item", resultType: "reward:storyPoints", amount: 3, description: "3 story points." },
  ],
};

// ─── top-level loot table ───────────────────────────────────────────────────

export const LOOT_TABLE = {
  id: "loot",
  label: "Loot Table",
  dice: "D100",
  rulesPage: 131,
  rows: [
    { min: 1, max: 25, title: "Weapon", resultType: "nextTable:weaponCategory", description: "Roll once on the Weapons Category Subtable." },
    { min: 26, max: 35, title: "Damaged weapons", resultType: "doubleDamagedTable:weaponCategory", description: "Roll twice on the Weapons Category Subtable. Both items require Repair." },
    { min: 36, max: 45, title: "Damaged gear", resultType: "doubleDamagedTable:gear", description: "Roll twice on Gear Subtable. Both items require Repair." },
    { min: 46, max: 65, title: "Gear", resultType: "nextTable:gear", description: "Roll once on the Gear Subtable." },
    { min: 66, max: 80, title: "Odds and ends", resultType: "nextTable:oddsAndEnds", description: "Roll once on the Odds and Ends Subtable." },
    { min: 81, max: 100, title: "Rewards", resultType: "nextTable:rewards", description: "Roll once on the Rewards Subtable." },
  ],
};

// Registry so the command layer can walk the tree generically instead of
// hardcoding a branch per level — the Loot Table genuinely is recursive.
export const LOOT_TABLE_REGISTRY = {
  loot: LOOT_TABLE,
  weaponCategory: WEAPON_CATEGORY_SUBTABLE,
  slugWeapons: SLUG_WEAPONS_SUBTABLE,
  energyWeapons: ENERGY_WEAPONS_SUBTABLE,
  specialWeapons: SPECIAL_WEAPONS_SUBTABLE,
  meleeWeapons: MELEE_WEAPONS_SUBTABLE,
  grenades: GRENADES_SUBTABLE,
  gear: GEAR_SUBTABLE,
  gunMods: GUN_MODS_SUBTABLE,
  gunSights: GUN_SIGHTS_SUBTABLE,
  protectiveItems: PROTECTIVE_ITEMS_SUBTABLE,
  utilityItems: UTILITY_ITEMS_SUBTABLE,
  oddsAndEnds: ODDS_AND_ENDS_SUBTABLE,
  consumables: CONSUMABLES_SUBTABLE,
  implants: IMPLANTS_SUBTABLE,
  shipItems: SHIP_ITEMS_SUBTABLE,
  rewards: REWARDS_SUBTABLE,
};

const CATALOG_LOOKUP = {
  weapons: WEAPONS_TABLE,
  consumables: CONSUMABLES_TABLE,
  protection: PROTECTION_TABLE,
  implants: IMPLANTS_TABLE,
  utility: UTILITY_DEVICES_TABLE,
  onboard: ONBOARD_ITEMS_TABLE,
};

function blankGearRecord({ name, effect, damaged = false }) {
  return {
    equipmentId: `equipment-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    name,
    category: "gear",
    subtype: "Gun Attachment",
    quantity: 1,
    locationType: "stash",
    crewMemberId: "",
    damaged,
    destroyed: false,
    gear: { effect, uses: "", traits: ["Gun Attachment"] },
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

// Resolves a leaf loot row into a stash-ready equipment record (or null for non-equipment rewards).
export function resolveLootLeafItem({ row, damaged = false }) {
  if (!row) return null;

  if (row.resultType === "gunMod") {
    const mod = findByNameCI(GUN_MODS_TABLE, row.title);
    return blankGearRecord({ name: mod?.name || row.title, effect: mod?.effect || "", damaged });
  }

  if (row.resultType === "gunSight") {
    const sight = findByNameCI(GUN_SIGHTS_TABLE, row.title);
    return blankGearRecord({ name: sight?.name || row.title, effect: sight?.effect || "", damaged });
  }

  if (String(row.resultType || "").startsWith("item:")) {
    const catalogId = row.resultType.split(":")[1];
    const catalog = CATALOG_LOOKUP[catalogId];
    const item = findByNameCI(catalog, row.itemName || row.title);

    if (!item) return null;

    const record = catalogItemToEquipment({
      catalogId,
      item,
      roomId: "",
      crewId: "",
      playerId: "",
      makeId: (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      nowIso: () => new Date().toISOString(),
    });

    return {
      ...record,
      quantity: row.quantity || 1,
      damaged,
    };
  }

  return null;
}

export function getLootTableById(tableId) {
  return LOOT_TABLE_REGISTRY[tableId] || null;
}
