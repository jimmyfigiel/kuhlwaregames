import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { CAMPAIGN_TASKS, CAMPAIGN_TABLES } from "../data/tables/campaignTables";

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeCampaignTable(table) {
  if (!table) return null;
  const dice = String(table.dice || "D100").toUpperCase();
  const sides = dice === "D10" ? 10 : dice === "D6" ? 6 : 100;
  return {
    id: table.id,
    title: table.label || table.title,
    dice: table.dice || "D100",
    sides,
    entries: (table.rows || []).map((row) => ({
      min: row.min,
      max: row.max,
      label: row.label || row.title,
      value: row.value || row.title,
      description: row.description,
    })),
  };
}

export function buildTaskResolutionCommands(factory, baseId, member, taskId, engineContext) {
  const state = engineContext.state;
  const { id, name } = member;

  switch (taskId) {
    case "doNothing":
      return [
        factory.popupMessage({
          id: `${baseId}-resolve-doNothing-${id}`,
          title: `${name}: Do Nothing`,
          message: `${name} sits around on the ship and does nothing this turn.`,
          buttonText: "OK",
          pauseAfter: false,
        }),
      ];

    case "train":
      return [
        factory.updateState({
          id: `${baseId}-resolve-train-xp-${id}`,
          title: `${name}: Train`,
          operations: [{ op: "increment", path: `crewLog.crewDetails.${id}.xp`, amount: 1 }],
          pauseAfter: false,
          visible: false,
        }),
        factory.popupMessage({
          id: `${baseId}-resolve-train-msg-${id}`,
          title: `${name}: Train`,
          message: `${name} earns +1 XP.\nIf a Character Upgrade was triggered, resolve it now.`,
          buttonText: "Done",
          pauseAfter: false,
        }),
      ];

    case "findPatron": {
      return [
        factory.numberInput({
          id: `${baseId}-resolve-findPatron-roll-${id}`,
          title: `${name}: Find Patron`,
          prompt: `${name} is searching for a patron job.\nRoll 1D6 and enter the result below.`,
          label: "D6 Roll",
          min: 1,
          max: 6,
          saveTo: `worldPhase.patronSeekRolls.${id}`,
          buttonText: "Submit Roll",
          pauseAfter: false,
        }),
        factory.postBattleDispatch({
          id: `${baseId}-resolve-findPatron-calc-${id}`,
          dispatchKey: "calcPatronSeek",
          params: { baseId, memberId: id, memberName: name },
        }),
      ];
    }

    case "explore": {
      const table = normalizeCampaignTable(CAMPAIGN_TABLES.explorationTable);
      return [
        factory.tableRoll({
          id: `${baseId}-resolve-explore-${id}`,
          title: `${name}: Explore`,
          table,
          saveTo: `worldPhase.exploreResults.${id}`,
          buttonText: "Select",
          rollButtonText: "Roll with App Dice",
          pauseAfter: false,
        }),
      ];
    }

    case "trade": {
      const table = normalizeCampaignTable(CAMPAIGN_TABLES.tradeTable);
      return [
        factory.tableRoll({
          id: `${baseId}-resolve-trade-${id}`,
          title: `${name}: Trade`,
          table,
          saveTo: `worldPhase.tradeResults.${id}`,
          buttonText: "Select",
          rollButtonText: "Roll with App Dice",
          pauseAfter: false,
        }),
      ];
    }

    case "recruit": {
      const crewCount = (state?.crewLog?.crewMembers || []).length;

      if (crewCount < 6) {
        return [
          factory.popupMessage({
            id: `${baseId}-resolve-recruit-auto-${id}`,
            title: `${name}: Recruit`,
            message: `${name} is recruiting. Your crew has fewer than 6 members, so you automatically find a new recruit.`,
            buttonText: "Add Recruit",
            pauseAfter: false,
          }),
          factory.postBattleDispatch({
            id: `${baseId}-resolve-recruit-add-${id}`,
            dispatchKey: "recruitAddMember",
            params: { baseId },
          }),
        ];
      }

      return [
        factory.numberInput({
          id: `${baseId}-resolve-recruit-roll-${id}`,
          title: `${name}: Recruit`,
          prompt: `${name} is recruiting.\nRoll 1D6 and enter the result below.`,
          label: "D6 Roll",
          min: 1,
          max: 6,
          saveTo: `worldPhase.recruitRolls.${id}`,
          buttonText: "Submit Roll",
          pauseAfter: false,
        }),
        factory.postBattleDispatch({
          id: `${baseId}-resolve-recruit-calc-${id}`,
          dispatchKey: "recruitResolve",
          params: { baseId, memberId: id, memberName: name },
        }),
      ];
    }

    case "track": {
      const rivals = state?.worldLog?.rivals || [];
      if (rivals.length === 0) {
        return [
          factory.popupMessage({
            id: `${baseId}-resolve-track-${id}`,
            title: `${name}: Track`,
            message: `${name} is tracking, but you have no current Rivals.\nThis action has no effect this turn.`,
            buttonText: "OK",
            pauseAfter: false,
          }),
        ];
      }

      return [
        factory.numberInput({
          id: `${baseId}-resolve-track-roll-${id}`,
          title: `${name}: Track`,
          prompt: `${name} is tracking a Rival.\nRoll 1D6 and enter the result below.`,
          label: "D6 Roll",
          min: 1,
          max: 6,
          saveTo: `worldPhase.trackRolls.${id}`,
          buttonText: "Submit Roll",
          pauseAfter: false,
        }),
        factory.postBattleDispatch({
          id: `${baseId}-resolve-track-calc-${id}`,
          dispatchKey: "trackResolve",
          params: { baseId, memberId: id, memberName: name },
        }),
      ];
    }

    case "repairKit": {
      const savvy = state?.crewLog?.crewDetails?.[id]?.stats?.savvy ?? 0;
      return [
        factory.numberInput({
          id: `${baseId}-resolve-repairKit-roll-${id}`,
          title: `${name}: Repair Kit`,
          prompt: `${name} is repairing a damaged item.\nRoll 1D6 and enter the result below. (Savvy +${savvy} is added automatically.)`,
          label: "D6 Roll",
          min: 1,
          max: 6,
          saveTo: `worldPhase.repairRolls.${id}`,
          buttonText: "Submit Roll",
          pauseAfter: false,
        }),
        factory.postBattleDispatch({
          id: `${baseId}-resolve-repairKit-calc-${id}`,
          dispatchKey: "repairKitResolve",
          params: { baseId, memberId: id, memberName: name, savvy },
        }),
      ];
    }

    case "decoy": {
      const crewMembers = state?.crewLog?.crewMembers || [];
      let decoyCount = 0;
      for (const m of crewMembers) {
        const task = state?.worldPhase?.crewTasks?.[m.id];
        if (task === "decoy") decoyCount++;
      }
      return [
        factory.popupMessage({
          id: `${baseId}-resolve-decoy-${id}`,
          title: `${name}: Decoy`,
          message: `${name} is acting as a Decoy.\nWhen rolling to see if Rivals track you down, add +${decoyCount} to the roll (1 per Decoy crew member).`,
          buttonText: "OK",
          pauseAfter: false,
        }),
      ];
    }

    default: {
      const taskDef = CAMPAIGN_TASKS.find((t) => t.id === taskId);
      return [
        factory.popupMessage({
          id: `${baseId}-resolve-default-${id}`,
          title: `${name}: ${taskDef ? taskDef.label : taskId}`,
          message: taskDef ? taskDef.description : `${name} resolves their task: ${taskId}`,
          buttonText: "Done",
          pauseAfter: false,
        }),
      ];
    }
  }
}

// ─── WorldCrewTasksCommand ───────────────────────────────────────────────────

export class WorldCrewTasksCommand extends BaseCommand {
  constructor({ id, title = "World: Crew Tasks", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "worldCrewTasks", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const crewMembers = engineContext.getStateValue("crewLog.crewMembers") || [];

    if (crewMembers.length === 0) {
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const baseId = this.id;
    const taskOptions = CAMPAIGN_TASKS.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      value: t.id,
    }));

    const cmds = [
      factory.popupMessage({
        id: `${baseId}-intro`,
        title: "Assign Crew Tasks",
        message: `Assign a campaign task to each of your ${crewMembers.length} crew member${crewMembers.length > 1 ? "s" : ""}.`,
        buttonText: "Start",
        pauseAfter: false,
      }),
    ];

    for (const member of crewMembers) {
      cmds.push(
        factory.choice({
          id: `${baseId}-assign-${member.id}`,
          title: `Assign Task: ${member.name}`,
          prompt: `Choose a campaign task for ${member.name}.`,
          options: taskOptions,
          saveTo: `worldPhase.crewTasks.${member.id}`,
          saveLabelTo: `worldPhase.crewTaskLabels.${member.id}`,
          buttonText: "Assign",
          pauseAfter: false,
        })
      );
    }

    cmds.push(
      factory.popupMessage({
        id: `${baseId}-resolve-intro`,
        title: "Resolve Tasks",
        message: "All tasks assigned. Now resolve each crew member's task.",
        buttonText: "Continue",
        pauseAfter: false,
      })
    );

    for (const member of crewMembers) {
      cmds.push(
        factory.postBattleDispatch({
          id: `${baseId}-resolve-dispatch-${member.id}`,
          dispatchKey: "resolveCrewTask",
          params: { baseId, memberId: member.id, memberName: member.name },
        })
      );
    }

    engineContext.pushCommandsToTop(cmds);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded crew task assignment and resolution steps.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default WorldCrewTasksCommand;
