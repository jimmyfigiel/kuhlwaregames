// src/games/pokemon-only-one/model/serializeGame.js

export function serializeGame(game) {
  return cleanForFirestore(game.toModel());
}

function cleanForFirestore(value) {
  if (Array.isArray(value)) {
    return value.map(cleanForFirestore);
  }

  if (!value || typeof value !== "object") {
    return value === undefined ? null : value;
  }

  const cleaned = {};
  for (const [key, child] of Object.entries(value)) {
    if (child !== undefined) {
      cleaned[key] = cleanForFirestore(child);
    }
  }
  return cleaned;
}
