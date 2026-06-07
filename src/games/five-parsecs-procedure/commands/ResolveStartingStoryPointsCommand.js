import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

function normalizeDifficulty(value) {
  return String(value || "normal").trim().toLowerCase();
}

function getDifficultyAdjustment(difficultyMode) {
  const difficulty = normalizeDifficulty(difficultyMode);

  if (difficulty === "hardcore") {
    return {
      mode: difficulty,
      adjustment: -1,
      disabled: false,
      label: "Hardcore: subtract 1 story point.",
    };
  }

  if (difficulty === "insanity") {
    return {
      mode: difficulty,
      adjustment: 0,
      disabled: true,
      label: "Insanity: start with 0 story points and cannot receive story points.",
    };
  }

  return {
    mode: difficulty,
    adjustment: 0,
    disabled: false,
    label: "No starting story point adjustment.",
  };
}

export class ResolveStartingStoryPointsCommand extends BaseCommand {
  constructor({
    id = "resolve-starting-story-points",
    title = "Starting Story Points",
    status = "pending",
    pauseAfter = false,
    visible = true,
  } = {}) {
    super({
      id,
      type: "resolveStartingStoryPoints",
      title,
      status,
      pauseAfter,
      visible,
    });
  }

  execute(engineContext) {
    const difficultyMode = engineContext.getStateValue("campaign.difficultyMode") || "normal";
    const difficultyInfo = getDifficultyAdjustment(difficultyMode);

    if (difficultyInfo.disabled) {
      engineContext.pushCommandsToTop(
        engineContext.commandFactory.updateState({
          id: "apply-starting-story-points-insanity",
          title: "Apply Starting Story Points: 0",
          operations: [
            { op: "set", path: "campaign.startingStoryPoints", value: 0 },
            { op: "set", path: "campaign.storyPoints", value: 0 },
            { op: "set", path: "campaign.storyPointsDisabled", value: true },
            { op: "set", path: "campaign.storyPointRule", value: difficultyInfo.label },
            { op: "set", path: "worldLog.storyPoints", value: 0 },
          ],
          pauseAfter: false,
          visible: false,
        })
      );

      this.status = "complete";
      engineContext.setStatus("running");
      engineContext.addLogEntry({
        type: "commandCompleted",
        text: "Starting story points set to 0 because difficulty is Insanity.",
        commandId: this.id,
      });
      return;
    }

    this.status = "waitingForUser";
    engineContext.showActiveCommand({
      ...this.toJSON(),
      difficultyMode,
      adjustment: difficultyInfo.adjustment,
      adjustmentLabel: difficultyInfo.label,
      baseBonus: 1,
    });
    engineContext.setStatus("waitingForUser");
    engineContext.stopAfterCurrentCommand();

    engineContext.addLogEntry({
      type: "commandStarted",
      text: `Started command: ${this.title}`,
      commandId: this.id,
    });
  }

  resolve(engineContext, input = {}) {
    const difficultyMode = engineContext.getStateValue("campaign.difficultyMode") || "normal";
    const difficultyInfo = getDifficultyAdjustment(difficultyMode);

    if (difficultyInfo.disabled) {
      engineContext.pushCommandsToTop(
        engineContext.commandFactory.updateState({
          id: "apply-starting-story-points-insanity",
          title: "Apply Starting Story Points: 0",
          operations: [
            { op: "set", path: "campaign.startingStoryPoints", value: 0 },
            { op: "set", path: "campaign.storyPoints", value: 0 },
            { op: "set", path: "campaign.storyPointsDisabled", value: true },
            { op: "set", path: "campaign.storyPointRule", value: difficultyInfo.label },
            { op: "set", path: "worldLog.storyPoints", value: 0 },
          ],
          pauseAfter: false,
          visible: false,
        })
      );
      engineContext.clearActiveCommand();
      engineContext.setStatus("idle");
      return;
    }

    const rawRoll = input.roll ?? input.value;
    const parsedRoll = Number(rawRoll);

    if (!Number.isFinite(parsedRoll) || parsedRoll < 1 || parsedRoll > 6) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this.toJSON(),
        status: "waitingForUser",
        difficultyMode,
        adjustment: difficultyInfo.adjustment,
        adjustmentLabel: difficultyInfo.label,
        baseBonus: 1,
        errorMessage: "Enter a D6 result from 1 to 6.",
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    const roll = Math.floor(parsedRoll);
    const rawTotal = roll + 1;
    const finalTotal = Math.max(0, rawTotal + difficultyInfo.adjustment);

    engineContext.pushCommandsToTop(
      engineContext.commandFactory.updateState({
        id: "apply-starting-story-points",
        title: `Apply Starting Story Points: ${finalTotal}`,
        operations: [
          { op: "set", path: "campaign.startingStoryPointRoll", value: roll },
          { op: "set", path: "campaign.startingStoryPointsRawTotal", value: rawTotal },
          { op: "set", path: "campaign.startingStoryPointAdjustment", value: difficultyInfo.adjustment },
          { op: "set", path: "campaign.startingStoryPointAdjustmentLabel", value: difficultyInfo.label },
          { op: "set", path: "campaign.startingStoryPoints", value: finalTotal },
          { op: "set", path: "campaign.storyPoints", value: finalTotal },
          { op: "set", path: "campaign.storyPointsDisabled", value: false },
          { op: "set", path: "worldLog.storyPoints", value: finalTotal },
        ],
        pauseAfter: false,
        visible: false,
      })
    );

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Starting story points: ${finalTotal}.`,
      commandId: this.id,
    });
  }

  rollWithApp() {
    return rollD6();
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      errorMessage: this.errorMessage,
    });
  }
}

export default ResolveStartingStoryPointsCommand;
