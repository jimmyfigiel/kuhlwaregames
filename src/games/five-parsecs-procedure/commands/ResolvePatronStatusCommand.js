import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { isObjectiveAchieved } from "./postBattleHelpers";

export class ResolvePatronStatusCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Resolve Patron Status", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "resolvePatronStatus", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    const isPatronMission = state?.encounter?.missionType === "patron";
    const succeeded = isPatronMission && isObjectiveAchieved(state);
    const patronJobs = state?.worldPhase?.patronJobs || {};
    const jobEntries = Object.entries(patronJobs);

    if (!succeeded) {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Resolve Patron Status",
          message: isPatronMission
            ? "The mission was not successful, so no Patron is added to your contacts."
            : "Skipped — this was not a Patron mission.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const cmds = [];

    if (jobEntries.length > 1) {
      cmds.push(
        factory.choice({
          id: `${baseId}-pick-job`,
          title: "Which Patron Job Did You Fight?",
          prompt: "Select the Patron job this battle resolved.",
          options: jobEntries.map(([jobIndex, job]) => ({
            id: jobIndex,
            label: job?.patronType?.title || job?.patronType?.label || `Job ${Number(jobIndex) + 1}`,
            value: jobIndex,
          })),
          saveTo: "postBattleTemp.patronStatus.jobIndex",
          buttonText: "Confirm",
          pauseAfter: false,
        })
      );
    }

    cmds.push(
      factory.postBattleDispatch({
        id: `${baseId}-resolve-patron-dispatch`,
        dispatchKey: "resolvePatronDispatch",
        params: { baseId },
      })
    );

    engineContext.pushCommandsToTop(cmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Resolve Patron Status step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default ResolvePatronStatusCommand;
