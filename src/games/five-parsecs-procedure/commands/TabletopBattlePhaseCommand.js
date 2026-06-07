import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class TabletopBattlePhaseCommand extends BaseCommand {
  constructor({
    id,
    title = "Step 3: Tabletop Battle",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
  } = {}) {
    super({
      id,
      type: "tabletopBattlePhase",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `${this.id}-set-phase`,
        title: "Set Tabletop Battle Phase",
        operations: [
          { op: "set", path: "campaign.phase", value: "tabletopBattle" },
          { op: "set", path: "campaign.currentStep", value: "tabletopBattle" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      factory.popupMessage({
        id: `${this.id}-play-battle`,
        title: "Tabletop Battle",
        message: "Play the tabletop battle. Later this command will collect the battle result, casualties, objective status, loot notes, and other encounter details before moving to post-battle.",
        buttonText: "Battle Complete",
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded the Tabletop Battle phase step.",
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

export default TabletopBattlePhaseCommand;
