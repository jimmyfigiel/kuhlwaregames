// src/games/pokemon-only-one/objects/CardZone.js

export class CardZone {
  constructor({
    id,
    ownerId = null,
    zoneKind = "generic",
    name = "Card Zone",
    cardIds = [],
    visibility = "public",
    capacity = null,
    faceDown = false,
  }) {
    this.id = id;
    this.ownerId = ownerId;
    this.zoneKind = zoneKind;
    this.name = name;
    this.cardIds = [...cardIds];
    this.visibility = visibility;
    this.capacity = capacity;
    this.faceDown = faceDown;
  }

  static fromModel(model) {
    return new CardZone(model || {});
  }

  get count() {
    return this.cardIds.length;
  }

  canAcceptCard() {
    return this.capacity === null || this.cardIds.length < this.capacity;
  }

  addCard(cardId) {
    if (!cardId) {
      return false;
    }

    if (this.cardIds.includes(cardId)) {
      return true;
    }

    if (!this.canAcceptCard()) {
      return false;
    }

    this.cardIds.push(cardId);
    return true;
  }

  removeCard(cardId) {
    const before = this.cardIds.length;
    this.cardIds = this.cardIds.filter((existingCardId) => existingCardId !== cardId);
    return this.cardIds.length !== before;
  }

  clearCards() {
    this.cardIds = [];
  }

  topCardId() {
    return this.cardIds.length > 0 ? this.cardIds[this.cardIds.length - 1] : null;
  }

  firstCardId() {
    return this.cardIds.length > 0 ? this.cardIds[0] : null;
  }

  toModel() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      zoneKind: this.zoneKind,
      name: this.name,
      cardIds: [...this.cardIds],
      visibility: this.visibility,
      capacity: this.capacity,
      faceDown: this.faceDown,
    };
  }
}
