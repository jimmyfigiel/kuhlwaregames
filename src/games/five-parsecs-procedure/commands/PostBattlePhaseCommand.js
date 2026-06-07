import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

const POST_BATTLE_STEPS = [
  ["resolve-rival-status", "Post-Battle: Resolve Rival Status", "Resolve Rival status after the battle."],
  ["resolve-patron-status", "Post-Battle: Resolve Patron Status", "Resolve Patron status after the battle."],
  ["quest-progress", "Post-Battle: Determine Quest Progress", "Determine Quest progress."],
  ["get-paid", "Post-Battle: Get Paid", "Resolve payment for the job if payment is pending."],
  ["battlefield-finds", "Post-Battle: Battlefield Finds", "Resolve Battlefield Finds."],
  ["check-invasion", "Post-Battle: Check for Invasion", "Check whether an Invasion occurs or progresses."],
  ["gather-loot", "Post-Battle: Gather the Loot", "Gather and record loot."],
  ["injuries-recovery", "Post-Battle: Determine Injuries and Recovery", "Determine Injuries and recovery for casualties."],
  ["xp-upgrades", "Post-Battle: Experience and Character Upgrades", "Assign XP and resolve character upgrades."],
  ["advanced-training", "Post-Battle: Invest in Advanced Training", "Invest in Advanced Training if desired."],
  ["purchase-items", "Post-Battle: Purchase Items", "Purchase items after the battle."],
  ["campaign-event", "Post-Battle: Campaign Event", "Roll for a Campaign Event."],
  ["character-event", "Post-Battle: Character Event", "Roll for a Character Event."],
  ["galactic-war", "Post-Battle: Galactic War Progress", "Check for Galactic War progress if applicable."],
];

export class PostBattlePhaseCommand extends BaseCommand {
  constructor({
    id,
    title = "Step 4: Post-Battle Sequence",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
  } = {}) {
    super({
      id,
      type: "postBattlePhase",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;

    const stepCommands = POST_BATTLE_STEPS.map(([slug, title, message]) =>
      factory.popupMessage({
        id: `${this.id}-${slug}`,
        title,
        message,
        buttonText: "Done",
        pauseAfter: false,
      })
    );

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `${this.id}-set-phase`,
        title: "Set Post-Battle Phase",
        operations: [
          { op: "set", path: "campaign.phase", value: "postBattle" },
          { op: "set", path: "campaign.currentStep", value: "postBattle" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      ...stepCommands,
      factory.updateState({
        id: `${this.id}-mark-turn-complete`,
        title: "Mark Turn Complete",
        operations: [
          { op: "set", path: "campaign.phase", value: "betweenTurns" },
          { op: "set", path: "campaign.currentStep", value: "betweenTurns" },
          { op: "set", path: "campaign.status", value: "betweenTurns" },
        ],
        pauseAfter: false,
        visible: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded the Post-Battle phase steps.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      turnNumber: this.turnNumber,
    });
  }
}

export default PostBattlePhaseCommand;
