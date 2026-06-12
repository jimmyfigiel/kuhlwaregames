// src/games/pokemon-only-one/commands/clearLog.js

export class ClearLogCommand {
  constructor() {
    this.type = "CLEAR_LOG";
  }

  run(game) {
    game.log.clear();
  }
}
