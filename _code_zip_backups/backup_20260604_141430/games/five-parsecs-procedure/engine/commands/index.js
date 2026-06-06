import BaseCommand from "./BaseCommand";
import PopupMessageCommand from "./PopupMessageCommand";

export function hydrateCommand(rawCommand) {
  if (!rawCommand || !rawCommand.type) {
    return null;
  }

  switch (rawCommand.type) {
    case "popupMessage":
      return new PopupMessageCommand(rawCommand);

    default:
      return new BaseCommand({
        id: rawCommand.id,
        type: rawCommand.type,
        title: rawCommand.title || rawCommand.type,
        status: rawCommand.status || "pending",
        pauseAfter: Boolean(rawCommand.pauseAfter),
        visible:
          typeof rawCommand.visible === "boolean" ? rawCommand.visible : true,
      });
  }
}

export { BaseCommand, PopupMessageCommand };
