// src/games/pokemon-only-one/commands/setPrizeCount.js

export class SetPrizeCountCommand {
  constructor({ prizeCount }) {
    this.type = "SET_PRIZE_COUNT";
    this.prizeCount = prizeCount;
  }

  run(game) {
    if ((game.setup?.phase || "setup") !== "setup" || (game.setup?.step || "coinFlip") !== "coinFlip" || game.hasAnyReadySide()) {
      game.log.add("COMMAND_ERROR", "Cannot change prize count after setup has started.", {
        requestedPrizeCount: this.prizeCount,
        setup: game.setup,
      });
      return;
    }

    game.setPrizeCount(this.prizeCount);
    game.log.add("PRIZE_COUNT_SET", `Prize count set to ${game.setup.prizeCount}.`, {
      prizeCount: game.setup.prizeCount,
    });
  }
}
