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

    options.push({
      id: "opportunity",
      label: "Opportunity Mission",
      value: "opportunity",
      description: "Take on a freelance job from the local area.",
    });

    const missionPrepCmd = {
      status: "pending",
      execute(ctx) {
        const missionType = ctx.getStateValue("encounter.missionType");

        let message;
        if (missionType === "patron") {
          message = "Record the patron details in your Encounter Log.\nSet up the battlefield and generate enemy forces according to the patron's mission parameters.";
        } else if (missionType === "rival") {
          message = "Select a rival from your list.\nNote their faction for enemy force generation.";
        } else {
          message = "Roll for the Opportunity mission type and enemy forces using the standard tables.";
        }

        ctx.pushCommandsToTop([
          ctx.commandFactory.popupMessage({
            id: `${baseId}-mission-prep-msg`,
            title: "Mission Prep",
            message,
            buttonText: "Ready",
            pauseAfter: false,
          }),
          ctx.commandFactory.updateState({
            id: `${baseId}-set-encounter-ready`,
            title: "Encounter Ready",
            operations: [{ op: "set", path: "encounter.phase", value: "ready" }],
            pauseAfter: false,
            visible: false,
          }),
        ]);

        this.status = "complete";
        ctx.setStatus("running");
      },
      toJSON() {
        return removeUndefinedValues({
          id: `${baseId}-mission-prep`,
          type: "missionPrepDispatch",
          status: this.status || "pending",
          baseId,
        });
      },
    };

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
      missionPrepCmd,
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
