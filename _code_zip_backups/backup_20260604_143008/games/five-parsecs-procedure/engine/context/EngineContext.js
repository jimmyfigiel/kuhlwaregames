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

export default class EngineContext {
  constructor({ state }) {
    this.state = structuredClone(state);
    this.activeCommand = null;
    this.status = "running";
    this.shouldContinue = true;
    this.logEntries = [];
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

  setStateValue(path, value) {
    setValueAtPath(this.state, path, value);
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
