// src/games/pokemon-only-one/controller/actionHandlers/placementActions.js

import { ClearSelectionCommand } from "../../commands/clearSelection.js";
import { MoveSelectedCardToZoneCommand } from "../../commands/moveSelectedCardToZone.js";
import { PlaceSelectedPokemonCommand } from "../../commands/placeSelectedPokemon.js";
import { SelectPokemonForPlacementCommand } from "../../commands/selectPokemonForPlacement.js";

export function getPlacementCommands(action) {
  switch (action.type) {
    case "SELECT_POKEMON_FOR_PLACEMENT":
      return [new SelectPokemonForPlacementCommand({ cardId: action.cardId, sourceZoneId: action.sourceZoneId, playerSlot: action.playerSlot })];

    // Backward-compatible alias from the earlier hand-to-bench version.
    case "SELECT_CARD_FOR_MOVE":
      return [new SelectPokemonForPlacementCommand({ cardId: action.cardId, sourceZoneId: action.sourceZoneId, playerSlot: action.playerSlot })];

    case "PLACE_SELECTED_POKEMON":
      return [new PlaceSelectedPokemonCommand({ targetZoneId: action.targetZoneId, playerSlot: action.playerSlot })];

    case "PLACE_POKEMON_FROM_HAND":
      return [
        new SelectPokemonForPlacementCommand({ cardId: action.cardId, sourceZoneId: action.sourceZoneId, playerSlot: action.playerSlot }),
        new PlaceSelectedPokemonCommand({ targetZoneId: action.targetZoneId, playerSlot: action.playerSlot }),
      ];

    // Backward-compatible alias from the earlier hand-to-bench version.
    case "MOVE_SELECTED_CARD_TO_ZONE":
      return [new MoveSelectedCardToZoneCommand({ targetZoneId: action.targetZoneId })];

    case "CLEAR_SELECTION":
      return [new ClearSelectionCommand()];

    default:
      return null;
  }
}
