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

function makeCampaignTableRoll(factory, { id, table, saveTo, title, pauseAfter = false }) {
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

        // Inline command to handle BHC modifiers
        const bhcCmd = {
          status: "pending",
          execute(ctx) {
            const patronTypeEntry = ctx.getStateValue(`worldPhase.patronJobs.${jobIndex}.patronType`);
            const patronTypeName = patronTypeEntry?.label || patronTypeEntry?.value || String(patronTypeEntry || "");
            const thresholds = PATRON_BHC_THRESHOLDS[patronTypeName] || { benefits: 8, hazards: 8, conditions: 8 };

            const benefitsRoll = Math.floor(Math.random() * 10) + 1;
            const hazardsRoll = Math.floor(Math.random() * 10) + 1;
            const conditionsRoll = Math.floor(Math.random() * 10) + 1;

            const subCmds = [];

            if (benefitsRoll >= thresholds.benefits) {
              subCmds.push(
                makeCampaignTableRoll(ctx.commandFactory, {
                  id: `${baseId}-job${jobIndex}-benefits`,
                  table: CAMPAIGN_TABLES.benefitsSubtable,
                  saveTo: `worldPhase.patronJobs.${jobIndex}.benefit`,
                  title: `Job ${jobIndex + 1}: Benefit`,
                })
              );
            }

            if (hazardsRoll >= thresholds.hazards) {
              subCmds.push(
                makeCampaignTableRoll(ctx.commandFactory, {
                  id: `${baseId}-job${jobIndex}-hazards`,
                  table: CAMPAIGN_TABLES.hazardsSubtable,
                  saveTo: `worldPhase.patronJobs.${jobIndex}.hazard`,
                  title: `Job ${jobIndex + 1}: Hazard`,
                })
              );
            }

            if (conditionsRoll >= thresholds.conditions) {
              subCmds.push(
                makeCampaignTableRoll(ctx.commandFactory, {
                  id: `${baseId}-job${jobIndex}-conditions`,
                  table: CAMPAIGN_TABLES.conditionsSubtable,
                  saveTo: `worldPhase.patronJobs.${jobIndex}.condition`,
                  title: `Job ${jobIndex + 1}: Condition`,
                })
              );
            }

            const hasBenefit = benefitsRoll >= thresholds.benefits;
            const hasHazard = hazardsRoll >= thresholds.hazards;
            const hasCondition = conditionsRoll >= thresholds.conditions;

            const modifierLines = [];
            if (hasBenefit) modifierLines.push(`• Benefit roll: ${benefitsRoll} (threshold ${thresholds.benefits}) — roll on Benefits table`);
            else modifierLines.push(`• No benefit (rolled ${benefitsRoll}, need ${thresholds.benefits})`);
            if (hasHazard) modifierLines.push(`• Hazard roll: ${hazardsRoll} (threshold ${thresholds.hazards}) — roll on Hazards table`);
            else modifierLines.push(`• No hazard (rolled ${hazardsRoll}, need ${thresholds.hazards})`);
            if (hasCondition) modifierLines.push(`• Condition roll: ${conditionsRoll} (threshold ${thresholds.conditions}) — roll on Conditions table`);
            else modifierLines.push(`• No condition (rolled ${conditionsRoll}, need ${thresholds.conditions})`);

            subCmds.push(
              ctx.commandFactory.popupMessage({
                id: `${baseId}-job${jobIndex}-summary`,
                title: `Job ${jobIndex + 1}: Summary`,
                message: `Patron: ${patronTypeName || "Unknown"}\n${modifierLines.join("\n")}`,
                buttonText: "Continue",
                pauseAfter: false,
              })
            );

            ctx.pushCommandsToTop(subCmds);
            this.status = "complete";
            ctx.setStatus("running");
          },
          toJSON() {
            return removeUndefinedValues({
              id: `${baseId}-job${jobIndex}-bhc`,
              type: "patronJobModifiers",
              status: this.status || "pending",
              jobIndex,
              baseId,
            });
          },
        };

        cmds.push(bhcCmd);
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
