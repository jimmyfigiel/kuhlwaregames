// src/games/pokemon-only-one/commands/mulliganSetupSide.js

export class MulliganSetupSideCommand {
  constructor({ sideId, playerSlot = null }) {
    this.type = "MULLIGAN_SETUP_SIDE";
    this.sideId = sideId === "opponent" ? "opponent" : "player";
    this.playerSlot = playerSlot;
  }

  run(game) {
    const side = game.getPlayerSide(this.sideId);
    const setupSide = game.getSetupSide(this.sideId);

    if (!side) {
      game.log.add("COMMAND_ERROR", `Cannot mulligan missing side ${this.sideId}.`, { sideId: this.sideId });
      return;
    }

    if (!game.canActorControlSide(this.playerSlot, this.sideId)) {
      game.log.add("COMMAND_ERROR", `Only ${side.name} can take this mulligan.`, {
        sideId: this.sideId,
        playerSlot: this.playerSlot,
        actingSide: game.playerSlotToSideId(this.playerSlot),
        playMode: game.getPlayMode(),
      });
      return;
    }

    if ((game.setup?.phase || "setup") !== "setup" || (game.setup?.step || "coinFlip") !== "mulligan") {
      game.log.add("COMMAND_ERROR", "A mulligan is not available right now.", {
        sideId: this.sideId,
        phase: game.setup?.phase,
        step: game.setup?.step,
      });
      return;
    }

    if (!setupSide.needsMulligan) {
      game.log.add("COMMAND_ERROR", `${side.name} does not need a mulligan.`, { sideId: this.sideId });
      return;
    }

    game.mulliganSetupSide(this.sideId);
  }
}
