import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import { TERRAIN_TYPES_BY_ID, makeTerrainTable } from "../data/tables/terrainGenerator";

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
      {
        // Inline orchestrator: reads the chosen terrain type and queues the actual rolls
        id: `${this.id}-queue-rolls`,
        type: "queueTerrainRolls",
        status: "pending",
        pauseAfter: false,
        visible: false,
        sourceTerrainGeneratorId: this.id,
        execute(ctx) {
          const terrainTypeId = ctx.state?.terrainSetup?.terrainTypeId;
          const terrainType = TERRAIN_TYPES_BY_ID[terrainTypeId];

          if (!terrainType) {
            ctx.addLogEntry({ type: "error", text: "Terrain type not found — cannot generate rolls.", commandId: this.id });
            this.status = "complete";
            ctx.setStatus("running");
            return;
          }

          const f = ctx.commandFactory;
          const baseId = this.sourceTerrainGeneratorId;
          const notableTable = makeTerrainTable(
            terrainType.notableFeatures,
            `${terrainType.id}-notable`,
            `${terrainType.label} — Notable Features`
          );
          const regularTable = makeTerrainTable(
            terrainType.regularFeatures,
            `${terrainType.id}-regular`,
            `${terrainType.label} — Regular Features`
          );

          const quarterCommands = [1, 2, 3, 4].flatMap((q) => [
            f.popupMessage({
              id: `${baseId}-quarter-${q}-intro`,
              title: `Quarter ${q} of 4`,
              message: `Roll 4D6 on the Regular Features table for Quarter ${q}. Then roll 1D6 for the number of scatter pieces to add to this quarter.`,
              buttonText: "Roll Now",
              pauseAfter: false,
            }),
            f.tableRoll({
              id: `${baseId}-q${q}-reg-1`,
              title: `Quarter ${q} — Regular Feature Roll 1`,
              table: regularTable,
              rollButtonText: "Roll 1D6",
              buttonText: "Select Result",
              pauseAfter: false,
            }),
            f.tableRoll({
              id: `${baseId}-q${q}-reg-2`,
              title: `Quarter ${q} — Regular Feature Roll 2`,
              table: regularTable,
              rollButtonText: "Roll 1D6",
              buttonText: "Select Result",
              pauseAfter: false,
            }),
            f.tableRoll({
              id: `${baseId}-q${q}-reg-3`,
              title: `Quarter ${q} — Regular Feature Roll 3`,
              table: regularTable,
              rollButtonText: "Roll 1D6",
              buttonText: "Select Result",
              pauseAfter: false,
            }),
            f.tableRoll({
              id: `${baseId}-q${q}-reg-4`,
              title: `Quarter ${q} — Regular Feature Roll 4`,
              table: regularTable,
              rollButtonText: "Roll 1D6",
              buttonText: "Select Result",
              pauseAfter: false,
            }),
            f.numberInput({
              id: `${baseId}-q${q}-scatter`,
              title: `Quarter ${q} — Scatter Terrain`,
              prompt: "Roll 1D6. Enter the result — that many scatter pieces (rocks, barrels, crates, etc.) go anywhere in this quarter.",
              label: "Scatter pieces (1D6 result)",
              defaultValue: 1,
              min: 1,
              max: 6,
              buttonText: "Place Scatter",
              pauseAfter: false,
            }),
          ]);

          ctx.pushCommandsToTop([
            f.popupMessage({
              id: `${baseId}-step2-intro`,
              title: "Step 2: The Center — Notable Feature",
              message: "Roll 1D6 on the Notable Features table below. Place the result so it partially covers the center point of the table.",
              buttonText: "Roll Now",
              pauseAfter: false,
            }),
            f.tableRoll({
              id: `${baseId}-notable`,
              title: `${terrainType.label} — Notable Feature (Center)`,
              table: notableTable,
              rollButtonText: "Roll 1D6",
              buttonText: "Select Result",
              pauseAfter: false,
            }),
            f.popupMessage({
              id: `${baseId}-step3-intro`,
              title: "Step 3: The Quarters",
              message: "Work through each quarter one at a time. For each quarter, roll 4D6 on the Regular Features table and 1D6 for scatter pieces.",
              buttonText: "Start Quarters",
              pauseAfter: false,
            }),
            ...quarterCommands,
            f.popupMessage({
              id: `${baseId}-final`,
              title: "Step 5: Final Evaluation",
              message: "Step back and evaluate. Swap features that seem out of place, add cosmetic touches (sand for roads, clumps of flock, pebbles). If things feel cluttered, that's usually fine — terrain to crawl between improves the game.",
              buttonText: "Battlefield Ready",
              pauseAfter: false,
            }),
          ]);

          this.status = "complete";
          ctx.setStatus("running");
          ctx.addLogEntry({
            type: "commandCompleted",
            text: `Queued terrain rolls for ${terrainType.label}.`,
            commandId: this.id,
          });
        },
        toJSON() {
          return removeUndefinedValues({
            id: this.id,
            type: this.type,
            title: "Queue Terrain Rolls",
            status: this.status,
            pauseAfter: this.pauseAfter,
            visible: this.visible,
            sourceTerrainGeneratorId: this.sourceTerrainGeneratorId,
          });
        },
      },
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
