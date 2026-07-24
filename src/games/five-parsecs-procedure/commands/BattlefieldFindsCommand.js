import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { BATTLEFIELD_FINDS_TABLE } from "../data/tables/postBattleTables";

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
    })),
  };
}

export class BattlefieldFindsCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Battlefield Finds", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "battlefieldFinds", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    const heldField = state?.encounter?.heldField === true;
    const isInvasionBattle = state?.encounter?.missionType === "invasion";

    if (!heldField || isInvasionBattle) {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Battlefield Finds",
          message: isInvasionBattle
            ? "Skipped — no Battlefield Finds after an Invasion battle."
            : "Skipped — you did not hold the field.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    engineContext.pushCommandsToTop([
      factory.tableRoll({
        id: `${baseId}-roll`,
        title: "Battlefield Finds Table",
        table: normalizeTable(BATTLEFIELD_FINDS_TABLE),
        saveTo: "postBattleTemp.battlefieldFinds",
        buttonText: "Claim Find",
        rollButtonText: "Roll with App Dice",
        afterSelectionCommands: [
          factory.postBattleDispatch({
            id: `${baseId}-dispatch`,
            dispatchKey: "battlefieldFindsDispatch",
            params: { baseId },
          }),
        ],
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Battlefield Finds step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default BattlefieldFindsCommand;
