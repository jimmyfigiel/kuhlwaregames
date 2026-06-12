// src/games/pokemon-only-one/commands/openCardZoom.js

export class OpenCardZoomCommand {
  constructor({ cardId }) {
    this.type = "OPEN_CARD_ZOOM";
    this.cardId = cardId;
  }

  run(game) {
    const card = game.getCard(this.cardId);
    if (!card) {
      game.log.add("COMMAND_ERROR", `Cannot zoom missing card ${this.cardId}.`, { cardId: this.cardId });
      return;
    }

    game.display.openCardZoom(this.cardId);
    game.log.add("ZOOM_OPENED", `Opened zoom for ${card.name}.`, { cardId: this.cardId });
  }
}
