import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { rollDice } from "./postBattleHelpers";

export class CheckInvasionCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Check for Invasion", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "checkInvasion", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    const isInvasionThreat = state?.encounter?.enemyWasInvasionThreat === "yes";

    if (!isInvasionThreat) {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Check for Invasion",
          message: "Skipped — the enemy force was not an Invasion Threat.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const heldField = state?.encounter?.heldField === true;
    const invasionEvidenceBonus = Number(state?.encounter?.invasionRollBonus || 0);
    const worldEventBonus = Number(state?.worldLog?.currentWorld?.invasionRollModifier || 0);
    const difficultyMode = state?.campaign?.difficultyMode;
    const hardcoreBonus = difficultyMode === "hardcore" ? 2 : 0;
    const insanityBonus = difficultyMode === "insanity" ? 3 : 0;
    const modifier = invasionEvidenceBonus + worldEventBonus + (heldField ? -1 : 0) + hardcoreBonus + insanityBonus;

    const { rolls, total } = rollDice(2, 6);
    const modified = total + modifier;
    const invaded = modified >= 9;

    const modifierLines = [
      invasionEvidenceBonus ? `+${invasionEvidenceBonus} Invasion Evidence` : null,
      worldEventBonus ? `+${worldEventBonus} rumors of war` : null,
      heldField ? "-1 Held the Field" : null,
      hardcoreBonus ? `+${hardcoreBonus} Hardcore difficulty` : null,
      insanityBonus ? `+${insanityBonus} Insanity difficulty` : null,
    ].filter(Boolean);

    const opsCmds = [];

    if (invaded) {
      opsCmds.push(
        factory.updateState({
          id: `${baseId}-set-invaded`,
          title: "Set World Invaded",
          operations: [{ op: "set", path: "worldLog.currentWorld.invasion", value: "invaded" }],
          pauseAfter: false,
          visible: false,
        })
      );
    }

    opsCmds.push(
      factory.popupMessage({
        id: `${baseId}-result`,
        title: "Check for Invasion",
        message: `Rolled 2D6: ${rolls.join(" + ")} = ${total}${modifierLines.length ? ` (${modifierLines.join(", ")})` : ""} → ${modified}.\n\n${
          invaded
            ? "9+ — the world is about to be Invaded! Next campaign turn, you must Flee the Invasion during the Travel step."
            : "Below 9 — no Invasion this time."
        }`,
        buttonText: "Continue",
        pauseAfter: false,
      })
    );

    engineContext.pushCommandsToTop(opsCmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: "Loaded Check for Invasion step.", commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default CheckInvasionCommand;
