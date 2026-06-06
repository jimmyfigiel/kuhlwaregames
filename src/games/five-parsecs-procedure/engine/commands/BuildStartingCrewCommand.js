import BaseCommand from "./BaseCommand";
import CrewMemberNameCommand from "./CrewMemberNameCommand";
import { removeUndefinedValues } from "../utils";

export default class BuildStartingCrewCommand extends BaseCommand {
  constructor({
    id,
    title = "Build Starting Crew",
    crewCountPath = "crewLog.startingCrewCount",
    status = "pending",
    pauseAfter = false,
    visible = false,
  }) {
    super({
      id,
      type: "buildStartingCrew",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.crewCountPath = crewCountPath;
  }

  execute(engineContext) {
    const rawCrewCount = engineContext.getStateValue(this.crewCountPath) ?? 6;
    const parsedCrewCount = Number(rawCrewCount);
    const crewCount = Number.isFinite(parsedCrewCount)
      ? Math.max(1, Math.floor(parsedCrewCount))
      : 6;

    const crewMemberCommands = [];

    for (let index = 1; index <= crewCount; index += 1) {
      crewMemberCommands.push(
        new CrewMemberNameCommand({
          id: `crew-member-name-${index}`,
          crewMemberNumber: index,
          pauseAfter: false,
        })
      );
    }

    engineContext.pushCommandsToTop(crewMemberCommands);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.continue();

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Added ${crewCount} crew member creation commands to the queue.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      crewCountPath: this.crewCountPath,
    });
  }
}
