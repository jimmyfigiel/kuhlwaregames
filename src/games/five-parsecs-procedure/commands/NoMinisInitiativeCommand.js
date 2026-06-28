import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { NO_MINIS_INITIATIVE_ACTIONS_BY_ID } from "../data/tables/noMinisInitiativeActions";

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function describeBattlefieldTest(test) {
  if (!test) return null;
  if (test.target === null) return test.note || "Per scenario.";
  const mods = (test.modifiers || []).map((m) => `${m.bonus > 0 ? "+" : ""}${m.bonus} if ${m.condition}`).join(", ");
  return `Roll 2D6, need ${test.target}+.${mods ? ` Modifiers: ${mods}.` : ""}`;
}

// Actions that have no battlefield test and resolve immediately
const NO_TEST_ACTIONS = new Set(["move-up", "support"]);

export class NoMinisInitiativeCommand extends BaseCommand {
  constructor({
    id,
    title = "Initiative Action",
    status = "pending",
    pauseAfter = false,
    visible = true,
    characterName = "Crew Member",
    roundNumber = 1,
  } = {}) {
    super({ id, type: "noMinisInitiative", title, status, pauseAfter, visible });
    this.characterName = characterName;
    this.roundNumber = roundNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const charName = this.characterName;
    const roundNum = this.roundNumber;
    const isRoundOne = roundNum === 1;

    const actionOptions = Object.values(NO_MINIS_INITIATIVE_ACTIONS_BY_ID)
      .filter((action) => !(isRoundOne && action.notInRoundOne))
      .map((action) => {
        const testDesc = describeBattlefieldTest(action.battlefieldTest);
        return {
          id: action.id,
          label: action.label,
          value: action.id,
          description: testDesc ? `${action.description} | Test: ${testDesc}` : action.description,
        };
      });

    const actionSavePath = `noMinis.initiativeActions.${this.id}`;

    engineContext.pushCommandsToTop([
      factory.choice({
        id: `${this.id}-pick-action`,
        title: `Initiative: ${charName}`,
        prompt: `Choose an Initiative Action for ${charName}.${isRoundOne ? " (Scout for Locations not available in Round 1.)" : ""}`,
        options: actionOptions,
        saveTo: actionSavePath,
        buttonText: "Choose Action",
        pauseAfter: false,
      }),
      {
        // Inline resolver: reads chosen action from state and queues test/result
        id: `${this.id}-resolve`,
        type: "resolveInitiativeAction",
        status: "pending",
        pauseAfter: false,
        visible: false,
        characterName: charName,
        actionSavePath,
        commandBaseId: this.id,
        execute(ctx) {
          const actionId = ctx.state?.noMinis?.initiativeActions?.[this.commandBaseId];
          const action = NO_MINIS_INITIATIVE_ACTIONS_BY_ID[actionId];
          const f = ctx.commandFactory;

          if (!action) {
            this.status = "complete";
            ctx.setStatus("running");
            return;
          }

          const cmds = [];

          if (!action.battlefieldTest || NO_TEST_ACTIONS.has(action.id)) {
            // No roll needed — instant effect
            cmds.push(
              f.popupMessage({
                id: `${this.commandBaseId}-result`,
                title: `${this.characterName}: ${action.label}`,
                message: `${action.description}\n\nNo roll required — action takes effect immediately.`,
                buttonText: "OK",
                pauseAfter: false,
              })
            );
          } else if (action.scenarioDependent) {
            cmds.push(
              f.popupMessage({
                id: `${this.commandBaseId}-result`,
                title: `${this.characterName}: ${action.label}`,
                message: `${action.description}\n\nResolve the Battlefield Test per the scenario rules.`,
                buttonText: "Done",
                pauseAfter: false,
              })
            );
          } else {
            const test = action.battlefieldTest;
            const testDesc = describeBattlefieldTest(test);
            const modList = (test.modifiers || [])
              .map((m) => `• ${m.bonus > 0 ? "+" : ""}${m.bonus} if ${m.condition}`)
              .join("\n");

            if (action.extraRoll) {
              cmds.push(
                f.popupMessage({
                  id: `${this.commandBaseId}-extra-roll-note`,
                  title: `${this.characterName}: ${action.label} — Extra Roll`,
                  message: `Before the Battlefield Test: ${action.extraRoll}.`,
                  buttonText: "OK",
                  pauseAfter: false,
                })
              );
            }

            cmds.push(
              f.numberInput({
                id: `${this.commandBaseId}-test-roll`,
                title: `${this.characterName}: ${action.label} — Battlefield Test`,
                prompt: `${testDesc}${modList ? `\n\nModifiers:\n${modList}` : ""}\n\nRoll 2D6 (or click Roll) and enter your total.`,
                label: "2D6 result",
                defaultValue: 7,
                min: 2,
                max: 12,
                saveTo: `noMinis.initiativeTests.${this.commandBaseId}`,
                buttonText: "Confirm Roll",
                pauseAfter: false,
              }),
              {
                id: `${this.commandBaseId}-test-result`,
                type: "resolveInitiativeTest",
                status: "pending",
                pauseAfter: false,
                visible: false,
                commandBaseId: this.commandBaseId,
                actionId: action.id,
                actionLabel: action.label,
                actionDescription: action.description,
                characterName: this.characterName,
                testTarget: test.target,
                execute(innerCtx) {
                  const roll = innerCtx.state?.noMinis?.initiativeTests?.[this.commandBaseId] ?? 0;
                  const passed = roll >= this.testTarget;
                  const innerF = innerCtx.commandFactory;

                  innerCtx.pushCommandsToTop([
                    innerF.popupMessage({
                      id: `${this.commandBaseId}-outcome`,
                      title: `${this.characterName}: ${this.actionLabel} — ${passed ? "Success!" : "Failed"}`,
                      message: passed
                        ? `Rolled ${roll} — meets ${this.testTarget}+. Action succeeds!\n\n${this.actionDescription}`
                        : `Rolled ${roll} — needs ${this.testTarget}+. Action fails. No extra penalty.`,
                      buttonText: "OK",
                      pauseAfter: false,
                    }),
                  ]);

                  this.status = "complete";
                  innerCtx.setStatus("running");
                  innerCtx.addLogEntry({
                    type: "commandCompleted",
                    text: `${this.characterName} initiative action "${this.actionLabel}": rolled ${roll} vs ${this.testTarget}+ — ${passed ? "success" : "fail"}.`,
                    commandId: this.id,
                  });
                },
                toJSON() {
                  return removeUndefinedValues({
                    id: this.id,
                    type: this.type,
                    status: this.status,
                    pauseAfter: this.pauseAfter,
                    visible: this.visible,
                    commandBaseId: this.commandBaseId,
                    actionId: this.actionId,
                    actionLabel: this.actionLabel,
                    actionDescription: this.actionDescription,
                    characterName: this.characterName,
                    testTarget: this.testTarget,
                  });
                },
              },
            );
          }

          ctx.pushCommandsToTop(cmds);
          this.status = "complete";
          ctx.setStatus("running");
          ctx.addLogEntry({
            type: "commandCompleted",
            text: `Resolving initiative action for ${this.characterName}.`,
            commandId: this.id,
          });
        },
        toJSON() {
          return removeUndefinedValues({
            id: this.id,
            type: this.type,
            status: this.status,
            pauseAfter: this.pauseAfter,
            visible: this.visible,
            characterName: this.characterName,
            actionSavePath: this.actionSavePath,
            commandBaseId: this.commandBaseId,
          });
        },
      },
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Loaded Initiative Action for ${charName}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      characterName: this.characterName,
      roundNumber: this.roundNumber,
    });
  }
}

export default NoMinisInitiativeCommand;
