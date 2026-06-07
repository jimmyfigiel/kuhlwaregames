import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function isActiveInvasion(value) {
  if (value === true) {
    return true;
  }

  const text = String(value || "").trim().toLowerCase();
  return ["true", "yes", "active", "invaded", "invasion"].includes(text);
}

export class TravelPhaseCommand extends BaseCommand {
  constructor({
    id,
    title = "Step 1: Travel",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
  } = {}) {
    super({
      id,
      type: "travelPhase",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const worldInvasion = engineContext.getStateValue("worldLog.currentWorld.invasion") || engineContext.getStateValue("worldLog.invasion");
    const commands = [
      factory.updateState({
        id: `${this.id}-set-phase`,
        title: "Set Travel Phase",
        operations: [
          { op: "set", path: "campaign.phase", value: "travel" },
          { op: "set", path: "campaign.currentStep", value: "travel" },
        ],
        pauseAfter: false,
        visible: false,
      }),
    ];

    if (isActiveInvasion(worldInvasion)) {
      commands.push(
        factory.popupMessage({
          id: `${this.id}-flee-invasion`,
          title: "Travel: Flee Invasion",
          message: "Resolve Flee Invasion if the current world is being invaded. This step is present because the World Log indicates an active invasion.",
          buttonText: "Done",
          pauseAfter: false,
        })
      );
    }

    commands.push(
      factory.popupMessage({
        id: `${this.id}-decide-travel`,
        title: "Travel: Decide Whether to Travel",
        message: "Decide whether the crew will stay on the current world or travel. Later this will branch into starship travel events and new-world arrival steps when travel is chosen.",
        buttonText: "Done",
        pauseAfter: false,
      })
    );

    engineContext.pushCommandsToTop(commands);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded the Travel phase steps.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      turnNumber: this.turnNumber,
    });
  }
}

export default TravelPhaseCommand;
