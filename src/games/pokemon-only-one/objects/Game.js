// src/games/pokemon-only-one/objects/Game.js

import { Area } from "./Area.js";
import { Card } from "./Card.js";
import { CardZone } from "./CardZone.js";
import { Display } from "./Display.js";
import { GameLog } from "./GameLog.js";
import { PlayerSide } from "./PlayerSide.js";

export class Game {
  constructor({
    gameId = "pokemon-only-one",
    version = "mvc-zones-v1",
    area = null,
    playerSides = {},
    zones = {},
    cards = {},
    settings = { playMode: "onePlayerTest", onePlayerTestMode: true },
    display = new Display(),
    log = new GameLog(),
    debug = {},
  } = {}) {
    this.gameId = gameId;
    this.version = version;
    this.area = area;
    this.playerSides = playerSides;
    this.zones = zones;
    this.cards = cards;
    this.settings = normalizeSettings(settings);
    this.display = display;
    this.log = log;
    this.debug = debug;
  }

  static fromModel(model) {
    const zones = {};
    const modelZones = model?.zones || convertOldSpacesToZones(model?.spaces || {});
    for (const [zoneId, zoneModel] of Object.entries(modelZones)) {
      zones[zoneId] = CardZone.fromModel(zoneModel);
    }

    const cards = {};
    for (const [cardId, cardModel] of Object.entries(model?.cards || {})) {
      cards[cardId] = Card.fromModel(cardModel);
    }

    const playerSides = {};
    for (const [sideId, sideModel] of Object.entries(model?.playerSides || {})) {
      playerSides[sideId] = PlayerSide.fromModel(convertOldSideToZoneSide(sideModel));
    }

    return new Game({
      gameId: model?.gameId || "pokemon-only-one",
      version: model?.version || "mvc-zones-v1",
      area: model?.area ? Area.fromModel(model.area) : null,
      playerSides,
      zones,
      cards,
      settings: normalizeSettings(model?.settings),
      display: Display.fromModel(model?.display),
      log: GameLog.fromModel(model),
      debug: model?.debug || {},
    });
  }

  getPlayMode() {
    return this.settings?.playMode || (this.settings?.onePlayerTestMode === false ? "twoPlayer" : "onePlayerTest");
  }

  isOnePlayerTestMode() {
    return this.getPlayMode() === "onePlayerTest" || this.settings?.onePlayerTestMode === true;
  }

  setPlayMode(playMode) {
    const normalized = playMode === "twoPlayer" ? "twoPlayer" : "onePlayerTest";
    this.settings = {
      ...(this.settings || {}),
      playMode: normalized,
      onePlayerTestMode: normalized === "onePlayerTest",
    };
  }

  playerSlotToSideId(playerSlot) {
    const raw = String(playerSlot || "").trim().toLowerCase();

    if (["p2", "player2", "playertwo", "opponent", "2", "side2", "slot2", "guest", "joiner"].includes(raw)) {
      return "opponent";
    }

    return "player";
  }

  canActorControlSide(playerSlot, sideId) {
    if (!sideId) {
      return false;
    }

    if (this.isOnePlayerTestMode()) {
      return true;
    }

    return this.playerSlotToSideId(playerSlot) === sideId;
  }

  canActorControlZone(playerSlot, zoneIdOrZone) {
    const zone = typeof zoneIdOrZone === "string" ? this.getZone(zoneIdOrZone) : zoneIdOrZone;
    if (!zone) {
      return false;
    }

    return this.canActorControlSide(playerSlot, zone.ownerId);
  }

  canActorSeeZoneFaces(playerSlot, zoneIdOrZone) {
    const zone = typeof zoneIdOrZone === "string" ? this.getZone(zoneIdOrZone) : zoneIdOrZone;

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

    if (this.isOnePlayerTestMode() && zone.visibility === "owner") {
      return true;
    }

    if (zone.visibility === "owner") {
      return this.playerSlotToSideId(playerSlot) === zone.ownerId;
    }

    return false;
  }

  canActorSeeCardFace(playerSlot, cardId) {
    const zone = this.getZoneContainingCard(cardId);
    return this.canActorSeeZoneFaces(playerSlot, zone);
  }

  setArea(area) {
    this.area = area;
  }

  addPlayerSide(playerSide) {
    this.playerSides[playerSide.id] = playerSide;
  }

  getPlayerSide(sideId) {
    return this.playerSides[sideId] || null;
  }

  addZone(zone) {
    this.zones[zone.id] = zone;
    if (this.area) {
      this.area.addSpace(zone.id);
    }
  }

  addCard(card) {
    this.cards[card.id] = card;
  }

  getCard(cardId) {
    return this.cards[cardId] || null;
  }

  getZone(zoneId) {
    return this.zones[zoneId] || null;
  }

  getCardsInZone(zoneId) {
    const zone = this.getZone(zoneId);
    if (!zone) {
      return [];
    }

    return zone.cardIds.map((cardId) => this.getCard(cardId)).filter(Boolean);
  }

  putCardInZone(cardId, zoneId) {
    const card = this.getCard(cardId);
    const zone = this.getZone(zoneId);

    if (!card) {
      this.log.add("COMMAND_ERROR", `Cannot put missing card ${cardId} in ${zoneId}.`, { cardId, zoneId });
      return;
    }

    if (!zone) {
      this.log.add("COMMAND_ERROR", `Cannot put ${card.name} in missing zone ${zoneId}.`, { cardId, zoneId });
      return;
    }

    if (!zone.canAcceptCard() && !zone.cardIds.includes(cardId)) {
      this.log.add("COMMAND_ERROR", `Cannot put ${card.name} in full zone ${zone.name}.`, { cardId, zoneId });
      return;
    }

    for (const existingZone of Object.values(this.zones)) {
      existingZone.removeCard(cardId);
    }

    zone.addCard(cardId);
  }

  getZoneContainingCard(cardId) {
    return Object.values(this.zones).find((zone) => zone.cardIds.includes(cardId)) || null;
  }

  getSideForZone(zoneId) {
    const zone = this.getZone(zoneId);
    if (!zone?.ownerId) {
      return null;
    }

    return this.getPlayerSide(zone.ownerId);
  }

  getSideByDeckZone(deckZoneId) {
    return Object.values(this.playerSides || {}).find((side) => side.deckZoneId === deckZoneId) || null;
  }

  getHandZoneForSide(sideId) {
    const side = this.getPlayerSide(sideId);
    return side ? this.getZone(side.handZoneId) : null;
  }

  getDeckZoneForSide(sideId) {
    const side = this.getPlayerSide(sideId);
    return side ? this.getZone(side.deckZoneId) : null;
  }

  getDiscardZoneForSide(sideId) {
    const side = this.getPlayerSide(sideId);
    return side ? this.getZone(side.discardZoneId) : null;
  }

  getActiveZoneForSide(sideId) {
    const side = this.getPlayerSide(sideId);
    return side ? this.getZone(side.activeZoneId) : null;
  }

  getBenchZonesForSide(sideId) {
    const side = this.getPlayerSide(sideId);
    return (side?.benchZoneIds || []).map((zoneId) => this.getZone(zoneId)).filter(Boolean);
  }

  findFirstEmptyBenchZoneForSide(sideId) {
    return this.getBenchZonesForSide(sideId).find((zone) => zone.zoneKind === "bench" && zone.count === 0) || null;
  }

  isPokemonCard(cardIdOrCard) {
    const card = typeof cardIdOrCard === "string" ? this.getCard(cardIdOrCard) : cardIdOrCard;
    return typeof card?.cardType === "string" && card.cardType.toLowerCase().includes("pokémon");
  }

  canPlaceSelectedPokemonInZone(zoneIdOrZone) {
    const selection = this.display?.selection || null;
    const zone = typeof zoneIdOrZone === "string" ? this.getZone(zoneIdOrZone) : zoneIdOrZone;

    if (!selection?.cardId || !zone) {
      return false;
    }

    const selectedCard = this.getCard(selection.cardId);
    const sourceZone = this.getZone(selection.sourceZoneId);

    return Boolean(
      sourceZone &&
        selectedCard &&
        sourceZone.zoneKind === "hand" &&
        this.isPokemonCard(selectedCard) &&
        ["active", "bench"].includes(zone.zoneKind) &&
        zone.ownerId === sourceZone.ownerId &&
        zone.count === 0
    );
  }

  toModel() {
    const playerSides = {};
    for (const [sideId, side] of Object.entries(this.playerSides)) {
      playerSides[sideId] = side.toModel();
    }

    const zones = {};
    for (const [zoneId, zone] of Object.entries(this.zones)) {
      zones[zoneId] = zone.toModel();
    }

    const cards = {};
    for (const [cardId, card] of Object.entries(this.cards)) {
      cards[cardId] = card.toModel();
    }

    const logPieces = this.log.toModelPieces();

    return {
      gameId: this.gameId,
      version: this.version,
      area: this.area ? this.area.toModel() : null,
      playerSides,
      zones,
      cards,
      settings: normalizeSettings(this.settings),
      display: this.display.toModel(),
      log: logPieces.log,
      nextLogNumber: logPieces.nextLogNumber,
      debug: this.debug,
    };
  }
}

function normalizeSettings(settings = {}) {
  const playMode = settings?.playMode || (settings?.onePlayerTestMode === false ? "twoPlayer" : "onePlayerTest");
  return {
    ...(settings || {}),
    playMode,
    onePlayerTestMode: playMode === "onePlayerTest",
  };
}

function convertOldSpacesToZones(spaces) {
  const zones = {};
  for (const [spaceId, space] of Object.entries(spaces || {})) {
    zones[spaceId] = {
      id: space.id || spaceId,
      ownerId: spaceId.startsWith("opponent") ? "opponent" : "player",
      zoneKind: spaceId.includes("Active") ? "active" : spaceId.includes("Bench") ? "bench" : spaceId.includes("Prize") ? "prize" : "space",
      name: space.name || spaceId,
      cardIds: space.cardId ? [space.cardId] : [],
      visibility: "public",
      capacity: 1,
      faceDown: spaceId.includes("Prize"),
    };
  }
  return zones;
}

function convertOldSideToZoneSide(side) {
  if (!side) {
    return side;
  }

  return {
    ...side,
    activeZoneId: side.activeZoneId || side.activeSpaceId,
    benchZoneIds: side.benchZoneIds || side.benchSpaceIds || [],
    prizeZoneIds: side.prizeZoneIds || side.prizeSpaceIds || [],
    deckZoneId: side.deckZoneId || `${side.id}Deck`,
    discardZoneId: side.discardZoneId || `${side.id}Discard`,
    handZoneId: side.handZoneId || `${side.id}Hand`,
  };
}
