import {
  NumberInputCommand,
  TextInputCommand,
  PopupMessageCommand,
  TableRollCommand,
  UpdateStateCommand,
} from "../commands";

export class CommandFactory {
  popupMessage({
    id,
    title,
    message,
    buttonText = "OK",
    pauseAfter = true,
    autoExecuteOnGameStart = false,
  }) {
    return new PopupMessageCommand({
      id,
      title,
      message,
      buttonText,
      pauseAfter,
      autoExecuteOnGameStart,
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


  textInput({
    id,
    title,
    prompt,
    label = "Text",
    defaultValue = "",
    saveTo = null,
    buttonText = "OK",
    allowRandomName = false,
    randomNameSet = "",
    randomNameButtonText = "Generate",
    pauseAfter = true,
  }) {
    return new TextInputCommand({
      id,
      title,
      prompt,
      label,
      defaultValue,
      saveTo,
      buttonText,
      allowRandomName,
      randomNameSet,
      randomNameButtonText,
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

      case "textInput":
        return new TextInputCommand(commandData);

      case "tableRoll":
        return new TableRollCommand(commandData);

      case "updateState":
        return new UpdateStateCommand(commandData);

      default:
        return null;
    }
  }
}

export default CommandFactory;
