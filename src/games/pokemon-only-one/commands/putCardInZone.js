// src/games/pokemon-only-one/commands/putCardInZone.js

export class PutCardInZoneCommand {
  constructor({ cardId, zoneId }) {
    this.type = "PUT_CARD_IN_ZONE";
    this.cardId = cardId;
    this.zoneId = zoneId;
  }

  run(game) {
    game.putCardInZone(this.cardId, this.zoneId);
    const card = game.getCard(this.cardId);
    const zone = game.getZone(this.zoneId);

    if (card && zone) {
      game.log.add("CARD_PLACED", `Put ${card.name} in ${zone.name}.`, {
        cardId: this.cardId,
        zoneId: this.zoneId,
      });
    }
  }
}
