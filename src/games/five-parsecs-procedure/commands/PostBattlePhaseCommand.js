import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class PostBattlePhaseCommand extends BaseCommand {
  constructor({
    id,
    title = "Step 4: Post-Battle Sequence",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
  } = {}) {
    super({
      id,
      type: "postBattlePhase",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const baseId = this.id;

    const stepCommands = [
      factory.battleRoster({ id: `${baseId}-battle-roster` }),
      factory.resolveRivalStatus({ id: `${baseId}-resolve-rival-status` }),
      factory.resolvePatronStatus({ id: `${baseId}-resolve-patron-status` }),
      factory.questProgress({ id: `${baseId}-quest-progress` }),
      factory.getPaid({ id: `${baseId}-get-paid` }),
      factory.battlefieldFinds({ id: `${baseId}-battlefield-finds` }),
      factory.checkInvasion({ id: `${baseId}-check-invasion` }),
      factory.gatherLoot({ id: `${baseId}-gather-loot` }),
      factory.injuriesRecovery({ id: `${baseId}-injuries-recovery` }),
      factory.experienceUpgrades({ id: `${baseId}-xp-upgrades` }),
      factory.advancedTraining({ id: `${baseId}-advanced-training` }),
      factory.purchaseItems({ id: `${baseId}-purchase-items` }),
      factory.campaignEvent({ id: `${baseId}-campaign-event` }),
      factory.characterEvent({ id: `${baseId}-character-event` }),
      factory.galacticWarProgress({ id: `${baseId}-galactic-war` }),
    ];

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `${this.id}-set-phase`,
        title: "Set Post-Battle Phase",
        operations: [
          { op: "set", path: "campaign.phase", value: "postBattle" },
          { op: "set", path: "campaign.currentStep", value: "postBattle" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      ...stepCommands,
      factory.updateState({
        id: `${this.id}-mark-turn-complete`,
        title: "Mark Turn Complete",
        operations: [
          { op: "set", path: "campaign.phase", value: "betweenTurns" },
          { op: "set", path: "campaign.currentStep", value: "betweenTurns" },
          { op: "set", path: "campaign.status", value: "betweenTurns" },
        ],
        pauseAfter: false,
        visible: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded the Post-Battle phase steps.",
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

export default PostBattlePhaseCommand;
