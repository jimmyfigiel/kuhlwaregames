import {
  NumberInputCommand,
  PopupMessageCommand,
  TableRollCommand,
  UpdateStateCommand,
} from "../commands";

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

  updateState({
    id,
    title = "Update State",
    targetPath = "",
    operations = [],
    pauseAfter = false,
    visible = false,
  }) {
    return new UpdateStateCommand({
      id,
      title,
      targetPath,
      operations,
      pauseAfter,
      visible,
    });
  }

  tableRoll({
    id,
    title,
    table,
    saveTo = null,
    buttonText = "OK",
    rollButtonText = "Roll with App Dice",
    afterSelectionCommands = [],
    pauseAfter = false,
    visible = true,
  }) {
    return new TableRollCommand({
      id,
      title,
      table,
      saveTo,
      buttonText,
      rollButtonText,
      afterSelectionCommands,
      pauseAfter,
      visible,
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

      case "tableRoll":
        return new TableRollCommand(commandData);

      case "updateState":
        return new UpdateStateCommand(commandData);

      default:
        return null;
    }
  }
}
