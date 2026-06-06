function createPopupMessageCommand({
  id,
  title,
  message,
  buttonText = "OK",
}) {
  return {
    id,
    type: "popupMessage",
    title,
    message,
    buttonText,
    status: "pending",
    pauseAfter: true,
  };
}

export function createInitialState() {
  return {
    gameTitle: "Five Parsecs Procedure Engine",

    commandQueue: [
      createPopupMessageCommand({
        id: "welcome-to-five-parsecs",
        title: "Welcome",
        message: "Welcome to 5 Parsecs",
        buttonText: "OK",
      }),
    ],

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

  const hasExistingCommandQueue = Object.prototype.hasOwnProperty.call(
    existingState,
    "commandQueue"
  );

  return {
    ...freshState,
    ...existingState,

    // Important: preserve an existing empty queue.
    // If the queue is [], the welcome command should NOT be recreated.
    commandQueue:
      hasExistingCommandQueue && Array.isArray(existingState.commandQueue)
        ? existingState.commandQueue
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

function completeCommand(state, commandId) {
  const currentCommand = state.commandQueue[0];

  if (!currentCommand) {
    return state;
  }

  // If a command id is supplied, only complete the command currently at the
  // front of the queue when the ids match. This prevents an old popup click
  // from removing a later command after the queue has advanced.
  if (commandId && currentCommand.id !== commandId) {
    return state;
  }

  const remainingQueue = state.commandQueue.slice(1);

  return {
    ...state,
    commandQueue: remainingQueue,
    logEntries: [
      ...state.logEntries,
      {
        id: `log-${Date.now()}`,
        type: "commandCompleted",
        text: `Completed command: ${currentCommand.title || currentCommand.type}`,
        commandId: currentCommand.id,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function submitAction(state, playerSlot, action) {
  const safeState = initializeMissingGameState(state);

  if (!action || !action.type) {
    return safeState;
  }

  switch (action.type) {
    case "COMPLETE_CURRENT_COMMAND":
    case "COMPLETE_COMMAND": {
      return completeCommand(safeState, action.commandId);
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
