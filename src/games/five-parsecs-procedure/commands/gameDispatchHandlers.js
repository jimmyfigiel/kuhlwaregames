// Dispatch handlers for module-wide "run this after a pause resolves" steps
// (Terrain Generator, Tabletop Battle Phase, Tabletop Combat, No-Minis Combat,
// World Phase / Job Offers / Choose Battle). See PostBattleDispatchCommand.js
// for why these must be pure functions keyed by string, not closures.

import { TERRAIN_TYPES_BY_ID, makeTerrainTable } from "../data/tables/terrainGenerator";
import { NO_MINIS_INITIATIVE_ACTIONS_BY_ID } from "../data/tables/noMinisInitiativeActions";
import NoMinisCombatCommand, { NoMinisCombatRoundCommand } from "./NoMinisCombatCommand";
import NoMinisInitiativeCommand from "./NoMinisInitiativeCommand";
import NoMinisFirefightCommand from "./NoMinisFirefightCommand";
import TabletopCombatCommand, { TabletopCombatRoundCommand } from "./TabletopCombatCommand";
import TerrainGeneratorCommand from "./TerrainGeneratorCommand";
import { buildTaskResolutionCommands } from "./WorldCrewTasksCommand";
import { ENEMY_CATEGORY_TABLES, UNIQUE_INDIVIDUALS_TABLE, rollOpponentDice, rollEnemyWeapon, rollEnemySpecialistWeapon } from "../data/tables/enemyTables";
import { buildEnemySubtable } from "./EnemyGenerationCommand";
import { OBJECTIVE_TYPES } from "../data/tables/objectiveTables";
import { rollDie, rollDice } from "./postBattleHelpers";
import { makeCampaignTableRoll } from "./WorldJobOffersCommand";
import { CAMPAIGN_TABLES, PATRON_BHC_THRESHOLDS } from "../data/tables/campaignTables";

function popup(ctx, { id, title, message, buttonText = "Continue" }) {
  ctx.pushCommandsToTop([
    ctx.commandFactory.popupMessage({ id, title, message, buttonText, pauseAfter: false }),
  ]);
}

// ─── Terrain Generator ──────────────────────────────────────────────────────

function queueTerrainRolls(ctx, params) {
  const { baseId } = params;
  const terrainTypeId = ctx.getStateValue("terrainSetup.terrainTypeId");
  const terrainType = TERRAIN_TYPES_BY_ID[terrainTypeId];
  const f = ctx.commandFactory;

  if (!terrainType) {
    ctx.addLogEntry({ type: "error", text: "Terrain type not found — cannot generate rolls.", commandId: baseId });
    return;
  }

  const notableTable = makeTerrainTable(terrainType.notableFeatures, `${terrainType.id}-notable`, `${terrainType.label} — Notable Features`);
  const regularTable = makeTerrainTable(terrainType.regularFeatures, `${terrainType.id}-regular`, `${terrainType.label} — Regular Features`);

  const quarterCommands = [1, 2, 3, 4].flatMap((q) => [
    f.popupMessage({
      id: `${baseId}-quarter-${q}-intro`,
      title: `Quarter ${q} of 4`,
      message: `Roll 4D6 on the Regular Features table for Quarter ${q}. Then roll 1D6 for the number of scatter pieces to add to this quarter.`,
      buttonText: "Roll Now",
      pauseAfter: false,
    }),
    f.tableRoll({ id: `${baseId}-q${q}-reg-1`, title: `Quarter ${q} — Regular Feature Roll 1`, table: regularTable, rollButtonText: "Roll 1D6", buttonText: "Select Result", pauseAfter: false }),
    f.tableRoll({ id: `${baseId}-q${q}-reg-2`, title: `Quarter ${q} — Regular Feature Roll 2`, table: regularTable, rollButtonText: "Roll 1D6", buttonText: "Select Result", pauseAfter: false }),
    f.tableRoll({ id: `${baseId}-q${q}-reg-3`, title: `Quarter ${q} — Regular Feature Roll 3`, table: regularTable, rollButtonText: "Roll 1D6", buttonText: "Select Result", pauseAfter: false }),
    f.tableRoll({ id: `${baseId}-q${q}-reg-4`, title: `Quarter ${q} — Regular Feature Roll 4`, table: regularTable, rollButtonText: "Roll 1D6", buttonText: "Select Result", pauseAfter: false }),
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
    f.popupMessage({ id: `${baseId}-step2-intro`, title: "Step 2: The Center — Notable Feature", message: "Roll 1D6 on the Notable Features table below. Place the result so it partially covers the center point of the table.", buttonText: "Roll Now", pauseAfter: false }),
    f.tableRoll({ id: `${baseId}-notable`, title: `${terrainType.label} — Notable Feature (Center)`, table: notableTable, rollButtonText: "Roll 1D6", buttonText: "Select Result", pauseAfter: false }),
    f.popupMessage({ id: `${baseId}-step3-intro`, title: "Step 3: The Quarters", message: "Work through each quarter one at a time. For each quarter, roll 4D6 on the Regular Features table and 1D6 for scatter pieces.", buttonText: "Start Quarters", pauseAfter: false }),
    ...quarterCommands,
    f.popupMessage({ id: `${baseId}-final`, title: "Step 5: Final Evaluation", message: "Step back and evaluate. Swap features that seem out of place, add cosmetic touches (sand for roads, clumps of flock, pebbles). If things feel cluttered, that's usually fine — terrain to crawl between improves the game.", buttonText: "Battlefield Ready", pauseAfter: false }),
  ]);

  ctx.addLogEntry({ type: "commandCompleted", text: `Queued terrain rolls for ${terrainType.label}.`, commandId: baseId });
}

// ─── Tabletop Battle Phase ───────────────────────────────────────────────────

function maybeRunTerrainGenerator(ctx, params) {
  if (ctx.getStateValue("terrainSetup.useGenerator") === "yes") {
    ctx.pushCommandsToTop([
      new TerrainGeneratorCommand({ id: `${params.baseId}-terrain-generator`, title: "Terrain Generator", pauseAfter: false }),
    ]);
  }
}

function branchBattleResolution(ctx, params) {
  const mode = ctx.getStateValue("encounter.resolutionMode") ?? "tabletop";

  if (mode === "no-minis") {
    ctx.pushCommandsToTop([
      new NoMinisCombatCommand({ id: `${params.baseId}-no-minis`, title: "No-Minis Combat Resolution", missionType: params.missionType, pauseAfter: false }),
    ]);
  } else {
    ctx.pushCommandsToTop([
      new TabletopCombatCommand({ id: `${params.baseId}-tabletop-combat`, title: "Tabletop Battle", missionType: params.missionType, pauseAfter: false }),
    ]);
  }
}

// ─── No-Minis Combat ─────────────────────────────────────────────────────────

function applyBattleFlowEvent(ctx, params) {
  const { baseId, round } = params;
  const bfeResult = ctx.getStateValue(`noMinis.rounds.${round}.battleFlowEvent`);
  const needsKillZoneRoll = bfeResult?.value === "kill-zone";

  popup(ctx, {
    id: `${baseId}-bfe-display`,
    title: `Battle Flow Event: ${bfeResult?.label || "Unknown"}`,
    message: bfeResult?.text
      ? `${bfeResult.text}${needsKillZoneRoll ? "\n\n🎲 Roll 1D6+10 now to determine the Kill Zone range in inches." : ""}`
      : "No battle flow event this round.",
    buttonText: "OK",
  });
}

function queueInitiativeActions(ctx, params) {
  const { round } = params;
  const count = ctx.getStateValue(`noMinis.rounds.${round}.eligibleCount`) ?? 0;
  const f = ctx.commandFactory;
  const actionCmds = [];

  for (let i = 1; i <= count; i += 1) {
    actionCmds.push(
      new NoMinisInitiativeCommand({
        id: `no-minis-round-${round}-init-char-${i}`,
        title: `Round ${round} — Initiative: Character ${i}`,
        characterName: `Character ${i}`,
        roundNumber: round,
        pauseAfter: false,
      })
    );
  }

  if (actionCmds.length === 0) {
    actionCmds.push(
      f.popupMessage({
        id: `no-minis-round-${round}-no-init`,
        title: `Round ${round}: No Initiative Actions`,
        message: "No crew members qualified for an Initiative Action this round. Proceeding to Firefight.",
        buttonText: "OK",
        pauseAfter: false,
      })
    );
  }

  ctx.pushCommandsToTop(actionCmds);
}

function queueFirefight(ctx, params) {
  const { round } = params;
  const bfeResult = ctx.getStateValue(`noMinis.rounds.${round}.battleFlowEvent`);
  const modifier = bfeResult?.firefightModifier ?? 0;
  const blocksBrawling = bfeResult?.blocksBrawling ?? false;

  ctx.pushCommandsToTop([
    new NoMinisFirefightCommand({
      id: `no-minis-round-${round}-firefight`,
      title: `Round ${round}: Firefight`,
      roundNumber: round,
      firefightModifier: modifier,
      blocksBrawling,
      pauseAfter: false,
    }),
  ]);
}

function startNoMinisRound1(ctx) {
  const bfe = ctx.getStateValue("noMinis.options.battleFlowEventsEnabled") === "true";
  const hectic = ctx.getStateValue("noMinis.options.hecticCombatEnabled") === "true";
  const faster = ctx.getStateValue("noMinis.options.fasterCombatEnabled") === "true";

  ctx.pushCommandsToTop([
    new NoMinisCombatRoundCommand({
      id: "no-minis-round-1",
      roundNumber: 1,
      battleFlowEventsEnabled: bfe,
      hecticCombatEnabled: hectic,
      fasterCombatEnabled: faster,
    }),
  ]);
}

// ─── No-Minis Initiative ─────────────────────────────────────────────────────

function describeBattlefieldTest(test) {
  if (!test) return null;
  if (test.target === null) return test.note || "Per scenario.";
  const mods = (test.modifiers || []).map((m) => `${m.bonus > 0 ? "+" : ""}${m.bonus} if ${m.condition}`).join(", ");
  return `Roll 2D6, need ${test.target}+.${mods ? ` Modifiers: ${mods}.` : ""}`;
}

const NO_TEST_ACTIONS = new Set(["move-up", "support"]);

function resolveInitiativeAction(ctx, params) {
  const { characterName, commandBaseId } = params;
  const actionId = ctx.getStateValue(`noMinis.initiativeActions.${commandBaseId}`);
  const action = NO_MINIS_INITIATIVE_ACTIONS_BY_ID[actionId];
  const f = ctx.commandFactory;

  if (!action) return;

  const cmds = [];

  if (!action.battlefieldTest || NO_TEST_ACTIONS.has(action.id)) {
    cmds.push(
      f.popupMessage({
        id: `${commandBaseId}-result`,
        title: `${characterName}: ${action.label}`,
        message: `${action.description}\n\nNo roll required — action takes effect immediately.`,
        buttonText: "OK",
        pauseAfter: false,
      })
    );
  } else if (action.scenarioDependent) {
    cmds.push(
      f.popupMessage({
        id: `${commandBaseId}-result`,
        title: `${characterName}: ${action.label}`,
        message: `${action.description}\n\nResolve the Battlefield Test per the scenario rules.`,
        buttonText: "Done",
        pauseAfter: false,
      })
    );
  } else {
    const test = action.battlefieldTest;
    const testDesc = describeBattlefieldTest(test);
    const modList = (test.modifiers || []).map((m) => `• ${m.bonus > 0 ? "+" : ""}${m.bonus} if ${m.condition}`).join("\n");

    if (action.extraRoll) {
      cmds.push(
        f.popupMessage({
          id: `${commandBaseId}-extra-roll-note`,
          title: `${characterName}: ${action.label} — Extra Roll`,
          message: `Before the Battlefield Test: ${action.extraRoll}.`,
          buttonText: "OK",
          pauseAfter: false,
        })
      );
    }

    cmds.push(
      f.numberInput({
        id: `${commandBaseId}-test-roll`,
        title: `${characterName}: ${action.label} — Battlefield Test`,
        prompt: `${testDesc}${modList ? `\n\nModifiers:\n${modList}` : ""}\n\nRoll 2D6 (or click Roll) and enter your total.`,
        label: "2D6 result",
        defaultValue: 7,
        min: 2,
        max: 12,
        saveTo: `noMinis.initiativeTests.${commandBaseId}`,
        buttonText: "Confirm Roll",
        pauseAfter: false,
      }),
      f.postBattleDispatch({
        id: `${commandBaseId}-test-result`,
        dispatchKey: "resolveInitiativeTest",
        params: {
          commandBaseId,
          actionLabel: action.label,
          actionDescription: action.description,
          characterName,
          testTarget: test.target,
        },
      })
    );
  }

  ctx.pushCommandsToTop(cmds);
  ctx.addLogEntry({ type: "commandCompleted", text: `Resolving initiative action for ${characterName}.`, commandId: commandBaseId });
}

function resolveInitiativeTest(ctx, params) {
  const { commandBaseId, actionLabel, actionDescription, characterName, testTarget } = params;
  const roll = ctx.getStateValue(`noMinis.initiativeTests.${commandBaseId}`) ?? 0;
  const passed = roll >= testTarget;

  popup(ctx, {
    id: `${commandBaseId}-outcome`,
    title: `${characterName}: ${actionLabel} — ${passed ? "Success!" : "Failed"}`,
    message: passed
      ? `Rolled ${roll} — meets ${testTarget}+. Action succeeds!\n\n${actionDescription}`
      : `Rolled ${roll} — needs ${testTarget}+. Action fails. No extra penalty.`,
    buttonText: "OK",
  });

  ctx.addLogEntry({ type: "commandCompleted", text: `${characterName} initiative action "${actionLabel}": rolled ${roll} vs ${testTarget}+ — ${passed ? "success" : "fail"}.`, commandId: commandBaseId });
}

// ─── Tabletop Combat ─────────────────────────────────────────────────────────

function getCrewList(state) {
  return Array.isArray(state?.crewLog?.crewMembers) ? state.crewLog.crewMembers : [];
}

function getCrewReaction(state, crewMemberId) {
  return state?.crewLog?.crewDetails?.[crewMemberId]?.stats?.reactions ?? 1;
}

function showReactionResult(ctx, params) {
  const { baseId, roundNumber } = params;
  const crewList = getCrewList(ctx.state);
  const quick = [];
  const slow = [];

  for (const member of crewList) {
    const roll = ctx.getStateValue(`encounter.reactionRolls.${member.id}`) ?? 1;
    const reactions = getCrewReaction(ctx.state, member.id);
    if (Number(roll) <= reactions) {
      quick.push(`${member.name} (rolled ${roll}, Reactions ${reactions})`);
    } else {
      slow.push(`${member.name} (rolled ${roll}, Reactions ${reactions})`);
    }
  }

  const quickText = quick.length ? quick.join(", ") : "None";
  const slowText = slow.length ? slow.join(", ") : "None";

  popup(ctx, {
    id: `${baseId}-reaction-split`,
    title: `Round ${roundNumber ?? ""} — Initiative`,
    message: `**Quick Actions:** ${quickText}\n\n**Slow Actions:** ${slowText}\n\nAll enemies act in the Enemy Actions phase.`,
    buttonText: "Begin Quick Actions",
  });

  ctx.addLogEntry({ type: "commandCompleted", text: `Round reaction roll complete. Quick: ${quickText}. Slow: ${slowText}.` });
}

function tabletopMoraleRoll(ctx, params) {
  const { baseId, roundNumber } = params;
  const casualties = Number(ctx.getStateValue(`encounter.rounds.${roundNumber}.casualties`) ?? 0);

  if (casualties === 0) {
    ctx.addLogEntry({ type: "commandCompleted", text: `Round ${roundNumber} end phase: No enemy casualties — no Morale check needed.` });
    return;
  }

  const panicRange = ctx.getStateValue("encounter.enemyPanicRange") ?? "1-2";

  ctx.pushCommandsToTop([
    ctx.commandFactory.numberInput({
      id: `${baseId}-morale-dice-entry`,
      title: `Round ${roundNumber} — Enemy Morale`,
      prompt: `Roll ${casualties}D6 (one per casualty this round). Enter the number of dice that fall within the enemy's **Panic range** (${panicRange}).\n\nEach die in the Panic range causes 1 enemy figure to Bail — remove from the table starting with the figure closest to the enemy battlefield edge.\n\nFearless enemies are never affected by Morale.`,
      min: 0,
      max: casualties,
      saveTo: `encounter.rounds.${roundNumber}.moraleFailures`,
      buttonText: "Confirm",
      pauseAfter: false,
    }),
  ]);
}

function tabletopSeizeResult(ctx, params) {
  const { baseId } = params;
  const roll = Number(ctx.getStateValue("encounter.seizeInitiativeRoll") ?? 0);
  const success = roll >= 10;
  const message = success
    ? `**Seized the Initiative!** (rolled ${roll})\n\nYour crew caught the opposition flat-footed. Each crew member may take a normal Move or fire before Round 1 begins. Shots fired now only Hit on a natural 6.`
    : `**Did not Seize the Initiative** (rolled ${roll}, needed 10+)\n\nProceed directly to Round 1.`;

  popup(ctx, {
    id: `${baseId}-seize-result-popup`,
    title: success ? "Initiative Seized!" : "Initiative Not Seized",
    message,
    buttonText: success ? "Take Pre-Battle Actions" : "Begin Round 1",
  });

  ctx.addLogEntry({ type: "commandCompleted", text: `Seize the Initiative: rolled ${roll} — ${success ? "SUCCESS" : "failed"}.` });
}

function tabletopStartRound1(ctx, params) {
  const { missionType } = params;
  const battleEventsEnabled = ctx.getStateValue("encounter.battleEventsEnabled") === "yes";

  ctx.pushCommandsToTop([
    new TabletopCombatRoundCommand({
      id: "tabletop-round-1",
      roundNumber: 1,
      battleEventsEnabled,
      missionType,
      pauseAfter: false,
    }),
  ]);

  ctx.addLogEntry({ type: "commandCompleted", text: `Tabletop battle started. Battle Events: ${battleEventsEnabled ? "ON" : "OFF"}.` });
}

// ─── World Phase (crew tasks, patron seek) ──────────────────────────────────

function calcPatronSeek(ctx, params) {
  const { baseId, memberId, memberName } = params;
  const roll = ctx.getStateValue(`worldPhase.patronSeekRolls.${memberId}`) ?? 0;

  const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];
  let patronSeekers = 0;
  for (const m of crewMembers) {
    const task = ctx.getStateValue(`worldPhase.crewTasks.${m.id}`);
    if (task === "findPatron") patronSeekers++;
  }

  const existingPatrons = (ctx.getStateValue("worldLog.patrons") || []).length;
  const total = roll + patronSeekers + existingPatrons;
  const found = total >= 6 ? 2 : total >= 5 ? 1 : 0;

  const currentFound = ctx.getStateValue("worldPhase.patronJobsFound") ?? 0;
  const newTotal = Math.min(currentFound + found, 2);

  ctx.setStateValue("worldPhase.patronJobsFound", newTotal);

  popup(ctx, {
    id: `${baseId}-resolve-findPatron-msg-${memberId}`,
    title: `${memberName}: Find Patron`,
    message:
      found === 0
        ? `${memberName} rolled ${roll}. Total: ${total} (roll + ${patronSeekers} seekers + ${existingPatrons} contacts).\nNo patron jobs found.`
        : `${memberName} rolled ${roll}. Total: ${total} (roll + ${patronSeekers} seekers + ${existingPatrons} contacts).\n${found === 2 ? "Two patron jobs found!" : "One patron job found!"}`,
    buttonText: "OK",
  });
}

function resolveCrewTask(ctx, params) {
  const { baseId, memberId, memberName } = params;
  const taskId = ctx.getStateValue(`worldPhase.crewTasks.${memberId}`) || "doNothing";
  const resCmds = buildTaskResolutionCommands(ctx.commandFactory, baseId, { id: memberId, name: memberName }, taskId, ctx);
  ctx.pushCommandsToTop(resCmds);
}

function patronJobModifiers(ctx, params) {
  const { baseId, jobIndex } = params;
  const patronTypeEntry = ctx.getStateValue(`worldPhase.patronJobs.${jobIndex}.patronType`);
  const patronTypeName = patronTypeEntry?.label || patronTypeEntry?.value || String(patronTypeEntry || "");
  const thresholds = PATRON_BHC_THRESHOLDS[patronTypeName] || { benefits: 8, hazards: 8, conditions: 8 };

  const benefitsRoll = Math.floor(Math.random() * 10) + 1;
  const hazardsRoll = Math.floor(Math.random() * 10) + 1;
  const conditionsRoll = Math.floor(Math.random() * 10) + 1;

  const subCmds = [];

  if (benefitsRoll >= thresholds.benefits) {
    subCmds.push(
      makeCampaignTableRoll(ctx.commandFactory, {
        id: `${baseId}-job${jobIndex}-benefits`,
        table: CAMPAIGN_TABLES.benefitsSubtable,
        saveTo: `worldPhase.patronJobs.${jobIndex}.benefit`,
        title: `Job ${jobIndex + 1}: Benefit`,
      })
    );
  }

  if (hazardsRoll >= thresholds.hazards) {
    subCmds.push(
      makeCampaignTableRoll(ctx.commandFactory, {
        id: `${baseId}-job${jobIndex}-hazards`,
        table: CAMPAIGN_TABLES.hazardsSubtable,
        saveTo: `worldPhase.patronJobs.${jobIndex}.hazard`,
        title: `Job ${jobIndex + 1}: Hazard`,
      })
    );
  }

  if (conditionsRoll >= thresholds.conditions) {
    subCmds.push(
      makeCampaignTableRoll(ctx.commandFactory, {
        id: `${baseId}-job${jobIndex}-conditions`,
        table: CAMPAIGN_TABLES.conditionsSubtable,
        saveTo: `worldPhase.patronJobs.${jobIndex}.condition`,
        title: `Job ${jobIndex + 1}: Condition`,
      })
    );
  }

  const hasBenefit = benefitsRoll >= thresholds.benefits;
  const hasHazard = hazardsRoll >= thresholds.hazards;
  const hasCondition = conditionsRoll >= thresholds.conditions;

  const modifierLines = [];
  modifierLines.push(hasBenefit ? `• Benefit roll: ${benefitsRoll} (threshold ${thresholds.benefits}) — roll on Benefits table` : `• No benefit (rolled ${benefitsRoll}, need ${thresholds.benefits})`);
  modifierLines.push(hasHazard ? `• Hazard roll: ${hazardsRoll} (threshold ${thresholds.hazards}) — roll on Hazards table` : `• No hazard (rolled ${hazardsRoll}, need ${thresholds.hazards})`);
  modifierLines.push(hasCondition ? `• Condition roll: ${conditionsRoll} (threshold ${thresholds.conditions}) — roll on Conditions table` : `• No condition (rolled ${conditionsRoll}, need ${thresholds.conditions})`);

  subCmds.push(
    ctx.commandFactory.popupMessage({
      id: `${baseId}-job${jobIndex}-summary`,
      title: `Job ${jobIndex + 1}: Summary`,
      message: `Patron: ${patronTypeName || "Unknown"}\n${modifierLines.join("\n")}`,
      buttonText: "Continue",
      pauseAfter: false,
    })
  );

  ctx.pushCommandsToTop(subCmds);
}

function missionPrepDispatch(ctx, params) {
  const { baseId } = params;
  const missionType = ctx.getStateValue("encounter.missionType");

  let message;
  if (missionType === "patron") {
    message = "Record the patron details in your Encounter Log.\nSet up the battlefield and generate enemy forces according to the patron's mission parameters.";
  } else if (missionType === "rival") {
    message = "Select a rival from your list.\nNote their faction for enemy force generation.";
  } else if (missionType === "quest") {
    message = "This is a Quest mission. If a Quest finale is pending, it's a Straight-up Fight with +1 opponent, and the opponents are Fearless.\nSet up the battlefield and generate enemy forces using the standard tables.";
  } else {
    message = "Roll for the Opportunity mission type and enemy forces using the standard tables.";
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.popupMessage({
      id: `${baseId}-mission-prep-msg`,
      title: "Mission Prep",
      message,
      buttonText: "Ready",
      pauseAfter: false,
    }),
    ctx.commandFactory.updateState({
      id: `${baseId}-set-encounter-ready`,
      title: "Encounter Ready",
      operations: [{ op: "set", path: "encounter.phase", value: "ready" }],
      pauseAfter: false,
      visible: false,
    }),
  ]);
}

function worldRumors(ctx, params) {
  const { baseId } = params;
  const rumors = ctx.getStateValue("worldLog.rumors") ?? 0;
  const questRumors = ctx.getStateValue("worldLog.questRumors") ?? 0;
  const total = rumors + questRumors;

  let message;
  if (total === 0) {
    message = "You have no Rumors or Quest Rumors to resolve this turn.";
  } else {
    const parts = [];
    if (rumors > 0) parts.push(`${rumors} Rumor${rumors !== 1 ? "s" : ""}`);
    if (questRumors > 0) parts.push(`${questRumors} Quest Rumor${questRumors !== 1 ? "s" : ""}`);
    message = `You have ${parts.join(" and ")} to resolve.\nSpend 1 credit per Rumor to convert it into a Quest lead. Quest Rumors may advance your current Quest.`;
  }

  popup(ctx, { id: `${baseId}-rumors-msg`, title: "Resolve Rumors", message, buttonText: total === 0 ? "Skip" : "Resolve" });
}

// ─── Enemy Generation ────────────────────────────────────────────────────────

function normalizeSubtable(table) {
  return {
    id: table.id,
    title: table.title,
    dice: table.dice || "D100",
    sides: 100,
    entries: table.entries,
  };
}

function extractSaveThrow(rules) {
  const text = (rules || []).join(" ");
  const match = text.match(/(\d)\+\s*(?:Armor\s+)?Saving Throw/i);
  return match ? Number(match[1]) : null;
}

function enemyGenerationRollCategory(ctx, params) {
  const { baseId, missionType, invasionBonus } = params;
  const categoryId = ctx.getStateValue("postBattleTemp.enemyGen.category");

  ctx.pushCommandsToTop([
    ctx.commandFactory.tableRoll({
      id: `${baseId}-specific`,
      title: ENEMY_CATEGORY_TABLES[categoryId]?.label || "Enemy",
      table: normalizeSubtable(buildEnemySubtable(categoryId)),
      saveTo: "postBattleTemp.enemyGen.specific",
      buttonText: "Select",
      rollButtonText: "Roll D100",
      afterSelectionCommands: [
        ctx.commandFactory.postBattleDispatch({
          id: `${baseId}-finalize`,
          dispatchKey: "enemyGenerationFinalize",
          params: { baseId, missionType, categoryId, invasionBonus },
        }),
      ],
      pauseAfter: false,
    }),
  ]);
}

function enemyGenerationRollSpecific(ctx, params) {
  const { baseId, categoryId, missionType, forcedEnemyName, rivalId, invasionBonus } = params;
  const category = ENEMY_CATEGORY_TABLES[categoryId];
  const row = category?.rows.find((r) => r.name === forcedEnemyName);

  if (!row) return;

  finalizeEnemyGeneration(ctx, { baseId, missionType, categoryId, row, rivalId, invasionBonus, isKnownRival: true });
}

function enemyGenerationFinalize(ctx, params) {
  const { baseId, missionType, categoryId, invasionBonus } = params;
  const specific = ctx.getStateValue("postBattleTemp.enemyGen.specific");
  const category = ENEMY_CATEGORY_TABLES[categoryId];
  const row = category?.rows.find((r) => r.name === (specific?.label || specific?.value)) || specific?.row;

  if (!row) return;

  let rivalId = null;
  if (missionType === "rival") {
    const rivalStateId = ctx.getStateValue("postBattleTemp.rivalStatus.rivalId") || ctx.getStateValue("encounter.selectedRivalId");
    const rivals = ctx.getStateValue("worldLog.rivals") || [];
    const rival = rivals.find((r) => r.id === rivalStateId) || rivals[0];
    rivalId = rival?.id || null;
  }

  finalizeEnemyGeneration(ctx, { baseId, missionType, categoryId, row, rivalId, invasionBonus, isKnownRival: false });
}

function finalizeEnemyGeneration(ctx, { baseId, missionType, categoryId, row, rivalId, invasionBonus = 0, isKnownRival }) {
  const state = ctx.state;
  const category = ENEMY_CATEGORY_TABLES[categoryId];
  const difficultyMode = state?.campaign?.difficultyMode || "normal";
  const crewSize = Number(state?.campaign?.crewSize || 6);

  // Number of opponents
  const diceResult = rollOpponentDice(crewSize);
  let picked = diceResult.picked;

  if (["challenging", "hardcore", "insanity"].includes(difficultyMode)) {
    const rerolled = diceResult.rolls.map((d) => (d <= 2 ? Math.ceil(Math.random() * 6) : d));
    picked = diceResult.mode === "lower of 2D6" ? Math.min(...rerolled) : diceResult.mode === "higher of 2D6" ? Math.max(...rerolled) : rerolled[0];
  }

  let total = picked + Number(row.numbers || 0) + invasionBonus;

  if (difficultyMode === "easy" && total >= 5) total -= 1;
  if (difficultyMode === "hardcore" || difficultyMode === "insanity") total += 1;
  total = Math.max(1, total);

  // Specialists / Lieutenant
  let specialistCount = total <= 2 ? 0 : total <= 6 ? 1 : 2;
  if (difficultyMode === "insanity") specialistCount += 1;
  specialistCount = Math.min(specialistCount, total);
  const hasLieutenant = total >= 4;

  // Weapons
  let regularWeapon;
  let specialistWeapon = null;
  if (row.weapon?.fixed) {
    regularWeapon = row.weapon.fixed;
    specialistWeapon = row.weapon.specialistFixed || row.weapon.fixed;
  } else {
    regularWeapon = rollEnemyWeapon(row.weapon?.roll || 1);
    if (specialistCount > 0) {
      specialistWeapon = rollEnemySpecialistWeapon(row.weapon?.specialist || "A");
    }
  }

  // Unique Individual(s)
  const skipUniqueRoll = (categoryId === "rovingThreats" || missionType === "invasion") && difficultyMode !== "insanity";
  const uniqueIndividuals = [];
  if (!skipUniqueRoll) {
    let uiModifier = 0;
    if (categoryId === "interestedParties") uiModifier += 1;
    if (difficultyMode === "hardcore") uiModifier += 1;
    const forceUnique = difficultyMode === "insanity";
    const { rolls: uiRolls, total: uiTotal } = rollDice(2, 6);
    const modifiedUiTotal = forceUnique ? uiTotal : uiTotal + uiModifier;

    if (forceUnique || modifiedUiTotal >= 9) {
      const count = forceUnique && uiTotal >= 11 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const uiRoll = Math.ceil(Math.random() * 100);
        const uiRow = UNIQUE_INDIVIDUALS_TABLE.rows.find((r) => uiRoll >= r.min && uiRoll <= r.max);
        if (uiRow) uniqueIndividuals.push(uiRow);
      }
    }
  }

  const saveThrow = extractSaveThrow(row.rules);

  // Build the individual enemy roster
  const enemies = [];
  for (let i = 0; i < total; i += 1) {
    const isSpecialist = i < specialistCount;
    const isLieutenant = !isSpecialist && hasLieutenant && i === specialistCount;
    enemies.push({
      id: `enemy-${i + 1}`,
      name: `${row.name}${isSpecialist ? " (Specialist)" : isLieutenant ? " (Lieutenant)" : ""}`,
      isSpecialist,
      isLieutenant,
      speed: row.speed,
      combatSkill: Number(row.combatSkill || 0) + (isLieutenant ? 1 : 0),
      toughness: row.toughness,
      ai: row.ai,
      panic: row.panic,
      saveThrow,
      weapon: isSpecialist ? specialistWeapon : regularWeapon,
      extraWeapon: isLieutenant ? "Blade" : null,
    });
  }

  uniqueIndividuals.forEach((ui, idx) => {
    enemies.push({
      id: `unique-${idx + 1}`,
      name: ui.name,
      isUnique: true,
      speed: ui.speed ?? row.speed,
      combatSkill: ui.combatSkill ?? row.combatSkill,
      toughness: ui.toughness ?? row.toughness,
      ai: ui.ai || row.ai,
      luck: ui.luck || 0,
      saveThrow: ui.saveThrow ? Number(String(ui.saveThrow).replace("+", "")) : saveThrow,
      weapon: (ui.weapons || [])[0] || regularWeapon,
      notes: ui.notes,
    });
  });

  const roster = {
    categoryId,
    categoryLabel: category?.label,
    enemyName: row.name,
    numbers: total,
    specialistCount,
    hasLieutenant,
    regularWeapon,
    specialistWeapon,
    panic: row.panic,
    speed: row.speed,
    combatSkill: row.combatSkill,
    toughness: row.toughness,
    ai: row.ai,
    saveThrow,
    rules: row.rules,
    invasionThreat: Boolean(row.invasionThreat),
    uniqueIndividuals,
    enemies,
  };

  ctx.setStateValue("encounter.enemyRoster", roster);
  ctx.setStateValue("encounter.enemyWasInvasionThreat", roster.invasionThreat ? "yes" : "no");

  if (rivalId && !isKnownRival) {
    const rivals = ctx.getStateValue("worldLog.rivals") || [];
    ctx.setStateValue(
      "worldLog.rivals",
      rivals.map((r) => (r.id === rivalId ? { ...r, enemyCategory: categoryId, enemyName: row.name } : r))
    );
  }

  const lines = [
    `**${row.name}** (${category?.label || categoryId})`,
    `Numbers: ${total}${specialistCount > 0 ? ` (${specialistCount} Specialist${specialistCount === 1 ? "" : "s"})` : ""}${hasLieutenant ? ", 1 Lieutenant" : ""}`,
    `Speed ${row.speed}" | Combat Skill ${row.combatSkill >= 0 ? "+" : ""}${row.combatSkill} | Toughness ${row.toughness} | AI: ${row.ai}${saveThrow ? ` | ${saveThrow}+ Saving Throw` : ""}`,
    `Panic range: ${(row.panic || []).join(", ") || "Fearless"}`,
    `Weapon: ${regularWeapon}${specialistWeapon ? ` | Specialist weapon: ${specialistWeapon}` : ""}`,
    roster.invasionThreat ? "⚠ Invasion Threat" : null,
    uniqueIndividuals.length > 0 ? `Accompanied by: ${uniqueIndividuals.map((u) => u.name).join(", ")}` : null,
    row.rules?.length ? `\nSpecial rules:\n${row.rules.map((r) => `• ${r}`).join("\n")}` : null,
  ].filter(Boolean);

  popup(ctx, { id: `${baseId}-result`, title: "Determine the Enemy", message: lines.join("\n") });
}

function objectiveDispatch(ctx, params) {
  const { baseId } = params;
  const objectiveId = ctx.getStateValue("postBattleTemp.objectiveRoll")?.value;
  const objective = OBJECTIVE_TYPES[objectiveId];

  ctx.setStateValue("encounter.objective", objectiveId);

  popup(ctx, {
    id: `${baseId}-result`,
    title: `Determine the Objective — ${objective?.label || objectiveId}`,
    message: objective?.text || "Objective determined.",
  });
}

export const GAME_DISPATCH_HANDLERS = {
  objectiveDispatch,
  enemyGenerationRollCategory,
  enemyGenerationRollSpecific,
  enemyGenerationFinalize,
  calcPatronSeek,
  resolveCrewTask,
  patronJobModifiers,
  missionPrepDispatch,
  worldRumors,
  queueTerrainRolls,
  maybeRunTerrainGenerator,
  branchBattleResolution,
  applyBattleFlowEvent,
  queueInitiativeActions,
  queueFirefight,
  startNoMinisRound1,
  resolveInitiativeAction,
  resolveInitiativeTest,
  showReactionResult,
  tabletopMoraleRoll,
  tabletopSeizeResult,
  tabletopStartRound1,
};
