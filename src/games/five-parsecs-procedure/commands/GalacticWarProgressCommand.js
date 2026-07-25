import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { findGalacticWarResult } from "../data/tables/postBattleTables";
import { rollDice } from "./postBattleHelpers";

function getTrackedWorlds(state) {
  const worlds = [];
  const currentWorld = state?.worldLog?.currentWorld;

  if (currentWorld && ["invaded", "contested"].includes(String(currentWorld.invasion || ""))) {
    worlds.push({ location: "current", index: -1, world: currentWorld });
  }

  (state?.worldLog?.visitedWorlds || []).forEach((world, index) => {
    if (["invaded", "contested"].includes(String(world?.invasion || ""))) {
      worlds.push({ location: "visited", index, world });
    }
  });

  return worlds;
}

export class GalacticWarProgressCommand extends BaseCommand {
  constructor({ id, title = "Post-Battle: Galactic War Progress", status = "pending", pauseAfter = false, visible = true } = {}) {
    super({ id, type: "galacticWarProgress", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;

    const trackedWorlds = getTrackedWorlds(state);

    if (trackedWorlds.length === 0) {
      engineContext.pushCommandsToTop([
        factory.popupMessage({
          id: `${baseId}-skip`,
          title: "Galactic War Progress",
          message: "No previously-Invaded planets are being tracked — nothing to roll.",
          buttonText: "Continue",
          pauseAfter: false,
        }),
      ]);
      this.status = "complete";
      engineContext.setStatus("running");
      return;
    }

    const ops = [];
    const lines = [];

    for (const tracked of trackedWorlds) {
      const bonus = Number(tracked.world?.galacticWarBonus || 0);
      const { rolls, total } = rollDice(2, 6);
      const modified = total + bonus;
      const result = findGalacticWarResult(modified);
      const worldName = tracked.world?.name || "Unnamed World";
      const basePath = tracked.location === "current" ? "worldLog.currentWorld" : `worldLog.visitedWorlds.${tracked.index}`;

      if (result?.result === "lostToUnity") {
        ops.push({ op: "set", path: `${basePath}.invasion`, value: "lost" });
      } else if (result?.result === "makingGround") {
        ops.push(
          { op: "set", path: `${basePath}.invasion`, value: "contested" },
          { op: "increment", path: `${basePath}.galacticWarBonus`, amount: 1 }
        );
      } else if (result?.result === "unityVictorious") {
        ops.push(
          { op: "set", path: `${basePath}.invasion`, value: "reclaimed" },
          { op: "set", path: `${basePath}.invasionThreatModifier`, value: -2 }
        );
      } else {
        ops.push({ op: "set", path: `${basePath}.invasion`, value: "contested" });
      }

      lines.push(`${worldName}: rolled 2D6 (${rolls.join(", ")})${bonus ? ` +${bonus}` : ""} = ${modified} → ${result?.label || "Contested"} — ${result?.description || ""}`);
    }

    engineContext.pushCommandsToTop([
      factory.updateState({
        id: `${baseId}-apply`,
        title: "Apply Galactic War Progress",
        operations: ops,
        pauseAfter: false,
        visible: false,
      }),
      factory.popupMessage({
        id: `${baseId}-result`,
        title: "Galactic War Progress",
        message: lines.join("\n\n"),
        buttonText: "Continue",
        pauseAfter: false,
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: `Loaded Galactic War Progress step (${trackedWorlds.length} world(s)).`, commandId: this.id });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default GalacticWarProgressCommand;
