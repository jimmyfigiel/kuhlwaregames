// src/games/pokemon-only-one/controller/actionHandlers/popupActions.js

import { CloseCardZoomCommand } from "../../commands/closeCardZoom.js";
import { ClosePopupCommand } from "../../commands/closePopup.js";
import { OpenCardZoomCommand } from "../../commands/openCardZoom.js";
import { OpenZonePopupCommand } from "../../commands/openZonePopup.js";

export function getPopupCommands(action) {
  switch (action.type) {
    case "OPEN_CARD_ZOOM":
      return [new OpenCardZoomCommand({ cardId: action.cardId, playerSlot: action.playerSlot })];

    case "CLOSE_CARD_ZOOM":
      return [new CloseCardZoomCommand()];

    case "OPEN_ZONE_POPUP":
      return [new OpenZonePopupCommand({ zoneId: action.zoneId, playerSlot: action.playerSlot })];

    case "CLOSE_POPUP":
      return [new ClosePopupCommand()];

    default:
      return null;
  }
}
