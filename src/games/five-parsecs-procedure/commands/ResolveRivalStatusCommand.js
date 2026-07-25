import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class ResolveRivalStatusCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Resolve Rival Status", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "resolveRivalStatus", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    if (state?.encounter?.missionType === "invasion") {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Resolve Rival Status",
          message: "Skipped — this was an Invasion battle.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const heldField = state?.encounter?.heldField === true;
    const rivals = state?.worldLog?.rivals || [];
    const isRivalMission = state?.encounter?.missionType === "rival" && rivals.length > 0;

    if (!heldField) {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-no-field`,
          title: "Resolve Rival Status",
          message: "You did not hold the field, so Rival status is unchanged this turn.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const cmds = [];

    if (isRivalMission) {
      if (rivals.length > 1) {
        cmds.push(
          factory.choice({
            id: `${baseId}-pick-rival`,
            title: "Which Rival Did You Fight?",
            prompt: "Select the Rival you fought this battle.",
            options: rivals.map((r) => ({ id: r.id, label: r.name, value: r.id })),
            saveTo: "postBattleTemp.rivalStatus.rivalId",
            buttonText: "Confirm",
            pauseAfter: false,
          })
        );
      }

      cmds.push(
        factory.choice({
          id: `${baseId}-tracked`,
          title: "Tracked Down?",
          prompt: "Did you Track this Rival down during Assign and Resolve Crew Tasks this turn?",
          options: [
            { id: "yes", label: "Yes (+1)", value: "yes" },
            { id: "no", label: "No", value: "no" },
          ],
          saveTo: "postBattleTemp.rivalStatus.tracked",
          buttonText: "Confirm",
          pauseAfter: false,
        }),
        factory.postBattleDispatch({
          id: `${baseId}-resolve-rival-dispatch`,
          dispatchKey: "resolveRivalRoll",
          params: { baseId },
        })
      );
    } else {
      cmds.push(
        factory.postBattleDispatch({
          id: `${baseId}-new-rival-dispatch`,
          dispatchKey: "resolveRivalNewRoll",
          params: { baseId },
        })
      );
    }

    engineContext.pushCommandsToTop(cmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Resolve Rival Status step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default ResolveRivalStatusCommand;
