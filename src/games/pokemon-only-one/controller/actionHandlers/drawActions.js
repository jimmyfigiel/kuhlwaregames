// src/games/pokemon-only-one/controller/actionHandlers/drawActions.js

import { DrawCardCommand } from "../../commands/drawCard.js";

export function getDrawCommands(action) {
  if (action.type !== "DRAW_CARD") {
    return null;
  }

  return [new DrawCardCommand({ deckZoneId: action.deckZoneId, playerSlot: action.playerSlot })];
}
