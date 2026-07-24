import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { NO_MINIS_INITIATIVE_ACTIONS_BY_ID } from "../data/tables/noMinisInitiativeActions";

function describeBattlefieldTest(test) {
  if (!test) return null;
  if (test.target === null) return test.note || "Per scenario.";
  const mods = (test.modifiers || []).map((m) => `${m.bonus > 0 ? "+" : ""}${m.bonus} if ${m.condition}`).join(", ");
  return `Roll 2D6, need ${test.target}+.${mods ? ` Modifiers: ${mods}.` : ""}`;
}

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
      factory.postBattleDispatch({
        id: `${this.id}-resolve`,
        dispatchKey: "resolveInitiativeAction",
        params: { characterName: charName, commandBaseId: this.id },
      }),
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
