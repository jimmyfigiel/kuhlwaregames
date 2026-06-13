// src/games/pokemon-only-one/commands/openCardZoom.js

export class OpenCardZoomCommand {
  constructor({ cardId, playerSlot = null }) {
    this.type = "OPEN_CARD_ZOOM";
    this.cardId = cardId;
    this.playerSlot = playerSlot;
  }

  run(game) {
    const card = game.getCard(this.cardId);

    if (!card) {
      game.log.add("COMMAND_ERROR", `Cannot zoom missing card ${this.cardId}.`, { cardId: this.cardId });
      return;
    }

    const sourceZone = game.getZoneContainingCard(this.cardId);
    const actingSideId = game.playerSlotToSideId(this.playerSlot);

    if (sourceZone && !game.canActorSeeCardFace(this.playerSlot, this.cardId)) {
      game.log.add("COMMAND_ERROR", `You cannot zoom hidden card ${this.cardId} in ${game.getPlayMode()} mode.`, {
        cardId: this.cardId,
        sourceZoneId: sourceZone.id,
        sourceZoneKind: sourceZone.zoneKind,
        ownerId: sourceZone.ownerId,
        playerSlot: this.playerSlot,
        actingSideId,
        playMode: game.getPlayMode(),
      });
      return;
    }

    game.display.openCardZoom(this.cardId, {
      openedBySideId: actingSideId,
      sourceZoneId: sourceZone?.id || null,
    });
    game.log.add("CARD_ZOOM_OPENED", `Opened zoom for ${card.name}.`, { cardId: this.cardId, playerSlot: this.playerSlot, actingSideId });
  }
}
