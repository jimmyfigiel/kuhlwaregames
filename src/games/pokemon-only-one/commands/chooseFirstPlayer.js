// src/games/pokemon-only-one/commands/chooseFirstPlayer.js

export class ChooseFirstPlayerCommand {
  constructor({ firstPlayerSideId, playerSlot = null }) {
    this.type = "CHOOSE_FIRST_PLAYER";
    this.firstPlayerSideId = firstPlayerSideId === "opponent" ? "opponent" : "player";
    this.playerSlot = playerSlot;
  }

  run(game) {
    const coinFlip = game.setup?.coinFlip || null;

    if (!coinFlip?.winnerSideId) {
      game.log.add("COMMAND_ERROR", "Cannot choose who goes first before the setup coin flip.", { firstPlayerSideId: this.firstPlayerSideId });
      return;
    }

    if (!game.canActorControlSide(this.playerSlot, coinFlip.winnerSideId)) {
      const winner = game.getPlayerSide(coinFlip.winnerSideId);
      game.log.add("COMMAND_ERROR", `Only ${winner?.name || coinFlip.winnerSideId} can choose who goes first.`, {
        playerSlot: this.playerSlot,
        actingSide: game.playerSlotToSideId(this.playerSlot),
        winnerSideId: coinFlip.winnerSideId,
        firstPlayerSideId: this.firstPlayerSideId,
        playMode: game.getPlayMode(),
      });
      return;
    }

    if (game.setup?.firstPlayerSideId) {
      game.log.add("FIRST_PLAYER_ALREADY_CHOSEN", "The first player has already been chosen.", {
        firstPlayerSideId: game.setup.firstPlayerSideId,
      });
      return;
    }

    game.chooseFirstPlayer(this.firstPlayerSideId);
  }
}
