// src/games/pokemon-only-one/commands/selectCardForMove.js

export class SelectCardForMoveCommand {
  constructor({ cardId, sourceZoneId }) {
    this.type = "SELECT_CARD_FOR_MOVE";
    this.cardId = cardId;
    this.sourceZoneId = sourceZoneId;
  }

  run(game) {
    const card = game.getCard(this.cardId);
    const sourceZone = game.getZone(this.sourceZoneId);
    const onePlayerTestMode = Boolean(game.settings?.onePlayerTestMode);

    if (!card) {
      game.log.add("COMMAND_ERROR", `Cannot select missing card ${this.cardId}.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
      });
      return;
    }

    if (!sourceZone) {
      game.log.add("COMMAND_ERROR", `Cannot select ${card.name} from missing zone ${this.sourceZoneId}.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
      });
      return;
    }

    if (!sourceZone.cardIds.includes(this.cardId)) {
      game.log.add("COMMAND_ERROR", `${card.name} is not in ${sourceZone.name}.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
      });
      return;
    }

    if (sourceZone.zoneKind !== "hand") {
      game.log.add("COMMAND_ERROR", `Only cards in a hand can be selected for this move.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
        ownerId: sourceZone.ownerId,
        zoneKind: sourceZone.zoneKind,
      });
      return;
    }

    if (!onePlayerTestMode && sourceZone.ownerId !== "player") {
      game.log.add("COMMAND_ERROR", `Only cards in the player's hand can be selected outside one-player test mode.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
        ownerId: sourceZone.ownerId,
        zoneKind: sourceZone.zoneKind,
        onePlayerTestMode,
      });
      return;
    }

    game.display.selectCardForMove(this.cardId, this.sourceZoneId);
    game.log.add("CARD_SELECTED_FOR_MOVE", `Selected ${card.name} from ${sourceZone.name}. Choose an empty ${sourceZone.ownerId} bench slot.`, {
      cardId: this.cardId,
      sourceZoneId: this.sourceZoneId,
      ownerId: sourceZone.ownerId,
      onePlayerTestMode,
    });
  }
}
