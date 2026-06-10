import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function makeId(prefix = "world") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function normalizeWorld(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      id: value.id || makeId("world"),
      name: value.name || "",
      traits: Array.isArray(value.traits) ? value.traits : [],
      license: value.license || "",
      invasion: value.invasion || "",
      notes: value.notes || "",
      arrivedAt: value.arrivedAt || "",
      departedAt: value.departedAt || "",
    };
  }

  return {
    id: makeId("world"),
    name: String(value || ""),
    traits: [],
    license: "",
    invasion: "",
    notes: "",
    arrivedAt: "",
    departedAt: "",
  };
}

function hasMeaningfulWorld(world) {
  if (!world || typeof world !== "object") {
    return false;
  }

  return Boolean(
    String(world.name || "").trim() ||
      (Array.isArray(world.traits) && world.traits.length > 0) ||
      String(world.license || "").trim() ||
      String(world.invasion || "").trim() ||
      String(world.notes || "").trim()
  );
}

export class NewWorldArrivalCommand extends BaseCommand {
  constructor({
    id,
    title = "Travel: New World Arrival",
    prompt = "Name the world your crew arrives at.",
    label = "New World Name",
    defaultValue = "",
    buttonText = "Arrive",
    allowRandomName = true,
    randomNameSet = "five_parsecs_world_parts",
    randomNameButtonText = "Generate World Name",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
  } = {}) {
    super({
      id,
      type: "newWorldArrival",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.prompt = prompt;
    this.label = label;
    this.defaultValue = defaultValue;
    this.buttonText = buttonText;
    this.allowRandomName = allowRandomName;
    this.randomNameSet = randomNameSet;
    this.randomNameButtonText = randomNameButtonText;
    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    this.status = "waitingForUser";

    const currentWorld = normalizeWorld(engineContext.getStateValue("worldLog.currentWorld"));
    const currentName = String(currentWorld.name || "").trim();

    engineContext.showActiveCommand({
      ...this,
      status: "waitingForUser",
      prompt: currentName
        ? `Your crew is leaving ${currentName}. Name the new world they arrive at.`
        : this.prompt,
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
    const rawValue = input.value ?? this.defaultValue;
    const worldName = String(rawValue || "").trim();

    if (!worldName) {
      this.status = "waitingForUser";
      this.errorMessage = "Please enter a world name.";
      engineContext.showActiveCommand(this);
      engineContext.setStatus("waitingForUser");
      engineContext.stopAfterCurrentCommand();
      return;
    }

    const factory = engineContext.commandFactory;
    const now = new Date().toISOString();
    const previousWorld = normalizeWorld(engineContext.getStateValue("worldLog.currentWorld"));
    const previousWorldRecord = hasMeaningfulWorld(previousWorld)
      ? {
          ...previousWorld,
          departedAt: now,
          archivedFromTurn: this.turnNumber || engineContext.getStateValue("campaign.turnNumber") || null,
        }
      : null;
    const newWorld = {
      id: makeId("world"),
      name: worldName,
      traits: [],
      license: "",
      invasion: "",
      notes: "",
      arrivedAt: now,
      arrivalTurn: this.turnNumber || engineContext.getStateValue("campaign.turnNumber") || null,
    };
    const arrivalRecord = {
      id: makeId("arrival"),
      worldId: newWorld.id,
      worldName,
      previousWorldId: previousWorldRecord?.id || "",
      previousWorldName: previousWorldRecord?.name || "",
      turnNumber: newWorld.arrivalTurn,
      arrivedAt: now,
      notes: previousWorldRecord?.name
        ? `Arrived at ${worldName} after leaving ${previousWorldRecord.name}.`
        : `Arrived at ${worldName}.`,
    };

    const operations = [
      { op: "set", path: "worldLog.currentWorld", value: newWorld },
      { op: "set", path: "worldLog.worldTraits", value: [] },
      { op: "set", path: "worldLog.license", value: "" },
      { op: "set", path: "worldLog.invasion", value: "" },
      { op: "append", path: "worldLog.arrivalHistory", value: arrivalRecord },
      { op: "set", path: "campaign.currentStep", value: "newWorldArrival" },
      { op: "set", path: "campaign.currentWorldName", value: worldName },
    ];

    if (previousWorldRecord) {
      operations.push({
        op: "append",
        path: "worldLog.visitedWorlds",
        value: previousWorldRecord,
      });
    }

    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");
    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `${this.id}-apply-arrival`,
        title: `Arrive at ${worldName}`,
        operations,
        pauseAfter: false,
        visible: false,
      }),
      factory.popupMessage({
        id: `${this.id}-arrival-summary`,
        title: `Arrived at ${worldName}`,
        message: previousWorldRecord?.name
          ? `The World Log has been updated. ${previousWorldRecord.name} was archived in visited worlds, and ${worldName} is now the current world.`
          : `The World Log has been updated. ${worldName} is now the current world.`,
        buttonText: "Continue",
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: previousWorldRecord?.name
        ? `Arrived at ${worldName}; archived ${previousWorldRecord.name}.`
        : `Arrived at ${worldName}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      prompt: this.prompt,
      label: this.label,
      defaultValue: this.defaultValue,
      buttonText: this.buttonText,
      allowRandomName: this.allowRandomName,
      randomNameSet: this.randomNameSet,
      randomNameButtonText: this.randomNameButtonText,
      turnNumber: this.turnNumber,
      errorMessage: this.errorMessage,
    });
  }
}

export default NewWorldArrivalCommand;
