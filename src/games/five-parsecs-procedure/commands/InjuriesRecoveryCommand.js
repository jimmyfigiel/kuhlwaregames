import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { INJURY_TABLE, BOT_INJURY_TABLE } from "../data/tables/postBattleTables";
import { isBotOrSoulless } from "./postBattleHelpers";

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
      recoveryTurns: row.sickBayTurns ?? row.repairTurns,
    })),
  };
}

export class InjuriesRecoveryCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Determine Injuries and Recovery", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "injuriesRecovery", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    const crewMembers = state?.crewLog?.crewMembers || [];
    const casualties = crewMembers.filter((m) => state?.crewLog?.crewDetails?.[m.id]?.battleOutcome === "casualty");

    if (casualties.length === 0) {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Determine Injuries and Recovery",
          message: "No casualties this battle — nothing to resolve.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const cmds = [];

    for (const member of casualties) {
      const memberId = member.id;
      const memberName = member.name;
      const detail = state?.crewLog?.crewDetails?.[memberId] || {};
      const isBot = isBotOrSoulless(detail) && String(detail?.injuryTable || "").toLowerCase() === "bot";
      const table = isBot ? BOT_INJURY_TABLE : INJURY_TABLE;

      cmds.push(
        factory.tableRoll({
          id: `${baseId}-roll-${memberId}`,
          title: `${isBot ? "Bot Injury" : "Injury"} Table: ${memberName}`,
          table: normalizeTable(table),
          saveTo: `postBattleTemp.injuryRolls.${memberId}`,
          buttonText: "Apply",
          rollButtonText: "Roll with App Dice",
          afterSelectionCommands: [
            factory.postBattleDispatch({
              id: `${baseId}-dispatch-${memberId}`,
              dispatchKey: "injuryDispatch",
              params: { baseId, memberId, memberName, isBot },
            }),
          ],
          pauseAfter: false,
        })
      );
    }

    engineContext.pushCommandsToTop(cmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: `Loaded Determine Injuries and Recovery step (${casualties.length} casualty roll(s)).`, commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default InjuriesRecoveryCommand;
