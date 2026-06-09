import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

const TRAVEL_OPTIONS = [
  {
    id: "stay",
    label: "Stay on this world",
    value: "stay",
    description: "Continue to the World phase without starship travel or new-world arrival steps.",
  },
  {
    id: "travel",
    label: "Travel to a new world",
    value: "travel",
    description: "Add starship travel and new-world arrival steps before continuing.",
  },
];

function normalizeTurnNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
}

export class DecideTravelCommand extends BaseCommand {
  constructor({
    id,
    title = "Travel: Stay or Travel?",
    prompt = "Will the crew stay on the current world or travel to a new world?",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
    buttonText = "Continue",
    options = TRAVEL_OPTIONS,
  } = {}) {
    super({
      id,
      type: "decideTravel",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.prompt = prompt;
    this.turnNumber = normalizeTurnNumber(turnNumber);
    this.buttonText = buttonText;
    this.options = Array.isArray(options) && options.length > 0 ? options : TRAVEL_OPTIONS;
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
    const selectedValue = String(input.value || "").trim();
    const selectedOption = this.options.find((option) => String(option.value) === selectedValue || option.id === selectedValue);

    if (!selectedOption || selectedOption.disabled) {
      this.status = "waitingForUser";
      this.errorMessage = "Choose whether the crew will stay or travel.";
      engineContext.showActiveCommand(this);
      engineContext.setStatus("waitingForUser");
      engineContext.stopAfterCurrentCommand();
      return;
    }

    const factory = engineContext.commandFactory;
    const turnPrefix = this.turnNumber ? `turn-${this.turnNumber}` : "travel";
    const selectedTravel = String(selectedOption.value) === "travel";
    const commands = [
      factory.updateState({
        id: `${this.id}-save-decision`,
        title: selectedTravel ? "Record Travel Decision: Travel" : "Record Travel Decision: Stay",
        operations: [
          { op: "set", path: "campaign.travelDecision", value: selectedOption.value },
          { op: "set", path: "campaign.travelDecisionLabel", value: selectedOption.label },
          { op: "set", path: "campaign.travelOccurredThisTurn", value: selectedTravel },
        ],
        pauseAfter: false,
        visible: false,
      }),
    ];

    if (selectedTravel) {
      commands.push(
        factory.popupMessage({
          id: `${turnPrefix}-starship-travel-event`,
          title: "Travel: Starship Travel Event",
          message: "Resolve the Starship Travel Event if one applies. This is a placeholder step; the event table will be added later.",
          buttonText: "Done",
          pauseAfter: false,
        }),
        factory.popupMessage({
          id: `${turnPrefix}-new-world-arrival`,
          title: "Travel: New World Arrival",
          message: "Resolve new-world arrival steps. This placeholder will later handle new world traits, license checks, patrons, rivals, and arrival effects.",
          buttonText: "Done",
          pauseAfter: false,
        })
      );
    }

    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");
    engineContext.pushCommandsToTop(commands);

    this.status = "complete";

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: selectedTravel
        ? "Crew chose to travel to a new world."
        : "Crew chose to stay on the current world.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      prompt: this.prompt,
      options: this.options,
      turnNumber: this.turnNumber,
      buttonText: this.buttonText,
      errorMessage: this.errorMessage,
    });
  }
}

export default DecideTravelCommand;
