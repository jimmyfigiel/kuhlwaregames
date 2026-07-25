import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { CAMPAIGN_EVENTS_TABLE } from "../data/tables/postBattleTables";

function normalizeTable(table) {
  return {
    id: table.id,
    title: table.label,
    dice: table.dice || "D100",
    sides: 100,
    entries: (table.rows || []).map((row) => ({
      min: row.min,
      max: row.max,
      label: row.title,
      value: row.title,
      description: row.description,
      resultType: row.resultType,
      amount: row.amount,
      cost: row.cost,
      turns: row.turns,
    })),
  };
}

export class CampaignEventCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Campaign Event", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "campaignEvent", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const baseId = this.id;

    engineContext.pushCommandsToTop([
      factory.tableRoll({
        id: `${baseId}-roll`,
        title: "Campaign Event Table",
        table: normalizeTable(CAMPAIGN_EVENTS_TABLE),
        saveTo: "postBattleTemp.campaignEvent",
        buttonText: "Apply",
        rollButtonText: "Roll with App Dice",
        afterSelectionCommands: [
          factory.postBattleDispatch({
            id: `${baseId}-dispatch`,
            dispatchKey: "campaignEventDispatch",
            params: { baseId },
          }),
        ],
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Campaign Event step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default CampaignEventCommand;
