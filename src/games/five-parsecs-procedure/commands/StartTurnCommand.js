import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function nextTurnNumberFromState(engineContext) {
  const currentTurn = Number(engineContext.getStateValue("campaign.turnNumber") || 0);
  return Number.isFinite(currentTurn) ? currentTurn + 1 : 1;
}

export class StartTurnCommand extends BaseCommand {
  constructor({
    id = "start-turn",
    title = "Start Turn",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
    message = "",
    buttonText = "Start Turn",
  } = {}) {
    super({
      id,
      type: "startTurn",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.turnNumber = turnNumber;
    this.message = message;
    this.buttonText = buttonText;
  }

  execute(engineContext) {
    const nextTurnNumber = this.turnNumber || nextTurnNumberFromState(engineContext);

    this.turnNumber = nextTurnNumber;
    this.title = `Start Campaign Turn ${nextTurnNumber}`;
    this.message = `Ready to start Campaign Turn ${nextTurnNumber}? This is a natural place to pause, review your crew, and continue when you are ready.`;
    this.status = "waitingForUser";

    engineContext.showActiveCommand(this);
    engineContext.setStatus("waitingForUser");
    engineContext.stopAfterCurrentCommand();

    engineContext.addLogEntry({
      type: "commandStarted",
      text: `Waiting to start Campaign Turn ${nextTurnNumber}.`,
      commandId: this.id,
    });
  }

  resolve(engineContext) {
    const factory = engineContext.commandFactory;
    const turnNumber = this.turnNumber || nextTurnNumberFromState(engineContext);

    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `turn-${turnNumber}-mark-started`,
        title: `Mark Campaign Turn ${turnNumber} Started`,
        operations: [
          { op: "set", path: "campaign.turnNumber", value: turnNumber },
          { op: "set", path: "campaign.phase", value: "travel" },
          { op: "set", path: "campaign.status", value: "active" },
          { op: "set", path: "campaign.setupComplete", value: true },
          { op: "set", path: "campaign.currentStep", value: "travel" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      factory.travelPhase({
        id: `turn-${turnNumber}-travel-phase`,
        title: `Turn ${turnNumber}: Step 1 - Travel`,
        turnNumber,
      }),
      factory.worldPhase({
        id: `turn-${turnNumber}-world-phase`,
        title: `Turn ${turnNumber}: Step 2 - World`,
        turnNumber,
      }),
      factory.tabletopBattlePhase({
        id: `turn-${turnNumber}-tabletop-battle-phase`,
        title: `Turn ${turnNumber}: Step 3 - Tabletop Battle`,
        turnNumber,
      }),
      factory.postBattlePhase({
        id: `turn-${turnNumber}-post-battle-phase`,
        title: `Turn ${turnNumber}: Step 4 - Post-Battle Sequence`,
        turnNumber,
      }),
      factory.startTurn({
        id: `start-turn-${turnNumber + 1}`,
        title: `Start Campaign Turn ${turnNumber + 1}`,
        turnNumber: turnNumber + 1,
      }),
    ]);

    this.status = "complete";

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Campaign Turn ${turnNumber} started.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      turnNumber: this.turnNumber,
      message: this.message,
      buttonText: this.buttonText,
    });
  }
}

export default StartTurnCommand;
