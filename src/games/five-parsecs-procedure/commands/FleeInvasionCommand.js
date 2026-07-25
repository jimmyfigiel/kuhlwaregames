import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

// Rulebook p.69: if the current world is being Invaded, the crew must attempt
// to flee before anything else happens this campaign turn.
export class FleeInvasionCommand extends BaseCommand {
  constructor({
    id,
    title = "Travel: Flee Invasion",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
  } = {}) {
    super({ id, type: "fleeInvasion", title, status, pauseAfter, visible });
    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const baseId = this.id;

    engineContext.pushCommandsToTop([
      factory.popupMessage({
        id: `${baseId}-intro`,
        title: "Flee Invasion",
        message:
          "This world is being Invaded! Roll 2D6 — an 8+ is required to get safely off-world before the fighting reaches you.\n\n" +
          "If the roll fails, there's no time to do anything except Assign Equipment before you must fight a mandatory Invasion Battle.",
        buttonText: "Roll 2D6",
        pauseAfter: false,
      }),
      factory.numberInput({
        id: `${baseId}-roll`,
        title: "Flee Invasion Roll",
        prompt: "Roll 2D6 and enter your total.",
        min: 2,
        max: 12,
        saveTo: "worldPhase.fleeInvasionRoll",
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      factory.postBattleDispatch({
        id: `${baseId}-resolve`,
        dispatchKey: "fleeInvasionResolve",
        params: { baseId, turnNumber: this.turnNumber },
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded Flee Invasion step.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON(), turnNumber: this.turnNumber });
  }
}

export default FleeInvasionCommand;
