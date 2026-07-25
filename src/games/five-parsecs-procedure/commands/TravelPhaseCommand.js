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
      // FleeInvasionCommand decides for itself whether the crew makes it off-world
      // (and pushes the normal decideTravel step) or is forced into a mandatory
      // Invasion Battle — either way it fully replaces the ordinary travel choice.
      commands.push(
        factory.fleeInvasion({
          id: `${this.id}-flee-invasion`,
          turnNumber: this.turnNumber,
          pauseAfter: false,
        })
      );
    } else {
      commands.push(
        factory.decideTravel({
          id: `${this.id}-decide-travel`,
          title: "Travel: Stay or Travel?",
          turnNumber: this.turnNumber,
          pauseAfter: false,
          visible: true,
        })
      );
    }

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
