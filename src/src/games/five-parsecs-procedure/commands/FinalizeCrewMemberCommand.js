import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function pickCharacterType(detail = {}) {
  if (detail.strangeCharacter?.label) {
    return detail.strangeCharacter.label;
  }

  if (detail.primaryAlien?.label) {
    return detail.primaryAlien.label;
  }

  if (detail.crewType?.label) {
    return detail.crewType.label;
  }

  return "Unknown";
}

function pickCategory(detail = {}) {
  return (
    detail.strangeCharacter?.category ||
    detail.primaryAlien?.category ||
    detail.crewType?.category ||
    detail.category ||
    "Unknown"
  );
}

export default class FinalizeCrewMemberCommand extends BaseCommand {
  constructor({
    id,
    crewMemberId,
    crewMemberNumber = 1,
    title = null,
    status = "pending",
    pauseAfter = false,
    visible = false,
  }) {
    super({
      id,
      type: "finalizeCrewMember",
      title: title || `Crew Member ${crewMemberNumber}: Finish Character`,
      status,
      pauseAfter,
      visible,
    });

    this.crewMemberId = crewMemberId;
    this.crewMemberNumber = crewMemberNumber;
  }

  execute(engineContext) {
    const detailPath = `crewLog.crewDetails.${this.crewMemberId}`;
    const detail = engineContext.getStateValue(detailPath) || {};
    const characterType = pickCharacterType(detail);
    const category = pickCategory(detail);

    engineContext.pushCommandsToTop(
      engineContext.commandFactory.updateState({
        id: `${this.crewMemberId}-mark-character-complete`,
        title: `Crew Member ${this.crewMemberNumber}: Mark Character Complete`,
        targetPath: detailPath,
        operations: [
          {
            op: "set",
            path: "characterType",
            value: characterType,
          },
          {
            op: "set",
            path: "category",
            value: category,
          },
          {
            op: "set",
            path: "creationComplete",
            value: true,
          },
        ],
        pauseAfter: false,
        visible: false,
      })
    );

    this.status = "complete";
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Queued final updates for crew member ${this.crewMemberNumber}: ${detail.name || this.crewMemberId} (${characterType})`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      crewMemberId: this.crewMemberId,
      crewMemberNumber: this.crewMemberNumber,
    });
  }
}
