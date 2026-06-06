import { CommandFactory } from "../../../procedure-core/factory";
import {
  BuildStartingCrewCommand,
  CrewMemberNameCommand,
  FinalizeCrewMemberCommand,
  QueueCrewMemberTableResultUpdateCommandsCommand,
} from "../commands";
import { buildCrewMemberTableResultUpdateCommands } from "../effects";

export default class FiveParsecsCommandFactory extends CommandFactory {
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
    allowRandomName = true,
    randomNameSet = "five_parsecs_pulp",
    randomNameButtonText = "Generate Name",
    pauseAfter = false,
  }) {
    return new CrewMemberNameCommand({
      id,
      crewMemberNumber,
      title,
      prompt,
      defaultValue,
      buttonText,
      allowRandomName,
      randomNameSet,
      randomNameButtonText,
      pauseAfter,
    });
  }

  queueCrewMemberTableResultUpdateCommands({
    id,
    crewMemberId,
    crewMemberNumber = 1,
    sourcePath,
    resultKind = "tableResult",
    title = null,
    pauseAfter = false,
    visible = false,
  }) {
    return new QueueCrewMemberTableResultUpdateCommandsCommand({
      id,
      crewMemberId,
      crewMemberNumber,
      sourcePath,
      resultKind,
      title,
      pauseAfter,
      visible,
    });
  }

  createCrewMemberTableResultUpdateCommands({
    crewMemberId,
    crewMemberNumber,
    sourcePath,
    resultKind,
    result,
  }) {
    return buildCrewMemberTableResultUpdateCommands({
      commandFactory: this,
      crewMemberId,
      crewMemberNumber,
      sourcePath,
      resultKind,
      result,
    });
  }

  fromJSON(commandData) {
    const coreCommand = super.fromJSON(commandData);

    if (coreCommand) {
      return coreCommand;
    }

    if (!commandData || !commandData.type) {
      return null;
    }

    switch (commandData.type) {
      case "buildStartingCrew":
        return new BuildStartingCrewCommand(commandData);

      case "crewMemberName":
        return new CrewMemberNameCommand(commandData);

      case "finalizeCrewMember":
        return new FinalizeCrewMemberCommand(commandData);

      case "queueCrewMemberTableResultUpdateCommands":
        return new QueueCrewMemberTableResultUpdateCommandsCommand(commandData);

      default:
        console.warn(`Unknown command type: ${commandData.type}`);
        return null;
    }
  }
}
