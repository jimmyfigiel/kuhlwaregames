import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function getEnemyNumberRule(crewSize) {
  if (crewSize <= 4) {
    return {
      key: "roll2d6UseLower",
      label: "Roll 2D6 and use the lower result when determining enemy numbers.",
    };
  }

  if (crewSize === 5) {
    return {
      key: "roll1d6",
      label: "Roll 1D6 when determining enemy numbers.",
    };
  }

  return {
    key: "roll2d6UseHigher",
    label: "Roll 2D6 and use the higher result when determining enemy numbers.",
  };
}

export class CampaignPrepCommand extends BaseCommand {
  constructor({
    id = "campaign-prep",
    title = "Campaign Prep",
    status = "pending",
    pauseAfter = false,
    visible = true,
  } = {}) {
    super({
      id,
      type: "campaignPrep",
      title,
      status,
      pauseAfter,
      visible,
    });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const selectedCrewSize = Number(engineContext.getStateValue("crewLog.startingCrewCount") || 6);
    const crewSize = [4, 5, 6].includes(selectedCrewSize) ? selectedCrewSize : 6;
    const enemyRule = getEnemyNumberRule(crewSize);

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: "mark-campaign-prep-phase",
        title: "Mark Campaign Prep Phase",
        operations: [
          { op: "set", path: "campaign.phase", value: "campaignPrep" },
          { op: "set", path: "campaign.status", value: "setup" },
          { op: "set", path: "campaign.currentStep", value: "campaignPrep" },
          { op: "set", path: "campaign.crewSize", value: crewSize },
          { op: "set", path: "campaign.deployLimit", value: crewSize },
          { op: "set", path: "campaign.enemyNumberRule", value: enemyRule.key },
          { op: "set", path: "campaign.enemyNumberRuleLabel", value: enemyRule.label },
        ],
        pauseAfter: false,
        visible: false,
      }),
      factory.popupMessage({
        id: "campaign-prep-crew-size-summary",
        title: "Campaign Crew Size",
        message: `Campaign crew size is ${crewSize}. You may deploy up to ${crewSize} characters in battle. ${enemyRule.label}`,
        buttonText: "Continue",
        pauseAfter: false,
      }),
      factory.choice({
        id: "choose-story-track",
        title: "Story Track",
        prompt: "Do you want to use the Story Track for this campaign?",
        options: [
          {
            id: "story-track-no",
            label: "No Story Track",
            value: false,
            description: "Play a regular open campaign.",
          },
          {
            id: "story-track-yes",
            label: "Use Story Track",
            value: true,
            description: "Use the narrative Story Track events from the appendix.",
          },
        ],
        saveTo: "campaign.storyTrackEnabled",
        saveLabelTo: "campaign.storyTrackLabel",
        buttonText: "Save Story Track Choice",
        pauseAfter: false,
      }),
      factory.choice({
        id: "choose-victory-condition",
        title: "Victory Condition",
        prompt: "Choose a victory condition, or choose none for an open-ended campaign.",
        options: factory.getVictoryConditionOptions(),
        saveTo: "campaign.victoryCondition",
        saveLabelTo: "campaign.victoryConditionLabel",
        buttonText: "Save Victory Condition",
        pauseAfter: false,
      }),
      factory.choice({
        id: "choose-difficulty-mode",
        title: "Difficulty Mode",
        prompt: "Choose the campaign difficulty mode.",
        options: factory.getDifficultyModeOptions(),
        saveTo: "campaign.difficultyMode",
        saveLabelTo: "campaign.difficultyModeLabel",
        buttonText: "Save Difficulty",
        pauseAfter: false,
      }),
      factory.resolveStartingStoryPoints({
        id: "resolve-starting-story-points",
        title: "Starting Story Points",
        pauseAfter: false,
        visible: true,
      }),
      factory.updateState({
        id: "finish-campaign-prep",
        title: "Finish Campaign Prep",
        operations: [
          { op: "set", path: "campaign.setupComplete", value: true },
          { op: "set", path: "campaign.status", value: "ready" },
          { op: "set", path: "campaign.phase", value: "readyForTurn" },
          { op: "set", path: "campaign.currentStep", value: "readyForTurn" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      factory.popupMessage({
        id: "campaign-prep-complete",
        title: "Campaign Prep Complete",
        message: "Campaign prep is complete. Review your Campaign, Crew, Encounter, and World sheets before starting the first turn.",
        buttonText: "Continue",
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Built the campaign prep command sequence.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
    });
  }
}

export default CampaignPrepCommand;
