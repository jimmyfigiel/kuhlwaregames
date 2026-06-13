// src/games/pokemon-only-one/controller/commandRunner.js

export function runCommands(game, commands = []) {
  for (const command of commands) {
    game.log.add("COMMAND_STARTED", `${command.type} started.`, commandToDetails(command));
    command.run(game);
    game.log.add("COMMAND_COMPLETED", `${command.type} completed.`, commandToDetails(command));
  }
}

export function commandToDetails(command) {
  const details = {};
  for (const [key, value] of Object.entries(command || {})) {
    if (typeof value !== "function") {
      details[key] = value;
    }
  }
  return details;
}
