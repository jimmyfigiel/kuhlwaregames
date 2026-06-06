import { BaseCommand } from "../../../procedure-core/commands/index.js";
import { FiveParsecsCommandFactory } from "../factory/index.js";

export class QueueEquipmentTableResultUpdateCommandsCommand extends BaseCommand {
  constructor({
    id,
    title = "Apply Equipment Result",
    pendingEffectId = "",
    tableId = "",
    source = "",
    pauseAfter = false,
  } = {}) {
    super({
      id,
      type: "queueEquipmentTableResultUpdateCommands",
      title,
      status: "pending",
      pauseAfter,
    });

    this.pendingEffectId = pendingEffectId;
    this.tableId = tableId;
    this.source = source;
  }

  execute(engineContext) {
    const selectedRow =
      engineContext.state?.equipmentRollSelections?.[this.pendingEffectId] ||
      null;

    if (!selectedRow) {
      engineContext.addLogEntry({
        type: "equipmentSelectionMissing",
        text: `No selected equipment row found for ${this.pendingEffectId}.`,
        commandId: this.id,
      });

      return;
    }

    const factory = new FiveParsecsCommandFactory();
    const commands = factory.createCommandsForEquipmentSelection({
      state: engineContext.state,
      pendingEffectId: this.pendingEffectId,
      tableId: this.tableId,
      source: this.source,
      selectedRow,
    });

    if (commands.length > 0) {
      engineContext.pushCommandsToTop(commands);
      engineContext.setStatus("running");
      engineContext.continue();
    }

    engineContext.addLogEntry({
      type: "equipmentSelectionQueued",
      text: `Queued equipment result updates for ${selectedRow.name || "selected item"}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return {
      ...super.toJSON(),
      pendingEffectId: this.pendingEffectId,
      tableId: this.tableId,
      source: this.source,
    };
  }
}

export default QueueEquipmentTableResultUpdateCommandsCommand;
