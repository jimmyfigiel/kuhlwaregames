import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

export class TabletopBattlePhaseCommand extends BaseCommand {
  constructor({
    id,
    title = "Step 3: Tabletop Battle",
    status = "pending",
    pauseAfter = false,
    visible = true,
    turnNumber = null,
  } = {}) {
    super({ id, type: "tabletopBattlePhase", title, status, pauseAfter, visible });
    this.turnNumber = turnNumber;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const terrainGeneratorEnabled = state?.campaign?.options?.terrainGenerator === true;
    const missionType = state?.encounter?.missionType ?? "standard";
    const isSalvage = missionType === "salvage";

    const cmds = [
      factory.updateState({
        id: `${this.id}-set-phase`,
        title: "Set Tabletop Battle Phase",
        operations: [
          { op: "set", path: "campaign.phase", value: "tabletopBattle" },
          { op: "set", path: "campaign.currentStep", value: "tabletopBattle" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      factory.objective({ id: `${this.id}-objective`, missionType }),
      factory.enemyGeneration({ id: `${this.id}-enemy-gen`, missionType }),
    ];

    // Terrain Generator — optional, if enabled in campaign options
    if (terrainGeneratorEnabled) {
      cmds.push(
        factory.choice({
          id: `${this.id}-terrain-gen-offer`,
          title: "Terrain Generator",
          prompt: "Would you like to use the Terrain Generator to set up your battlefield?",
          options: [
            { id: "yes", label: "Yes — generate terrain", value: "yes" },
            { id: "no", label: "No — I'll set up terrain myself", value: "no" },
          ],
          saveTo: "terrainSetup.useGenerator",
          buttonText: "Confirm",
          pauseAfter: false,
        }),
        factory.postBattleDispatch({
          id: `${this.id}-maybe-run-terrain-gen`,
          dispatchKey: "maybeRunTerrainGenerator",
          params: { baseId: this.id },
        })
      );
    }

    // Resolution mode choice — No-Minis disabled for Salvage missions
    cmds.push(
      factory.choice({
        id: `${this.id}-resolution-mode`,
        title: "Battle Resolution Mode",
        prompt: "How will you resolve this battle?",
        options: [
          {
            id: "tabletop",
            label: "Tabletop Battle",
            value: "tabletop",
            description: "Play the battle with miniatures on the table.",
          },
          {
            id: "no-minis",
            label: "No-Minis Combat Resolution",
            value: "no-minis",
            description: "Resolve the battle using the abstract No-Minis system (Compendium p.66–72).",
            disabled: isSalvage,
          },
        ],
        saveTo: "encounter.resolutionMode",
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      factory.postBattleDispatch({
        id: `${this.id}-branch-resolution`,
        dispatchKey: "branchBattleResolution",
        params: { baseId: this.id, missionType },
      })
    );

    engineContext.pushCommandsToTop(cmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: "Loaded the Tabletop Battle phase step.",
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON(), turnNumber: this.turnNumber });
  }
}

export default TabletopBattlePhaseCommand;
