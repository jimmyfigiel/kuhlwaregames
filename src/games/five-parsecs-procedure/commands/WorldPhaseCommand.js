import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import WorldCrewTasksCommand from "./WorldCrewTasksCommand";
import WorldJobOffersCommand from "./WorldJobOffersCommand";
import WorldChooseBattleCommand from "./WorldChooseBattleCommand";
import { rollDice } from "./postBattleHelpers";

export class WorldPhaseCommand extends BaseCommand {
  constructor({
    id,
    title = "Step 2: World",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
  } = {}) {
    super({ id, type: "worldPhase", title, status, pauseAfter, visible });
    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const baseId = this.id;

    // Upkeep inline command
    const upkeepCmd = {
      status: "pending",
      execute(ctx) {
        const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];
        const credits = ctx.getStateValue("crewLog.credits") ?? 0;
        const hullDamage = ctx.getStateValue("crewLog.starship.hullDamage") ?? 0;
        const turnNumber = Number(ctx.getStateValue("campaign.turnNumber") || 0);
        const components = ctx.getStateValue("crewLog.starship.components") || [];
        const hasLivingQuarters = components.some((c) => c.componentId === "livingQuarters" && Number(c.installedAtTurn) < turnNumber);
        const traitTitle = ctx.getStateValue("worldLog.currentWorld.trait")?.title;
        const traitCrewModifier = traitTitle === "High cost" ? 2 : 0;
        const upkeepCost = Math.max(0, crewMembers.length - (hasLivingQuarters ? 2 : 0) + traitCrewModifier);
        const remaining = credits - upkeepCost;

        let message = `Upkeep cost: ${upkeepCost} credit${upkeepCost !== 1 ? "s" : ""} (1 per crew member${hasLivingQuarters ? ", -2 Living Quarters" : ""}${traitCrewModifier ? ", +2 High cost world" : ""}).\nCurrent credits: ${credits}\nAfter upkeep: ${remaining}`;
        if (hullDamage > 0) {
          message += `\n\nYour ship has ${hullDamage} Hull Point${hullDamage !== 1 ? "s" : ""} of damage.\nShip repairs cost 1 credit per Hull Point. Resolve repairs now if desired.`;
        }

        const debt = Number(ctx.getStateValue("crewLog.debt") || 0);
        let nextDebt = debt;
        let seized = false;
        if (debt > 0) {
          nextDebt = debt + (debt <= 30 ? 1 : 2);
          message += `\n\nShip debt owed: ${debt} → ${nextDebt} credits (interest accrues each turn).`;
          if (nextDebt > 75) {
            const seizeRoll = rollDice(2, 6).total;
            seized = seizeRoll <= 6;
            message += `\nDebt exceeds 75 — rolled 2D6: ${seizeRoll}. ${seized ? "Your ship is seized and lost!" : "The ship is not seized this time."}`;
          }
        }

        const crewDetails = ctx.getStateValue("crewLog.crewDetails") || {};
        const recoveryOps = [];
        const recoveredNames = [];

        for (const member of crewMembers) {
          const turnsRemaining = Number(crewDetails?.[member.id]?.sickBayTurnsRemaining || 0);
          if (turnsRemaining > 0) {
            const nextTurns = turnsRemaining - 1;
            recoveryOps.push({ op: "set", path: `crewLog.crewDetails.${member.id}.sickBayTurnsRemaining`, value: nextTurns });
            if (nextTurns === 0) {
              recoveredNames.push(member.name);
            }
          }
        }

        if (recoveredNames.length > 0) {
          message += `\n\nRecovered from Sick Bay this turn: ${recoveredNames.join(", ")}.`;
        }

        const debtOps = [];
        if (debt > 0) {
          debtOps.push({ op: "set", path: "crewLog.debt", value: seized ? 0 : nextDebt });
          if (seized) {
            debtOps.push({ op: "set", path: "crewLog.starship", value: null });
          }
        }

        ctx.pushCommandsToTop([
          ctx.commandFactory.updateState({
            id: `${baseId}-upkeep-deduct`,
            title: "Upkeep Costs",
            operations: [{ op: "increment", path: "crewLog.credits", amount: -upkeepCost }, ...recoveryOps, ...debtOps],
            pauseAfter: false,
            visible: false,
          }),
          ctx.commandFactory.popupMessage({
            id: `${baseId}-upkeep-msg`,
            title: "Upkeep & Ship Repairs",
            message,
            buttonText: "Done",
            pauseAfter: false,
          }),
        ]);

        this.status = "complete";
        ctx.setStatus("running");
      },
      toJSON() {
        return removeUndefinedValues({
          id: `${baseId}-upkeep`,
          type: "worldUpkeep",
          status: this.status || "pending",
          baseId,
        });
      },
    };

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `${baseId}-set-phase`,
        title: "Set World Phase",
        operations: [
          { op: "set", path: "campaign.phase", value: "world" },
          { op: "set", path: "campaign.currentStep", value: "world" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      upkeepCmd,
      new WorldCrewTasksCommand({ id: `${baseId}-crew-tasks` }),
      new WorldJobOffersCommand({ id: `${baseId}-job-offers` }),
      factory.popupMessage({
        id: `${baseId}-assign-equipment`,
        title: "Assign Equipment",
        message: "Review your Stash and assign weapons and gear to your crew before choosing the battle.",
        buttonText: "Done",
        pauseAfter: false,
      }),
      factory.postBattleDispatch({
        id: `${baseId}-rumors`,
        dispatchKey: "worldRumors",
        params: { baseId },
      }),
      new WorldChooseBattleCommand({ id: `${baseId}-choose-battle` }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded the World phase steps.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      turnNumber: this.turnNumber,
    });
  }
}

export default WorldPhaseCommand;
