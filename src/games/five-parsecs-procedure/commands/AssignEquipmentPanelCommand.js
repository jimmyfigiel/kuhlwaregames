import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

// Rulebook World step 4, p.87 — a compact, always-editable panel (table +
// per-crew-member collapsible sections) for moving items between the Stash
// and crew members, rather than a multi-screen wizard. Each move is applied
// immediately and the panel re-shows itself; "Done" completes the step.
export class AssignEquipmentPanelCommand extends BaseCommand {
  constructor({
    id,
    title = "Assign Equipment",
    status = "pending",
    pauseAfter = false,
    visible = true,
  } = {}) {
    super({ id, type: "assignEquipmentPanel", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    this.status = "waitingForUser";

    engineContext.showActiveCommand(this);
    engineContext.setStatus("waitingForUser");
    engineContext.stopAfterCurrentCommand();

    engineContext.addLogEntry({
      type: "commandStarted",
      text: `Started command: ${this.title}`,
      commandId: this.id,
    });
  }

  resolve(engineContext, input = {}) {
    if (input.action === "move") {
      const { sourcePath, index, destinationPath } = input;
      const sourceList = engineContext.getStateValue(sourcePath) || [];
      const item = sourceList[index];

      if (item && sourcePath !== destinationPath) {
        engineContext.setStateValue(sourcePath, sourceList.filter((_, i) => i !== index));
        engineContext.appendStateValue(destinationPath, item);
      }

      this.status = "waitingForUser";
      engineContext.showActiveCommand(this);
      engineContext.setStatus("waitingForUser");
      engineContext.stopAfterCurrentCommand();
      return;
    }

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Completed command: ${this.title}`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default AssignEquipmentPanelCommand;
