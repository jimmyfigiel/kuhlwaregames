import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

const TERRAIN_TYPE_OPTIONS = [
  { id: "industrial", label: "Industrial", value: "industrial", description: "Semi-urban semi-factory. Structures, barrels, shipping containers." },
  { id: "wilderness", label: "Wilderness", value: "wilderness", description: "Natural features, foliage, rock formations, hills." },
  { id: "alien-ruin", label: "Alien Ruin", value: "alien-ruin", description: "Old strange sites, ruins, rubble, alien statues." },
  { id: "crash-site", label: "Crash Site", value: "crash-site", description: "Shuttle or craft wreckage, craters, debris." },
];

export class TerrainGeneratorCommand extends BaseCommand {
  constructor({
    id,
    title = "Terrain Generator",
    status = "pending",
    pauseAfter = false,
    visible = true,
  } = {}) {
    super({ id, type: "terrainGenerator", title, status, pauseAfter, visible });
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;

    engineContext.pushCommandsToTop([
      factory.popupMessage({
        id: `${this.id}-intro`,
        title: "Terrain Generator",
        message:
          "Divide your table into 4 quarters, then subdivide each quarter into 4 sectors (16 sectors total). Mark the center of the table with a die or small marker.\n\nWork through the following steps to generate your battlefield.",
        buttonText: "Let's Go",
        pauseAfter: false,
      }),
      factory.choice({
        id: `${this.id}-choose-type`,
        title: "Step 1: Choose Terrain Type",
        prompt: "Select the type of terrain for this battle.",
        options: TERRAIN_TYPE_OPTIONS,
        saveTo: "terrainSetup.terrainTypeId",
        saveLabelTo: "terrainSetup.terrainTypeLabel",
        buttonText: "Confirm Terrain Type",
        pauseAfter: false,
      }),
      factory.postBattleDispatch({
        id: `${this.id}-queue-rolls`,
        dispatchKey: "queueTerrainRolls",
        params: { baseId: this.id },
      }),
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded Terrain Generator.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON() });
  }
}

export default TerrainGeneratorCommand;
