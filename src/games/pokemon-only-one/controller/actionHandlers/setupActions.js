// src/games/pokemon-only-one/controller/actionHandlers/setupActions.js

import { ReadySetupSideCommand } from "../../commands/readySetupSide.js";
import { SetPrizeCountCommand } from "../../commands/setPrizeCount.js";

export function getSetupCommands(action) {
  switch (action.type) {
    case "SET_PRIZE_COUNT":
      return [new SetPrizeCountCommand({ prizeCount: action.prizeCount })];

    case "READY_SETUP_SIDE":
      return [new ReadySetupSideCommand({ sideId: action.sideId, playerSlot: action.playerSlot })];

    default:
      return null;
  }
}
