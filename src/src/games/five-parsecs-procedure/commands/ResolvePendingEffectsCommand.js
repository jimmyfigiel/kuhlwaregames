import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export default class ResolvePendingEffectsCommand extends BaseCommand {
  constructor({
    id = "resolve-pending-creation-effects",
    title = "Resolve Pending Creation Effects",
    status = "pending",
    pauseAfter = false,
    visible = false,
  } = {}) {
    super({
      id,
      type: "resolvePendingEffects",
      title,
      status,
      pauseAfter,
      visible,
    });
  }

  execute(engineContext) {
    const commands = engineContext.commandFactory?.createPendingEffectResolutionCommands
      ? engineContext.commandFactory.createPendingEffectResolutionCommands({
          state: engineContext.state,
        })
      : [];

    if (commands.length > 0) {
      engineContext.pushCommandsToTop(commands);
      engineContext.setStatus("running");
      engineContext.continue();
    } else {
      engineContext.setStatus("idle");
    }

    this.status = "complete";

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Queued ${commands.length} command${commands.length === 1 ? "" : "s"} to resolve pending effects.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
    });
  }
}
