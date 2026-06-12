// src/games/pokemon-only-one/objects/Space.js

export class Space {
  constructor({ id, name, cardId = null }) {
    this.id = id;
    this.name = name;
    this.cardId = cardId;
  }

  static fromModel(model) {
    return new Space(model);
  }

  putCard(cardId) {
    this.cardId = cardId;
  }

  removeCard() {
    const removedCardId = this.cardId;
    this.cardId = null;
    return removedCardId;
  }

  toModel() {
    return {
      id: this.id,
      name: this.name,
      cardId: this.cardId,
    };
  }
}
