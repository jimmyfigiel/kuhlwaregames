import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { rollDie, isObjectiveAchieved } from "./postBattleHelpers";

export class QuestProgressCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Determine Quest Progress", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "questProgress", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    if (state?.encounter?.missionType !== "quest") {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Determine Quest Progress",
          message: "Skipped — this battle was not part of a Quest.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const questRumors = Number(state?.worldLog?.questRumors || 0);
    const won = isObjectiveAchieved(state);
    const wasFinaleBattle = state?.worldLog?.questFinalePending === true;
    const roll = rollDie(6);
    const modified = roll + questRumors - (won ? 0 : 2);

    const opsCmds = [];

    if (wasFinaleBattle) {
      opsCmds.push(
        factory.updateState({
          id: `${baseId}-resolve-finale`,
          title: "Resolve Quest Finale",
          operations: [
            { op: "set", path: "worldLog.questFinalePending", value: false },
            { op: "set", path: "encounter.questWasFinale", value: true },
          ],
          pauseAfter: false,
          visible: false,
        })
      );
    }

    let outcomeText;

    if (modified <= 3) {
      outcomeText = "This place was a dead end. The Quest continues.";
    } else if (modified <= 6) {
      outcomeText = "You're a step closer. Gained a Quest Rumor.";
      opsCmds.push(
        factory.updateState({
          id: `${baseId}-gain-rumor`,
          title: "Gain Quest Rumor",
          operations: [{ op: "increment", path: "worldLog.questRumors", amount: 1 }],
          pauseAfter: false,
          visible: false,
        })
      );
    } else {
      outcomeText = "You've reached the conclusion of the Quest! Next Quest mission will be the finale — a Straight-up Fight with +1 opponent, and the opponents will be Fearless.";
      opsCmds.push(
        factory.updateState({
          id: `${baseId}-set-finale`,
          title: "Set Quest Finale Pending",
          operations: [{ op: "set", path: "worldLog.questFinalePending", value: true }],
          pauseAfter: false,
          visible: false,
        })
      );
    }

    let anotherWorldText = "";
    if (modified >= 4) {
      const travelRoll = rollDie(6);
      if (travelRoll >= 5) {
        anotherWorldText = `\n\nA further D6 roll (${travelRoll}) says the next step is on another world — you'll need to travel before continuing the Quest, though there's no rush.`;
        opsCmds.push(
          factory.updateState({
            id: `${baseId}-set-another-world`,
            title: "Quest Next Step On Another World",
            operations: [{ op: "set", path: "worldLog.questNextStepAnotherWorld", value: true }],
            pauseAfter: false,
            visible: false,
          })
        );
      }
    }

    opsCmds.push(
      factory.popupMessage({
        id: `${baseId}-result`,
        title: "Determine Quest Progress",
        message: `Rolled 1D6: ${roll} + ${questRumors} Quest Rumors${won ? "" : " - 2 (did not Win)"} = ${modified}.\n\n${outcomeText}${anotherWorldText}`,
        buttonText: "Continue",
        pauseAfter: false,
      })
    );

    engineContext.pushCommandsToTop(opsCmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Determine Quest Progress step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default QuestProgressCommand;
