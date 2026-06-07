import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class WorldPhaseCommand extends BaseCommand {
  constructor({
    id,
    title = "Step 2: World",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
  } = {}) {
    super({
      id,
      type: "worldPhase",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `${this.id}-set-phase`,
        title: "Set World Phase",
        operations: [
          { op: "set", path: "campaign.phase", value: "world" },
          { op: "set", path: "campaign.currentStep", value: "world" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      factory.popupMessage({
        id: `${this.id}-upkeep-ship-repairs`,
        title: "World: Upkeep and Ship Repairs",
        message: "Resolve upkeep and any ship repairs. Later this command will calculate upkeep and only include repair steps when the ship is damaged.",
        buttonText: "Done",
        pauseAfter: false,
      }),
      factory.popupMessage({
        id: `${this.id}-crew-tasks`,
        title: "World: Assign and Resolve Crew Tasks",
        message: "Assign available crew members to campaign tasks and resolve them. Later this will expand into one task command per available crew member.",
        buttonText: "Done",
        pauseAfter: false,
      }),
      factory.popupMessage({
        id: `${this.id}-job-offers`,
        title: "World: Determine Job Offers",
        message: "Determine available job offers from patrons or the current world.",
        buttonText: "Done",
        pauseAfter: false,
      }),
      factory.popupMessage({
        id: `${this.id}-assign-equipment`,
        title: "World: Assign Equipment",
        message: "Assign weapons and gear before choosing the battle.",
        buttonText: "Done",
        pauseAfter: false,
      }),
      factory.popupMessage({
        id: `${this.id}-resolve-rumors`,
        title: "World: Resolve Rumors",
        message: "Resolve any Rumors or Quest Rumors. Later this step can be skipped when no rumors are available.",
        buttonText: "Done",
        pauseAfter: false,
      }),
      factory.popupMessage({
        id: `${this.id}-choose-battle`,
        title: "World: Choose Your Battle",
        message: "Choose the battle to play and prepare the Encounter Log.",
        buttonText: "Done",
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded the World phase steps.",
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

export default WorldPhaseCommand;
