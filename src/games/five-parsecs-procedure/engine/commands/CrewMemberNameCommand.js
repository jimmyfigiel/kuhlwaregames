import BaseCommand from "./BaseCommand";
import { removeUndefinedValues } from "../utils";

export default class CrewMemberNameCommand extends BaseCommand {
  constructor({
    id,
    crewMemberNumber = 1,
    title = null,
    prompt = null,
    defaultValue = "",
    buttonText = "OK",
    status = "pending",
    pauseAfter = false,
    visible = true,
  }) {
    super({
      id,
      type: "crewMemberName",
      title: title || `Crew Member ${crewMemberNumber}`,
      status,
      pauseAfter,
      visible,
    });

    this.crewMemberNumber = crewMemberNumber;
    this.prompt = prompt || `Enter the name of crew member ${crewMemberNumber}.`;
    this.defaultValue = defaultValue;
    this.buttonText = buttonText;
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
    const rawValue = input.value ?? this.defaultValue;
    const name = String(rawValue || "").trim();

    if (!name) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this,
        status: "waitingForUser",
        errorMessage: "Please enter a crew member name.",
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    engineContext.appendStateValue("crewLog.crewMembers", {
      id: `crew-member-${this.crewMemberNumber}`,
      number: this.crewMemberNumber,
      name,
    });

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Created crew member ${this.crewMemberNumber}: ${name}`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      crewMemberNumber: this.crewMemberNumber,
      prompt: this.prompt,
      defaultValue: this.defaultValue,
      buttonText: this.buttonText,
      errorMessage: this.errorMessage,
    });
  }
}
