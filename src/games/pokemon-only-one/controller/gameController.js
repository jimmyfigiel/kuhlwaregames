// src/games/pokemon-only-one/controller/gameController.js

import { ClearLogCommand } from "../commands/clearLog.js";
import { CloseCardZoomCommand } from "../commands/closeCardZoom.js";
import { CreateAreaCommand } from "../commands/createArea.js";
import { CreateCardCommand } from "../commands/createCard.js";
import { CreateSpaceCommand } from "../commands/createSpace.js";
import { OpenCardZoomCommand } from "../commands/openCardZoom.js";
import { PutCardInSpaceCommand } from "../commands/putCardInSpace.js";
import { createEmptyModel } from "../model/createInitialModel.js";
import { hydrateGame } from "../model/hydrateGame.js";
import { serializeGame } from "../model/serializeGame.js";

const PIKACHU = {
  cardId: "pikachu",
  name: "Pikachu",
  cardType: "Basic Pokémon",
  imagePath: "/card-images/pokemon/base-set/058-pikachu.jpg",
  ownerId: "p1",
};

export class GameController {
  createInitialModel(options = {}) {
    const game = hydrateGame(createEmptyModel());

    const commands = [
      new CreateAreaCommand({ areaId: "mainArea", name: "Main Area" }),
      new CreateSpaceCommand({ spaceId: "space1", name: "Card Space 1" }),
      new CreateSpaceCommand({ spaceId: "space2", name: "Card Space 2" }),
      new CreateCardCommand(PIKACHU),
      new PutCardInSpaceCommand({ cardId: "pikachu", spaceId: "space1" }),
    ];

    game.log.add("CONTROLLER_STARTED", "Creating initial model.", { options });
    this.runCommands(game, commands);
    game.log.add("CONTROLLER_COMPLETED", "Initial model created.");

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
      "No action reached rules.submitAction. Check the game view action callback prop.",
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

    const commands = this.commandsForAction(action);
    if (commands.length === 0) {
      game.log.add("ACTION_ERROR", `No command for action ${action.type}.`, action);
      return serializeGame(game);
    }

    this.runCommands(game, commands);
    return serializeGame(game);
  }

  commandsForAction(action) {
    switch (action.type) {
      case "OPEN_CARD_ZOOM":
        return [new OpenCardZoomCommand({ cardId: action.cardId })];

      case "CLOSE_CARD_ZOOM":
        return [new CloseCardZoomCommand()];

      case "CLEAR_LOG":
        return [new ClearLogCommand()];

      default:
        return [];
    }
  }

  runCommands(game, commands) {
    for (const command of commands) {
      game.log.add("COMMAND_STARTED", `${command.type} started.`, commandToDetails(command));
      command.run(game);
      game.log.add("COMMAND_COMPLETED", `${command.type} completed.`, commandToDetails(command));
    }
  }
}

function commandToDetails(command) {
  const details = {};
  for (const [key, value] of Object.entries(command)) {
    if (typeof value !== "function") {
      details[key] = value;
    }
  }
  return details;
}
