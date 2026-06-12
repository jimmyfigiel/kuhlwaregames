// src/games/pokemon-only-one/objects/Game.js

import { Area } from "./Area.js";
import { Card } from "./Card.js";
import { Display } from "./Display.js";
import { GameLog } from "./GameLog.js";
import { Space } from "./Space.js";

export class Game {
  constructor({
    gameId = "pokemon-only-one",
    version = "mvc-v1",
    area = null,
    spaces = {},
    cards = {},
    display = new Display(),
    log = new GameLog(),
    debug = {},
  } = {}) {
    this.gameId = gameId;
    this.version = version;
    this.area = area;
    this.spaces = spaces;
    this.cards = cards;
    this.display = display;
    this.log = log;
    this.debug = debug;
  }

  static fromModel(model) {
    const spaces = {};
    for (const [spaceId, spaceModel] of Object.entries(model?.spaces || {})) {
      spaces[spaceId] = Space.fromModel(spaceModel);
    }

    const cards = {};
    for (const [cardId, cardModel] of Object.entries(model?.cards || {})) {
      cards[cardId] = Card.fromModel(cardModel);
    }

    return new Game({
      gameId: model?.gameId || "pokemon-only-one",
      version: model?.version || "mvc-v1",
      area: model?.area ? Area.fromModel(model.area) : null,
      spaces,
      cards,
      display: Display.fromModel(model?.display),
      log: GameLog.fromModel(model),
      debug: model?.debug || {},
    });
  }

  setArea(area) {
    this.area = area;
  }

  addSpace(space) {
    this.spaces[space.id] = space;
    if (this.area) {
      this.area.addSpace(space.id);
    }
  }

  addCard(card) {
    this.cards[card.id] = card;
  }

  getCard(cardId) {
    return this.cards[cardId] || null;
  }

  getSpace(spaceId) {
    return this.spaces[spaceId] || null;
  }

  putCardInSpace(cardId, spaceId) {
    const card = this.getCard(cardId);
    const space = this.getSpace(spaceId);

    if (!card) {
      this.log.add("COMMAND_ERROR", `Cannot put missing card ${cardId} in ${spaceId}.`, { cardId, spaceId });
      return;
    }

    if (!space) {
      this.log.add("COMMAND_ERROR", `Cannot put ${card.name} in missing space ${spaceId}.`, { cardId, spaceId });
      return;
    }

    for (const existingSpace of Object.values(this.spaces)) {
      if (existingSpace.cardId === cardId) {
        existingSpace.removeCard();
      }
    }

    space.putCard(cardId);
  }

  toModel() {
    const spaces = {};
    for (const [spaceId, space] of Object.entries(this.spaces)) {
      spaces[spaceId] = space.toModel();
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
      spaces,
      cards,
      display: this.display.toModel(),
      log: logPieces.log,
      nextLogNumber: logPieces.nextLogNumber,
      debug: this.debug,
    };
  }
}
