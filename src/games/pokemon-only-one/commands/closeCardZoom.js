// src/games/pokemon-only-one/commands/closeCardZoom.js

export class CloseCardZoomCommand {
  constructor() {
    this.type = "CLOSE_CARD_ZOOM";
  }

  run(game) {
    const cardId = game.display.zoomCardId;
    const card = cardId ? game.getCard(cardId) : null;
    game.display.closeCardZoom();
    game.log.add("ZOOM_CLOSED", card ? `Closed zoom for ${card.name}.` : "Closed zoom.", { cardId });
  }
}
