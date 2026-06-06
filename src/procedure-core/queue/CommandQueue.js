import { removeUndefinedValues } from "../utils";

export default class CommandQueue {
  constructor(commands = []) {
    this.commands = Array.isArray(commands) ? commands : [];
  }

  static fromJSON(commandData = [], commandFactory) {
    const commands = Array.isArray(commandData)
      ? commandData
          .map((command) => commandFactory.fromJSON(command))
          .filter(Boolean)
      : [];

    return new CommandQueue(commands);
  }

  count() {
    return this.commands.length;
  }

  isEmpty() {
    return this.commands.length === 0;
  }

  peek() {
    return this.commands[0] || null;
  }

  pop() {
    return this.commands.shift() || null;
  }

  pushBottom(commandOrCommands) {
    const commands = Array.isArray(commandOrCommands)
      ? commandOrCommands
      : [commandOrCommands];

    this.commands.push(...commands.filter(Boolean));
  }

  pushTop(commandOrCommands) {
    const commands = Array.isArray(commandOrCommands)
      ? commandOrCommands
      : [commandOrCommands];

    this.commands.unshift(...commands.filter(Boolean));
  }

  executeNext(engineContext) {
    const command = this.pop();

    engineContext.setCommandQueue(this);

    if (!command) {
      engineContext.setStatus("empty");
      engineContext.stop();
      return;
    }

    command.execute(engineContext);
  }

  executeUntilStop(engineContext) {
    engineContext.setCommandQueue(this);
    engineContext.setStatus("running");
    engineContext.continue();

    while (engineContext.shouldContinue && !this.isEmpty()) {
      this.executeNext(engineContext);
    }

    if (this.isEmpty() && !engineContext.activeCommand) {
      engineContext.setStatus("empty");
    }
  }

  toJSON() {
    return removeUndefinedValues(this.commands.map((command) => command.toJSON()));
  }
}
