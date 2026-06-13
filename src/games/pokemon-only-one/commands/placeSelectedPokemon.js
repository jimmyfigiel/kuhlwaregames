// src/games/pokemon-only-one/commands/placeSelectedPokemon.js

export class PlaceSelectedPokemonCommand {
  constructor({ targetZoneId, playerSlot = null }) {
    this.type = "PLACE_SELECTED_POKEMON";
    this.targetZoneId = targetZoneId;
    this.playerSlot = playerSlot;
  }

  run(game) {
    const selection = game.display.selection || null;

    if (!selection?.cardId) {
      game.log.add("COMMAND_ERROR", "No Pokémon is selected for placement.", {
        targetZoneId: this.targetZoneId,
      });
      return;
    }

    const card = game.getCard(selection.cardId);
    const sourceZone = game.getZone(selection.sourceZoneId);
    const targetZone = game.getZone(this.targetZoneId);
    const playMode = game.getPlayMode();

    if (!card) {
      game.log.add("COMMAND_ERROR", `Cannot place missing card ${selection.cardId}.`, {
        cardId: selection.cardId,
        sourceZoneId: selection.sourceZoneId,
        targetZoneId: this.targetZoneId,
      });
      game.display.clearSelection();
      return;
    }

    if (!game.isPokemonCard(card)) {
      game.log.add("COMMAND_ERROR", `Only Pokémon cards can be placed as Active or Bench Pokémon.`, {
        cardId: card.id,
        cardType: card.cardType,
        sourceZoneId: selection.sourceZoneId,
        targetZoneId: this.targetZoneId,
      });
      game.display.clearSelection();
      return;
    }

    if (!sourceZone || !sourceZone.cardIds.includes(card.id)) {
      game.log.add("COMMAND_ERROR", `${card.name} is no longer in the selected source zone.`, {
        cardId: card.id,
        sourceZoneId: selection.sourceZoneId,
        targetZoneId: this.targetZoneId,
      });
      game.display.clearSelection();
      return;
    }

    if (!targetZone) {
      game.log.add("COMMAND_ERROR", `Cannot place ${card.name} in missing zone ${this.targetZoneId}.`, {
        cardId: card.id,
        sourceZoneId: sourceZone.id,
        targetZoneId: this.targetZoneId,
      });
      return;
    }

    if (sourceZone.zoneKind !== "hand") {
      game.log.add("COMMAND_ERROR", `${sourceZone.name} is not a legal source hand for setup placement.`, {
        cardId: card.id,
        sourceZoneId: sourceZone.id,
        targetZoneId: targetZone.id,
        sourceZoneKind: sourceZone.zoneKind,
      });
      game.display.clearSelection();
      return;
    }

    if (!["active", "bench"].includes(targetZone.zoneKind)) {
      game.log.add("COMMAND_ERROR", `${targetZone.name} is not a legal Active or Bench target.`, {
        cardId: card.id,
        sourceZoneId: sourceZone.id,
        targetZoneId: targetZone.id,
        targetZoneKind: targetZone.zoneKind,
      });
      return;
    }

    if (targetZone.ownerId !== sourceZone.ownerId) {
      game.log.add("COMMAND_ERROR", `${targetZone.name} belongs to ${targetZone.ownerId}, but ${card.name} was selected from ${sourceZone.ownerId}'s hand.`, {
        cardId: card.id,
        sourceZoneId: sourceZone.id,
        targetZoneId: targetZone.id,
        sourceOwnerId: sourceZone.ownerId,
        targetOwnerId: targetZone.ownerId,
      });
      return;
    }

    if (!game.canActorControlZone(this.playerSlot, sourceZone) || !game.canActorControlZone(this.playerSlot, targetZone)) {
      game.log.add("COMMAND_ERROR", `You cannot place ${card.name} from ${sourceZone.name} into ${targetZone.name} in ${playMode} mode.`, {
        cardId: card.id,
        sourceZoneId: sourceZone.id,
        targetZoneId: targetZone.id,
        playerSlot: this.playerSlot,
        actingSide: game.playerSlotToSideId(this.playerSlot),
        sourceOwnerId: sourceZone.ownerId,
        targetOwnerId: targetZone.ownerId,
        playMode,
      });
      return;
    }

    if (!targetZone.canAcceptCard()) {
      game.log.add("COMMAND_ERROR", `${targetZone.name} is full.`, {
        cardId: card.id,
        sourceZoneId: sourceZone.id,
        targetZoneId: targetZone.id,
      });
      return;
    }

    game.putCardInZone(card.id, targetZone.id);
    game.display.clearSelection();
    game.log.add("POKEMON_PLACED", `Placed ${card.name} from ${sourceZone.name} into ${targetZone.name}.`, {
      cardId: card.id,
      sourceZoneId: sourceZone.id,
      targetZoneId: targetZone.id,
      targetZoneKind: targetZone.zoneKind,
      playMode,
    });
  }
}

