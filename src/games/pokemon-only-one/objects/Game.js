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
    setup = createDefaultSetup(),
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
    this.setup = normalizeSetup(setup);
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
      setup: normalizeSetup(model?.setup),
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

  getCurrentTurnSideId() {
    this.setup = normalizeSetup(this.setup);
    return this.setup.currentTurnSideId || this.setup.coinFlip?.resultSideId || null;
  }

  isTurnPhase() {
    return this.setup?.phase === "turn" && Boolean(this.getCurrentTurnSideId());
  }

  canActorTakeTurnForSide(playerSlot, sideId) {
    if (!this.canActorControlSide(playerSlot, sideId)) {
      return false;
    }

    return this.isTurnPhase() && this.getCurrentTurnSideId() === sideId;
  }

  canActorModifySide(playerSlot, sideId) {
    if (!this.canActorControlSide(playerSlot, sideId)) {
      return false;
    }

    if ((this.setup?.phase || "setup") === "setup") {
      return true;
    }

    return this.getCurrentTurnSideId() === sideId;
  }

  canActorModifyZone(playerSlot, zoneIdOrZone) {
    const zone = typeof zoneIdOrZone === "string" ? this.getZone(zoneIdOrZone) : zoneIdOrZone;
    if (!zone) {
      return false;
    }

    return this.canActorModifySide(playerSlot, zone.ownerId);
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


  getSetupSide(sideId) {
    const normalizedSideId = sideId === "opponent" ? "opponent" : "player";
    this.setup = normalizeSetup(this.setup);
    return this.setup.sides[normalizedSideId];
  }

  setPrizeCount(prizeCount) {
    const parsed = Number.parseInt(prizeCount, 10);
    const clamped = Math.max(1, Math.min(6, Number.isFinite(parsed) ? parsed : 6));

    this.setup = normalizeSetup({
      ...(this.setup || {}),
      prizeCount: clamped,
    });
  }

  hasAnyReadySide() {
    this.setup = normalizeSetup(this.setup);
    return Boolean(this.setup.sides.player.ready || this.setup.sides.opponent.ready);
  }

  drawOpeningHandForSide(sideId, cardCount = 7) {
    const side = this.getPlayerSide(sideId);
    const deckZone = this.getDeckZoneForSide(sideId);
    const handZone = this.getHandZoneForSide(sideId);

    if (!side || !deckZone || !handZone) {
      this.log.add("COMMAND_ERROR", `Cannot draw opening hand for missing side ${sideId}.`, { sideId });
      return 0;
    }

    let drawnCount = 0;
    for (let index = 0; index < cardCount; index += 1) {
      const cardId = deckZone.topCardId();
      if (!cardId) {
        break;
      }
      this.putCardInZone(cardId, handZone.id);
      drawnCount += 1;
    }

    const setupSide = this.getSetupSide(sideId);
    setupSide.openingHandDrawn = true;

    this.log.add("OPENING_HAND_DRAWN", `${side.name} drew ${drawnCount} card${drawnCount === 1 ? "" : "s"} for opening hand.`, {
      sideId,
      drawnCount,
      requestedCount: cardCount,
      deckZoneId: deckZone.id,
      handZoneId: handZone.id,
    });

    return drawnCount;
  }

  setPrizesForSide(sideId) {
    const side = this.getPlayerSide(sideId);
    const deckZone = this.getDeckZoneForSide(sideId);

    if (!side || !deckZone) {
      this.log.add("COMMAND_ERROR", `Cannot set prizes for missing side ${sideId}.`, { sideId });
      return 0;
    }

    const prizeCount = normalizePrizeCount(this.setup?.prizeCount);
    let placedCount = 0;

    for (const [index, zoneId] of (side.prizeZoneIds || []).entries()) {
      const prizeZone = this.getZone(zoneId);
      if (!prizeZone) {
        continue;
      }

      prizeZone.clearCards();

      if (index >= prizeCount) {
        continue;
      }

      const cardId = deckZone.topCardId();
      if (!cardId) {
        break;
      }

      this.putCardInZone(cardId, prizeZone.id);
      placedCount += 1;
    }

    const setupSide = this.getSetupSide(sideId);
    setupSide.prizesSet = true;

    this.log.add("PRIZES_SET", `${side.name} set ${placedCount} prize card${placedCount === 1 ? "" : "s"}.`, {
      sideId,
      prizeCount,
      placedCount,
      deckZoneId: deckZone.id,
      prizeZoneIds: side.prizeZoneIds,
    });

    return placedCount;
  }

  markSetupSideReady(sideId) {
    const setupSide = this.getSetupSide(sideId);
    setupSide.ready = true;
  }

  areBothSetupSidesReady() {
    this.setup = normalizeSetup(this.setup);
    return Boolean(this.setup.sides.player.ready && this.setup.sides.opponent.ready);
  }

  resolveSetupCoinFlip() {
    this.setup = normalizeSetup(this.setup);

    if (this.setup.coinFlip?.resultSideId) {
      return this.setup.coinFlip;
    }

    const coinFace = Math.random() < 0.5 ? "heads" : "tails";
    const resultSideId = coinFace === "heads" ? "player" : "opponent";
    const resultSide = this.getPlayerSide(resultSideId);

    this.setup = normalizeSetup({
      ...this.setup,
      phase: "turn",
      currentTurnSideId: resultSideId,
      coinFlip: {
        coinFace,
        resultSideId,
        resultSideName: resultSide?.name || resultSideId,
        resolvedAt: new Date().toISOString(),
      },
    });

    this.display.openCoinFlip(this.setup.coinFlip);
    this.log.add("COIN_FLIP_RESOLVED", `${resultSide?.name || resultSideId} wins the coin flip and goes first.`, this.setup.coinFlip);

    return this.setup.coinFlip;
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
      setup: normalizeSetup(this.setup),
      display: this.display.toModel(),
      log: logPieces.log,
      nextLogNumber: logPieces.nextLogNumber,
      debug: this.debug,
    };
  }
}

function normalizeSetup(setup = {}) {
  const normalized = {
    phase: setup?.phase || "setup",
    prizeCount: normalizePrizeCount(setup?.prizeCount),
    currentTurnSideId: setup?.currentTurnSideId || null,
    sides: {
      player: normalizeSetupSide(setup?.sides?.player),
      opponent: normalizeSetupSide(setup?.sides?.opponent),
    },
    coinFlip: setup?.coinFlip || null,
  };

  if (normalized.coinFlip?.resultSideId && !normalized.currentTurnSideId) {
    normalized.currentTurnSideId = normalized.coinFlip.resultSideId;
  }

  return normalized;
}

function normalizeSetupSide(side = {}) {
  return {
    ready: Boolean(side?.ready),
    openingHandDrawn: Boolean(side?.openingHandDrawn),
    prizesSet: Boolean(side?.prizesSet),
  };
}

function normalizePrizeCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Math.max(1, Math.min(6, Number.isFinite(parsed) ? parsed : 6));
}

function createDefaultSetup() {
  return normalizeSetup({});
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
