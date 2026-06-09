// src/core/card/cardEngine.js
// Generic, game-agnostic card helpers.
// This file does not know anything about Pokémon rules.

export function makeCardInstance({ instanceId, definitionId, ownerId, zoneId, faceUp = false }) {
  return {
    id: instanceId,
    definitionId,
    ownerId,
    zoneId,
    faceUp,
    tapped: false,
    rotation: 0,
    damage: 0,
    counters: {},
    markers: [],
    attached: [],
  };
}

export function cloneState(state) {
  return structuredCloneSafe(state);
}

export function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function shuffleArray(items, seed = Date.now()) {
  const result = [...items];
  let random = mulberry32(hashSeed(seed));

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function hashSeed(seed) {
  const text = String(seed);
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function nextRandom() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function moveId(list, cardId) {
  return list.filter((id) => id !== cardId);
}

export function removeCardFromEverywhere(state, cardId) {
  const next = cloneState(state);

  for (const player of Object.values(next.players ?? {})) {
    player.deck = moveId(player.deck ?? [], cardId);
    player.hand = moveId(player.hand ?? [], cardId);
    player.discard = moveId(player.discard ?? [], cardId);
    player.prizes = moveId(player.prizes ?? [], cardId);
    player.bench = (player.bench ?? []).map((id) => (id === cardId ? null : id));
    if (player.active === cardId) {
      player.active = null;
    }
  }

  for (const card of Object.values(next.cardsById ?? {})) {
    card.attached = moveId(card.attached ?? [], cardId);
  }

  return next;
}

export function moveCardToPlayerList(state, cardId, playerId, listName, { faceUp } = {}) {
  let next = removeCardFromEverywhere(state, cardId);
  const player = next.players[playerId];

  if (!player) {
    throw new Error(`Unknown player ${playerId}`);
  }

  if (!Array.isArray(player[listName])) {
    throw new Error(`Player list ${listName} is not an array`);
  }

  player[listName].push(cardId);
  next.cardsById[cardId].zoneId = `${playerId}.${listName}`;

  if (typeof faceUp === "boolean") {
    next.cardsById[cardId].faceUp = faceUp;
  }

  return next;
}

export function moveCardToActive(state, cardId, playerId) {
  let next = removeCardFromEverywhere(state, cardId);
  const player = next.players[playerId];

  if (!player) {
    throw new Error(`Unknown player ${playerId}`);
  }

  player.active = cardId;
  next.cardsById[cardId].zoneId = `${playerId}.active`;
  next.cardsById[cardId].faceUp = true;

  return next;
}

export function moveCardToBench(state, cardId, playerId, benchIndex = null) {
  let next = removeCardFromEverywhere(state, cardId);
  const player = next.players[playerId];

  if (!player) {
    throw new Error(`Unknown player ${playerId}`);
  }

  const currentBench = player.bench ?? [null, null, null, null, null];
  const targetIndex =
    benchIndex === null || benchIndex === undefined
      ? currentBench.findIndex((slot) => !slot)
      : benchIndex;

  if (targetIndex < 0 || targetIndex >= currentBench.length) {
    throw new Error("No open bench slot");
  }

  if (currentBench[targetIndex]) {
    throw new Error("Bench slot is already occupied");
  }

  currentBench[targetIndex] = cardId;
  player.bench = currentBench;
  next.cardsById[cardId].zoneId = `${playerId}.bench.${targetIndex}`;
  next.cardsById[cardId].faceUp = true;

  return next;
}

export function attachCard(state, attachmentCardId, targetCardId) {
  let next = removeCardFromEverywhere(state, attachmentCardId);
  const attachment = next.cardsById[attachmentCardId];
  const target = next.cardsById[targetCardId];

  if (!attachment) {
    throw new Error(`Unknown attachment card ${attachmentCardId}`);
  }

  if (!target) {
    throw new Error(`Unknown target card ${targetCardId}`);
  }

  target.attached = [...(target.attached ?? []), attachmentCardId];
  attachment.zoneId = `attached.${targetCardId}`;
  attachment.faceUp = true;

  return next;
}

export function detachToDiscard(state, attachmentCardId, ownerId = null) {
  const card = state.cardsById[attachmentCardId];
  const discardOwnerId = ownerId ?? card?.ownerId;

  if (!discardOwnerId) {
    throw new Error(`Cannot determine owner for ${attachmentCardId}`);
  }

  return moveCardToPlayerList(state, attachmentCardId, discardOwnerId, "discard", {
    faceUp: true,
  });
}

export function drawCards(state, playerId, count = 1) {
  let next = cloneState(state);
  const player = next.players[playerId];

  if (!player) {
    throw new Error(`Unknown player ${playerId}`);
  }

  for (let i = 0; i < count; i += 1) {
    const cardId = player.deck.pop();
    if (!cardId) break;

    player.hand.push(cardId);
    next.cardsById[cardId].zoneId = `${playerId}.hand`;
    next.cardsById[cardId].faceUp = true;
  }

  return next;
}

export function dealPrizes(state, playerId, count = 6) {
  let next = cloneState(state);
  const player = next.players[playerId];

  if (!player) {
    throw new Error(`Unknown player ${playerId}`);
  }

  for (let i = 0; i < count; i += 1) {
    const cardId = player.deck.pop();
    if (!cardId) break;

    player.prizes.push(cardId);
    next.cardsById[cardId].zoneId = `${playerId}.prizes`;
    next.cardsById[cardId].faceUp = false;
  }

  return next;
}

export function addDamage(state, cardId, amount) {
  const next = cloneState(state);
  const card = next.cardsById[cardId];

  if (!card) {
    throw new Error(`Unknown card ${cardId}`);
  }

  card.damage = Math.max(0, Number(card.damage ?? 0) + Number(amount ?? 0));
  return next;
}

export function setDamage(state, cardId, amount) {
  const next = cloneState(state);
  const card = next.cardsById[cardId];

  if (!card) {
    throw new Error(`Unknown card ${cardId}`);
  }

  card.damage = Math.max(0, Number(amount ?? 0));
  return next;
}

export function cardIsInPlayerList(state, cardId, playerId, listName) {
  return Boolean(state.players[playerId]?.[listName]?.includes(cardId));
}

export function getPlayerCards(state, playerId, listName) {
  return (state.players[playerId]?.[listName] ?? []).map((id) => state.cardsById[id]).filter(Boolean);
}
