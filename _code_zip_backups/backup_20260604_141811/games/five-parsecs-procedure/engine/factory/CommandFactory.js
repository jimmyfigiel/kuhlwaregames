import { PopupMessageCommand } from "../commands";

export default class CommandFactory {
  popupMessage({ id, title, message, buttonText = "OK" }) {
    return new PopupMessageCommand({
      id,
      title,
      message,
      buttonText,
    });
  }

  fromJSON(commandData) {
    if (!commandData || !commandData.type) {
      return null;
    }

    switch (commandData.type) {
      case "popupMessage":
        return new PopupMessageCommand(commandData);

      default:
        console.warn(`Unknown command type: ${commandData.type}`);
        return null;
    }
  }
}
