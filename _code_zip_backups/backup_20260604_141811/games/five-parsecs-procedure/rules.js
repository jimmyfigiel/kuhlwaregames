import EngineContext from "./engine/context/EngineContext";
import { CommandFactory } from "./engine/factory";
import CommandQueue from "./engine/queue/CommandQueue";

function buildInitialCommandQueue() {
  const factory = new CommandFactory();

  return [
    factory
      .popupMessage({
        id: "welcome-to-five-parsecs",
        title: "Welcome",
        message: "Welcome to 5 Parsecs",
        buttonText: "OK",
      })
      .toJSON(),
  ];
}

export function createInitialState() {
  return {
    gameTitle: "Five Parsecs Procedure Engine",
    queueStatus: "idle",
    activeCommand: null,
    commandQueue: buildInitialCommandQueue(),

    crewLog: {
      title: "Crew Log",
      crewName: "",
      credits: 0,
      ship: "",
      crewMembers: [],
      notes: "",
    },

    encounterLog: {
      title: "Encounter Log",
      patron: "",
      rival: "",
      objective: "",
      enemy: "",
      result: "",
      notes: "",
    },

    worldLog: {
      title: "World Log",
      currentWorld: "",
      worldTraits: [],
      license: "",
      invasion: "",
      notes: "",
    },

    logEntries: [],
  };
}

export function initializeMissingGameState(existingState = {}) {
  const freshState = createInitialState();
  const hasCommandQueue = Object.prototype.hasOwnProperty.call(
    existingState,
    "commandQueue"
  );
  const hasActiveCommand = Object.prototype.hasOwnProperty.call(
    existingState,
    "activeCommand"
  );

  return {
    ...freshState,
    ...existingState,
    queueStatus: existingState.queueStatus || freshState.queueStatus,
    activeCommand: hasActiveCommand
      ? existingState.activeCommand
      : freshState.activeCommand,
    commandQueue: hasCommandQueue
      ? Array.isArray(existingState.commandQueue)
        ? existingState.commandQueue
        : []
      : freshState.commandQueue,
    crewLog: {
      ...freshState.crewLog,
      ...(existingState.crewLog || {}),
    },
    encounterLog: {
      ...freshState.encounterLog,
      ...(existingState.encounterLog || {}),
    },
    worldLog: {
      ...freshState.worldLog,
      ...(existingState.worldLog || {}),
    },
    logEntries: Array.isArray(existingState.logEntries)
      ? existingState.logEntries
      : freshState.logEntries,
  };
}

function normalizeAction(args) {
  const possibleAction = args.find((arg) => arg && typeof arg === "object" && arg.type);

  if (possibleAction) {
    return possibleAction;
  }

  const wrappedAction = args.find(
    (arg) => arg && typeof arg === "object" && arg.action && arg.action.type
  );

  return wrappedAction ? wrappedAction.action : null;
}

function executeQueue(state) {
  const safeState = initializeMissingGameState(state);

  if (safeState.activeCommand) {
    return safeState;
  }

  const factory = new CommandFactory();
  const queue = CommandQueue.fromJSON(safeState.commandQueue, factory);
  const engineContext = new EngineContext({ state: safeState });

  queue.executeUntilStop(engineContext);

  return {
    ...safeState,
    commandQueue: queue.toJSON(),
    activeCommand: engineContext.activeCommand,
    queueStatus: engineContext.status,
    logEntries: [...safeState.logEntries, ...engineContext.logEntries],
  };
}

function resolveActiveCommand(state) {
  const safeState = initializeMissingGameState(state);

  if (!safeState.activeCommand) {
    return safeState;
  }

  return {
    ...safeState,
    activeCommand: null,
    queueStatus:
      Array.isArray(safeState.commandQueue) && safeState.commandQueue.length > 0
        ? "idle"
        : "empty",
    logEntries: [
      ...safeState.logEntries,
      {
        id: `log-${Date.now()}`,
        type: "commandCompleted",
        text: `Completed command: ${safeState.activeCommand.title || safeState.activeCommand.type}`,
        commandId: safeState.activeCommand.id,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function submitAction(...args) {
  const stateArg = args.find(
    (arg) =>
      arg &&
      typeof arg === "object" &&
      (Object.prototype.hasOwnProperty.call(arg, "commandQueue") ||
        Object.prototype.hasOwnProperty.call(arg, "crewLog") ||
        Object.prototype.hasOwnProperty.call(arg, "worldLog"))
  );

  const state = initializeMissingGameState(stateArg || {});
  const action = normalizeAction(args);

  if (!action) {
    return state;
  }

  switch (action.type) {
    case "EXECUTE_QUEUE":
      return executeQueue(state);

    case "RESOLVE_ACTIVE_COMMAND":
      return resolveActiveCommand(state);

    default:
      return state;
  }
}

export default {
  createInitialState,
  initializeMissingGameState,
  submitAction,
};
