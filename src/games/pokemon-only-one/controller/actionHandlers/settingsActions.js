// src/games/pokemon-only-one/controller/actionHandlers/settingsActions.js

import { SetPlayModeCommand } from "../../commands/setPlayMode.js";

export function getSettingsCommands(action) {
  if (action.type !== "SET_PLAY_MODE") {
    return null;
  }

  return [new SetPlayModeCommand({ playMode: action.playMode })];
}
