import {
  BuildStartingCrewCommand,
  CrewMemberNameCommand,
  NumberInputCommand,
  PopupMessageCommand,
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

  buildStartingCrew({
    id,
    title = "Build Starting Crew",
    crewCountPath = "crewLog.startingCrewCount",
    pauseAfter = false,
    visible = false,
  }) {
    return new BuildStartingCrewCommand({
      id,
      title,
      crewCountPath,
      pauseAfter,
      visible,
    });
  }

  crewMemberName({
    id,
    crewMemberNumber = 1,
    title = null,
    prompt = null,
    defaultValue = "",
    buttonText = "OK",
    pauseAfter = false,
  }) {
    return new CrewMemberNameCommand({
      id,
      crewMemberNumber,
      title,
      prompt,
      defaultValue,
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

      case "buildStartingCrew":
        return new BuildStartingCrewCommand(commandData);

      case "crewMemberName":
        return new CrewMemberNameCommand(commandData);

      default:
        console.warn(`Unknown command type: ${commandData.type}`);
        return null;
    }
  }
}
