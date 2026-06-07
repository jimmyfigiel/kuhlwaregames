import { removeUndefinedValues } from "../utils";

function setValueAtPath(target, path, value) {
  if (!target || !path || typeof path !== "string") {
    return;
  }

  const parts = path.split(".").filter(Boolean);

  if (parts.length === 0) {
    return;
  }

  let current = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];

    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }

    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

function getValueAtPath(target, path) {
  if (!target || !path || typeof path !== "string") {
    return undefined;
  }

  const parts = path.split(".").filter(Boolean);
  let current = target;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

export default class EngineContext {
  constructor({ state, commandQueue = null, commandFactory = null }) {
    this.state = structuredClone(state);
    this.commandQueue = commandQueue;
    this.commandFactory = commandFactory;
    this.activeCommand = null;
    this.status = "running";
    this.shouldContinue = true;
    this.logEntries = [];
  }

  setCommandQueue(commandQueue) {
    this.commandQueue = commandQueue;
  }

  setCommandFactory(commandFactory) {
    this.commandFactory = commandFactory;
  }

  showActiveCommand(command) {
    this.activeCommand = removeUndefinedValues(
      command.toJSON ? command.toJSON() : command
    );
  }

  clearActiveCommand() {
    this.activeCommand = null;
  }

  setStatus(status) {
    this.status = status;
  }

  stopAfterCurrentCommand() {
    this.shouldContinue = false;
  }

  stop() {
    this.stopAfterCurrentCommand();
  }

  continue() {
    this.shouldContinue = true;
  }

  getStateValue(path) {
    return getValueAtPath(this.state, path);
  }

  setStateValue(path, value) {
    setValueAtPath(this.state, path, value);
  }

  appendStateValue(path, value) {
    const existingValue = this.getStateValue(path);
    const nextValue = Array.isArray(existingValue) ? [...existingValue] : [];

    nextValue.push(value);
    this.setStateValue(path, nextValue);
  }

  hydrateCommand(command) {
    if (!command) {
      return null;
    }

    if (command.toJSON && command.execute) {
      return command;
    }

    if (this.commandFactory && command.type) {
      return this.commandFactory.fromJSON(command);
    }

    return command;
  }

  hydrateCommands(commandOrCommands) {
    const commands = Array.isArray(commandOrCommands)
      ? commandOrCommands
      : [commandOrCommands];

    return commands.map((command) => this.hydrateCommand(command)).filter(Boolean);
  }

  pushCommandsToTop(commandOrCommands) {
    if (!this.commandQueue) {
      throw new Error("No command queue is attached to this engine context.");
    }

    this.commandQueue.pushTop(this.hydrateCommands(commandOrCommands));
  }

  pushCommandsToBottom(commandOrCommands) {
    if (!this.commandQueue) {
      throw new Error("No command queue is attached to this engine context.");
    }

    this.commandQueue.pushBottom(this.hydrateCommands(commandOrCommands));
  }

  addLogEntry(entry) {
    this.logEntries.push(
      removeUndefinedValues({
        id: `log-${Date.now()}-${this.logEntries.length}`,
        createdAt: new Date().toISOString(),
        ...entry,
      })
    );
  }
}
