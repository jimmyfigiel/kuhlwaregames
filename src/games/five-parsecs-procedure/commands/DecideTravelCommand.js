import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

const TRAVEL_OPTIONS = [
  {
    id: "stay",
    label: "Stay on this world",
    value: "stay",
    description: "Continue to the World phase without starship travel.",
  },
  {
    id: "newWorld",
    label: "Travel to a new world",
    value: "newWorld",
    description: "Roll a starship travel event, then create a new current world.",
  },
];

function normalizeWorld(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      id: value.id || "",
      name: value.name || "",
      departedAt: value.departedAt || "",
      traits: Array.isArray(value.traits) ? value.traits : [],
      invasion: value.invasion || "",
      license: value.license || "",
    };
  }

  return {
    id: "",
    name: String(value || ""),
    departedAt: "",
    traits: [],
    invasion: "",
    license: "",
  };
}

function buildTravelOptions(state, baseOptions) {
  const options = [...baseOptions];
  const currentWorld = normalizeWorld(state?.worldLog?.currentWorld);
  const currentWorldName = String(currentWorld.name || "").trim().toLowerCase();
  const visitedWorlds = Array.isArray(state?.worldLog?.visitedWorlds)
    ? state.worldLog.visitedWorlds
    : [];

  visitedWorlds
    .map(normalizeWorld)
    .filter((world) => String(world.name || "").trim())
    .filter((world) => String(world.name || "").trim().toLowerCase() !== currentWorldName)
    .forEach((world, index) => {
      const traitCount = Array.isArray(world.traits) ? world.traits.length : 0;
      const value = `return:${world.id || world.name || index}`;
      const details = [
        world.departedAt ? `Last left ${new Date(world.departedAt).toLocaleDateString()}` : "Previously visited world",
        traitCount > 0 ? `${traitCount} trait${traitCount === 1 ? "" : "s"}` : "",
        world.invasion ? `Invasion: ${world.invasion}` : "",
        world.license ? `License: ${world.license}` : "",
      ].filter(Boolean);

      options.push({
        id: value,
        label: `Travel back to ${world.name}`,
        value,
        description: details.join(" · "),
        worldId: world.id || world.name || String(index),
      });
    });

  return options;
}

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

    const options = buildTravelOptions(engineContext.state, this.options);

    engineContext.showActiveCommand({
      ...this,
      status: "waitingForUser",
      options,
    });
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
    const availableOptions = buildTravelOptions(engineContext.state, this.options);
    const selectedOption = availableOptions.find((option) => String(option.value) === selectedValue || option.id === selectedValue);

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
    const selectedKind = String(selectedOption.value || "");
    const selectedNewWorld = selectedKind === "newWorld" || selectedKind === "travel";
    const selectedReturn = selectedKind.startsWith("return:");
    const selectedTravel = selectedNewWorld || selectedReturn;
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
        factory.starshipTravelEventRoll({
          id: `${turnPrefix}-starship-travel-event`,
          title: "Travel: Starship Travel Event",
          turnNumber: this.turnNumber,
          pauseAfter: false,
          visible: true,
        })
      );

      if (selectedReturn) {
        commands.push(
          factory.returnToVisitedWorld({
            id: `${turnPrefix}-return-to-visited-world`,
            title: selectedOption.label,
            targetWorldId: selectedKind.replace(/^return:/, ""),
            turnNumber: this.turnNumber,
            pauseAfter: false,
            visible: false,
          })
        );
      } else if (selectedNewWorld) {
        commands.push(
          factory.newWorldArrival({
            id: `${turnPrefix}-new-world-arrival`,
            title: "Travel: New World Arrival",
            turnNumber: this.turnNumber,
            pauseAfter: false,
            visible: true,
          })
        );
      }
    }

    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");
    engineContext.pushCommandsToTop(commands);

    this.status = "complete";

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: selectedTravel
        ? `Crew chose to ${selectedOption.label.toLowerCase()}.`
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
