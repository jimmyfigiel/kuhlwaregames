import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { ENEMY_ENCOUNTER_CATEGORY_TABLE, ENEMY_CATEGORY_TABLES } from "../data/tables/enemyTables";

function buildCategoryTableForColumn(missionColumn) {
  return {
    id: "enemyEncounterCategory",
    title: "Enemy Encounter Category",
    dice: "D100",
    sides: 100,
    entries: ENEMY_ENCOUNTER_CATEGORY_TABLE.filter((r) => r[missionColumn]).map((r) => ({
      min: r[missionColumn][0],
      max: r[missionColumn][1],
      label: r.category,
      value: r.category,
    })),
  };
}

function buildEnemySubtable(categoryId) {
  const category = ENEMY_CATEGORY_TABLES[categoryId];
  return {
    id: category.id,
    title: category.label,
    dice: "D100",
    sides: 100,
    entries: category.rows.map((row) => ({
      min: row.min,
      max: row.max,
      label: row.name,
      value: row.name,
      row,
    })),
  };
}

export class EnemyGenerationCommand extends BaseCommand {
  constructor({ id, title = "Determine the Enemy", status = "pending", pauseAfter = false, visible = true, missionType = "opportunity" } = {}) {
    super({ id, type: "enemyGeneration", title, status, pauseAfter, visible });
    this.missionType = missionType;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;
    const missionType = this.missionType;
    const isInvasion = missionType === "invasion";
    const invasionBonus = isInvasion ? 2 : 0;

    // Rival mission against an established Rival — reuse their known type if we have one.
    if (missionType === "rival") {
      const rivalId = state?.postBattleTemp?.rivalStatus?.rivalId || state?.encounter?.selectedRivalId;
      const rivals = state?.worldLog?.rivals || [];
      const rival = rivals.find((r) => r.id === rivalId) || rivals[0];

      if (rival?.enemyCategory && rival?.enemyName) {
        engineContext.pushCommandsToTop([
          factory.postBattleDispatch({
            id: `${baseId}-reuse-rival-type`,
            dispatchKey: "enemyGenerationRollSpecific",
            params: { baseId, categoryId: rival.enemyCategory, missionType, forcedEnemyName: rival.enemyName, rivalId: rival.id, invasionBonus },
          }),
        ]);
        this.status = "complete";
        engineContext.setStatus("running");
        return;
      }
    }

    const missionColumn = missionType === "rival" ? "unknownRival" : missionType === "patron" ? "patron" : missionType === "quest" ? "quest" : "opportunity";

    engineContext.pushCommandsToTop([
      factory.popupMessage({
        id: `${baseId}-intro`,
        title: "Step 3: Determine the Enemy",
        message: "Roll D100 on the Enemy Encounter Category Table, then roll again on that category's subtable for the exact enemy type.",
        buttonText: "Roll",
        pauseAfter: false,
      }),
      factory.tableRoll({
        id: `${baseId}-category`,
        title: "Enemy Encounter Category",
        table: buildCategoryTableForColumn(missionColumn),
        saveTo: "postBattleTemp.enemyGen.category",
        buttonText: "Select",
        rollButtonText: "Roll D100",
        afterSelectionCommands: [
          factory.postBattleDispatch({
            id: `${baseId}-category-dispatch`,
            dispatchKey: "enemyGenerationRollCategory",
            params: { baseId, missionType, invasionBonus },
          }),
        ],
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Determine the Enemy step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON(), missionType: this.missionType });
  }
}

export { buildEnemySubtable, buildCategoryTableForColumn };
export default EnemyGenerationCommand;
