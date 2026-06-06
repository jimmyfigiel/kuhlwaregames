import CommandFactory from "./engine/factory";
import CommandQueue from "./engine/queue/CommandQueue";

function createInitialCommandQueue() {
  const factory = new CommandFactory({ idPrefix: "five-parsecs" });

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

    commandRuntime: {
      status: "idle",
      activeCommand: null,
    },

    commandQueue: createInitialCommandQueue(),

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

function normalizeCommandRuntime(existingRuntime = {}) {
  return {
    status: existingRuntime.status || "idle",
    activeCommand: existingRuntime.activeCommand || null,
  };
}

export function initializeMissingGameState(existingState = {}) {
  const freshState = createInitialState();

  const hasCommandQueue = Object.prototype.hasOwnProperty.call(
    existingState,
    "commandQueue"
  );

  return {
    ...freshState,
    ...existingState,

    commandRuntime: normalizeCommandRuntime(existingState.commandRuntime),

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

function addLogEntry(state, entry) {
  if (!entry) {
    return state;
  }

  return {
    ...state,
    logEntries: [
      ...state.logEntries,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        ...entry,
      },
    ],
  };
}

function executeQueueUntilStop(state) {
  let nextState = state;
  let queue = new CommandQueue(nextState.commandQueue);
  let keepRunning = true;
  let safetyCounter = 0;

  while (keepRunning && safetyCounter < 25) {
    safetyCounter += 1;

    const result = queue.executeNext();

    nextState = {
      ...nextState,
      commandQueue: result.queue.toJSON(),
      commandRuntime: {
        status: result.status,
        activeCommand: result.activeCommand,
      },
    };

    nextState = addLogEntry(nextState, result.logEntry);

    keepRunning = result.shouldContinue;
    queue = result.queue;
  }

  if (safetyCounter >= 25) {
    nextState = {
      ...nextState,
      commandRuntime: {
        status: "blocked",
        activeCommand: null,
      },
    };

    nextState = addLogEntry(nextState, {
      type: "queueSafetyStop",
      text: "Queue execution stopped after 25 automatic commands.",
    });
  }

  return nextState;
}

export function submitAction(state, playerSlot, action) {
  const safeState = initializeMissingGameState(state);

  if (!action || !action.type) {
    return safeState;
  }

  switch (action.type) {
    case "EXECUTE_QUEUE": {
      if (safeState.commandRuntime.activeCommand) {
        return safeState;
      }

      return executeQueueUntilStop(safeState);
    }

    case "RESOLVE_ACTIVE_COMMAND": {
      const activeCommand = safeState.commandRuntime.activeCommand;

      if (!activeCommand) {
        return safeState;
      }

      const nextState = {
        ...safeState,
        commandRuntime: {
          status: safeState.commandQueue.length > 0 ? "idle" : "empty",
          activeCommand: null,
        },
      };

      return addLogEntry(nextState, {
        type: "commandResolved",
        text: `Resolved command: ${activeCommand.title || activeCommand.type}`,
        commandId: activeCommand.id,
      });
    }

    default:
      return safeState;
  }
}

export default {
  createInitialState,
  initializeMissingGameState,
  submitAction,
};
