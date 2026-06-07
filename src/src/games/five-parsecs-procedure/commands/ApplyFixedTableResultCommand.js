import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { characterCreationTables } from "../data/tables/characterCreationTables";

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function findFixedResult({ rollType, resultName }) {
  const table = characterCreationTables[rollType];

  if (!table || !Array.isArray(table.entries)) {
    return null;
  }

  const wanted = normalizeName(resultName);

  return table.entries.find((entry) => normalizeName(entry.label || entry.value) === wanted) || null;
}

export default class ApplyFixedTableResultCommand extends BaseCommand {
  constructor({
    id,
    crewMemberId,
    crewMemberNumber = 1,
    rollType,
    resultName,
    resultKind = null,
    title = null,
    status = "pending",
    pauseAfter = false,
    visible = false,
  }) {
    super({
      id,
      type: "applyFixedTableResult",
      title: title || `Crew Member ${crewMemberNumber}: Apply ${resultName}`,
      status,
      pauseAfter,
      visible,
    });

    this.crewMemberId = crewMemberId;
    this.crewMemberNumber = crewMemberNumber;
    this.rollType = rollType;
    this.resultName = resultName;
    this.resultKind = resultKind || rollType;
  }

  execute(engineContext) {
    const result = findFixedResult({
      rollType: this.rollType,
      resultName: this.resultName,
    });

    if (!result) {
      this.status = "complete";
      engineContext.setStatus("running");
      engineContext.continue();
      engineContext.addLogEntry({
        type: "commandWarning",
        text: `Fixed result not found: ${this.rollType} → ${this.resultName}`,
        commandId: this.id,
      });
      return;
    }

    const detailBasePath = `crewLog.crewDetails.${this.crewMemberId}`;
    const sourcePath = `${detailBasePath}.${this.resultKind}`;
    const selectedResult = removeUndefinedValues({
      tableId: this.rollType,
      tableTitle: characterCreationTables[this.rollType]?.title || this.rollType,
      roll: "fixed",
      fixed: true,
      ...result,
    });

    const commands = [
      engineContext.commandFactory.updateState({
        id: `${this.id}-save-fixed-result`,
        title: `${this.title}: Save Fixed Result`,
        operations: [
          {
            op: "set",
            path: sourcePath,
            value: selectedResult,
          },
        ],
        pauseAfter: false,
        visible: false,
      }),
      engineContext.commandFactory.queueCrewMemberTableResultUpdateCommands({
        id: `${this.id}-queue-fixed-updates`,
        crewMemberId: this.crewMemberId,
        crewMemberNumber: this.crewMemberNumber,
        sourcePath,
        resultKind: this.resultKind,
        title: `${this.title}: Queue Updates`,
        pauseAfter: false,
        visible: false,
      }),
    ];

    engineContext.pushCommandsToTop(commands);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.continue();

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Applied fixed result for crew member ${this.crewMemberNumber}: ${this.rollType} → ${this.resultName}`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      crewMemberId: this.crewMemberId,
      crewMemberNumber: this.crewMemberNumber,
      rollType: this.rollType,
      resultName: this.resultName,
      resultKind: this.resultKind,
    });
  }
}
