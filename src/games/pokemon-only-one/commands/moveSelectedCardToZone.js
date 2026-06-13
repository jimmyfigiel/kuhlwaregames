// src/games/pokemon-only-one/commands/moveSelectedCardToZone.js

import { PlaceSelectedPokemonCommand } from "./placeSelectedPokemon.js";

// Backward-compatible name from the earlier hand-to-bench version.
// The current setup action is PLACE_SELECTED_POKEMON, which can place a selected Pokémon
// from hand into an empty Active or Bench zone on the same side.
export class MoveSelectedCardToZoneCommand extends PlaceSelectedPokemonCommand {
  constructor({ targetZoneId }) {
    super({ targetZoneId });
    this.type = "MOVE_SELECTED_CARD_TO_ZONE";
  }
}
