import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class PurchaseItemsCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Purchase Items", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "purchaseItems", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const baseId = this.id;

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `${baseId}-reset-sold-count`,
        title: "Reset Purchase Items Counters",
        operations: [{ op: "set", path: "postBattleTemp.purchaseItems.soldCount", value: 0 }],
        pauseAfter: false,
        visible: false,
      }),
      factory.postBattleDispatch({
        id: `${baseId}-component-offer`,
        dispatchKey: "purchaseComponentOffer",
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Purchase Items step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default PurchaseItemsCommand;
