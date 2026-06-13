// src/games/pokemon-only-one/commands/closePopup.js

export class ClosePopupCommand {
  constructor() {
    this.type = "CLOSE_POPUP";
  }

  run(game) {
    game.display.closePopup();
    game.log.add("POPUP_CLOSED", "Closed popup.");
  }
}
