import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import NoMinisCombatCommand from "./NoMinisCombatCommand";
import TerrainGeneratorCommand from "./TerrainGeneratorCommand";

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
        {
          id: `${this.id}-maybe-run-terrain-gen`,
          type: "maybeRunTerrainGenerator",
          status: "pending",
          pauseAfter: false,
          visible: false,
          commandBaseId: this.id,
          execute(ctx) {
            if (ctx.state?.terrainSetup?.useGenerator === "yes") {
              ctx.pushCommandsToTop([
                new TerrainGeneratorCommand({
                  id: `${this.commandBaseId}-terrain-generator`,
                  title: "Terrain Generator",
                  pauseAfter: false,
                }),
              ]);
            }
            this.status = "complete";
            ctx.setStatus("running");
          },
          toJSON() {
            return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible, commandBaseId: this.commandBaseId });
          },
        }
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
      {
        id: `${this.id}-branch-resolution`,
        type: "branchBattleResolution",
        status: "pending",
        pauseAfter: false,
        visible: false,
        commandBaseId: this.id,
        missionType,
        execute(ctx) {
          const mode = ctx.state?.encounter?.resolutionMode ?? "tabletop";
          const f = ctx.commandFactory;

          if (mode === "no-minis") {
            ctx.pushCommandsToTop([
              new NoMinisCombatCommand({
                id: `${this.commandBaseId}-no-minis`,
                title: "No-Minis Combat Resolution",
                missionType: this.missionType,
                pauseAfter: false,
              }),
            ]);
          } else {
            ctx.pushCommandsToTop([
              f.popupMessage({
                id: `${this.commandBaseId}-play-battle`,
                title: "Tabletop Battle",
                message: "Play the tabletop battle now. When the battle is complete, click the button below to continue to the Post-Battle Sequence.",
                buttonText: "Battle Complete",
                pauseAfter: false,
              }),
            ]);
          }

          this.status = "complete";
          ctx.setStatus("running");
        },
        toJSON() {
          return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible, commandBaseId: this.commandBaseId, missionType: this.missionType });
        },
      }
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
