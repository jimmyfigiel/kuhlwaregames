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

function buildTaskResolutionCommands(factory, baseId, member, taskId, engineContext) {
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
      const patronSeekCalcCmd = {
        status: "pending",
        execute(ctx) {
          const roll = ctx.getStateValue(`worldPhase.patronSeekRolls.${id}`) ?? 0;

          const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];
          let patronSeekers = 0;
          for (const m of crewMembers) {
            const task = ctx.getStateValue(`worldPhase.crewTasks.${m.id}`);
            if (task === "findPatron") patronSeekers++;
          }

          const existingPatrons = (ctx.getStateValue("worldLog.patrons") || []).length;
          const total = roll + patronSeekers + existingPatrons;
          const found = total >= 6 ? 2 : total >= 5 ? 1 : 0;

          const currentFound = ctx.getStateValue("worldPhase.patronJobsFound") ?? 0;
          const newTotal = Math.min(currentFound + found, 2);

          ctx.pushCommandsToTop([
            ctx.commandFactory.updateState({
              id: `${baseId}-resolve-findPatron-save-${id}`,
              title: `${name}: Find Patron`,
              operations: [{ op: "set", path: "worldPhase.patronJobsFound", value: newTotal }],
              pauseAfter: false,
              visible: false,
            }),
            ctx.commandFactory.popupMessage({
              id: `${baseId}-resolve-findPatron-msg-${id}`,
              title: `${name}: Find Patron`,
              message: found === 0
                ? `${name} rolled ${roll}. Total: ${total} (roll + ${patronSeekers} seekers + ${existingPatrons} contacts).\nNo patron jobs found.`
                : `${name} rolled ${roll}. Total: ${total} (roll + ${patronSeekers} seekers + ${existingPatrons} contacts).\n${found === 2 ? "Two patron jobs found!" : "One patron job found!"}`,
              buttonText: "OK",
              pauseAfter: false,
            }),
          ]);

          this.status = "complete";
          ctx.setStatus("running");
        },
        toJSON() {
          return removeUndefinedValues({
            id: `${baseId}-resolve-findPatron-calc-${id}`,
            type: "calcPatronSeek",
            status: this.status || "pending",
            memberId: id,
            memberName: name,
            baseId,
          });
        },
      };

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
        patronSeekCalcCmd,
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
      const autoRecruit = crewCount < 6;
      return [
        factory.popupMessage({
          id: `${baseId}-resolve-recruit-${id}`,
          title: `${name}: Recruit`,
          message: autoRecruit
            ? `${name} is recruiting. Your crew has fewer than 6 members, so you automatically find a new recruit.\nGenerate a new crew member and add them to your roster.`
            : `${name} is recruiting. Roll 1D6 and add the number of crew members Recruiting. On 6+, you gain one new recruit.\nCrew currently has ${crewCount} members.`,
          buttonText: "Done",
          pauseAfter: false,
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

      const crewMembers = state?.crewLog?.crewMembers || [];
      let trackerCount = 0;
      for (const m of crewMembers) {
        const task = state?.worldPhase?.crewTasks?.[m.id];
        if (task === "track") trackerCount++;
      }

      return [
        factory.popupMessage({
          id: `${baseId}-resolve-track-${id}`,
          title: `${name}: Track`,
          message: `${name} is tracking a Rival.\nRoll 1D6 + ${trackerCount} (trackers) + any credits spent. On 6+, you locate a Rival of your choice for a battle this turn.\nYou have ${rivals.length} rival(s).`,
          buttonText: "Done",
          pauseAfter: false,
        }),
      ];
    }

    case "repairKit": {
      const savvy = state?.crewLog?.crewDetails?.[id]?.stats?.savvy ?? 0;
      return [
        factory.popupMessage({
          id: `${baseId}-resolve-repairKit-${id}`,
          title: `${name}: Repair Kit`,
          message: `${name} is repairing an item.\nRoll 1D6 + Savvy (${savvy}) + any credits spent on spare parts. On 6+, the item is repaired.\nA natural 1 always fails and the item is destroyed.`,
          buttonText: "Done",
          pauseAfter: false,
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
      const memberId = member.id;
      const memberName = member.name;

      const resolutionCmd = {
        status: "pending",
        execute(ctx) {
          const taskId = ctx.getStateValue(`worldPhase.crewTasks.${memberId}`) || "doNothing";
          const resCmds = buildTaskResolutionCommands(
            ctx.commandFactory,
            baseId,
            { id: memberId, name: memberName },
            taskId,
            ctx
          );
          ctx.pushCommandsToTop(resCmds);
          this.status = "complete";
          ctx.setStatus("running");
        },
        toJSON() {
          return removeUndefinedValues({
            id: `${baseId}-resolve-dispatch-${memberId}`,
            type: "resolveCrewTask",
            status: this.status || "pending",
            memberId,
            memberName,
            baseId,
          });
        },
      };

      cmds.push(resolutionCmd);
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
