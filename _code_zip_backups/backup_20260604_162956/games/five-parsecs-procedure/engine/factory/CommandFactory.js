import { NumberInputCommand, PopupMessageCommand } from "../commands";

export default class CommandFactory {
  popupMessage({ id, title, message, buttonText = "OK", pauseAfter = true }) {
    return new PopupMessageCommand({
      id,
      title,
      message,
      buttonText,
      pauseAfter,
    });
  }

  numberInput({
    id,
    title,
    prompt,
    defaultValue = 0,
    min = null,
    max = null,
    saveTo = null,
    buttonText = "OK",
    pauseAfter = true,
  }) {
    return new NumberInputCommand({
      id,
      title,
      prompt,
      defaultValue,
      min,
      max,
      saveTo,
      buttonText,
      pauseAfter,
    });
  }

  fromJSON(commandData) {
    if (!commandData || !commandData.type) {
      return null;
    }

    switch (commandData.type) {
      case "popupMessage":
        return new PopupMessageCommand(commandData);

      case "numberInput":
        return new NumberInputCommand(commandData);

      default:
        console.warn(`Unknown command type: ${commandData.type}`);
        return null;
    }
  }
}
