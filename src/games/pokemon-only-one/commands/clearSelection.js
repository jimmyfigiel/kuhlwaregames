// src/games/pokemon-only-one/commands/clearSelection.js

export class ClearSelectionCommand {
  constructor() {
    this.type = "CLEAR_SELECTION";
  }

  run(game) {
    game.display.clearSelection();
    game.log.add("SELECTION_CLEARED", "Cleared card selection.");
  }
}
