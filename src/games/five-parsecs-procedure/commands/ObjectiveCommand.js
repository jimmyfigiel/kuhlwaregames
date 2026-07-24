import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { OBJECTIVE_TABLES_BY_MISSION_TYPE, OBJECTIVE_TYPES } from "../data/tables/objectiveTables";

function normalizeObjectiveTable(table) {
  return {
    id: table.id,
    title: table.label,
    dice: table.dice || "D10",
    sides: 10,
    entries: table.rows.map((row) => ({
      min: row.min,
      max: row.max,
      label: OBJECTIVE_TYPES[row.objective]?.label || row.objective,
      value: row.objective,
    })),
  };
}

export class ObjectiveCommand extends BaseCommand {
  constructor({ id, title = "Determine the Objective", status = "pending", pauseAfter = false, visible = true, missionType = "opportunity" } = {}) {
    super({ id, type: "objective", title, status, pauseAfter, visible });
    this.missionType = missionType;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;
    const missionType = this.missionType;

    // Rival and Invasion battles don't roll for an objective (Rival: "no Win condition,
    // Hold the Field matters"; Invasion: "simply here to outlast the attacking forces").
    if (missionType === "rival" || missionType === "invasion") {
      engineContext.pushCommandsToTop([
        factory.updateState({
          id: `${baseId}-set-none`,
          title: "Set Objective",
          operations: [{ op: "set", path: "encounter.objective", value: missionType === "rival" ? "holdTheField" : "outlast" }],
          pauseAfter: false,
          visible: false,
        }),
        factory.popupMessage({
          id: `${baseId}-none-msg`,
          title: "Determine the Objective",
          message:
            missionType === "rival"
              ? "Rival attacks have no Win condition — but if you Hold the Field, you have an increased chance of permanently chasing them off."
              : "Invasion battles have no Win condition — you're here to outlast the attackers. Hold out for 6 rounds, then flee or fight until you Hold the Field. Any figure that leaves the table before Round 6 becomes a casualty.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const questFinalePending = state?.worldLog?.questFinalePending === true;

    if (missionType === "quest" && questFinalePending) {
      engineContext.pushCommandsToTop([
        factory.updateState({
          id: `${baseId}-set-finale`,
          title: "Set Objective (Quest Finale)",
          operations: [
            { op: "set", path: "encounter.objective", value: "fightOff" },
            { op: "set", path: "encounter.questFinaleBattle", value: true },
          ],
          pauseAfter: false,
          visible: false,
        }),
        factory.popupMessage({
          id: `${baseId}-finale-msg`,
          title: "Determine the Objective — Quest Finale",
          message: `${OBJECTIVE_TYPES.fightOff.text}\n\nThis is the Quest finale: it is always a Fight Off, add +1 to the number of enemies faced, and the opponents are Fearless.`,
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const table = OBJECTIVE_TABLES_BY_MISSION_TYPE[missionType] || OBJECTIVE_TABLES_BY_MISSION_TYPE.opportunity;

    engineContext.pushCommandsToTop([
      factory.tableRoll({
        id: `${baseId}-roll`,
        title: table.label,
        table: normalizeObjectiveTable(table),
        saveTo: "postBattleTemp.objectiveRoll",
        buttonText: "Select",
        rollButtonText: "Roll D10",
        afterSelectionCommands: [
          factory.postBattleDispatch({
            id: `${baseId}-dispatch`,
            dispatchKey: "objectiveDispatch",
            params: { baseId },
          }),
        ],
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Determine the Objective step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON(), missionType: this.missionType });
  }
}

export default ObjectiveCommand;
