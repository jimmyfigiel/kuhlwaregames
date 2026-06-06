export default class EngineContext {
  constructor({ state }) {
    this.state = state;
    this.activeCommand = null;
    this.status = "running";
    this.shouldContinue = true;
    this.logEntries = [];
  }

  showActiveCommand(command) {
    this.activeCommand = command.toJSON();
  }

  clearActiveCommand() {
    this.activeCommand = null;
  }

  setStatus(status) {
    this.status = status;
  }

  stop() {
    this.shouldContinue = false;
  }

  continue() {
    this.shouldContinue = true;
  }

  addLogEntry(entry) {
    this.logEntries.push({
      id: `log-${Date.now()}-${this.logEntries.length}`,
      createdAt: new Date().toISOString(),
      ...entry,
    });
  }
}
