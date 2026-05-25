export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollD6() {
  return rollDie(6);
}

export function rollD100() {
  return rollDie(100);
}

export function formatRollRange(row) {
  if (!row) return "";
  if (row.rollMin === row.rollMax) return String(row.rollMin);
  return `${row.rollMin}-${row.rollMax}`;
}

export function findByRoll(rows, roll) {
  return rows.find((row) => roll >= row.rollMin && roll <= row.rollMax) || null;
}

export function rollOnTable(rows) {
  const roll = rollD100();
  return { roll, result: findByRoll(rows, roll) };
}

export function formatStatModifiers(statModifiers = {}) {
  const labels = {
    reactions: "Reactions",
    speed: "Speed",
    combatSkill: "Combat Skill",
    toughness: "Toughness",
    savvy: "Savvy",
    luck: "Luck",
  };

  const parts = Object.entries(statModifiers).map(([key, value]) => {
    const sign = Number(value) >= 0 ? "+" : "";
    return `${sign}${value} ${labels[key] || key}`;
  });

  return parts.length ? parts.join(", ") : "-";
}

export function formatResources(resources = []) {
  if (!resources.length) return "-";

  return resources
    .map((resource) => {
      if (resource.type === "credits") return `+${resource.amount} credits`;
      if (resource.type === "storyPoint") return `+${resource.count} story point${resource.count === 1 ? "" : "s"}`;
      if (resource.type === "patron") return `+${resource.count} Patron${resource.count === 1 ? "" : "s"}`;
      if (resource.type === "rumor") return `${resource.count} Rumor${resource.count === 1 ? "" : "s"}`;
      if (resource.type === "questRumor") return `${resource.count} Quest Rumor${resource.count === 1 ? "" : "s"}`;
      if (resource.type === "rival") return `+${resource.count} Rival${resource.count === 1 ? "" : "s"}`;
      if (resource.type === "xp") return `+${resource.count} XP`;
      return resource.label || resource.type;
    })
    .join(", ");
}

export function formatStartingRolls(startingRolls = []) {
  if (!startingRolls.length) return "-";
  return startingRolls.map((roll) => roll.label || roll.type).join(", ");
}

export function tableRowsForDisplay(rows = []) {
  return rows.map((row) => ({
    ...row,
    roll: formatRollRange(row),
    result: row.name || row.result || row.ship || "",
    effect: formatStatModifiers(row.statModifiers || {}),
    resources: formatResources(row.resources || []),
    startingRolls: formatStartingRolls(row.startingRolls || []),
    traitsText: Array.isArray(row.traits) && row.traits.length ? row.traits.join(", ") : "-",
  }));
}
