import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { NO_MINIS_BATTLE_FLOW_EVENTS } from "../data/tables/noMinisBattleFlowEvents";
import NoMinisInitiativeCommand from "./NoMinisInitiativeCommand";
import NoMinisFirefightCommand from "./NoMinisFirefightCommand";

// Self-looping round command — pushes all steps for one round, then a continue check
class NoMinisCombatRoundCommand extends BaseCommand {
  constructor({ id, roundNumber = 1, battleFlowEventsEnabled = false, hecticCombatEnabled = false, fasterCombatEnabled = false } = {}) {
    super({
      id,
      type: "noMinisCombatRound",
      title: `Battle Round ${roundNumber}`,
      status: "pending",
      pauseAfter: false,
      visible: true,
    });
    this.roundNumber = roundNumber;
    this.battleFlowEventsEnabled = battleFlowEventsEnabled;
    this.hecticCombatEnabled = hecticCombatEnabled;
    this.fasterCombatEnabled = fasterCombatEnabled;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const round = this.roundNumber;
    const baseId = `no-minis-round-${round}`;
    const bfe = this.battleFlowEventsEnabled;
    const hectic = this.hecticCombatEnabled;
    const faster = this.fasterCombatEnabled;

    const subRuleNote = [
      hectic ? "Hectic Combat: characters shoot every engagement this round; subsequent attacks by the same character hit only on a natural 6." : null,
      faster ? "Faster Combat: first exchange of fire this round treats both combatants as being in the open (not Cover)." : null,
    ].filter(Boolean).join("\n");

    const cmds = [];

    // Step 1: Battle Flow Events (optional)
    if (bfe) {
      cmds.push(
        factory.tableRoll({
          id: `${baseId}-battle-flow`,
          title: `Round ${round}: Battle Flow Events`,
          table: NO_MINIS_BATTLE_FLOW_EVENTS,
          saveTo: `noMinis.rounds.${round}.battleFlowEvent`,
          rollButtonText: "Roll D100",
          buttonText: "Select Event",
          pauseAfter: false,
        }),
        {
          // Read BFE result from state and queue firefight modifier if needed
          id: `${baseId}-apply-bfe`,
          type: "applyBattleFlowEvent",
          status: "pending",
          pauseAfter: false,
          visible: false,
          round,
          execute(ctx) {
            const bfeResult = ctx.state?.noMinis?.rounds?.[this.round]?.battleFlowEvent;
            const needsKillZoneRoll = bfeResult?.value === "kill-zone";

            ctx.pushCommandsToTop([
              ctx.commandFactory.popupMessage({
                id: `${baseId}-bfe-display`,
                title: `Battle Flow Event: ${bfeResult?.label || "Unknown"}`,
                message: bfeResult?.text
                  ? `${bfeResult.text}${needsKillZoneRoll ? "\n\n🎲 Roll 1D6+10 now to determine the Kill Zone range in inches." : ""}`
                  : "No battle flow event this round.",
                buttonText: "OK",
                pauseAfter: false,
              }),
            ]);

            this.status = "complete";
            ctx.setStatus("running");
          },
          toJSON() {
            return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible, round: this.round });
          },
        }
      );
    }

    // Step 2: Initiative
    cmds.push(
      factory.popupMessage({
        id: `${baseId}-initiative-intro`,
        title: `Round ${round}: Initiative`,
        message:
          `Roll initiative using one die fewer than normal.\n\n` +
          `Crew Captain and any character assigned a die ≤ their Reactions score may each take one Initiative Action.\n` +
          `Characters assigned a higher die are caught up in the general firefight — no action.\n` +
          `Enemies do NOT act during Initiative.\n\n` +
          `${subRuleNote ? `Active Sub-rules:\n${subRuleNote}\n\n` : ""}` +
          `Resolve each eligible character's action in any order.`,
        buttonText: "Roll Initiative",
        pauseAfter: false,
      }),
      factory.numberInput({
        id: `${baseId}-eligible-count`,
        title: `Round ${round}: Eligible Characters`,
        prompt: "How many crew members get an Initiative Action this round? (Captain always qualifies; others qualify if their initiative die ≤ their Reactions score.)",
        label: "Eligible characters",
        defaultValue: 1,
        min: 0,
        max: 8,
        saveTo: `noMinis.rounds.${round}.eligibleCount`,
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      {
        id: `${baseId}-queue-initiative-actions`,
        type: "queueInitiativeActions",
        status: "pending",
        pauseAfter: false,
        visible: false,
        round,
        battleFlowEventsEnabled: bfe,
        hecticCombatEnabled: hectic,
        fasterCombatEnabled: faster,
        execute(ctx) {
          const count = ctx.state?.noMinis?.rounds?.[this.round]?.eligibleCount ?? 0;
          const f = ctx.commandFactory;
          const actionCmds = [];

          for (let i = 1; i <= count; i += 1) {
            actionCmds.push(
              new NoMinisInitiativeCommand({
                id: `no-minis-round-${this.round}-init-char-${i}`,
                title: `Round ${this.round} — Initiative: Character ${i}`,
                characterName: `Character ${i}`,
                roundNumber: this.round,
                pauseAfter: false,
              })
            );
          }

          if (actionCmds.length === 0) {
            actionCmds.push(
              f.popupMessage({
                id: `no-minis-round-${this.round}-no-init`,
                title: `Round ${this.round}: No Initiative Actions`,
                message: "No crew members qualified for an Initiative Action this round. Proceeding to Firefight.",
                buttonText: "OK",
                pauseAfter: false,
              })
            );
          }

          ctx.pushCommandsToTop(actionCmds);
          this.status = "complete";
          ctx.setStatus("running");
        },
        toJSON() {
          return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible, round: this.round });
        },
      }
    );

    // Step 3: Firefight — modifier is read from BFE result when the command executes
    cmds.push(
      {
        id: `${baseId}-queue-firefight`,
        type: "queueFirefight",
        status: "pending",
        pauseAfter: false,
        visible: false,
        round,
        execute(ctx) {
          const bfeResult = ctx.state?.noMinis?.rounds?.[this.round]?.battleFlowEvent;
          const modifier = bfeResult?.firefightModifier ?? 0;
          const blocksBrawling = bfeResult?.blocksBrawling ?? false;

          ctx.pushCommandsToTop([
            new NoMinisFirefightCommand({
              id: `no-minis-round-${this.round}-firefight`,
              title: `Round ${this.round}: Firefight`,
              roundNumber: this.round,
              firefightModifier: modifier,
              blocksBrawling,
              pauseAfter: false,
            }),
          ]);

          this.status = "complete";
          ctx.setStatus("running");
        },
        toJSON() {
          return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible, round: this.round });
        },
      }
    );

    // Step 4: Morale & Retreat
    cmds.push(
      factory.popupMessage({
        id: `${baseId}-morale`,
        title: `Round ${round}: Morale & Retreat`,
        message:
          "Enemies take Morale tests as normal. Morale failures remove regular foes first, then Specialists.\n\n" +
          "You may attempt to retreat up to 2 crew members: roll 1D6 per figure — success (≤ their Movement speed) means they escape as if they left over the battlefield edge.\n\n" +
          "Characters with special movement options (e.g. Jump Belt) can leave automatically, in addition to the normal two retreating figures.\n\n" +
          "All Stun markers are cleared at the end of this battle round.",
        buttonText: "Morale & Retreat Done",
        pauseAfter: false,
      })
    );

    // Continue check
    cmds.push(
      new NoMinisContinueCommand({
        id: `${baseId}-continue`,
        roundNumber: round,
        battleFlowEventsEnabled: bfe,
        hecticCombatEnabled: hectic,
        fasterCombatEnabled: faster,
      })
    );

    engineContext.pushCommandsToTop(cmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Loaded No-Minis Battle Round ${round}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      roundNumber: this.roundNumber,
      battleFlowEventsEnabled: this.battleFlowEventsEnabled,
      hecticCombatEnabled: this.hecticCombatEnabled,
      fasterCombatEnabled: this.fasterCombatEnabled,
    });
  }
}

// Prompts the player whether to continue to the next round
class NoMinisContinueCommand extends BaseCommand {
  constructor({ id, roundNumber = 1, battleFlowEventsEnabled = false, hecticCombatEnabled = false, fasterCombatEnabled = false } = {}) {
    super({ id, type: "noMinisContinue", title: `End of Round ${roundNumber}`, status: "pending", pauseAfter: false, visible: true });
    this.roundNumber = roundNumber;
    this.battleFlowEventsEnabled = battleFlowEventsEnabled;
    this.hecticCombatEnabled = hecticCombatEnabled;
    this.fasterCombatEnabled = fasterCombatEnabled;
  }

  execute(engineContext) {
    this.status = "waitingForUser";
    engineContext.showActiveCommand(this);
    engineContext.setStatus("waitingForUser");
    engineContext.stopAfterCurrentCommand();
    engineContext.addLogEntry({ type: "commandStarted", text: `End of Round ${this.roundNumber} — continue?`, commandId: this.id });
  }

  resolve(engineContext, input = {}) {
    if (input.choice === "next-round") {
      engineContext.pushCommandsToTop([
        new NoMinisCombatRoundCommand({
          id: `no-minis-round-${this.roundNumber + 1}`,
          roundNumber: this.roundNumber + 1,
          battleFlowEventsEnabled: this.battleFlowEventsEnabled,
          hecticCombatEnabled: this.hecticCombatEnabled,
          fasterCombatEnabled: this.fasterCombatEnabled,
        }),
      ]);
    } else {
      engineContext.pushCommandsToTop([
        engineContext.commandFactory.popupMessage({
          id: `no-minis-battle-complete`,
          title: "Battle Complete",
          message: "The No-Minis battle is over. Proceed to the Post-Battle Sequence.",
          buttonText: "Continue to Post-Battle",
          pauseAfter: false,
        }),
      ]);
    }

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");
    engineContext.addLogEntry({ type: "commandCompleted", text: `Round ${this.roundNumber} continue choice: ${input.choice ?? "end-battle"}.`, commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      roundNumber: this.roundNumber,
      battleFlowEventsEnabled: this.battleFlowEventsEnabled,
      hecticCombatEnabled: this.hecticCombatEnabled,
      fasterCombatEnabled: this.fasterCombatEnabled,
    });
  }
}

// Top-level entry point: sets options, then starts Round 1
export class NoMinisCombatCommand extends BaseCommand {
  constructor({
    id,
    title = "No-Minis Combat Resolution",
    status = "pending",
    pauseAfter = false,
    visible = true,
    missionType = "standard",
  } = {}) {
    super({ id, type: "noMinisCombat", title, status, pauseAfter, visible });
    this.missionType = missionType;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;

    // Check compatibility warnings
    const state = engineContext.state;
    const hasAiVariations = state?.campaign?.options?.aiVariations === true;
    const hasEscalatingBattles = state?.campaign?.options?.escalatingBattles === true;
    const hasEnemyDeploymentVariables = state?.campaign?.options?.enemyDeploymentVariables === true;

    const warningLines = [
      hasAiVariations ? "• AI Variations" : null,
      hasEscalatingBattles ? "• Escalating Battles" : null,
      hasEnemyDeploymentVariables ? "• Enemy Deployment Variables" : null,
    ].filter(Boolean);

    const cmds = [];

    if (warningLines.length > 0) {
      cmds.push(
        factory.popupMessage({
          id: `${this.id}-compat-warning`,
          title: "Compatibility Notice",
          message:
            `The following active campaign options are not easily compatible with No-Minis Combat Resolution:\n\n${warningLines.join("\n")}\n\nThe source leaves combining these as a house rule — proceed as you see fit.`,
          buttonText: "Understood, Continue",
          pauseAfter: false,
        })
      );
    }

    // Sub-rule toggles
    cmds.push(
      factory.choice({
        id: `${this.id}-battle-flow-toggle`,
        title: "Option: Battle Flow Events",
        prompt: "Enable Battle Flow Events? Roll D100 at the start of each round for a random event.",
        options: [
          { id: "yes", label: "Yes — use Battle Flow Events (D100)", value: "true" },
          { id: "no", label: "No — skip Battle Flow Events", value: "false" },
        ],
        saveTo: "noMinis.options.battleFlowEventsEnabled",
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      factory.choice({
        id: `${this.id}-hectic-toggle`,
        title: "Option: Hectic Combat",
        prompt: "Enable Hectic Combat? Characters shoot every time they're engaged (subsequent attacks hit only on a natural 6).",
        options: [
          { id: "no", label: "No — standard combat", value: "false" },
          { id: "yes", label: "Yes — Hectic Combat", value: "true" },
        ],
        saveTo: "noMinis.options.hecticCombatEnabled",
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      factory.choice({
        id: `${this.id}-faster-toggle`,
        title: "Option: Faster Combat",
        prompt: "Enable Faster Combat? First exchange each Firefight phase treats both combatants as in the open.",
        options: [
          { id: "no", label: "No — standard Cover", value: "false" },
          { id: "yes", label: "Yes — Faster Combat", value: "true" },
        ],
        saveTo: "noMinis.options.fasterCombatEnabled",
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      factory.updateState({
        id: `${this.id}-set-mode`,
        title: "Set No-Minis Resolution Mode",
        operations: [
          { op: "set", path: "encounter.resolutionMode", value: "no-minis" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      {
        // Read option choices from state and start Round 1
        id: `${this.id}-start-round-1`,
        type: "startNoMinisRound1",
        status: "pending",
        pauseAfter: false,
        visible: false,
        execute(ctx) {
          const bfe = ctx.state?.noMinis?.options?.battleFlowEventsEnabled === "true";
          const hectic = ctx.state?.noMinis?.options?.hecticCombatEnabled === "true";
          const faster = ctx.state?.noMinis?.options?.fasterCombatEnabled === "true";

          ctx.pushCommandsToTop([
            new NoMinisCombatRoundCommand({
              id: "no-minis-round-1",
              roundNumber: 1,
              battleFlowEventsEnabled: bfe,
              hecticCombatEnabled: hectic,
              fasterCombatEnabled: faster,
            }),
          ]);

          this.status = "complete";
          ctx.setStatus("running");
        },
        toJSON() {
          return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible });
        },
      }
    );

    engineContext.pushCommandsToTop(cmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded No-Minis Combat Resolution.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON(), missionType: this.missionType });
  }
}

export { NoMinisCombatRoundCommand, NoMinisContinueCommand };
export default NoMinisCombatCommand;
