// src/games/pokemon-only-one/controller/actionHandlers/setupActions.js

import { ChooseFirstPlayerCommand } from "../../commands/chooseFirstPlayer.js";
import { FlipSetupCoinCommand } from "../../commands/flipSetupCoin.js";
import { MulliganSetupSideCommand } from "../../commands/mulliganSetupSide.js";
import { ReadySetupSideCommand } from "../../commands/readySetupSide.js";
import { SetPrizeCountCommand } from "../../commands/setPrizeCount.js";

export function getSetupCommands(action) {
  switch (action.type) {
    case "SET_PRIZE_COUNT":
      return [new SetPrizeCountCommand({ prizeCount: action.prizeCount })];

    case "FLIP_SETUP_COIN":
      return [new FlipSetupCoinCommand({ playerSlot: action.playerSlot })];

    case "CHOOSE_FIRST_PLAYER":
      return [new ChooseFirstPlayerCommand({ firstPlayerSideId: action.firstPlayerSideId, playerSlot: action.playerSlot })];

    case "MULLIGAN_SETUP_SIDE":
      return [new MulliganSetupSideCommand({ sideId: action.sideId, playerSlot: action.playerSlot })];

    case "READY_SETUP_SIDE":
      return [new ReadySetupSideCommand({ sideId: action.sideId, playerSlot: action.playerSlot })];

    default:
      return null;
  }
}
