import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { CAMPAIGN_TABLES, PATRON_BHC_THRESHOLDS } from "../data/tables/campaignTables";

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

export function makeCampaignTableRoll(factory, { id, table, saveTo, title, pauseAfter = false }) {
  const normalized = normalizeCampaignTable(table);
  return factory.tableRoll({
    id,
    title: title || normalized.title,
    table: normalized,
    saveTo,
    buttonText: "Select",
    rollButtonText: "Roll with App Dice",
    pauseAfter,
  });
}

// ─── WorldJobOffersCommand ───────────────────────────────────────────────────

export class WorldJobOffersCommand extends BaseCommand {
  constructor({ id, title = "World: Job Offers", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "worldJobOffers", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const baseId = this.id;
    const patronJobsFound = engineContext.getStateValue("worldPhase.patronJobsFound") ?? 0;

    const cmds = [];

    if (patronJobsFound === 0) {
      cmds.push(
        factory.popupMessage({
          id: `${baseId}-no-jobs`,
          title: "No Patron Jobs",
          message: "No patron jobs found this turn.\nYou may still take an Opportunity mission.",
          buttonText: "OK",
          pauseAfter: false,
        })
      );
    } else {
      for (let i = 0; i < patronJobsFound; i++) {
        const jobIndex = i;

        cmds.push(
          makeCampaignTableRoll(factory, {
            id: `${baseId}-job${jobIndex}-patron-type`,
            table: CAMPAIGN_TABLES.patronTable,
            saveTo: `worldPhase.patronJobs.${jobIndex}.patronType`,
            title: `Job ${jobIndex + 1}: Patron Type`,
          }),
          makeCampaignTableRoll(factory, {
            id: `${baseId}-job${jobIndex}-danger-pay`,
            table: CAMPAIGN_TABLES.dangerPayTable,
            saveTo: `worldPhase.patronJobs.${jobIndex}.dangerPay`,
            title: `Job ${jobIndex + 1}: Danger Pay`,
          }),
          makeCampaignTableRoll(factory, {
            id: `${baseId}-job${jobIndex}-time-frame`,
            table: CAMPAIGN_TABLES.timeFrameTable,
            saveTo: `worldPhase.patronJobs.${jobIndex}.timeFrame`,
            title: `Job ${jobIndex + 1}: Time Frame`,
          })
        );

        cmds.push(
          factory.postBattleDispatch({
            id: `${baseId}-job${jobIndex}-bhc`,
            dispatchKey: "patronJobModifiers",
            params: { baseId, jobIndex },
          })
        );
      }
    }

    engineContext.pushCommandsToTop(cmds);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Loaded job offer steps (${patronJobsFound} job(s) found).`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default WorldJobOffersCommand;
