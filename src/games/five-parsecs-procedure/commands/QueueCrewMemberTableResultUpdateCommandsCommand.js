import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import ResolvePendingEffectsCommand from "./ResolvePendingEffectsCommand";

export default class QueueCrewMemberTableResultUpdateCommandsCommand extends BaseCommand {
  constructor({
    id,
    crewMemberId,
    crewMemberNumber = 1,
    sourcePath,
    resultKind = "tableResult",
    title = null,
    status = "pending",
    pauseAfter = false,
    visible = false,
  }) {
    super({
      id,
      type: "queueCrewMemberTableResultUpdateCommands",
      title: title || `Crew Member ${crewMemberNumber}: Queue Table Result Updates`,
      status,
      pauseAfter,
      visible,
    });

    this.crewMemberId = crewMemberId;
    this.crewMemberNumber = crewMemberNumber;
    this.sourcePath = sourcePath;
    this.resultKind = resultKind;
  }

  execute(engineContext) {
    const result = engineContext.getStateValue(this.sourcePath);

    if (!result || typeof result !== "object") {
      this.status = "complete";
      engineContext.setStatus("idle");
      engineContext.addLogEntry({
        type: "commandSkipped",
        text: `No table result found at ${this.sourcePath}.`,
        commandId: this.id,
      });
      return;
    }

    const commands = engineContext.commandFactory?.createCrewMemberTableResultUpdateCommands
      ? engineContext.commandFactory.createCrewMemberTableResultUpdateCommands({
          crewMemberId: this.crewMemberId,
          crewMemberNumber: this.crewMemberNumber,
          sourcePath: this.sourcePath,
          resultKind: this.resultKind,
          result,
        })
      : [];

    if (commands.length > 0) {
      const commandsWithImmediateEffectResolution = [
        ...commands,
        new ResolvePendingEffectsCommand({
          id: `${this.id}-resolve-immediate-effects`,
          title: `Resolve Effects for Crew Member ${this.crewMemberNumber}`,
          pauseAfter: false,
          visible: false,
        }),
      ];

      engineContext.pushCommandsToTop(commandsWithImmediateEffectResolution);
      engineContext.setStatus("running");
      engineContext.continue();
    } else {
      engineContext.setStatus("idle");
    }

    this.status = "complete";

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Queued ${commands.length} update command${commands.length === 1 ? "" : "s"} for crew member ${this.crewMemberNumber}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      crewMemberId: this.crewMemberId,
      crewMemberNumber: this.crewMemberNumber,
      sourcePath: this.sourcePath,
      resultKind: this.resultKind,
    });
  }
}
