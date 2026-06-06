import { hydrateCommand } from "../commands";

export default class CommandQueue {
  constructor(commands = []) {
    this.commands = Array.isArray(commands) ? commands : [];
  }

  count() {
    return this.commands.length;
  }

  peek() {
    return this.commands[0] || null;
  }

  pop() {
    const [nextCommand, ...remainingCommands] = this.commands;
    this.commands = remainingCommands;
    return nextCommand || null;
  }

  pushTop(commandOrCommands) {
    const commandsToAdd = this.normalizeCommandList(commandOrCommands);
    this.commands = [...commandsToAdd, ...this.commands];
  }

  pushBottom(commandOrCommands) {
    const commandsToAdd = this.normalizeCommandList(commandOrCommands);
    this.commands = [...this.commands, ...commandsToAdd];
  }

  toJSON() {
    return this.commands.map((command) => {
      if (command && typeof command.toJSON === "function") {
        return command.toJSON();
      }

      return command;
    });
  }

  executeNext() {
    const rawCommand = this.pop();

    if (!rawCommand) {
      return {
        queue: this,
        activeCommand: null,
        status: "empty",
        shouldContinue: false,
        logEntry: null,
      };
    }

    const command = hydrateCommand(rawCommand);

    if (!command) {
      return {
        queue: this,
        activeCommand: null,
        status: "blocked",
        shouldContinue: false,
        logEntry: {
          type: "commandError",
          text: "Could not hydrate command.",
          commandId: rawCommand.id || "unknown",
        },
      };
    }

    const result = command.execute();

    return {
      queue: this,
      activeCommand: result.activeCommand || null,
      status: result.status || "complete",
      shouldContinue: Boolean(result.shouldContinue),
      logEntry: {
        type: "commandExecuted",
        text: `Executed command: ${command.title || command.type}`,
        commandId: command.id,
      },
    };
  }

  normalizeCommandList(commandOrCommands) {
    if (!commandOrCommands) {
      return [];
    }

    const list = Array.isArray(commandOrCommands)
      ? commandOrCommands
      : [commandOrCommands];

    return list.map((command) => {
      if (command && typeof command.toJSON === "function") {
        return command.toJSON();
      }

      return command;
    });
  }
}
