import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function makeId(prefix = "travel-event") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function getEventTitle(event) {
  return event?.label || event?.title || event?.name || event?.value || "Starship Travel Event";
}

export class ApplyStarshipTravelEventCommand extends BaseCommand {
  constructor({
    id = "apply-starship-travel-event",
    title = "Record Starship Travel Event",
    sourcePath = "campaign.lastStarshipTravelEvent",
    turnNumber = null,
    status = "pending",
    pauseAfter = false,
    visible = false,
  } = {}) {
    super({
      id,
      type: "applyStarshipTravelEvent",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.sourcePath = sourcePath;
    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const event = engineContext.getStateValue(this.sourcePath) || {};
    const eventTitle = getEventTitle(event);
    const turnNumber = this.turnNumber || engineContext.getStateValue("campaign.turnNumber") || null;
    const currentWorld = engineContext.getStateValue("worldLog.currentWorld") || {};
    const currentWorldName = currentWorld?.name || engineContext.getStateValue("campaign.currentWorldName") || "current world";
    const eventRecord = removeUndefinedValues({
      id: makeId(),
      tableId: event.tableId || "starshipTravelEvents",
      tableTitle: event.tableTitle || "Starship Travel Events Table",
      roll: event.roll ?? null,
      title: eventTitle,
      label: eventTitle,
      description: event.description || "",
      rulesPage: event.rulesPage || 69,
      turnNumber,
      worldName: currentWorldName,
      createdAt: new Date().toISOString(),
      status: "unresolved",
      notes: "Recorded from Starship Travel Events Table. Resolve any mechanical effects manually for now.",
    });

    engineContext.pushCommandsToTop([
      engineContext.commandFactory.updateState({
        id: `${this.id}-save-event`,
        title: `Record Travel Event: ${eventTitle}`,
        operations: [
          { op: "set", path: "campaign.currentStep", value: "starshipTravelEvent" },
          { op: "set", path: "campaign.lastStarshipTravelEvent", value: eventRecord },
          { op: "append", path: "campaign.travelEvents", value: eventRecord },
          { op: "append", path: "worldLog.travelEvents", value: eventRecord },
        ],
        pauseAfter: false,
        visible: false,
      }),
      engineContext.commandFactory.popupMessage({
        id: `${this.id}-summary`,
        title: `Starship Travel Event: ${eventTitle}`,
        message: event.description
          ? `${event.description}\n\nThis event has been recorded in the campaign and world logs. Resolve any listed effects manually for now.`
          : "This event has been recorded in the campaign and world logs. Resolve any listed effects manually for now.",
        buttonText: "Continue",
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.continue();
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Recorded Starship Travel Event: ${eventTitle}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      sourcePath: this.sourcePath,
      turnNumber: this.turnNumber,
    });
  }
}

export default ApplyStarshipTravelEventCommand;
