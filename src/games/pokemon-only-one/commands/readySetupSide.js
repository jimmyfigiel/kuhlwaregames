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

    game.setup = game.setup || {};
    const setupStep = game.setup.step || "coinFlip";
    if ((game.setup.phase || "setup") !== "setup" || !["placePokemon", "readyToReveal"].includes(setupStep)) {
      game.log.add("COMMAND_ERROR", `${side.name} cannot ready yet. Finish the setup steps first.`, {
        sideId: this.sideId,
        phase: game.setup.phase,
        step: setupStep,
      });
      return;
    }

    const setupSide = game.getSetupSide(this.sideId);
    if (setupSide.ready) {
      game.log.add("SETUP_ALREADY_READY", `${side.name} is already ready.`, { sideId: this.sideId });
      return;
    }

    if (setupSide.needsMulligan) {
      game.log.add("COMMAND_ERROR", `${side.name} must mulligan before setup can continue.`, { sideId: this.sideId });
      return;
    }

    const activeZone = game.getActiveZoneForSide(this.sideId);
    if (!activeZone || activeZone.count === 0) {
      game.log.add("COMMAND_ERROR", `${side.name} must choose one Basic Pokémon as Active before readying.`, { sideId: this.sideId });
      return;
    }

    setupSide.activePlaced = true;

    if (!setupSide.prizesSet) {
      game.setPrizesForSide(this.sideId);
    }

    game.markSetupSideReady(this.sideId);
    game.log.add("SETUP_SIDE_READY", `${side.name} is ready to reveal Pokémon.`, {
      sideId: this.sideId,
      prizeCount: game.setup.prizeCount,
      activePlaced: setupSide.activePlaced,
      prizesSet: game.getSetupSide(this.sideId).prizesSet,
    });

    if (game.areBothSetupSidesReady()) {
      game.revealSetupPokemonAndStartTurn();
    } else {
      game.setup.step = "readyToReveal";
    }
  }
}
