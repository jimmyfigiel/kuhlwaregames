// src/games/pokemon-only-one/commands/flipSetupCoin.js

export class FlipSetupCoinCommand {
  constructor({ playerSlot = null } = {}) {
    this.type = "FLIP_SETUP_COIN";
    this.playerSlot = playerSlot;
  }

  run(game) {
    game.setup = game.setup || {};

    if ((game.setup.phase || "setup") !== "setup") {
      game.log.add("COMMAND_ERROR", "The setup coin has already been resolved.", { phase: game.setup.phase });
      return;
    }

    if (game.setup.coinFlip?.winnerSideId) {
      game.log.add("SETUP_COIN_ALREADY_FLIPPED", "The setup coin has already been flipped.", game.setup.coinFlip);
      game.display.openCoinFlip(game.setup.coinFlip);
      return;
    }

    game.flipSetupCoin();
  }
}
