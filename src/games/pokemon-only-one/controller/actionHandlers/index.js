// src/games/pokemon-only-one/controller/actionHandlers/index.js

import { getDrawCommands } from "./drawActions.js";
import { getLogCommands } from "./logActions.js";
import { getPlacementCommands } from "./placementActions.js";
import { getPopupCommands } from "./popupActions.js";
import { getSettingsCommands } from "./settingsActions.js";
import { getSetupCommands } from "./setupActions.js";

const HANDLERS = [getSettingsCommands, getSetupCommands, getPopupCommands, getPlacementCommands, getDrawCommands, getLogCommands];

export function commandsForAction(action) {
  for (const handler of HANDLERS) {
    const commands = handler(action);
    if (commands) {
      return commands;
    }
  }

  return [];
}
