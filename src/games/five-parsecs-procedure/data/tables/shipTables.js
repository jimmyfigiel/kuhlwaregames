export const SHIP_TABLE = [
  { rollMin: 1, rollMax: 12, name: "Worn freighter", ship: "Worn freighter", debt: "1D6 + 20", debtBonus: 20, hull: 30, traits: [] },
  { rollMin: 13, rollMax: 18, name: "Retired troop transport", ship: "Retired troop transport", debt: "1D6 + 30", debtBonus: 30, hull: 35, traits: ["Emergency Drives"] },
  { rollMin: 19, rollMax: 23, name: "Strange alien vessel", ship: "Strange alien vessel", debt: "1D6 + 15", debtBonus: 15, hull: 25, traits: [] },
  { rollMin: 24, rollMax: 31, name: "Upgraded shuttle", ship: "Upgraded shuttle", debt: "1D6 + 10", debtBonus: 10, hull: 20, traits: [] },
  { rollMin: 32, rollMax: 38, name: "Retired scout ship", ship: "Retired scout ship", debt: "1D6 + 20", debtBonus: 20, hull: 25, traits: ["Fuel-efficient"] },
  { rollMin: 39, rollMax: 45, name: "Repurposed science vessel", ship: "Repurposed science vessel", debt: "1D6 + 10", debtBonus: 10, hull: 20, traits: [] },
  { rollMin: 46, rollMax: 56, name: "Battered mining ship", ship: "Battered mining ship", debt: "1D6 + 20", debtBonus: 20, hull: 35, traits: ["Fuel Hog"] },
  { rollMin: 57, rollMax: 65, name: "Unreliable merchant cruiser", ship: "Unreliable merchant cruiser", debt: "1D6 + 20", debtBonus: 20, hull: 30, traits: [] },
  { rollMin: 66, rollMax: 70, name: "Former diplomatic vessel", ship: "Former diplomatic vessel", debt: "1D6 + 15", debtBonus: 15, hull: 25, traits: [] },
  { rollMin: 71, rollMax: 76, name: "Ancient low-tech craft", ship: "Ancient low-tech craft", debt: "1D6 + 20", debtBonus: 20, hull: 35, traits: ["Dodgy Drive"] },
  { rollMin: 77, rollMax: 84, name: "Built from salvaged wrecks", ship: "Built from salvaged wrecks", debt: "1D6 + 20", debtBonus: 20, hull: 30, traits: [] },
  { rollMin: 85, rollMax: 95, name: "Worn colony ship", ship: "Worn colony ship", debt: "1D6 + 20", debtBonus: 20, hull: 25, traits: ["Standard Issue"] },
  { rollMin: 96, rollMax: 100, name: "Retired military patrol ship", ship: "Retired military patrol ship", debt: "1D6 + 35", debtBonus: 35, hull: 40, traits: ["Armored"] },
];

export const SHIP_TRAIT_DESCRIPTIONS = {
  "Emergency Drives": { name: "Emergency Drives", description: "Trait description not entered yet." },
  "Fuel-efficient": { name: "Fuel-efficient", description: "Trait description not entered yet." },
  "Fuel Hog": { name: "Fuel Hog", description: "Trait description not entered yet." },
  "Dodgy Drive": { name: "Dodgy Drive", description: "Trait description not entered yet." },
  "Standard Issue": { name: "Standard Issue", description: "Trait description not entered yet." },
  Armored: { name: "Armored", description: "Trait description not entered yet." },
};

export const SHIP_TABLE_DEFINITION = {
  id: "ship",
  title: "Ship Table",
  dice: "D100",
  sides: 100,
  entries: SHIP_TABLE.map((row) => ({
    ...row,
    min: row.rollMin,
    max: row.rollMax,
    label: row.name,
    value: row.name,
    description: `Debt ${row.debt} · Hull ${row.hull}${row.traits?.length ? ` · ${row.traits.join(", ")}` : ""}`,
  })),
};
