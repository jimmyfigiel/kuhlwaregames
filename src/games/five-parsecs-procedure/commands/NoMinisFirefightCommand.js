import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class NoMinisFirefightCommand extends BaseCommand {
  constructor({
    id,
    title = "The Firefight",
    status = "pending",
    pauseAfter = false,
    visible = true,
    roundNumber = 1,
    firefightModifier = 0,
    blocksBrawling = false,
  } = {}) {
    super({ id, type: "noMinisFirefight", title, status, pauseAfter, visible });
    this.roundNumber = roundNumber;
    this.firefightModifier = firefightModifier;
    this.blocksBrawling = blocksBrawling;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const baseId = this.id;

    engineContext.pushCommandsToTop([
      factory.postBattleDispatch({
        id: `${baseId}-setup`,
        dispatchKey: "noMinisFirefightSetup",
        params: { baseId, roundNumber: this.roundNumber, modifier: this.firefightModifier, blocksBrawling: this.blocksBrawling },
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Loaded Firefight for Round ${this.roundNumber}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      roundNumber: this.roundNumber,
      firefightModifier: this.firefightModifier,
      blocksBrawling: this.blocksBrawling,
    });
  }
}

export default NoMinisFirefightCommand;
