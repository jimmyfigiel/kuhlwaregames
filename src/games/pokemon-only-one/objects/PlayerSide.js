// src/games/pokemon-only-one/objects/PlayerSide.js

export class PlayerSide {
  constructor({
    id,
    name,
    activeZoneId,
    benchZoneIds = [],
    prizeZoneIds = [],
    deckZoneId,
    discardZoneId,
    handZoneId,
  }) {
    this.id = id;
    this.name = name;
    this.activeZoneId = activeZoneId;
    this.benchZoneIds = [...benchZoneIds];
    this.prizeZoneIds = [...prizeZoneIds];
    this.deckZoneId = deckZoneId;
    this.discardZoneId = discardZoneId;
    this.handZoneId = handZoneId;
  }

  static fromModel(model) {
    return new PlayerSide(model || {});
  }

  toModel() {
    return {
      id: this.id,
      name: this.name,
      activeZoneId: this.activeZoneId,
      benchZoneIds: [...this.benchZoneIds],
      prizeZoneIds: [...this.prizeZoneIds],
      deckZoneId: this.deckZoneId,
      discardZoneId: this.discardZoneId,
      handZoneId: this.handZoneId,
    };
  }
}
