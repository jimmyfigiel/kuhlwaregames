import EngineContext from "./engine/context/EngineContext";
import { CommandFactory } from "./engine/factory";
import CommandQueue from "./engine/queue/CommandQueue";
import { removeUndefinedValues } from "./engine/utils";

function buildInitialCommandQueue() {
  const factory = new CommandFactory();

  return [
    factory
      .popupMessage({
        id: "welcome-to-five-parsecs",
        title: "Welcome",
        message: "Welcome to Five Parsecs from Home! Let's build a crew.",
        buttonText: "OK",
      })
      .toJSON(),
    factory
      .numberInput({
        id: "choose-starting-crew-count",
        title: "Starting Crew Size",
        prompt: "How many crew members do you want to start with?",
        defaultValue: 6,
        min: 1,
        max: 20,
        saveTo: "crewLog.startingCrewCount",
        buttonText: "OK",
      })
      .toJSON(),
  ];
}

function createBlankState() {
  return {
    gameTitle: "Five Parsecs Procedure Engine",
    hasInitializedCommandQueue: false,
    queueStatus: "idle",
    activeCommand: null,
    commandQueue: [],

    crewLog: {
      title: "Crew Log",
      crewName: "",
      startingCrewCount: null,
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

export function createInitialState() {
  return removeUndefinedValues({
    ...createBlankState(),
    hasInitializedCommandQueue: true,
    commandQueue: buildInitialCommandQueue(),
  });
}

export function initializeMissingGameState(existingState = {}) {
  const blankState = createBlankState();
  const safeExistingState =
    existingState && typeof existingState === "object" ? existingState : {};

  const hasCommandQueue = Object.prototype.hasOwnProperty.call(
    safeExistingState,
    "commandQueue"
  );
  const hasActiveCommand = Object.prototype.hasOwnProperty.call(
    safeExistingState,
    "activeCommand"
  );
  const hasInitializedCommandQueue =
    safeExistingState.hasInitializedCommandQueue === true;

  let commandQueue;

  if (hasCommandQueue) {
    commandQueue = Array.isArray(safeExistingState.commandQueue)
      ? safeExistingState.commandQueue
      : [];
  } else if (hasInitializedCommandQueue) {
    commandQueue = [];
  } else {
    commandQueue = buildInitialCommandQueue();
  }

  return removeUndefinedValues({
    ...blankState,
    ...safeExistingState,
    hasInitializedCommandQueue: true,
    queueStatus: safeExistingState.queueStatus || blankState.queueStatus,
    activeCommand: hasActiveCommand
      ? safeExistingState.activeCommand
      : blankState.activeCommand,
    commandQueue,
    crewLog: {
      ...blankState.crewLog,
      ...(safeExistingState.crewLog || {}),
    },
    encounterLog: {
      ...blankState.encounterLog,
      ...(safeExistingState.encounterLog || {}),
    },
    worldLog: {
      ...blankState.worldLog,
      ...(safeExistingState.worldLog || {}),
    },
    logEntries: Array.isArray(safeExistingState.logEntries)
      ? safeExistingState.logEntries
      : blankState.logEntries,
  });
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

function looksLikeGameState(value) {
  return (
    value &&
    typeof value === "object" &&
    (Object.prototype.hasOwnProperty.call(value, "commandQueue") ||
      Object.prototype.hasOwnProperty.call(value, "activeCommand") ||
      Object.prototype.hasOwnProperty.call(value, "hasInitializedCommandQueue") ||
      Object.prototype.hasOwnProperty.call(value, "crewLog") ||
      Object.prototype.hasOwnProperty.call(value, "worldLog"))
  );
}

function normalizeState(args, action) {
  const directStateArg = args.find((arg) => looksLikeGameState(arg));

  if (directStateArg) {
    return initializeMissingGameState(directStateArg);
  }

  if (action && looksLikeGameState(action.stateSnapshot)) {
    return initializeMissingGameState(action.stateSnapshot);
  }

  if (action && looksLikeGameState(action.gameState)) {
    return initializeMissingGameState(action.gameState);
  }

  return initializeMissingGameState({});
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

  const nextState = {
    ...engineContext.state,
    hasInitializedCommandQueue: true,
    commandQueue: queue.toJSON(),
    activeCommand: engineContext.activeCommand,
    queueStatus: engineContext.status,
    logEntries: [...safeState.logEntries, ...engineContext.logEntries],
  };

  if (!nextState.activeCommand && nextState.commandQueue.length === 0) {
    nextState.queueStatus = "empty";
  }

  return removeUndefinedValues(nextState);
}

function resolveActiveCommand(state, action = {}) {
  const safeState = initializeMissingGameState(state);

  if (!safeState.activeCommand) {
    return safeState;
  }

  const factory = new CommandFactory();
  const activeCommand = factory.fromJSON(safeState.activeCommand);

  if (!activeCommand) {
    return {
      ...safeState,
      activeCommand: null,
      queueStatus:
        Array.isArray(safeState.commandQueue) && safeState.commandQueue.length > 0
          ? "idle"
          : "empty",
    };
  }

  const engineContext = new EngineContext({ state: safeState });
  activeCommand.resolve(engineContext, action.input || {});

  const commandQueue = Array.isArray(safeState.commandQueue)
    ? safeState.commandQueue
    : [];

  const nextState = {
    ...engineContext.state,
    hasInitializedCommandQueue: true,
    commandQueue,
    activeCommand: engineContext.activeCommand,
    queueStatus: engineContext.status,
    logEntries: [...safeState.logEntries, ...engineContext.logEntries],
  };

  if (!nextState.activeCommand && nextState.commandQueue.length === 0) {
    nextState.queueStatus = "empty";
  }

  return removeUndefinedValues(nextState);
}

export function submitAction(...args) {
  const action = normalizeAction(args);
  const state = normalizeState(args, action);

  if (!action) {
    return state;
  }

  switch (action.type) {
    case "EXECUTE_QUEUE":
      return executeQueue(state);

    case "RESOLVE_ACTIVE_COMMAND":
      return resolveActiveCommand(state, action);

    default:
      return state;
  }
}

export default {
  createInitialState,
  initializeMissingGameState,
  submitAction,
};
