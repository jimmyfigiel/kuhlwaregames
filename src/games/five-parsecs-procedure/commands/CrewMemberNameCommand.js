import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { buildCrewTypeTableForCrewMember } from "../data/tables";

export default class CrewMemberNameCommand extends BaseCommand {
  constructor({
    id,
    crewMemberNumber = 1,
    title = null,
    prompt = null,
    defaultValue = "",
    buttonText = "OK",
    allowRandomName = true,
    randomNameSet = "five_parsecs_pulp",
    randomNameButtonText = "Generate Name",
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
    this.allowRandomName = allowRandomName;
    this.randomNameSet = randomNameSet;
    this.randomNameButtonText = randomNameButtonText;
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

    const crewMemberId = `crew-member-${this.crewMemberNumber}`;
    const detailPath = `crewLog.crewDetails.${crewMemberId}`;

    const updateNameCommand = engineContext.commandFactory.updateState({
      id: `${crewMemberId}-save-name`,
      title: `Crew Member ${this.crewMemberNumber}: Save Name`,
      operations: [
        {
          op: "append",
          path: "crewLog.crewMembers",
          value: {
            id: crewMemberId,
            number: this.crewMemberNumber,
            name,
          },
        },
        {
          op: "set",
          path: `${detailPath}.name`,
          value: name,
        },
        {
          op: "set",
          path: `${detailPath}.number`,
          value: this.crewMemberNumber,
        },
      ],
      pauseAfter: false,
      visible: false,
    });

    const crewTypeTableCommand = engineContext.commandFactory.tableRoll({
      id: `${crewMemberId}-crew-type-table`,
      title: `Crew Member ${this.crewMemberNumber}: Crew Type`,
      table: buildCrewTypeTableForCrewMember({
        crewMemberId,
        crewMemberNumber: this.crewMemberNumber,
      }),
      saveTo: `${detailPath}.crewType`,
      afterSelectionCommands: [
        {
          id: `${crewMemberId}-queue-crew-type-updates`,
          type: "queueCrewMemberTableResultUpdateCommands",
          title: `Crew Member ${this.crewMemberNumber}: Queue Crew Type Updates`,
          crewMemberId,
          crewMemberNumber: this.crewMemberNumber,
          sourcePath: `${detailPath}.crewType`,
          resultKind: "crewType",
          pauseAfter: false,
          visible: false,
        },
      ],
      buttonText: "OK",
      pauseAfter: false,
    });

    engineContext.pushCommandsToTop([updateNameCommand, crewTypeTableCommand]);

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Queued creation commands for crew member ${this.crewMemberNumber}: ${name}`,
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
      allowRandomName: this.allowRandomName,
      randomNameSet: this.randomNameSet,
      randomNameButtonText: this.randomNameButtonText,
      errorMessage: this.errorMessage,
    });
  }
}
