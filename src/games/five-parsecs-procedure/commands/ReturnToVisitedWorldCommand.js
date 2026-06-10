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
      archivedFromTurn: value.archivedFromTurn || null,
      arrivalTurn: value.arrivalTurn || null,
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
    archivedFromTurn: null,
    arrivalTurn: null,
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

function sameWorld(a, b) {
  const aId = String(a?.id || "");
  const bId = String(b?.id || "");

  if (aId && bId) {
    return aId === bId;
  }

  return String(a?.name || "").trim().toLowerCase() === String(b?.name || "").trim().toLowerCase();
}

function removeWorldFromList(worlds, targetWorld) {
  return (Array.isArray(worlds) ? worlds : []).filter((world) => !sameWorld(normalizeWorld(world), targetWorld));
}

function findVisitedWorld(worlds, targetWorldId) {
  const safeTarget = String(targetWorldId || "").replace(/^return:/, "");
  return (Array.isArray(worlds) ? worlds : [])
    .map(normalizeWorld)
    .find((world) => String(world.id || "") === safeTarget || String(world.name || "") === safeTarget) || null;
}

export class ReturnToVisitedWorldCommand extends BaseCommand {
  constructor({
    id,
    title = "Travel: Return to Previous World",
    targetWorldId = "",
    turnNumber = null,
    status = "pending",
    pauseAfter = false,
    visible = false,
  } = {}) {
    super({
      id,
      type: "returnToVisitedWorld",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.targetWorldId = String(targetWorldId || "").replace(/^return:/, "");
    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const now = new Date().toISOString();
    const turnNumber = this.turnNumber || engineContext.getStateValue("campaign.turnNumber") || null;
    const currentWorld = normalizeWorld(engineContext.getStateValue("worldLog.currentWorld"));
    const visitedWorlds = Array.isArray(engineContext.getStateValue("worldLog.visitedWorlds"))
      ? engineContext.getStateValue("worldLog.visitedWorlds")
      : [];
    const returningWorld = findVisitedWorld(visitedWorlds, this.targetWorldId);

    if (!returningWorld) {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${this.id}-missing-world`,
          title: "Previous World Not Found",
          message: "That previous world is no longer available in the World Log. Continue to the World phase and choose travel again if needed.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);

      this.status = "complete";
      engineContext.setStatus("running");
      engineContext.continue();
      return;
    }

    const currentWorldRecord = hasMeaningfulWorld(currentWorld)
      ? {
          ...currentWorld,
          departedAt: now,
          archivedFromTurn: turnNumber,
        }
      : null;
    const returnedWorld = {
      ...returningWorld,
      arrivedAt: now,
      departedAt: "",
      arrivalTurn: turnNumber,
      returnedTo: true,
    };
    const previousWorlds = removeWorldFromList(visitedWorlds, returningWorld);

    if (currentWorldRecord && !sameWorld(currentWorldRecord, returnedWorld)) {
      previousWorlds.push(currentWorldRecord);
    }

    const arrivalRecord = {
      id: makeId("arrival"),
      worldId: returnedWorld.id,
      worldName: returnedWorld.name,
      previousWorldId: currentWorldRecord?.id || "",
      previousWorldName: currentWorldRecord?.name || "",
      turnNumber,
      arrivedAt: now,
      type: "return",
      notes: currentWorldRecord?.name
        ? `Returned to ${returnedWorld.name} after leaving ${currentWorldRecord.name}.`
        : `Returned to ${returnedWorld.name}.`,
    };

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `${this.id}-apply-return`,
        title: `Return to ${returnedWorld.name}`,
        operations: [
          { op: "set", path: "worldLog.currentWorld", value: returnedWorld },
          { op: "set", path: "worldLog.visitedWorlds", value: previousWorlds },
          { op: "set", path: "worldLog.worldTraits", value: returnedWorld.traits || [] },
          { op: "set", path: "worldLog.license", value: returnedWorld.license || "" },
          { op: "set", path: "worldLog.invasion", value: returnedWorld.invasion || "" },
          { op: "append", path: "worldLog.arrivalHistory", value: arrivalRecord },
          { op: "set", path: "campaign.currentStep", value: "returnToVisitedWorld" },
          { op: "set", path: "campaign.currentWorldName", value: returnedWorld.name },
        ],
        pauseAfter: false,
        visible: false,
      }),
      factory.popupMessage({
        id: `${this.id}-return-summary`,
        title: `Returned to ${returnedWorld.name}`,
        message: currentWorldRecord?.name
          ? `The World Log has been updated. ${returnedWorld.name} is now the current world, and ${currentWorldRecord.name} moved to Previous Worlds.`
          : `The World Log has been updated. ${returnedWorld.name} is now the current world.`,
        buttonText: "Continue",
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.continue();
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: currentWorldRecord?.name
        ? `Returned to ${returnedWorld.name}; archived ${currentWorldRecord.name}.`
        : `Returned to ${returnedWorld.name}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      targetWorldId: this.targetWorldId,
      turnNumber: this.turnNumber,
    });
  }
}

export default ReturnToVisitedWorldCommand;
