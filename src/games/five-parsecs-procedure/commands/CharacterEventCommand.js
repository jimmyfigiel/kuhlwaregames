import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { CHARACTER_EVENTS_TABLE } from "../data/tables/postBattleTables";
import { isBotOrSoulless, isSpecies, pickRandomElement, getActiveCrewMembers } from "./postBattleHelpers";

function normalizeTable(table) {
  return {
    id: table.id,
    title: table.label,
    dice: table.dice || "D100",
    sides: 100,
    entries: (table.rows || []).map((row) => ({
      min: row.min,
      max: row.max,
      label: row.title,
      value: row.title,
      description: row.description,
      resultType: row.resultType,
      amount: row.amount,
    })),
  };
}

export class CharacterEventCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Character Event", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "characterEvent", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    const eligible = getActiveCrewMembers(state).filter((m) => !isBotOrSoulless(state?.crewLog?.crewDetails?.[m.id] || {}));

    if (eligible.length === 0) {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Character Event",
          message: "No eligible (non-Bot, non-Soulless) crew members to target.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const target = pickRandomElement(eligible);
    const detail = state?.crewLog?.crewDetails?.[target.id] || {};
    const isPrecursor = isSpecies(detail, "Precursor");

    engineContext.pushCommandsToTop([
      factory.tableRoll({
        id: `${baseId}-roll`,
        title: `Character Event: ${target.name}${isPrecursor ? " (Precursor — may reroll)" : ""}`,
        table: normalizeTable(CHARACTER_EVENTS_TABLE),
        saveTo: "postBattleTemp.characterEvent",
        buttonText: "Apply",
        rollButtonText: "Roll with App Dice",
        afterSelectionCommands: [
          factory.postBattleDispatch({
            id: `${baseId}-dispatch`,
            dispatchKey: "characterEventDispatch",
            params: { baseId, targetId: target.id, targetName: target.name },
          }),
        ],
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Character Event step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default CharacterEventCommand;
