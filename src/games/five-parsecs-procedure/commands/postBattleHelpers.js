import { rollDie, rollDice } from "../data/tables/campaignTables";

export { rollDie, rollDice };

// Rolls a dice expression like "1D6", "1D3+1", "2D6", or a plain number. Returns { total, text }.
export function rollExpression(expression) {
  if (typeof expression === "number") {
    return { total: expression, text: String(expression) };
  }

  const text = String(expression || "0").trim().toUpperCase();
  const match = text.match(/^(\d*)D(\d+)([+-]\d+)?$/);

  if (!match) {
    const numeric = Number(text);
    return { total: Number.isFinite(numeric) ? numeric : 0, text };
  }

  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;
  const { total } = rollDice(count, sides);
  const finalTotal = total + modifier;

  return { total: finalTotal, text: `${text} → ${finalTotal}` };
}

export function isObjectiveAchieved(state) {
  return state?.encounter?.objectiveAchieved === "objective-achieved";
}

export function getActiveCrewMembers(state) {
  return (state?.crewLog?.crewMembers || []).filter(
    (member) => !state?.crewLog?.crewDetails?.[member.id]?.removedFromCrew
  );
}

// Mirrors FinalizeCrewMemberCommand.pickCharacterType — the label used elsewhere for species checks.
export function getCharacterTypeLabel(detail = {}) {
  return (
    detail?.strangeCharacter?.label ||
    detail?.primaryAlien?.label ||
    detail?.crewType?.label ||
    detail?.characterType ||
    ""
  );
}

export function isSpecies(detail, name) {
  return String(getCharacterTypeLabel(detail) || "").toLowerCase().includes(String(name).toLowerCase());
}

export function isBotOrSoulless(detail) {
  return isSpecies(detail, "Bot") || isSpecies(detail, "Soulless");
}

export function makeContactRecord({ type, name, source = "" }) {
  return {
    id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    name: name || `Unnamed ${type === "patron" ? "Patron" : "Rival"}`,
    type,
    source,
    status: "active",
    notes: source ? `Created from ${source}` : "",
    createdAt: new Date().toISOString(),
  };
}

export function makeStashEquipmentRecord({ name, effect = "", category = "gear", damaged = false }) {
  return {
    equipmentId: `equipment-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    name,
    category,
    locationType: "stash",
    crewMemberId: "",
    damaged,
    destroyed: false,
    gear: { effect, uses: "", traits: [] },
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

// Picks a random item from crewLog.inventory (the shared stash). Returns { item, index } or null.
export function pickRandomStashItem(state) {
  const inventory = state?.crewLog?.inventory || [];
  if (inventory.length === 0) return null;
  const index = Math.floor(Math.random() * inventory.length);
  return { item: inventory[index], index };
}

// Picks a random item carried by a specific crew member. Returns { item, index } or null.
export function pickRandomCarriedItem(state, crewMemberId) {
  const equipment = state?.crewLog?.crewDetails?.[crewMemberId]?.equipment || [];
  if (equipment.length === 0) return null;
  const index = Math.floor(Math.random() * equipment.length);
  return { item: equipment[index], index };
}

export function pickRandomElement(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}
