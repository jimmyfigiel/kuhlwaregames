import EngineContext from "../../procedure-core/context/EngineContext";
import { FiveParsecsCommandFactory } from "./factory";
import CommandQueue from "../../procedure-core/queue/CommandQueue";
import { removeUndefinedValues } from "../../procedure-core/utils";

function buildInitialCommandQueue() {
  const factory = new FiveParsecsCommandFactory();

  return [
    factory
      .popupMessage({
        id: "welcome-to-five-parsecs",
        title: "Welcome",
        message: "Welcome to Five Parsecs from Home! Let's build your campaign.",
        buttonText: "OK",
        pauseAfter: false,
        autoExecuteOnGameStart: true,
      })
      .toJSON(),
    factory
      .buildWorld({
        id: "build-world",
        title: "Build World",
        pauseAfter: false,
        visible: true,
      })
      .toJSON(),
    factory
      .buildCrew({
        id: "build-crew",
        title: "Build Crew",
        pauseAfter: false,
        visible: true,
      })
      .toJSON(),
    factory
      .buildShip({
        id: "build-ship",
        title: "Build Ship",
        pauseAfter: false,
        visible: true,
      })
      .toJSON(),
    factory
      .campaignPrep({
        id: "campaign-prep",
        title: "Campaign Prep",
        pauseAfter: false,
        visible: true,
      })
      .toJSON(),
    factory
      .startTurn({
        id: "start-turn-1",
        title: "Start Campaign Turn 1",
        turnNumber: 1,
        pauseAfter: false,
        visible: true,
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
    equipmentRollSelections: {},
    shipSetup: {},

    campaign: {
      turnNumber: 0,
      phase: "setup",
      status: "setup",
      setupComplete: false,
      currentStep: "initialSetup",
      crewSize: null,
      deployLimit: null,
      enemyNumberRule: "",
      enemyNumberRuleLabel: "",
      storyTrackEnabled: false,
      storyTrackLabel: "No Story Track",
      victoryCondition: "none",
      victoryConditionLabel: "No Victory Condition",
      difficultyMode: "normal",
      difficultyModeLabel: "Normal",
      startingStoryPointRoll: null,
      startingStoryPointsRawTotal: null,
      startingStoryPointAdjustment: 0,
      startingStoryPointAdjustmentLabel: "",
      startingStoryPoints: 0,
      storyPoints: 0,
      storyPointsDisabled: false,
      storyPointRule: "",
    },

    crewLog: {
      title: "Crew Log",
      crewName: "",
      startingCrewCount: null,
      credits: 0,
      ship: "",
      debt: 0,
      starship: null,
      inventory: [],
      crewMembers: [],
      crewDetails: {},
      pendingEffects: [],
      resolvedEffects: [],
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
      currentWorld: {
        id: "beginning-world",
        name: "",
        traits: [],
        license: "",
        invasion: "",
        notes: "",
      },
      patrons: [],
      rivals: [],
      rumors: 0,
      questRumors: 0,
      storyPoints: 0,
      pendingEffects: [],
      resolvedEffects: [],
      visitedWorlds: [],
      arrivalHistory: [],
      travelEvents: [],
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
    shipSetup: {
      ...blankState.shipSetup,
      ...(safeExistingState.shipSetup || {}),
    },
    campaign: {
      ...blankState.campaign,
      ...(safeExistingState.campaign || {}),
    },
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

  const factory = new FiveParsecsCommandFactory();
  const queue = CommandQueue.fromJSON(safeState.commandQueue, factory);
  const engineContext = new EngineContext({
    state: safeState,
    commandQueue: queue,
    commandFactory: factory,
  });

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

  const factory = new FiveParsecsCommandFactory();
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

  const queue = CommandQueue.fromJSON(safeState.commandQueue, factory);
  const engineContext = new EngineContext({
    state: safeState,
    commandQueue: queue,
    commandFactory: factory,
  });

  activeCommand.resolve(engineContext, action.input || {});

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

  const shouldContinueAfterResolve = activeCommand.pauseAfter === false;

  if (
    shouldContinueAfterResolve &&
    !nextState.activeCommand &&
    Array.isArray(nextState.commandQueue) &&
    nextState.commandQueue.length > 0
  ) {
    return executeQueue(nextState);
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
