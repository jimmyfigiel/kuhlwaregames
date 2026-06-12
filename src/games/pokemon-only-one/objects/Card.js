// src/games/pokemon-only-one/objects/Card.js

export class Card {
  constructor({ id, name, cardType, imagePath, ownerId = "p1" }) {
    this.id = id;
    this.name = name;
    this.cardType = cardType;
    this.imagePath = imagePath;
    this.ownerId = ownerId;
  }

  static fromModel(model) {
    return new Card(model);
  }

  toModel() {
    return {
      id: this.id,
      name: this.name,
      cardType: this.cardType,
      imagePath: this.imagePath,
      ownerId: this.ownerId,
    };
  }
}
