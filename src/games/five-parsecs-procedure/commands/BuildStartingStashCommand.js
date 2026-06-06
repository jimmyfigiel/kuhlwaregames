import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { STARTING_EQUIPMENT_RULES } from "../data/tables/startingEquipmentTables";

export default class BuildStartingStashCommand extends BaseCommand {
  constructor({
    id = "build-starting-stash",
    title = "Build Starting Crew Stash",
    crewCountPath = "crewLog.startingCrewCount",
    status = "pending",
    pauseAfter = false,
    visible = false,
  } = {}) {
    super({
      id,
      type: "buildStartingStash",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.crewCountPath = crewCountPath;
  }

  execute(engineContext) {
    const rawCrewCount = engineContext.getStateValue(this.crewCountPath) ?? 0;
    const parsedCrewCount = Number(rawCrewCount);
    const crewCount = Number.isFinite(parsedCrewCount) ? Math.max(0, Math.floor(parsedCrewCount)) : 0;
    const commands = [];

    const baseCredits = Number(STARTING_EQUIPMENT_RULES?.credits?.basePerCrewMember || 0) * crewCount;

    if (baseCredits > 0) {
      commands.push(
        engineContext.commandFactory.updateState({
          id: "add-base-starting-credits",
          title: `Add ${baseCredits} Starting Credits`,
          operations: [
            {
              op: "increment",
              path: "crewLog.credits",
              amount: baseCredits,
            },
            {
              op: "append",
              path: "crewLog.resolvedEffects",
              value: {
                id: "base-starting-credits",
                status: "resolved",
                effectType: "startingCredits",
                source: "Starting Equipment",
                total: baseCredits,
                resolution: `Added ${baseCredits} starting credits.`,
                resolvedAt: new Date().toISOString(),
              },
            },
          ],
          pauseAfter: false,
          visible: false,
        })
      );
    }

    (STARTING_EQUIPMENT_RULES.baseRolls || []).forEach((roll) => {
      const count = Number(roll.count || 1);
      const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 1;

      for (let index = 0; index < safeCount; index += 1) {
        const suffix = safeCount > 1 ? ` ${index + 1}` : "";
        const pendingEffectId = `starting-stash-${roll.tableId}-${index + 1}`;

        const command = engineContext.commandFactory.equipmentTableRoll({
          id: `${pendingEffectId}-equipment-table`,
          pendingEffectId,
          tableId: roll.tableId,
          source: "Starting Crew Stash",
          title: `${roll.label || roll.tableId}${suffix}`,
          pauseAfter: false,
          visible: true,
        });

        if (command) {
          commands.push(command);
        }
      }
    });

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
      text: `Queued ${commands.length} starting stash command${commands.length === 1 ? "" : "s"}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      crewCountPath: this.crewCountPath,
    });
  }
}
