import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class GetPaidCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Get Paid", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "getPaid", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    if (state?.encounter?.missionType === "invasion") {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-no-payment`,
          title: "Get Paid",
          message: "You receive no payment for an Invasion Battle.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const isPatronMission = state?.encounter?.missionType === "patron";
    const patronJobs = state?.worldPhase?.patronJobs || {};
    const jobEntries = Object.entries(patronJobs);
    const cmds = [];

    if (isPatronMission && jobEntries.length > 1 && state?.postBattleTemp?.patronStatus?.jobIndex === undefined) {
      cmds.push(
        factory.choice({
          id: `${baseId}-pick-job`,
          title: "Which Patron Job Paid You?",
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
        id: `${baseId}-get-paid-dispatch`,
        dispatchKey: "getPaidDispatch",
        params: { baseId },
      })
    );

    engineContext.pushCommandsToTop(cmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Get Paid step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default GetPaidCommand;
