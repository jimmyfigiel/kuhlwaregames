// src/games/pokemon-only-one/commands/drawCard.js

export class DrawCardCommand {
  constructor({ deckZoneId, playerSlot = null }) {
    this.type = "DRAW_CARD";
    this.deckZoneId = deckZoneId;
    this.playerSlot = playerSlot;
  }

  run(game) {
    const deckZone = game.getZone(this.deckZoneId);

    if (!deckZone) {
      game.log.add("COMMAND_ERROR", `Cannot draw from missing deck ${this.deckZoneId}.`, {
        deckZoneId: this.deckZoneId,
      });
      return;
    }

    if (!game.canActorControlZone(this.playerSlot, deckZone)) {
      game.log.add("COMMAND_ERROR", `You cannot draw from ${deckZone.name} in ${game.getPlayMode()} mode.`, {
        deckZoneId: deckZone.id,
        ownerId: deckZone.ownerId,
        playerSlot: this.playerSlot,
        actingSide: game.playerSlotToSideId(this.playerSlot),
        playMode: game.getPlayMode(),
      });
      return;
    }

    if (deckZone.zoneKind !== "deck") {
      game.log.add("COMMAND_ERROR", `${deckZone.name} is not a deck.`, {
        deckZoneId: deckZone.id,
        zoneKind: deckZone.zoneKind,
      });
      return;
    }

    const side = game.getSideByDeckZone(deckZone.id);
    if (!side) {
      game.log.add("COMMAND_ERROR", `No player side owns deck ${deckZone.name}.`, {
        deckZoneId: deckZone.id,
        ownerId: deckZone.ownerId,
      });
      return;
    }

    const handZone = game.getZone(side.handZoneId);
    if (!handZone) {
      game.log.add("COMMAND_ERROR", `Cannot draw from ${deckZone.name}; missing hand zone ${side.handZoneId}.`, {
        deckZoneId: deckZone.id,
        handZoneId: side.handZoneId,
      });
      return;
    }

    if (handZone.zoneKind !== "hand") {
      game.log.add("COMMAND_ERROR", `${handZone.name} is not a hand.`, {
        deckZoneId: deckZone.id,
        handZoneId: handZone.id,
        handZoneKind: handZone.zoneKind,
      });
      return;
    }

    const cardId = deckZone.topCardId();
    if (!cardId) {
      game.log.add("DECK_EMPTY", `${deckZone.name} is empty. No card drawn.`, {
        deckZoneId: deckZone.id,
        handZoneId: handZone.id,
      });
      return;
    }

    const card = game.getCard(cardId);
    if (!card) {
      game.log.add("COMMAND_ERROR", `${deckZone.name} contains missing card ${cardId}.`, {
        deckZoneId: deckZone.id,
        handZoneId: handZone.id,
        cardId,
      });
      return;
    }

    if (!handZone.canAcceptCard()) {
      game.log.add("COMMAND_ERROR", `${handZone.name} is full. Cannot draw ${card.name}.`, {
        deckZoneId: deckZone.id,
        handZoneId: handZone.id,
        cardId,
      });
      return;
    }

    game.putCardInZone(card.id, handZone.id);
    game.display.openCardZoom(card.id, {
      openedBySideId: side.id,
      sourceZoneId: handZone.id,
      visibilityReason: "drawn-card",
    });
    game.log.add("CARD_DRAWN", `Drew ${card.name} from ${deckZone.name} to ${handZone.name}.`, {
      cardId: card.id,
      cardName: card.name,
      deckZoneId: deckZone.id,
      handZoneId: handZone.id,
      remainingDeckCount: game.getZone(deckZone.id)?.count || 0,
      handCount: game.getZone(handZone.id)?.count || 0,
    });
  }
}
