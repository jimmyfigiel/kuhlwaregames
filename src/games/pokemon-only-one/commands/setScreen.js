// src/games/pokemon-only-one/commands/setScreen.js

export class SetScreenCommand {
  constructor({ screen }) {
    this.type = "SET_SCREEN";
    this.screen = screen;
  }

  run(game) {
    game.display.setScreen(this.screen);
    game.log.add("SCREEN_SET", `Set screen to ${this.screen}.`, { screen: this.screen });
  }
}
