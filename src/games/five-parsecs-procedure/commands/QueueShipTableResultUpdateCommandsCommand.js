import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { FiveParsecsCommandFactory } from "../factory/index.js";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class QueueShipTableResultUpdateCommandsCommand extends BaseCommand {
  constructor({
    id = "queue-ship-result-updates",
    title = "Apply Ship Result",
    sourcePath = "shipSetup.selectedShip",
    pauseAfter = false,
    visible = false,
  } = {}) {
    super({
      id,
      type: "queueShipTableResultUpdateCommands",
      title,
      status: "pending",
      pauseAfter,
      visible,
    });

    this.sourcePath = sourcePath;
  }

  execute(engineContext) {
    const selectedShip = engineContext.getStateValue(this.sourcePath);

    if (!selectedShip) {
      engineContext.addLogEntry({
        type: "shipSelectionMissing",
        text: `No selected ship row found at ${this.sourcePath}.`,
        commandId: this.id,
      });
      this.status = "complete";
      engineContext.setStatus("running");
      engineContext.continue();
      return;
    }

    const factory = new FiveParsecsCommandFactory();
    const commands = factory.createCommandsForShipSelection({
      state: engineContext.state,
      selectedShip,
      sourcePath: this.sourcePath,
    });

    if (commands.length > 0) {
      engineContext.pushCommandsToTop(commands);
    }

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.continue();
    engineContext.addLogEntry({
      type: "shipSelectionQueued",
      text: `Queued ship setup commands for ${selectedShip.name || selectedShip.label || "selected ship"}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      sourcePath: this.sourcePath,
    });
  }
}

export default QueueShipTableResultUpdateCommandsCommand;
