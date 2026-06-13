// src/games/pokemon-only-one/commands/setPlayMode.js

export class SetPlayModeCommand {
  constructor({ playMode }) {
    this.type = "SET_PLAY_MODE";
    this.playMode = playMode === "twoPlayer" ? "twoPlayer" : "onePlayerTest";
  }

  run(game) {
    game.setPlayMode(this.playMode);
    game.log.add("PLAY_MODE_SET", `Play mode set to ${this.playMode}.`, {
      playMode: this.playMode,
      onePlayerTestMode: game.isOnePlayerTestMode(),
    });
  }
}
