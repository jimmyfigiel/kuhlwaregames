import BaseCommand from "../../../procedure-core/commands/BaseCommand";
import { removeUndefinedValues } from "../../../procedure-core/utils";
import {
  DEPLOYMENT_CONDITIONS,
  NOTABLE_SIGHTS,
  BATTLE_EVENTS,
  getDeploymentConditionForRoll,
  getNotableSightForRoll,
} from "../data/tables/tabletopBattleTables";

// ─── helpers ────────────────────────────────────────────────────────────────

function setPhase(factory, baseId, phase) {
  return factory.updateState({
    id: `${baseId}-set-phase-${phase}`,
    title: `Combat: ${phase}`,
    operations: [{ op: "set", path: "encounter.combatPhase", value: phase }],
    pauseAfter: false,
    visible: false,
  });
}

function buildDeployConditionEntries(missionType) {
  const col = missionType === "patron" ? "opportunity" : (missionType || "opportunity");
  return DEPLOYMENT_CONDITIONS.entries.map((e) => {
    const range = e.ranges[col] || e.ranges.opportunity;
    return { roll: range ? `${range[0]}–${range[1]}` : "–", label: e.label, value: e.id, text: e.text };
  });
}

function buildNotableSightEntries(missionType) {
  const col = missionType === "patron" ? "opportunity" : (missionType || "opportunity");
  return NOTABLE_SIGHTS.entries.map((e) => {
    const range = e.ranges[col] || e.ranges.opportunity;
    return { roll: range ? `${range[0]}–${range[1]}` : "–", label: e.label, value: e.id, text: e.text };
  });
}

function buildBattleEventEntries() {
  return BATTLE_EVENTS.entries.map((e) => ({
    roll: `${e.min}–${e.max}`,
    label: e.label,
    value: e.id || e.label,
    text: e.text,
  }));
}

function getCrewList(state) {
  return Array.isArray(state?.crewLog?.crewMembers) ? state.crewLog.crewMembers : [];
}

function getCrewReaction(state, crewMemberId) {
  return state?.crewLog?.crewDetails?.[crewMemberId]?.stats?.reactions ?? 1;
}

function getHighestSavvy(state) {
  const crew = getCrewList(state);
  let highest = 0;
  for (const member of crew) {
    const savvy = state?.crewLog?.crewDetails?.[member.id]?.stats?.savvy ?? 0;
    if (savvy > highest) highest = savvy;
  }
  return highest;
}

// ─── TabletopCombatRoundCommand ──────────────────────────────────────────────

export class TabletopCombatRoundCommand extends BaseCommand {
  constructor({ id, title = null, status = "pending", pauseAfter = false, visible = true, roundNumber = 1, battleEventsEnabled = false, missionType = "opportunity" } = {}) {
    super({ id, type: "tabletopCombatRound", title: title || `Battle Round ${roundNumber}`, status, pauseAfter, visible });
    this.roundNumber = roundNumber;
    this.battleEventsEnabled = battleEventsEnabled;
    this.missionType = missionType;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = `${this.id}-r${this.roundNumber}`;
    const crew = getCrewList(state);

    const cmds = [
      factory.updateState({
        id: `${baseId}-set-round`,
        title: `Round ${this.roundNumber}: Start`,
        operations: [
          { op: "set", path: "encounter.roundNumber", value: this.roundNumber },
          { op: "set", path: "encounter.combatPhase", value: "reaction-roll" },
        ],
        pauseAfter: false,
        visible: false,
      }),
    ];

    // ── Reaction Roll ──────────────────────────────────────────────────────
    if (crew.length > 0) {
      // One number input per crew member for their die result
      for (const member of crew) {
        const reactions = getCrewReaction(state, member.id);
        cmds.push(
          factory.numberInput({
            id: `${baseId}-reaction-${member.id}`,
            title: `Reaction Roll: ${member.name}`,
            prompt: `Roll 1D6 for ${member.name} (Reactions: ${reactions}). Enter the die result.\n\n≤ ${reactions} → Quick Actions  |  > ${reactions} → Slow Actions`,
            min: 1,
            max: 6,
            saveTo: `encounter.reactionRolls.${member.id}`,
            buttonText: "Confirm",
            pauseAfter: false,
          })
        );
      }

      // Inline: sort crew into quick/slow and show the phase split
      cmds.push({
        id: `${baseId}-show-reaction-result`,
        type: "showReactionResult",
        status: "pending",
        pauseAfter: false,
        visible: false,
        baseId,
        execute(ctx) {
          const crewList = getCrewList(ctx.state);
          const quick = [];
          const slow = [];
          for (const member of crewList) {
            const roll = ctx.state?.encounter?.reactionRolls?.[member.id] ?? 1;
            const reactions = getCrewReaction(ctx.state, member.id);
            if (Number(roll) <= reactions) {
              quick.push(`${member.name} (rolled ${roll}, Reactions ${reactions})`);
            } else {
              slow.push(`${member.name} (rolled ${roll}, Reactions ${reactions})`);
            }
          }
          const quickText = quick.length ? quick.join(", ") : "None";
          const slowText = slow.length ? slow.join(", ") : "None";
          ctx.pushCommandsToTop([
            ctx.commandFactory.popupMessage({
              id: `${this.baseId}-reaction-split`,
              title: `Round ${this.roundNumber ?? ""} — Initiative`,
              message: `**Quick Actions:** ${quickText}\n\n**Slow Actions:** ${slowText}\n\nAll enemies act in the Enemy Actions phase.`,
              buttonText: "Begin Quick Actions",
              pauseAfter: false,
            }),
          ]);
          ctx.addLogEntry({ type: "commandCompleted", text: `Round reaction roll complete. Quick: ${quickText}. Slow: ${slowText}.` });
          this.status = "complete";
          ctx.setStatus("running");
        },
        toJSON() {
          return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible, baseId: this.baseId });
        },
      });
    } else {
      // No crew in state yet — just prompt
      cmds.push(
        factory.popupMessage({
          id: `${baseId}-reaction-prompt`,
          title: `Round ${this.roundNumber} — Reaction Roll`,
          message: `Roll 1D6 per crew member. Assign each die to a crew member:\n• Die ≤ their Reactions score → acts in **Quick Actions**\n• Die > their Reactions score → acts in **Slow Actions**\n\nAll enemies act in the Enemy Actions phase.`,
          buttonText: "Begin Quick Actions",
          pauseAfter: false,
        })
      );
    }

    // ── Quick Actions Phase ───────────────────────────────────────────────
    cmds.push(
      setPhase(factory, baseId, "quick-actions"),
      factory.popupMessage({
        id: `${baseId}-quick-actions`,
        title: `Round ${this.roundNumber} — Quick Actions`,
        message: `**Quick Actions Phase**\n\nCrew members assigned to Quick Actions may now Move and take a Combat Action.\n\n• Snap Fire: Crew may hold action to fire when an enemy moves, or delay to Slow Actions.\n• Stunned figures: May Move OR make a Combat Action (not both). Remove 1 Stun marker after acting.\n• Move +2" bonus if not firing.`,
        buttonText: "Quick Actions Done",
        pauseAfter: false,
      })
    );

    // ── Enemy Actions Phase ───────────────────────────────────────────────
    cmds.push(
      setPhase(factory, baseId, "enemy-actions"),
      factory.popupMessage({
        id: `${baseId}-enemy-actions`,
        title: `Round ${this.roundNumber} — Enemy Actions`,
        message: `**Enemy Actions Phase**\n\nEnemies act, starting with figures closest to your battlefield edge, progressing away.\n\n• Crew who held for Snap Fire may now fire (prevents them from moving this round).\n• Crew who delayed to Slow Actions now join the Slow Actions phase instead.`,
        buttonText: "Enemy Actions Done",
        pauseAfter: false,
      })
    );

    // ── Slow Actions Phase ────────────────────────────────────────────────
    cmds.push(
      setPhase(factory, baseId, "slow-actions"),
      factory.popupMessage({
        id: `${baseId}-slow-actions`,
        title: `Round ${this.roundNumber} — Slow Actions`,
        message: `**Slow Actions Phase**\n\nRemaining crew members (those assigned to Slow Actions, plus any who delayed from Quick Actions) may now Move and take a Combat Action.\n\n• Stunned figures: May Move OR make a Combat Action. Remove 1 Stun marker after acting.`,
        buttonText: "Slow Actions Done",
        pauseAfter: false,
      })
    );

    // ── End Phase / Enemy Morale ──────────────────────────────────────────
    cmds.push(
      setPhase(factory, baseId, "end-phase"),
      factory.numberInput({
        id: `${baseId}-casualties-this-round`,
        title: `Round ${this.roundNumber} — End Phase: Enemy Casualties`,
        prompt: `How many enemy figures were removed from the battlefield this round?\n\n(Casualties from terrain hazards or other non-combat causes don't count for Morale.)`,
        min: 0,
        max: 30,
        saveTo: `encounter.rounds.${this.roundNumber}.casualties`,
        buttonText: "Confirm",
        pauseAfter: false,
      })
    );

    cmds.push({
      id: `${baseId}-morale-roll`,
      type: "tabletopMoraleRoll",
      status: "pending",
      pauseAfter: false,
      visible: false,
      baseId,
      roundNumber: this.roundNumber,
      execute(ctx) {
        const casualties = Number(ctx.state?.encounter?.rounds?.[this.roundNumber]?.casualties ?? 0);
        if (casualties === 0) {
          ctx.addLogEntry({ type: "commandCompleted", text: `Round ${this.roundNumber} end phase: No enemy casualties — no Morale check needed.` });
          this.status = "complete";
          ctx.setStatus("running");
          return;
        }
        const panicRange = ctx.state?.encounter?.enemyPanicRange ?? "1-2";
        ctx.pushCommandsToTop([
          ctx.commandFactory.numberInput({
            id: `${this.baseId}-morale-dice-entry`,
            title: `Round ${this.roundNumber} — Enemy Morale`,
            prompt: `Roll ${casualties}D6 (one per casualty this round). Enter the number of dice that fall within the enemy's **Panic range** (${panicRange}).\n\nEach die in the Panic range causes 1 enemy figure to Bail — remove from the table starting with the figure closest to the enemy battlefield edge.\n\nFearless enemies are never affected by Morale.`,
            min: 0,
            max: casualties,
            saveTo: `encounter.rounds.${this.roundNumber}.moraleFailures`,
            buttonText: "Confirm",
            pauseAfter: false,
          }),
        ]);
        this.status = "complete";
        ctx.setStatus("running");
      },
      toJSON() {
        return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible, baseId: this.baseId, roundNumber: this.roundNumber });
      },
    });

    // ── Battle Events (end of round 2 and round 4) ───────────────────────
    if (this.battleEventsEnabled && (this.roundNumber === 2 || this.roundNumber === 4)) {
      cmds.push(
        factory.tableRoll({
          id: `${baseId}-battle-event`,
          title: `Round ${this.roundNumber} — Battle Event`,
          prompt: `Roll D100 on the Battle Events table and apply the result to the rest of the battle.`,
          table: {
            id: "battleEvents",
            title: "Battle Events",
            dice: "D100",
            sides: 100,
            entries: buildBattleEventEntries(),
          },
          saveTo: `encounter.rounds.${this.roundNumber}.battleEvent`,
          pauseAfter: false,
        })
      );
    }

    // ── Continue? ─────────────────────────────────────────────────────────
    cmds.push(
      new TabletopContinueCommand({
        id: `${baseId}-continue`,
        title: `Round ${this.roundNumber} Complete`,
        roundNumber: this.roundNumber,
        battleEventsEnabled: this.battleEventsEnabled,
        missionType: this.missionType,
        pauseAfter: false,
      })
    );

    engineContext.pushCommandsToTop(cmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: `Battle Round ${this.roundNumber} started.` });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON(), roundNumber: this.roundNumber, battleEventsEnabled: this.battleEventsEnabled, missionType: this.missionType });
  }
}

// ─── TabletopContinueCommand ─────────────────────────────────────────────────

export class TabletopContinueCommand extends BaseCommand {
  constructor({ id, title = "Round Complete", status = "pending", pauseAfter = false, visible = true, roundNumber = 1, battleEventsEnabled = false, missionType = "opportunity" } = {}) {
    super({ id, type: "tabletopContinue", title, status, pauseAfter, visible });
    this.roundNumber = roundNumber;
    this.battleEventsEnabled = battleEventsEnabled;
    this.missionType = missionType;
  }

  execute(engineContext) {
    engineContext.setStatus("idle");
  }

  resolve(engineContext, input = {}) {
    const choice = input?.choice ?? input?.value ?? "next-round";
    if (choice === "next-round") {
      engineContext.pushCommandsToTop([
        new TabletopCombatRoundCommand({
          id: `tabletop-round-${this.roundNumber + 1}`,
          roundNumber: this.roundNumber + 1,
          battleEventsEnabled: this.battleEventsEnabled,
          missionType: this.missionType,
          pauseAfter: false,
        }),
      ]);
      engineContext.addLogEntry({ type: "commandCompleted", text: `Round ${this.roundNumber} complete. Starting Round ${this.roundNumber + 1}.` });
    } else {
      const held = choice === "battle-won";
      const retreated = choice === "retreat";
      const outcomeText = held
        ? "Battle won — Held the Field."
        : retreated
          ? "Crew retreated from the battle."
          : "Battle ended.";

      engineContext.pushCommandsToTop([
        engineContext.commandFactory.choice({
          id: `tabletop-outcome-detail`,
          title: "Battle Outcome",
          prompt: `${outcomeText}\n\nDid you achieve your mission objective?`,
          options: [
            { id: "yes", label: "Yes — Objective Achieved", value: "objective-achieved" },
            { id: "no", label: "No — Objective Not Achieved", value: "objective-failed" },
          ],
          saveTo: "encounter.objectiveAchieved",
          buttonText: "Confirm",
          pauseAfter: false,
        }),
        engineContext.commandFactory.updateState({
          id: "tabletop-set-held-field",
          title: "Record Battle Outcome",
          operations: [
            { op: "set", path: "encounter.heldField", value: held },
            { op: "set", path: "encounter.retreated", value: retreated },
            { op: "set", path: "encounter.combatPhase", value: "complete" },
            { op: "set", path: "encounter.totalRounds", value: this.roundNumber },
          ],
          pauseAfter: false,
          visible: false,
        }),
        engineContext.commandFactory.popupMessage({
          id: "tabletop-battle-summary",
          title: "Battle Complete",
          message: `${outcomeText}\n\nRounds fought: ${this.roundNumber}\n\nProceed to the Post-Battle Sequence.`,
          buttonText: "Continue to Post-Battle",
          pauseAfter: false,
        }),
      ]);
      engineContext.addLogEntry({ type: "commandCompleted", text: `Battle ended after Round ${this.roundNumber}. ${outcomeText}` });
    }

    this.status = "complete";
    engineContext.setStatus("running");
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON(), roundNumber: this.roundNumber, battleEventsEnabled: this.battleEventsEnabled, missionType: this.missionType });
  }
}

// ─── TabletopCombatCommand ───────────────────────────────────────────────────

export default class TabletopCombatCommand extends BaseCommand {
  constructor({ id, title = "Tabletop Battle", status = "pending", pauseAfter = false, visible = true, missionType = "opportunity" } = {}) {
    super({ id, type: "tabletopCombat", title, status, pauseAfter, visible });
    this.missionType = missionType;
  }

  execute(engineContext) {
    const factory = engineContext.commandFactory;
    const state = engineContext.state;
    const baseId = this.id;
    const missionType = this.missionType;
    const isInvasion = missionType === "invasion";
    const highestSavvy = getHighestSavvy(state);

    const cmds = [
      factory.updateState({
        id: `${baseId}-set-mode`,
        title: "Start Tabletop Battle",
        operations: [
          { op: "set", path: "encounter.resolutionMode", value: "tabletop" },
          { op: "set", path: "encounter.combatPhase", value: "pre-battle" },
          { op: "set", path: "encounter.roundNumber", value: 0 },
        ],
        pauseAfter: false,
        visible: false,
      }),
    ];

    // ── Step 1: Deployment Conditions ─────────────────────────────────────
    if (!isInvasion) {
      cmds.push(
        factory.popupMessage({
          id: `${baseId}-deploy-intro`,
          title: "Step 1: Deployment Conditions",
          message: `Roll D100 and consult the **${missionType === "rival" ? "Rival" : missionType === "quest" ? "Quest" : "Opportunity / Patron"}** column of the Deployment Conditions table.`,
          buttonText: "Roll",
          pauseAfter: false,
        }),
        factory.tableRoll({
          id: `${baseId}-deployment-conditions`,
          title: "Deployment Conditions",
          prompt: "Roll D100 and select your Deployment Condition.",
          table: {
            id: "deploymentConditions",
            title: "Deployment Conditions",
            dice: "D100",
            sides: 100,
            entries: buildDeployConditionEntries(missionType),
          },
          saveTo: "encounter.deploymentCondition",
          pauseAfter: false,
        })
      );
    }

    // ── Step 2: Notable Sights ────────────────────────────────────────────
    if (!isInvasion) {
      cmds.push(
        factory.tableRoll({
          id: `${baseId}-notable-sights`,
          title: "Notable Sights",
          prompt: `Roll D100 for a Notable Sight. If present, place it 2D6+2" in a random direction from the center of the table.`,
          table: {
            id: "notableSights",
            title: "Notable Sights",
            dice: "D100",
            sides: 100,
            entries: buildNotableSightEntries(missionType),
          },
          saveTo: "encounter.notableSight",
          pauseAfter: false,
        })
      );
    }

    // ── Enemy Panic Range ─────────────────────────────────────────────────
    cmds.push(
      factory.textInput({
        id: `${baseId}-panic-range`,
        title: "Enemy Panic Range",
        prompt: `What is the enemy's Panic range? (Check the Enemy table — e.g. "1-2", "1-3", or "0" for Fearless)\n\nThis is used during the Morale check at the end of each round.`,
        saveTo: "encounter.enemyPanicRange",
        placeholder: "e.g. 1-2",
        buttonText: "Confirm",
        pauseAfter: false,
      })
    );

    // ── Step 3: Seize the Initiative ──────────────────────────────────────
    const seizeModifierNote = highestSavvy > 0
      ? `Your highest Savvy is **+${highestSavvy}**, so your total target is **${10 - highestSavvy}+** on 2D6.`
      : `No Savvy bonus. Target is **10+** on 2D6.`;

    cmds.push(
      factory.popupMessage({
        id: `${baseId}-seize-intro`,
        title: "Seize the Initiative",
        message: `Before the first round, you may attempt to **Seize the Initiative**.\n\nRoll 2D6 and add the highest Savvy score of any crew member. On a total of **10+**, your crew may each take a normal Move or fire before the battle begins (shots only Hit on a natural 6).\n\n${seizeModifierNote}\n\nNote: Ambush Rival attacks, Cautious enemies with Alert, and Hired Muscle impose penalties to this roll.`,
        buttonText: "Roll for Initiative",
        pauseAfter: false,
      }),
      factory.numberInput({
        id: `${baseId}-seize-roll`,
        title: "Seize the Initiative Roll",
        prompt: `Roll 2D6 and add your highest Savvy (${highestSavvy > 0 ? "+" + highestSavvy : "0"}). Enter your total.`,
        min: 2,
        max: 15,
        saveTo: "encounter.seizeInitiativeRoll",
        buttonText: "Confirm",
        pauseAfter: false,
      })
    );

    // Inline: show seize result
    cmds.push({
      id: `${baseId}-seize-result`,
      type: "tabletopSeizeResult",
      status: "pending",
      pauseAfter: false,
      visible: false,
      baseId,
      execute(ctx) {
        const roll = Number(ctx.state?.encounter?.seizeInitiativeRoll ?? 0);
        const success = roll >= 10;
        const msg = success
          ? `**Seized the Initiative!** (rolled ${roll})\n\nYour crew caught the opposition flat-footed. Each crew member may take a normal Move or fire before Round 1 begins. Shots fired now only Hit on a natural 6.`
          : `**Did not Seize the Initiative** (rolled ${roll}, needed 10+)\n\nProceed directly to Round 1.`;
        ctx.pushCommandsToTop([
          ctx.commandFactory.popupMessage({
            id: `${this.baseId}-seize-result-popup`,
            title: success ? "Initiative Seized!" : "Initiative Not Seized",
            message: msg,
            buttonText: success ? "Take Pre-Battle Actions" : "Begin Round 1",
            pauseAfter: false,
          }),
        ]);
        ctx.addLogEntry({ type: "commandCompleted", text: `Seize the Initiative: rolled ${roll} — ${success ? "SUCCESS" : "failed"}.` });
        this.status = "complete";
        ctx.setStatus("running");
      },
      toJSON() {
        return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible, baseId: this.baseId });
      },
    });

    // ── Battle Events toggle ──────────────────────────────────────────────
    cmds.push(
      factory.choice({
        id: `${baseId}-battle-events-toggle`,
        title: "Battle Events (Optional)",
        prompt: `Use the **Battle Events** table this battle? (Roll D100 at the end of Rounds 2 and 4)\n\nThis adds an extra random element beyond simple to-hit rolls. Recommended if you want a more dynamic battle.`,
        options: [
          { id: "yes", label: "Yes — use Battle Events", value: "yes" },
          { id: "no", label: "No — skip Battle Events", value: "no" },
        ],
        saveTo: "encounter.battleEventsEnabled",
        buttonText: "Confirm",
        pauseAfter: false,
      })
    );

    // Inline: start Round 1
    cmds.push({
      id: `${baseId}-start-round-1`,
      type: "tabletopStartRound1",
      status: "pending",
      pauseAfter: false,
      visible: false,
      baseId,
      missionType,
      execute(ctx) {
        const battleEventsEnabled = ctx.state?.encounter?.battleEventsEnabled === "yes";
        ctx.pushCommandsToTop([
          new TabletopCombatRoundCommand({
            id: `tabletop-round-1`,
            roundNumber: 1,
            battleEventsEnabled,
            missionType: this.missionType,
            pauseAfter: false,
          }),
        ]);
        ctx.addLogEntry({ type: "commandCompleted", text: `Tabletop battle started. Battle Events: ${battleEventsEnabled ? "ON" : "OFF"}.` });
        this.status = "complete";
        ctx.setStatus("running");
      },
      toJSON() {
        return removeUndefinedValues({ id: this.id, type: this.type, status: this.status, pauseAfter: this.pauseAfter, visible: this.visible, baseId: this.baseId, missionType: this.missionType });
      },
    });

    engineContext.pushCommandsToTop(cmds);
    this.status = "complete";
    engineContext.setStatus("running");
    engineContext.addLogEntry({ type: "commandCompleted", text: `Tabletop Battle started (${missionType} mission).` });
  }

  toJSON() {
    return removeUndefinedValues({ ...super.toJSON(), missionType: this.missionType });
  }
}
