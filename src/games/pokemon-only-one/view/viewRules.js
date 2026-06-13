// src/games/pokemon-only-one/view/viewRules.js

export function getPlayMode(model) {
  return model?.settings?.playMode || (model?.settings?.onePlayerTestMode === false ? "twoPlayer" : "onePlayerTest");
}

export function isOnePlayerTestMode(model) {
  return getPlayMode(model) === "onePlayerTest" || model?.settings?.onePlayerTestMode === true;
}

export function playerSlotToSideId(playerSlot) {
  const raw = String(playerSlot || "").trim().toLowerCase();

  if (["p2", "player2", "playertwo", "opponent", "2", "side2", "slot2", "guest", "joiner"].includes(raw)) {
    return "opponent";
  }

  return "player";
}

export function getViewerSideId(actionBridgeOrPlayerSlot) {
  if (typeof actionBridgeOrPlayerSlot === "string") {
    return playerSlotToSideId(actionBridgeOrPlayerSlot);
  }

  return actionBridgeOrPlayerSlot?.viewerSideId || playerSlotToSideId(actionBridgeOrPlayerSlot?.playerSlot);
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

export function getCurrentTurnSideId(model) {
  return model?.setup?.currentTurnSideId || model?.setup?.firstPlayerSideId || null;
}

export function isTurnPhase(model) {
  return model?.setup?.phase === "turn" && Boolean(getCurrentTurnSideId(model));
}

export function canViewerTakeTurnForSide(model, viewerSideId, sideId) {
  if (!canViewerControlSide(model, viewerSideId, sideId)) {
    return false;
  }

  return isTurnPhase(model) && getCurrentTurnSideId(model) === sideId;
}

export function canViewerTakeTurnForZone(model, viewerSideId, zone) {
  if (!zone) {
    return false;
  }

  return canViewerTakeTurnForSide(model, viewerSideId, zone.ownerId);
}

export function canViewerModifySide(model, viewerSideId, sideId) {
  if (!canViewerControlSide(model, viewerSideId, sideId)) {
    return false;
  }

  if ((model?.setup?.phase || "setup") === "setup") {
    return ["openingHands", "mulligan", "placePokemon", "readyToReveal"].includes(model?.setup?.step || "coinFlip");
  }

  return getCurrentTurnSideId(model) === sideId;
}

export function canViewerModifyZone(model, viewerSideId, zone) {
  if (!zone) {
    return false;
  }

  return canViewerModifySide(model, viewerSideId, zone.ownerId);
}

export function canViewerInspectZone(model, zone, viewerSideId) {
  if (!zone) {
    return false;
  }

  if (isOnePlayerTestMode(model)) {
    return true;
  }

  // In real two-player mode, player-private zones may only be opened by
  // the side that owns them. Deck popups still do not reveal deck contents,
  // but they may contain owner-only actions such as drawing when it is that
  // side's turn.
  if (["hand", "discard", "deck"].includes(zone.zoneKind)) {
    return zone.ownerId === viewerSideId;
  }

  // Prizes remain closed information for now. The board shows prize count/card
  // backs, but no player gets a prize-inspection popup until a future rule
  // explicitly reveals them.
  if (zone.zoneKind === "prize") {
    return false;
  }

  if (zone.visibility === "public") {
    return true;
  }

  return zone.visibility === "owner" && zone.ownerId === viewerSideId;
}

export function canViewerSeeZoneFaces(zoneOrModel, viewerSideId, onePlayerTestModeOrZone = false) {
  // Backward-compatible form: canViewerSeeZoneFaces(zone, viewerSideId, onePlayerTestMode)
  if (zoneOrModel && zoneOrModel.zoneKind) {
    return canViewerSeeZoneFacesWithMode(zoneOrModel, viewerSideId, Boolean(onePlayerTestModeOrZone));
  }

  // Preferred form: canViewerSeeZoneFaces(model, viewerSideId, zone)
  return canViewerSeeZoneFacesWithMode(onePlayerTestModeOrZone, viewerSideId, isOnePlayerTestMode(zoneOrModel));
}

function canViewerSeeZoneFacesWithMode(zone, viewerSideId, onePlayerTestMode = false) {
  if (!zone) {
    return false;
  }

  if (zone.zoneKind === "deck" || zone.zoneKind === "prize") {
    return false;
  }

  if (zone.faceDown === true && zone.visibility !== "owner") {
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

export function canViewerSeeCardFace(model, viewerSideId, cardId) {
  const zone = getZoneContainingCard(model, cardId);
  if (!zone) {
    return false;
  }

  return canViewerSeeZoneFaces(model, viewerSideId, zone);
}

export function shouldViewerSeePopup(model, popup, viewerSideId) {
  if (!popup) {
    return false;
  }

  if (isOnePlayerTestMode(model)) {
    return true;
  }

  if (popup.openedBySideId && popup.openedBySideId !== viewerSideId) {
    return false;
  }

  if (popup.type === "COIN_FLIP") {
    return true;
  }

  if (popup.type === "CARD_ZOOM") {
    return canViewerSeeCardFace(model, viewerSideId, popup.cardId);
  }

  if (popup.type === "ZONE_POPUP") {
    const zone = model.zones?.[popup.zoneId] || null;
    if (!zone) {
      return false;
    }

    if (popup.openedBySideId && popup.openedBySideId !== viewerSideId) {
      return false;
    }

    return canViewerInspectZone(model, zone, viewerSideId);
  }

  return true;
}

export function shouldViewerSeeSelection(model, selection, viewerSideId) {
  if (!selection) {
    return false;
  }

  if (isOnePlayerTestMode(model)) {
    return true;
  }

  const selectedBySideId = selection.selectedBySideId || playerSlotToSideId(selection.playerSlot);
  return selectedBySideId === viewerSideId;
}

export function canPlaceSelectedPokemonInZone(model, zone, playerSlotOrBridge = null) {
  const selection = model.display?.selection || null;

  if (!selection?.cardId || !zone) {
    return false;
  }

  const selectedCard = model.cards?.[selection.cardId] || null;
  const sourceZone = selection.sourceZoneId ? model.zones?.[selection.sourceZoneId] : null;

  if (!sourceZone || !selectedCard) {
    return false;
  }

  const viewerSideId = getViewerSideId(playerSlotOrBridge || selection.playerSlot || selection.selectedBySideId);

  if (!shouldViewerSeeSelection(model, selection, viewerSideId)) {
    return false;
  }

  if (!canViewerModifyZone(model, viewerSideId, sourceZone) || !canViewerModifyZone(model, viewerSideId, zone)) {
    return false;
  }

  return (
    sourceZone.zoneKind === "hand" &&
    (model?.setup?.phase === "setup" ? isBasicPokemonCard(selectedCard) : isPokemonCard(selectedCard)) &&
    ["active", "bench"].includes(zone.zoneKind) &&
    zone.ownerId === sourceZone.ownerId &&
    (zone.cardIds || []).length === 0
  );
}

export function isPokemonCard(card) {
  return typeof card?.cardType === "string" && card.cardType.toLowerCase().includes("pokémon");
}

export function isBasicPokemonCard(card) {
  const cardType = String(card?.cardType || "").toLowerCase();
  return cardType.includes("pokémon") && cardType.includes("basic");
}

export function getFirstCardInZone(model, zoneId) {
  const cardId = model.zones?.[zoneId]?.cardIds?.[0];
  return cardId ? model.cards?.[cardId] || null : null;
}

export function getZoneContainingCard(model, cardId) {
  return Object.values(model?.zones || {}).find((zone) => (zone.cardIds || []).includes(cardId)) || null;
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
