import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class GatherLootCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Gather the Loot", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "gatherLoot", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    if (state?.encounter?.missionType === "invasion") {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Gather the Loot",
          message: "Skipped — no Loot after an Invasion battle.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const rollCount = state?.encounter?.questWasFinale ? 3 : 1;

    engineContext.pushCommandsToTop([
      factory.postBattleDispatch({
        id: `${baseId}-loot-start`,
        dispatchKey: "startLootChain",
        params: {
          chainId: `gather-loot-${baseId}`,
          rollCount,
          doneDispatchKey: "lootChainFinalize",
          doneParams: { title: "Gather the Loot", multiHeader: "You gained:" },
        },
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: `Loaded Gather the Loot step (${rollCount} roll${rollCount === 1 ? "" : "s"}).`, commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default GatherLootCommand;
