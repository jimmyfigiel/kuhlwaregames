// src/games/pokemon-only-one/commands/createCard.js

import { Card } from "../objects/Card.js";

export class CreateCardCommand {
  constructor({ cardId, name, cardType, imagePath, ownerId = "p1" }) {
    this.type = "CREATE_CARD";
    this.cardId = cardId;
    this.name = name;
    this.cardType = cardType;
    this.imagePath = imagePath;
    this.ownerId = ownerId;
  }

  run(game) {
    game.addCard(
      new Card({
        id: this.cardId,
        name: this.name,
        cardType: this.cardType,
        imagePath: this.imagePath,
        ownerId: this.ownerId,
      })
    );
    game.log.add("CARD_CREATED", `Created card ${this.name}.`, { cardId: this.cardId });
  }
}
