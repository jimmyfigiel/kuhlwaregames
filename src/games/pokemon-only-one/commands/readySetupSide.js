// src/games/pokemon-only-one/commands/readySetupSide.js

export class ReadySetupSideCommand {
  constructor({ sideId, playerSlot = null }) {
    this.type = "READY_SETUP_SIDE";
    this.sideId = sideId === "opponent" ? "opponent" : "player";
    this.playerSlot = playerSlot;
  }

  run(game) {
    const side = game.getPlayerSide(this.sideId);
    if (!side) {
      game.log.add("COMMAND_ERROR", `Cannot ready missing setup side ${this.sideId}.`, { sideId: this.sideId });
      return;
    }

    if (!game.canActorControlSide(this.playerSlot, this.sideId)) {
      game.log.add("COMMAND_ERROR", `You cannot ready ${side.name} in ${game.getPlayMode()} mode.`, {
        sideId: this.sideId,
        playerSlot: this.playerSlot,
        actingSide: game.playerSlotToSideId(this.playerSlot),
        playMode: game.getPlayMode(),
      });
      return;
    }

    const setupSide = game.getSetupSide(this.sideId);
    if (setupSide.ready) {
      game.log.add("SETUP_ALREADY_READY", `${side.name} is already ready.`, { sideId: this.sideId });
      return;
    }

    if (!setupSide.openingHandDrawn) {
      game.drawOpeningHandForSide(this.sideId, 7);
    }

    if (!setupSide.prizesSet) {
      game.setPrizesForSide(this.sideId);
    }

    game.markSetupSideReady(this.sideId);
    game.log.add("SETUP_SIDE_READY", `${side.name} is ready.`, {
      sideId: this.sideId,
      prizeCount: game.setup.prizeCount,
      openingHandDrawn: game.getSetupSide(this.sideId).openingHandDrawn,
      prizesSet: game.getSetupSide(this.sideId).prizesSet,
    });

    if (game.areBothSetupSidesReady()) {
      game.resolveSetupCoinFlip();
    }
  }
}
