// src/games/pokemon-only-one/commands/selectPokemonForPlacement.js

export class SelectPokemonForPlacementCommand {
  constructor({ cardId, sourceZoneId, playerSlot = null }) {
    this.type = "SELECT_POKEMON_FOR_PLACEMENT";
    this.cardId = cardId;
    this.sourceZoneId = sourceZoneId;
    this.playerSlot = playerSlot;
  }

  run(game) {
    const card = game.getCard(this.cardId);
    const sourceZone = game.getZone(this.sourceZoneId);
    const playMode = game.getPlayMode();

    if (!card) {
      game.log.add("COMMAND_ERROR", `Cannot select missing card ${this.cardId}.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
      });
      return;
    }

    if (!sourceZone) {
      game.log.add("COMMAND_ERROR", `Cannot select ${card.name} from missing zone ${this.sourceZoneId}.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
      });
      return;
    }

    if (!sourceZone.cardIds.includes(this.cardId)) {
      game.log.add("COMMAND_ERROR", `${card.name} is not in ${sourceZone.name}.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
      });
      return;
    }

    if (sourceZone.zoneKind !== "hand") {
      game.log.add("COMMAND_ERROR", `Only cards in a hand can be selected for setup placement.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
        zoneKind: sourceZone.zoneKind,
      });
      return;
    }

    if (!game.isPokemonCard(card)) {
      game.log.add("COMMAND_ERROR", `Only Pokémon cards can be placed as Active or Bench Pokémon.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
        cardType: card.cardType,
      });
      return;
    }

    if (!game.canActorModifyZone(this.playerSlot, sourceZone)) {
      game.log.add("COMMAND_ERROR", `You cannot act with cards from ${sourceZone.name} in ${playMode} mode.`, {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
        ownerId: sourceZone.ownerId,
        playerSlot: this.playerSlot,
        actingSide: game.playerSlotToSideId(this.playerSlot),
        playMode,
      });
      return;
    }

    game.display.selectCardForMove(this.cardId, this.sourceZoneId, {
      type: "PLACE_POKEMON",
      playerSlot: this.playerSlot,
      selectedBySideId: game.playerSlotToSideId(this.playerSlot),
    });
        game.log.add(
      "POKEMON_SELECTED_FOR_PLACEMENT",
      `Selected ${card.name} from ${sourceZone.name}. Choose an empty Active or Bench slot.`,
      {
        cardId: this.cardId,
        sourceZoneId: this.sourceZoneId,
        ownerId: sourceZone.ownerId,
        cardType: card.cardType,
        playMode,
      }
    );
  }
}

