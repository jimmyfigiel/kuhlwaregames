import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class WorldChooseBattleCommand extends BaseCommand {
  constructor({ id, title = "World: Choose Battle", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "worldChooseBattle", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const baseId = this.id;

    const patronJobsFound = engineContext.getStateValue("worldPhase.patronJobsFound") ?? 0;
    const rivals = engineContext.getStateValue("worldLog.rivals") || [];
    const questRumors = engineContext.getStateValue("worldLog.questRumors") ?? 0;

    const options = [];

    if (patronJobsFound > 0) {
      options.push({
        id: "patron",
        label: "Patron Job",
        value: "patron",
        description: "Fight a mission assigned by your patron.",
      });
    }

    if (rivals.length > 0) {
      options.push({
        id: "rival",
        label: "Rival Encounter",
        value: "rival",
        description: "Track down and fight one of your Rivals.",
      });
    }

    if (questRumors > 0) {
      options.push({
        id: "quest",
        label: "Pursue a Quest",
        value: "quest",
        description: `Follow up on a Quest lead (${questRumors} Quest Rumor${questRumors === 1 ? "" : "s"} accumulated).`,
      });
    }

    options.push({
      id: "opportunity",
      label: "Opportunity Mission",
      value: "opportunity",
      description: "Take on a freelance job from the local area.",
    });

    engineContext.pushCommandsToTop([
      factory.choice({
        id: `${baseId}-choose`,
        title: "Choose Your Battle",
        prompt: "Select the type of battle you will fight this campaign turn.",
        options,
        saveTo: "encounter.missionType",
        saveLabelTo: "encounter.missionTypeLabel",
        buttonText: "Choose",
        pauseAfter: false,
      }),
      factory.postBattleDispatch({
        id: `${baseId}-mission-prep`,
        dispatchKey: "missionPrepDispatch",
        params: { baseId },
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded battle selection step.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default WorldChooseBattleCommand;
