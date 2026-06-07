import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class BuildWorldCommand extends BaseCommand {
  constructor({
    id = "build-world",
    title = "Build World",
    status = "pending",
    pauseAfter = false,
    visible = true,
  } = {}) {
    super({
      id,
      type: "buildWorld",
      title,
      status,
      pauseAfter,
      visible,
    });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;

    engineContext.pushCommandsToTop([
      factory.textInput({
        id: "create-beginning-world",
        title: "Create Beginning World",
        prompt: "Name the world where your crew begins.",
        label: "World Name",
        defaultValue: engineContext.getStateValue("worldLog.currentWorld.name") || "",
        saveTo: "worldLog.currentWorld.name",
        buttonText: "OK",
        allowRandomName: true,
        randomNameSet: "five_parsecs_world_parts",
        randomNameButtonText: "Generate World Name",
        pauseAfter: false,
      }),
      factory.updateState({
        id: "initialize-beginning-world-record",
        title: "Initialize Beginning World Record",
        operations: [
          {
            op: "setIfMissing",
            path: "worldLog.currentWorld.id",
            value: "beginning-world",
          },
          {
            op: "setIfMissing",
            path: "worldLog.currentWorld.traits",
            value: [],
          },
          {
            op: "setIfMissing",
            path: "worldLog.currentWorld.license",
            value: "",
          },
          {
            op: "setIfMissing",
            path: "worldLog.currentWorld.invasion",
            value: "",
          },
          {
            op: "setIfMissing",
            path: "worldLog.currentWorld.notes",
            value: "",
          },
          {
            op: "set",
            path: "campaign.phase",
            value: "worldSetup",
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
      text: "Built the world setup command sequence.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
    });
  }
}

export default BuildWorldCommand;
