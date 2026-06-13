// src/games/pokemon-only-one/controller/actionHandlers/logActions.js

import { ClearLogCommand } from "../../commands/clearLog.js";

export function getLogCommands(action) {
  if (action.type !== "CLEAR_LOG") {
    return null;
  }

  return [new ClearLogCommand()];
}
