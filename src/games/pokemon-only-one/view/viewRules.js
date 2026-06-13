// src/games/pokemon-only-one/view/viewRules.js

export function getPlayMode(model) {
  return model?.settings?.playMode || (model?.settings?.onePlayerTestMode === false ? "twoPlayer" : "onePlayerTest");
}

export function isOnePlayerTestMode(model) {
  return getPlayMode(model) === "onePlayerTest" || model?.settings?.onePlayerTestMode === true;
}

export function playerSlotToSideId(playerSlot) {
  if (playerSlot === "p2" || playerSlot === "player2" || playerSlot === "opponent") {
    return "opponent";
  }

  return "player";
}

export function canViewerControlSide(model, viewerSideId, sideId) {
  if (!sideId) {
    return false;
  }

  if (isOnePlayerTestMode(model)) {
    return true;
  }

  return viewerSideId === sideId;
}

export function canViewerControlZone(model, zone, viewerSideId) {
  if (!zone) {
    return false;
  }

  return canViewerControlSide(model, viewerSideId, zone.ownerId);
}

export function canViewerSeeZoneFaces(zone, viewerSideId, onePlayerTestMode = false) {
  if (!zone) {
    return false;
  }

  if (zone.visibility === "public") {
    return true;
  }

  if (onePlayerTestMode && zone.visibility === "owner") {
    return true;
  }

  if (zone.visibility === "owner") {
    return zone.ownerId === viewerSideId;
  }

  return false;
}

export function canPlaceSelectedPokemonInZone(model, zone, playerSlot = null) {
  const selection = model.display?.selection || null;

  if (!selection?.cardId || !zone) {
    return false;
  }

  const selectedCard = model.cards?.[selection.cardId] || null;
  const sourceZone = selection.sourceZoneId ? model.zones?.[selection.sourceZoneId] : null;

  if (!sourceZone || !selectedCard) {
    return false;
  }

  const viewerSideId = playerSlotToSideId(playerSlot || selection.playerSlot || selection.selectedBySideId);
  if (!canViewerControlZone(model, sourceZone, viewerSideId) || !canViewerControlZone(model, zone, viewerSideId)) {
    return false;
  }

  return (
    sourceZone.zoneKind === "hand" &&
    isPokemonCard(selectedCard) &&
    ["active", "bench"].includes(zone.zoneKind) &&
    zone.ownerId === sourceZone.ownerId &&
    (zone.cardIds || []).length === 0
  );
}

export function isPokemonCard(card) {
  return typeof card?.cardType === "string" && card.cardType.toLowerCase().includes("pokémon");
}

export function getFirstCardInZone(model, zoneId) {
  const cardId = model.zones?.[zoneId]?.cardIds?.[0];
  return cardId ? model.cards?.[cardId] || null : null;
}

export function getActiveZoneIdForSide(model, ownerId) {
  const side = model.playerSides?.[ownerId] || null;
  return side?.activeZoneId || null;
}

export function findFirstEmptyBenchZoneId(model, ownerId) {
  const side = model.playerSides?.[ownerId] || null;
  const benchZoneIds = side?.benchZoneIds || [];

  return benchZoneIds.find((zoneId) => {
    const zone = model.zones?.[zoneId];
    return zone && zone.zoneKind === "bench" && zone.ownerId === ownerId && (zone.cardIds || []).length === 0;
  }) || null;
}
