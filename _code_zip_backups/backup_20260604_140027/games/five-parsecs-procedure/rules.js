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

function createCommandFactory() {
  return {
    popupMessage({ id, title, message, buttonText = "OK" }) {
      return createPopupMessageCommand({
        id,
        title,
        message,
        buttonText,
      });
    },
  };
}

export function createInitialState() {
  const commandFactory = createCommandFactory();

  return {
    gameTitle: "Five Parsecs Procedure Engine",

    commandQueue: [
      commandFactory.popupMessage({
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

    commandHistory: [],
    logEntries: [],
  };
}

export function initializeMissingGameState(existingState = {}) {
  const freshState = createInitialState();

  return {
    ...freshState,
    ...existingState,

    commandQueue: Array.isArray(existingState.commandQueue)
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

    commandHistory: Array.isArray(existingState.commandHistory)
      ? existingState.commandHistory
      : freshState.commandHistory,

    logEntries: Array.isArray(existingState.logEntries)
      ? existingState.logEntries
      : freshState.logEntries,
  };
}

function completeCurrentCommand(state) {
  const currentCommand = state.commandQueue[0];

  if (!currentCommand) {
    return state;
  }

  const completedAt = new Date().toISOString();
  const completedCommand = {
    ...currentCommand,
    status: "complete",
    completedAt,
  };

  return {
    ...state,
    commandQueue: state.commandQueue.slice(1),
    commandHistory: [
      ...state.commandHistory,
      completedCommand,
    ],
    logEntries: [
      ...state.logEntries,
      {
        id: `log-${Date.now()}`,
        type: "commandCompleted",
        text: `Completed command: ${currentCommand.title || currentCommand.type}`,
        commandId: currentCommand.id,
        createdAt: completedAt,
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
      return completeCurrentCommand(safeState);

    default:
      return safeState;
  }
}

export default {
  createInitialState,
  initializeMissingGameState,
  submitAction,
};
