import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { getActiveCrewMembers } from "./postBattleHelpers";

export class AdvancedTrainingCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Invest in Advanced Training", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "advancedTraining", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    const eligible = getActiveCrewMembers(state).filter((m) => !state?.crewLog?.crewDetails?.[m.id]?.advancedTraining);
    const credits = Number(state?.crewLog?.credits || 0);

    if (eligible.length === 0 || credits < 1) {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Invest in Advanced Training",
          message: eligible.length === 0 ? "Every crew member already has Advanced Training. Nothing to do." : "You have no credits to pay the application fee.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    engineContext.pushCommandsToTop([
      factory.choice({
        id: `${baseId}-offer`,
        title: "Invest in Advanced Training?",
        prompt: "Send a crew member to Advanced Training this turn? Costs 1 credit application fee, requiring a 2D6 roll of 4+ to be approved. Only one attempt is permitted per campaign turn.",
        options: [
          { id: "yes", label: "Yes — Apply", value: "yes" },
          { id: "no", label: "No — Skip", value: "no" },
        ],
        saveTo: "postBattleTemp.advancedTraining.offer",
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      factory.postBattleDispatch({
        id: `${baseId}-offer-dispatch`,
        dispatchKey: "advancedTrainingOffer",
        params: { baseId },
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Invest in Advanced Training step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default AdvancedTrainingCommand;
