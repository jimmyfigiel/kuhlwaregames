export function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollD10() {
  return Math.floor(Math.random() * 10) + 1;
}

export function rollD100() {
  return Math.floor(Math.random() * 100) + 1;
}

export function findByRoll(rows = [], roll) {
  return (
    rows.find((row) => {
      return roll >= Number(row.rollMin) && roll <= Number(row.rollMax);
    }) || null
  );
}

export function formatRollRange(row) {
  if (!row) return "";

  if (
    row.rollMin !== undefined &&
    row.rollMax !== undefined &&
    Number(row.rollMin) === Number(row.rollMax)
  ) {
    return String(row.rollMin);
  }

  if (row.rollMin !== undefined && row.rollMax !== undefined) {
    return `${row.rollMin}-${row.rollMax}`;
  }

  return row.roll || "";
}

export function formatStatModifiers(statModifiers = {}) {
  const labels = {
    reactions: "Reactions",
    speed: "Speed",
    combatSkill: "Combat Skill",
    toughness: "Toughness",
    savvy: "Savvy",
    luck: "Luck",
    xp: "XP",
  };

  const parts = Object.entries(statModifiers).map(([key, value]) => {
    const number = Number(value);
    const sign = number >= 0 ? "+" : "";

    return `${sign}${number} ${labels[key] || key}`;
  });

  return parts.length ? parts.join(", ") : "-";
}

export function formatResources(resources = []) {
  if (!resources.length) return "-";

  return resources
    .map((resource) => {
      if (resource.type === "credits") {
        return `+${resource.amount} credits`;
      }

      if (resource.type === "storyPoint") {
        return `+${resource.count} story point${
          resource.count === 1 ? "" : "s"
        }`;
      }

      if (resource.type === "patron") {
        return `+${resource.count} Patron${resource.count === 1 ? "" : "s"}`;
      }

      if (resource.type === "rumor") {
        return `${resource.count} Rumor${resource.count === 1 ? "" : "s"}`;
      }

      if (resource.type === "questRumor") {
        return `${resource.count} Quest Rumor${
          resource.count === 1 ? "" : "s"
        }`;
      }

      if (resource.type === "rival") {
        return `+${resource.count} Rival${resource.count === 1 ? "" : "s"}`;
      }

      if (resource.type === "xp") {
        return `+${resource.count} XP`;
      }

      return resource.label || resource.type || "";
    })
    .filter(Boolean)
    .join(", ");
}

export function formatStartingRolls(startingRolls = []) {
  if (!startingRolls.length) return "-";

  return startingRolls.map((roll) => roll.label || roll.type).join(", ");
}

export function formatTraits(traits = []) {
  if (!traits.length) return "-";

  return traits.join(", ");
}

export function tableRowsForDisplay(rows = []) {
  return rows.map((row) => {
    const displayRow = {
      ...row,
      roll: formatRollRange(row),
    };

    if (row.name && !displayRow.result) {
      displayRow.result = row.name;
    }

    if (row.ship === undefined && row.name) {
      displayRow.ship = row.name;
    }

    if (row.effect === undefined) {
      displayRow.effect = formatStatModifiers(row.statModifiers || {});
    }

    if (row.resources !== undefined) {
      displayRow.resources = formatResources(row.resources || []);
    }

    if (row.startingRolls !== undefined) {
      displayRow.startingRolls = formatStartingRolls(row.startingRolls || []);
    }

    if (row.traits !== undefined) {
      displayRow.traits = formatTraits(row.traits || []);
    }

    if (row.debt !== undefined) {
      displayRow.debt = row.debt;
    }

    if (row.hull !== undefined) {
      displayRow.hull = row.hull;
    }

    if (row.notes === undefined) {
      displayRow.notes = "";
    }

    return displayRow;
  });
}