// src/games/pokemon-only-one/commands/closeCardZoom.js

export class CloseCardZoomCommand {
  constructor() {
    this.type = "CLOSE_CARD_ZOOM";
  }

  run(game) {
    game.display.closePopup();
    game.log.add("CARD_ZOOM_CLOSED", "Closed card zoom.");
  }
}
