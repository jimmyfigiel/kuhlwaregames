import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class BuildCrewCommand extends BaseCommand {
  constructor({
    id = "build-crew",
    title = "Build Crew",
    status = "pending",
    pauseAfter = false,
    visible = true,
  } = {}) {
    super({
      id,
      type: "buildCrew",
      title,
      status,
      pauseAfter,
      visible,
    });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;

    engineContext.pushCommandsToTop([
      factory.numberInput({
        id: "choose-starting-crew-count",
        title: "Starting Crew Size",
        prompt: "How many crew members do you want to start with?",
        defaultValue: engineContext.getStateValue("crewLog.startingCrewCount") || 6,
        min: 1,
        max: 20,
        saveTo: "crewLog.startingCrewCount",
        buttonText: "OK",
        pauseAfter: false,
      }),
      factory.buildStartingCrew({
        id: "build-starting-crew",
        title: "Build Starting Crew",
        crewCountPath: "crewLog.startingCrewCount",
        pauseAfter: false,
        visible: false,
      }),
      factory.updateState({
        id: "mark-crew-setup-phase",
        title: "Mark Crew Setup Phase",
        operations: [
          {
            op: "set",
            path: "campaign.phase",
            value: "crewSetup",
          },
        ],
        pauseAfter: false,
        visible: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Built the crew setup command sequence.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
    });
  }
}

export default BuildCrewCommand;
