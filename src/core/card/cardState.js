// src/core/card/cardState.js

import { cloneState } from "../command/commandObjects";

export function createEmptyCardState() {
  return {
    players: {},
    zones: {},
    cards: {},
  };
}

export function addPlayer(state, player) {
  const next = cloneState(state);
  next.players = next.players || {};
  next.players[player.id] = player;
  return next;
}

export function addZone(state, zone) {
  const next = cloneState(state);
  next.zones = next.zones || {};
  next.zones[zone.id] = { ...zone, cardIds: zone.cardIds || [] };
  return next;
}

export function addCard(state, card) {
  const next = cloneState(state);
  next.cards = next.cards || {};
  next.cards[card.id] = { ...card, zoneId: card.zoneId || null };
  return next;
}

export function putCardInZone(state, cardId, zoneId) {
  const next = removeCardFromAllZones(state, cardId);
  const card = next.cards?.[cardId];
  const zone = next.zones?.[zoneId];
  if (!card) throw new Error(`Card ${cardId} does not exist.`);
  if (!zone) throw new Error(`Zone ${zoneId} does not exist.`);
  if (zone.capacity && zone.cardIds.length >= zone.capacity) {
    throw new Error(`Zone ${zone.label || zone.id} is full.`);
  }
  zone.cardIds.push(cardId);
  card.zoneId = zoneId;
  return next;
}

export function removeCardFromAllZones(state, cardId) {
  const next = cloneState(state);
  for (const zone of Object.values(next.zones || {})) {
    zone.cardIds = (zone.cardIds || []).filter((id) => id !== cardId);
  }
  if (next.cards?.[cardId]) {
    next.cards[cardId].zoneId = null;
  }
  return next;
}

export function moveCard(state, cardId, toZoneId) {
  return putCardInZone(state, cardId, toZoneId);
}
