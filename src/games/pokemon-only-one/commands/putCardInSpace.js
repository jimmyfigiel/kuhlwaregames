// src/games/pokemon-only-one/commands/putCardInSpace.js

export class PutCardInSpaceCommand {
  constructor({ cardId, spaceId }) {
    this.type = "PUT_CARD_IN_SPACE";
    this.cardId = cardId;
    this.spaceId = spaceId;
  }

  run(game) {
    game.putCardInSpace(this.cardId, this.spaceId);
    const card = game.getCard(this.cardId);
    const space = game.getSpace(this.spaceId);
    if (card && space) {
      game.log.add("CARD_PLACED", `Put ${card.name} in ${space.name}.`, {
        cardId: this.cardId,
        spaceId: this.spaceId,
      });
    }
  }
}
