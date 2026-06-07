import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class BuildShipCommand extends BaseCommand {
  constructor({
    id = "build-ship",
    title = "Build Ship",
    status = "pending",
    pauseAfter = false,
    visible = true,
  } = {}) {
    super({
      id,
      type: "buildShip",
      title,
      status,
      pauseAfter,
      visible,
    });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: "mark-ship-setup-phase",
        title: "Mark Ship Setup Phase",
        operations: [
          { op: "set", path: "campaign.phase", value: "shipSetup" },
          { op: "setIfMissing", path: "shipSetup", value: {} },
        ],
        pauseAfter: false,
        visible: false,
      }),
      factory.shipTableRoll({
        id: "choose-starting-ship",
        title: "Choose Starting Ship",
        pauseAfter: false,
        visible: true,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Built the ship setup command sequence.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
    });
  }
}

export default BuildShipCommand;
