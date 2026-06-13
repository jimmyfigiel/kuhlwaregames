// src/games/pokemon-only-one/controller/gameController.js

import { commandsForAction } from "./actionHandlers/index.js";
import { runCommands } from "./commandRunner.js";
import { createInitialGameCommands } from "./setup/createInitialGameCommands.js";
import { createEmptyModel } from "../model/createInitialModel.js";
import { hydrateGame } from "../model/hydrateGame.js";
import { serializeGame } from "../model/serializeGame.js";

export class GameController {
  createInitialModel(options = {}) {
    const game = hydrateGame(createEmptyModel());
    const commands = createInitialGameCommands();

    game.log.add("CONTROLLER_STARTED", "Creating initial battle model with randomized 60-card decks only.", { options });
    runCommands(game, commands);
    game.log.add("CONTROLLER_COMPLETED", "Initial battle model created. Draw cards, then place an active Pokémon and bench Pokémon from hand.");

    return serializeGame(game);
  }

  handleBridgeError(model, bridgeDebug = null) {
    const game = hydrateGame(model || this.createInitialModel());

    game.debug = {
      ...(game.debug || {}),
      lastSubmitShape: bridgeDebug,
    };

    game.log.add(
      "BRIDGE_ERROR",
      "No action reached rules.submitAction. Check the GameLoader action envelope.",
      bridgeDebug
    );

    return serializeGame(game);
  }

  handleAction(model, action, bridgeDebug = null) {
    const game = hydrateGame(model || this.createInitialModel());

    game.debug = {
      ...(game.debug || {}),
      lastSubmittedAction: action,
      lastSubmitShape: bridgeDebug,
    };

    game.log.add("ACTION_RECEIVED", `Controller received ${action.type}.`, action);

    const commands = commandsForAction(action);
    if (commands.length === 0) {
      game.log.add("ACTION_ERROR", `No command for action ${action.type}.`, action);
      return serializeGame(game);
    }

    runCommands(game, commands);
    return serializeGame(game);
  }
}
