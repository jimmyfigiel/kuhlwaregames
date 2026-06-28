import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export class NoMinisFirefightCommand extends BaseCommand {
  constructor({
    id,
    title = "The Firefight",
    status = "pending",
    pauseAfter = false,
    visible = true,
    roundNumber = 1,
    firefightModifier = 0,
    blocksBrawling = false,
  } = {}) {
    super({ id, type: "noMinisFirefight", title, status, pauseAfter, visible });
    this.roundNumber = roundNumber;
    this.firefightModifier = firefightModifier;
    this.blocksBrawling = blocksBrawling;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const baseId = this.id;
    const modifier = this.firefightModifier;
    const blocksBrawling = this.blocksBrawling;

    const enemyCountSavePath = `noMinis.firefight.${baseId}.totalEnemies`;
    const activeCountSavePath = `noMinis.firefight.${baseId}.activeEnemies`;

    engineContext.pushCommandsToTop([
      factory.numberInput({
        id: `${baseId}-enemy-count`,
        title: "Firefight: Enemy Count",
        prompt: "How many total Enemy figures are on the battlefield right now?",
        label: "Total enemies",
        defaultValue: 3,
        min: 1,
        max: 50,
        saveTo: enemyCountSavePath,
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      {
        id: `${baseId}-setup`,
        type: "noMinisFirefightSetup",
        status: "pending",
        pauseAfter: false,
        visible: false,
        baseId,
        modifier,
        blocksBrawling,
        roundNumber: this.roundNumber,
        execute(ctx) {
          const totalEnemies = ctx.state?.noMinis?.firefight?.[this.baseId]?.totalEnemies ?? 3;
          const baseActive = totalEnemies >= 7 ? 4 : 3;
          const activeEnemies = Math.max(1, baseActive + this.modifier);
          const f = ctx.commandFactory;

          const modNote = this.modifier !== 0
            ? ` (Battle Flow Event modifier: ${this.modifier > 0 ? "+" : ""}${this.modifier})`
            : "";

          const brawlNote = this.blocksBrawling
            ? "\n\n⚠ Battle Flow Event: No Brawling combat this round. Melee-only enemies will not attack."
            : "";

          const cmds = [
            f.updateState({
              id: `${this.baseId}-save-active`,
              title: "Save Active Enemy Count",
              operations: [{ op: "set", path: `noMinis.firefight.${this.baseId}.activeEnemies`, value: activeEnemies }],
              pauseAfter: false,
              visible: false,
            }),
            f.popupMessage({
              id: `${this.baseId}-firefight-intro`,
              title: `Firefight — Round ${this.roundNumber}`,
              message: `${totalEnemies} total enemies → ${activeEnemies} will act this Firefight phase${modNote}.\n\nRemaining enemies are hiding or maneuvering.\n\nYou choose the order. Each active Enemy targets a random crew figure.${brawlNote}`,
              buttonText: "Begin Firefight",
              pauseAfter: false,
            }),
          ];

          // One engagement command per active enemy
          for (let i = 1; i <= activeEnemies; i += 1) {
            const engId = `${this.baseId}-enemy-${i}`;
            cmds.push(
              f.choice({
                id: `${engId}-weapon-type`,
                title: `Enemy ${i} of ${activeEnemies}: Weapon Type`,
                prompt: `Select Enemy ${i}'s weapon type to determine how this engagement resolves.`,
                options: [
                  {
                    id: "ranged",
                    label: "Ranged only",
                    value: "ranged",
                    description: "Both combatants fire. Longer range fires first; ties go to crew. Both stationary, in Cover, at max range, max Shots.",
                  },
                  {
                    id: "melee-only",
                    label: "Melee only",
                    value: "melee-only",
                    description: "Ranged side shoots first at 6\" (target in Cover, no Heavy/Area weapon). If melee combatant survives, Brawl follows.",
                    disabled: blocksBrawling,
                  },
                  {
                    id: "mixed",
                    label: "Mixed (Melee + Ranged)",
                    value: "mixed",
                    description: "Enemy has both. If out-ranged by crew, enemy switches to Brawl. Crew may also choose Brawl over shooting (not with Pistol only).",
                    disabled: blocksBrawling,
                  },
                ],
                saveTo: `noMinis.firefight.${this.baseId}.enemy${i}WeaponType`,
                buttonText: "Confirm",
                pauseAfter: false,
              }),
              {
                id: `${engId}-resolve`,
                type: "noMinisFirefightEngagement",
                status: "pending",
                pauseAfter: false,
                visible: false,
                baseId: this.baseId,
                enemyIndex: i,
                activeEnemies,
                blocksBrawling: this.blocksBrawling,
                roundNumber: this.roundNumber,
                execute(innerCtx) {
                  const weaponType = innerCtx.state?.noMinis?.firefight?.[this.baseId]?.[`enemy${this.enemyIndex}WeaponType`] ?? "ranged";
                  const innerF = innerCtx.commandFactory;
                  const engId = `${this.baseId}-enemy-${this.enemyIndex}`;

                  let resolveMessage = "";

                  if (weaponType === "ranged") {
                    resolveMessage =
                      "Both Ranged:\n" +
                      "• Longer-range weapon fires first. Tie = crew fires first.\n" +
                      "• Both assumed stationary, in Cover, at max range, firing max Shots.\n" +
                      "• Roll to hit, Toughness saves, apply results.\n" +
                      "• If target survives, they return fire.\n\n" +
                      "Cover rule: hits only on natural 6 if either side has Take Cover status.\n" +
                      "Stun markers clear at end of round.";
                  } else if (weaponType === "melee-only") {
                    resolveMessage =
                      "Melee vs Ranged:\n" +
                      "• Ranged combatant fires first at 6\" range — target counts as in Cover.\n" +
                      "• Ranged cannot use a Heavy or Area weapon in this exchange.\n" +
                      "• If the Melee combatant survives → resolve Brawl.\n" +
                      "• Defensive fire note: if crew fired defensively, they cannot swap weapon or use Melee bonus (Pistol bonus kept if fired defensively). If crew did NOT fire defensively, they may Brawl with any weapon.\n\n" +
                      "Stun markers clear at end of round.";
                  } else {
                    resolveMessage =
                      "Mixed Loadout (both Melee + Ranged):\n" +
                      "• If enemy is out-ranged by crew → enemy switches to Brawl instead of firing.\n" +
                      "• Crew may also choose to Brawl rather than shoot (must have a true Melee weapon — Pistol does not qualify).\n" +
                      "• Resolve as ranged exchange or Brawl accordingly.\n\n" +
                      "Stun markers clear at end of round.";
                  }

                  innerCtx.pushCommandsToTop([
                    innerF.popupMessage({
                      id: `${engId}-resolution`,
                      title: `Enemy ${this.enemyIndex} of ${this.activeEnemies} — ${weaponType === "ranged" ? "Ranged" : weaponType === "melee-only" ? "Melee" : "Mixed"} Engagement`,
                      message: resolveMessage,
                      buttonText: "Engagement Resolved",
                      pauseAfter: false,
                    }),
                  ]);

                  this.status = "complete";
                  innerCtx.setStatus("running");
                  innerCtx.addLogEntry({
                    type: "commandCompleted",
                    text: `Firefight Round ${this.roundNumber}: Enemy ${this.enemyIndex} engagement (${weaponType}) resolved.`,
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
                    baseId: this.baseId,
                    enemyIndex: this.enemyIndex,
                    activeEnemies: this.activeEnemies,
                    blocksBrawling: this.blocksBrawling,
                    roundNumber: this.roundNumber,
                  });
                },
              }
            );
          }

          ctx.pushCommandsToTop(cmds);
          this.status = "complete";
          ctx.setStatus("running");
          ctx.addLogEntry({
            type: "commandCompleted",
            text: `Firefight setup: ${totalEnemies} total, ${activeEnemies} active.`,
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
            baseId: this.baseId,
            modifier: this.modifier,
            blocksBrawling: this.blocksBrawling,
            roundNumber: this.roundNumber,
          });
        },
      },
    ]);

    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Loaded Firefight for Round ${this.roundNumber}.`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      roundNumber: this.roundNumber,
      firefightModifier: this.firefightModifier,
      blocksBrawling: this.blocksBrawling,
    });
  }
}

export default NoMinisFirefightCommand;
