import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import WorldCrewTasksCommand from "./WorldCrewTasksCommand";
import WorldJobOffersCommand from "./WorldJobOffersCommand";
import WorldChooseBattleCommand from "./WorldChooseBattleCommand";

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
        const upkeepCost = crewMembers.length;
        const remaining = credits - upkeepCost;

        let message = `Upkeep cost: ${upkeepCost} credit${upkeepCost !== 1 ? "s" : ""} (1 per crew member).\nCurrent credits: ${credits}\nAfter upkeep: ${remaining}`;
        if (hullDamage > 0) {
          message += `\n\nYour ship has ${hullDamage} Hull Point${hullDamage !== 1 ? "s" : ""} of damage.\nShip repairs cost 1 credit per Hull Point. Resolve repairs now if desired.`;
        }

        ctx.pushCommandsToTop([
          ctx.commandFactory.updateState({
            id: `${baseId}-upkeep-deduct`,
            title: "Upkeep Costs",
            operations: [{ op: "increment", path: "crewLog.credits", amount: -upkeepCost }],
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

    // Rumors inline command
    const rumorsCmd = {
      status: "pending",
      execute(ctx) {
        const rumors = ctx.getStateValue("worldLog.rumors") ?? 0;
        const questRumors = ctx.getStateValue("worldLog.questRumors") ?? 0;
        const total = rumors + questRumors;

        let message;
        if (total === 0) {
          message = "You have no Rumors or Quest Rumors to resolve this turn.";
        } else {
          const parts = [];
          if (rumors > 0) parts.push(`${rumors} Rumor${rumors !== 1 ? "s" : ""}`);
          if (questRumors > 0) parts.push(`${questRumors} Quest Rumor${questRumors !== 1 ? "s" : ""}`);
          message = `You have ${parts.join(" and ")} to resolve.\nSpend 1 credit per Rumor to convert it into a Quest lead. Quest Rumors may advance your current Quest.`;
        }

        ctx.pushCommandsToTop([
          ctx.commandFactory.popupMessage({
            id: `${baseId}-rumors-msg`,
            title: "Resolve Rumors",
            message,
            buttonText: total === 0 ? "Skip" : "Resolve",
            pauseAfter: false,
          }),
        ]);

        this.status = "complete";
        ctx.setStatus("running");
      },
      toJSON() {
        return removeUndefinedValues({
          id: `${baseId}-rumors`,
          type: "worldRumors",
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
      rumorsCmd,
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
