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
import CrewMemberNameCommand from "./CrewMemberNameCommand";
import DecideTravelCommand from "./DecideTravelCommand";
import CharacterEventCommand from "./CharacterEventCommand";
import TabletopBattlePhaseCommand from "./TabletopBattlePhaseCommand";
import { ENEMY_CATEGORY_TABLES, UNIQUE_INDIVIDUALS_TABLE, rollOpponentDice, rollEnemyWeapon, rollEnemySpecialistWeapon } from "../data/tables/enemyTables";
import { buildEnemySubtable } from "./EnemyGenerationCommand";
import { OBJECTIVE_TYPES } from "../data/tables/objectiveTables";
import { rollDie, rollDice, getActiveCrewMembers, pickRandomElement } from "./postBattleHelpers";
import {
  isMeleeOnly,
  parseRangeInches,
  getCrewWeapons,
  pickBestRangedWeapon,
  pickBestMeleeWeapon,
  resolveToHit,
  resolveDamage,
  resolveBrawl,
  weaponBonusForBrawl,
  getWeaponDamage,
  weaponHasTrait,
} from "./combatResolution";
import { makeCampaignTableRoll } from "./WorldJobOffersCommand";
import { CAMPAIGN_TABLES, PATRON_BHC_THRESHOLDS } from "../data/tables/campaignTables";
import { SHIP_TABLE_DEFINITION } from "../data/tables/shipTables";

function popupCmd(ctx, { id, title, message, buttonText = "Continue" }) {
  return ctx.commandFactory.popupMessage({ id, title, message, buttonText, pauseAfter: false });
}

function popup(ctx, options) {
  ctx.pushCommandsToTop([popupCmd(ctx, options)]);
}

function num(ctx, path) {
  return Number(ctx.getStateValue(path) || 0);
}

function inc(ctx, path, amount) {
  ctx.setStateValue(path, num(ctx, path) + amount);
}

function pickCrewMember(state) {
  return pickRandomElement(getActiveCrewMembers(state));
}

function getSavvy(state, memberId) {
  return Number(state?.crewLog?.crewDetails?.[memberId]?.stats?.savvy || 0);
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

function getRemainingEnemies(state) {
  const roster = state?.encounter?.enemyRoster;
  const defeatedIds = state?.encounter?.combat?.defeatedEnemyIds || [];
  return (roster?.enemies || []).filter((e) => !defeatedIds.includes(e.id));
}

function getRemainingCrew(ctx) {
  const casualtyIds = ctx.getStateValue("encounter.combat.crewCasualtyIds") || [];
  return getActiveCrewMembers(ctx.state).filter((m) => !casualtyIds.includes(m.id));
}

function noMinisFirefightSetup(ctx, params) {
  const { baseId, roundNumber, modifier, blocksBrawling } = params;
  const state = ctx.state;
  const remaining = getRemainingEnemies(state);

  if (remaining.length === 0) {
    popup(ctx, { id: `${baseId}-no-enemies`, title: `Firefight — Round ${roundNumber}`, message: "No enemies remain to engage this Firefight." });
    return;
  }

  const baseActive = remaining.length >= 7 ? 4 : 3;
  const activeEnemies = Math.max(0, Math.min(remaining.length, baseActive + Number(modifier || 0)));
  const modNote = modifier ? ` (Battle Flow Event modifier: ${modifier > 0 ? "+" : ""}${modifier})` : "";
  const brawlNote = blocksBrawling ? "\n\n⚠ Battle Flow Event: No Brawling combat this round. Melee-only enemies will not attack." : "";

  const cmds = [
    ctx.commandFactory.popupMessage({
      id: `${baseId}-firefight-intro`,
      title: `Firefight — Round ${roundNumber}`,
      message: `${remaining.length} enem${remaining.length === 1 ? "y" : "ies"} remain → ${activeEnemies} will engage this Firefight phase${modNote}.${brawlNote}`,
      buttonText: "Begin Firefight",
      pauseAfter: false,
    }),
  ];

  for (let i = 1; i <= activeEnemies; i += 1) {
    cmds.push(
      ctx.commandFactory.postBattleDispatch({
        id: `${baseId}-engagement-${i}`,
        dispatchKey: "noMinisFirefightEngagement",
        params: { baseId, roundNumber, engagementIndex: i, totalActive: activeEnemies, blocksBrawling },
      })
    );
  }

  ctx.pushCommandsToTop(cmds);
}

function fireShot(ctx, { lines, attackerLabel, attackerCombatSkill, weaponName, targetNumber, targetToughness, targetSaveThrow, targetLuck }) {
  const toHit = resolveToHit({ combatSkill: attackerCombatSkill, targetNumber });
  lines.push(`${attackerLabel} fires (${weaponName}): rolled ${toHit.roll} + ${attackerCombatSkill} = ${toHit.total} vs ${targetNumber}+.`);

  if (!toHit.hit) {
    lines.push("Miss.");
    return null;
  }

  return resolveDamage({
    damage: getWeaponDamage(weaponName),
    toughness: targetToughness,
    saveThrow: targetSaveThrow,
    piercing: weaponHasTrait(weaponName, "Piercing"),
    luck: targetLuck,
  });
}

function reportDamage(lines, targetLabel, dmgResult, onCasualty) {
  lines.push(`Damage: rolled ${dmgResult.roll} + weapon = ${dmgResult.total}.`);
  if (!dmgResult.wouldBeCasualty) {
    lines.push(`${targetLabel} is Stunned but holds on.`);
  } else if (dmgResult.savedByArmor) {
    lines.push(`${targetLabel}'s armor saves them (Stunned).`);
  } else if (dmgResult.savedByLuck) {
    lines.push(`${targetLabel}'s Luck saves them! (-1 Luck, dives to safety)`);
    onCasualty("luckSaved");
  } else {
    lines.push(`${targetLabel} is taken out!`);
    onCasualty("casualty");
  }
}

function noMinisFirefightEngagement(ctx, params) {
  const { baseId, engagementIndex, totalActive, blocksBrawling } = params;
  const state = ctx.state;
  const remainingEnemies = getRemainingEnemies(state);
  const remainingCrew = getRemainingCrew(ctx);

  if (remainingEnemies.length === 0) {
    popup(ctx, { id: `${baseId}-eng-${engagementIndex}-none`, title: `Engagement ${engagementIndex} of ${totalActive}`, message: "No enemies remain." });
    return;
  }
  if (remainingCrew.length === 0) {
    popup(ctx, { id: `${baseId}-eng-${engagementIndex}-nocrew`, title: `Engagement ${engagementIndex} of ${totalActive}`, message: "No crew members remain to engage." });
    return;
  }

  const enemy = pickRandomElement(remainingEnemies);
  const crewMember = pickRandomElement(remainingCrew);
  const crewStats = state?.crewLog?.crewDetails?.[crewMember.id]?.stats || {};
  const crewWeapons = getCrewWeapons(state, crewMember.id);
  const crewRanged = pickBestRangedWeapon(crewWeapons);
  const crewMelee = pickBestMeleeWeapon(crewWeapons);
  const crewCombatSkill = crewStats.combatSkill ?? 0;
  const crewToughness = crewStats.toughness ?? 3;
  const crewLuck = Number(crewStats.luck || 0);

  const enemyMeleeOnly = isMeleeOnly(enemy.weapon);
  const crewHasRanged = Boolean(crewRanged);
  const lines = [`**${crewMember.name}** vs **${enemy.name}**`];

  let enemyDefeated = false;
  let crewCasualty = false;
  let crewLuckLost = false;

  const onEnemyResult = (outcome) => {
    if (outcome === "casualty") enemyDefeated = true;
  };
  const onCrewResult = (outcome) => {
    if (outcome === "casualty") crewCasualty = true;
    if (outcome === "luckSaved") crewLuckLost = true;
  };

  if (blocksBrawling && enemyMeleeOnly && !crewHasRanged) {
    lines.push(`${enemy.name} is melee-only and cannot attack this round (Battle Flow Event).`);
  } else if (!enemyMeleeOnly && crewHasRanged) {
    // Both ranged — longer range fires first; both stationary & in Cover, target 6+.
    const enemyFiresFirst = parseRangeInches(enemy.weapon) > parseRangeInches(crewRanged);
    const order = enemyFiresFirst ? ["enemy", "crew"] : ["crew", "enemy"];

    for (const side of order) {
      if (side === "enemy" && enemyDefeated) continue;
      if (side === "crew" && crewCasualty) continue;

      if (side === "enemy") {
        const dmg = fireShot(ctx, { lines, attackerLabel: enemy.name, attackerCombatSkill: enemy.combatSkill, weaponName: enemy.weapon, targetNumber: 6, targetToughness: crewToughness, targetSaveThrow: null, targetLuck: crewLuck });
        if (dmg) reportDamage(lines, crewMember.name, dmg, onCrewResult);
      } else {
        const dmg = fireShot(ctx, { lines, attackerLabel: crewMember.name, attackerCombatSkill: crewCombatSkill, weaponName: crewRanged, targetNumber: 6, targetToughness: enemy.toughness, targetSaveThrow: enemy.saveThrow, targetLuck: 0 });
        if (dmg) reportDamage(lines, enemy.name, dmg, onEnemyResult);
      }
    }
  } else if (enemyMeleeOnly || !crewHasRanged) {
    // One side is melee-only — the ranged side fires first at 5+ (6" range, target in Cover).
    if (crewHasRanged) {
      const dmg = fireShot(ctx, { lines, attackerLabel: `${crewMember.name} (defensive fire)`, attackerCombatSkill: crewCombatSkill, weaponName: crewRanged, targetNumber: 5, targetToughness: enemy.toughness, targetSaveThrow: enemy.saveThrow, targetLuck: 0 });
      if (dmg) reportDamage(lines, enemy.name, dmg, onEnemyResult);
    } else if (!enemyMeleeOnly) {
      const dmg = fireShot(ctx, { lines, attackerLabel: `${enemy.name} (defensive fire)`, attackerCombatSkill: enemy.combatSkill, weaponName: enemy.weapon, targetNumber: 5, targetToughness: crewToughness, targetSaveThrow: null, targetLuck: crewLuck });
      if (dmg) reportDamage(lines, crewMember.name, dmg, onCrewResult);
    }

    if (!enemyDefeated && !crewCasualty) {
      if (blocksBrawling) {
        lines.push("No Brawling combat this round (Battle Flow Event) — engagement ends.");
      } else {
        resolveBrawlExchange();
      }
    }
  } else if (blocksBrawling) {
    lines.push("Both sides are melee-only and Brawling is blocked this round (Battle Flow Event) — no engagement.");
  } else {
    resolveBrawlExchange();
  }

  function resolveBrawlExchange() {
    const meleeWeapon = crewMelee || crewRanged;
    const aBonus = weaponBonusForBrawl(meleeWeapon);
    const bBonus = weaponBonusForBrawl(enemy.weapon) + (enemy.extraWeapon ? 2 : 0);
    const brawl = resolveBrawl({ aCombatSkill: crewCombatSkill, aWeaponBonus: aBonus, bCombatSkill: enemy.combatSkill, bWeaponBonus: bBonus });
    lines.push(`Brawl: ${crewMember.name} rolled ${brawl.aRoll} (+${crewCombatSkill}+${aBonus}=${brawl.aTotal}) vs ${enemy.name} rolled ${brawl.bRoll} (+${enemy.combatSkill}+${bBonus}=${brawl.bTotal}).`);

    if (brawl.bHitsA) {
      const dmg = resolveDamage({ damage: getWeaponDamage(enemy.weapon) || (enemy.extraWeapon ? getWeaponDamage(enemy.extraWeapon) : 0), toughness: crewToughness, luck: crewLuck });
      lines.push(`${crewMember.name} takes a Hit.`);
      reportDamage(lines, crewMember.name, dmg, onCrewResult);
    }
    if (brawl.aHitsB && !enemyDefeated) {
      const dmg = resolveDamage({ damage: getWeaponDamage(meleeWeapon), toughness: enemy.toughness, saveThrow: enemy.saveThrow });
      lines.push(`${enemy.name} takes a Hit.`);
      reportDamage(lines, enemy.name, dmg, onEnemyResult);
    }
  }

  if (enemyDefeated) {
    ctx.setStateValue("encounter.combat.defeatedEnemyIds", [...(ctx.getStateValue("encounter.combat.defeatedEnemyIds") || []), enemy.id]);
  }
  if (crewCasualty) {
    ctx.setStateValue("encounter.combat.crewCasualtyIds", [...(ctx.getStateValue("encounter.combat.crewCasualtyIds") || []), crewMember.id]);
  }
  if (crewLuckLost) {
    ctx.setStateValue(`crewLog.crewDetails.${crewMember.id}.stats.luck`, Math.max(0, crewLuck - 1));
  }

  popup(ctx, { id: `${baseId}-eng-${engagementIndex}-result`, title: `Engagement ${engagementIndex} of ${totalActive}`, message: lines.join("\n") });
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
  const traitTitle = ctx.getStateValue("worldLog.currentWorld.trait")?.title;
  const traitBonus = traitTitle === "Opportunities" ? 1 : traitTitle === "Corporate state" ? 2 : 0;
  const total = roll + patronSeekers + existingPatrons + traitBonus;
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

export function nextCrewMemberNumber(crewMembers) {
  return crewMembers.reduce((max, m) => Math.max(max, Number(m.number) || 0), 0) + 1;
}

function recruitAddMember(ctx, params) {
  const { baseId } = params;
  const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];
  const nextNumber = nextCrewMemberNumber(crewMembers);

  ctx.pushCommandsToTop([
    new CrewMemberNameCommand({ id: `${baseId}-new-recruit-${nextNumber}`, crewMemberNumber: nextNumber, pauseAfter: false }),
  ]);
}

function recruitResolve(ctx, params) {
  const { baseId, memberId, memberName } = params;
  const roll = ctx.getStateValue(`worldPhase.recruitRolls.${memberId}`) ?? 0;
  const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];

  let recruiters = 0;
  for (const m of crewMembers) {
    if (ctx.getStateValue(`worldPhase.crewTasks.${m.id}`) === "recruit") recruiters++;
  }
  const traitTitle = ctx.getStateValue("worldLog.currentWorld.trait")?.title;
  const traitBonus = traitTitle === "Easy recruiting" ? 1 : 0;
  const bonus = Math.max(0, recruiters - 1) + traitBonus;
  const total = roll + bonus;
  const success = total >= 6;

  if (!success) {
    popup(ctx, {
      id: `${baseId}-recruit-result-${memberId}`,
      title: `${memberName}: Recruit — No Luck`,
      message: `Rolled ${roll}${bonus ? ` + ${bonus} (extra crew members Recruiting)` : ""} = ${total}. No new recruit this turn.`,
    });
    return;
  }

  const nextNumber = nextCrewMemberNumber(crewMembers);
  ctx.pushCommandsToTop([
    ctx.commandFactory.popupMessage({
      id: `${baseId}-recruit-result-${memberId}`,
      title: `${memberName}: Recruit — Success!`,
      message: `Rolled ${roll}${bonus ? ` + ${bonus} (extra crew members Recruiting)` : ""} = ${total}. A new recruit joins the crew!`,
      buttonText: "Add Recruit",
      pauseAfter: false,
    }),
    new CrewMemberNameCommand({ id: `${baseId}-new-recruit-${nextNumber}`, crewMemberNumber: nextNumber, pauseAfter: false }),
  ]);
}

function trackResolve(ctx, params) {
  const { baseId, memberId, memberName } = params;
  const roll = ctx.getStateValue(`worldPhase.trackRolls.${memberId}`) ?? 0;
  const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];

  let trackers = 0;
  for (const m of crewMembers) {
    if (ctx.getStateValue(`worldPhase.crewTasks.${m.id}`) === "track") trackers++;
  }
  const bonus = Math.max(0, trackers - 1);
  const total = roll + bonus;
  const success = total >= 6;
  const rivals = ctx.getStateValue("worldLog.rivals") || [];
  const rival = success ? pickRandomElement(rivals) : null;

  popup(ctx, {
    id: `${baseId}-track-result-${memberId}`,
    title: success ? `${memberName}: Track — Success!` : `${memberName}: Track — No Luck`,
    message: success
      ? `Rolled ${roll}${bonus ? ` + ${bonus} (extra trackers)` : ""} = ${total}. You locate ${rival?.name || "a Rival"} — choose Rival Encounter from Choose Your Battle to fight them this turn.`
      : `Rolled ${roll}${bonus ? ` + ${bonus} (extra trackers)` : ""} = ${total}. No Rival located this turn.`,
  });
}

export function findDamagedItem(state, crewMemberId) {
  const carried = state?.crewLog?.crewDetails?.[crewMemberId]?.equipment || [];
  const carriedIndex = carried.findIndex((item) => item?.damaged && !item?.destroyed);
  if (carriedIndex >= 0) {
    return { path: `crewLog.crewDetails.${crewMemberId}.equipment`, index: carriedIndex, item: carried[carriedIndex] };
  }

  const stash = state?.crewLog?.inventory || [];
  const stashIndex = stash.findIndex((item) => item?.damaged && !item?.destroyed);
  if (stashIndex >= 0) {
    return { path: "crewLog.inventory", index: stashIndex, item: stash[stashIndex] };
  }

  return null;
}

function repairKitResolve(ctx, params) {
  const { baseId, memberId, memberName, savvy } = params;
  const roll = ctx.getStateValue(`worldPhase.repairRolls.${memberId}`) ?? 0;
  const traitBonus = ctx.getStateValue("worldLog.currentWorld.trait")?.title === "Technical knowledge" ? 1 : 0;
  const total = roll + Number(savvy || 0) + traitBonus;
  const found = findDamagedItem(ctx.state, memberId);

  if (!found) {
    popup(ctx, {
      id: `${baseId}-repair-result-${memberId}`,
      title: `${memberName}: Repair Kit`,
      message: `Rolled ${roll} + Savvy ${savvy} = ${total}. No damaged items to repair.`,
    });
    return;
  }

  const list = ctx.getStateValue(found.path) || [];

  if (roll === 1) {
    ctx.setStateValue(found.path, list.filter((_, i) => i !== found.index));
    popup(ctx, {
      id: `${baseId}-repair-result-${memberId}`,
      title: `${memberName}: Repair Kit — Destroyed!`,
      message: `Rolled a natural 1 — ${found.item.name} is destroyed beyond repair and removed.`,
    });
    return;
  }

  if (total >= 6) {
    ctx.setStateValue(found.path, list.map((item, i) => (i === found.index ? { ...item, damaged: false } : item)));
    popup(ctx, {
      id: `${baseId}-repair-result-${memberId}`,
      title: `${memberName}: Repair Kit — Success!`,
      message: `Rolled ${roll} + Savvy ${savvy} = ${total}. ${found.item.name} is repaired.`,
    });
  } else {
    popup(ctx, {
      id: `${baseId}-repair-result-${memberId}`,
      title: `${memberName}: Repair Kit — Failed`,
      message: `Rolled ${roll} + Savvy ${savvy} = ${total}. ${found.item.name} remains damaged.`,
    });
  }
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

// ─── Ship destruction / Getting a New Ship (Rulebook p.60, p.62) ────────────

function checkShipWreckAndOffer(ctx, params) {
  const { baseId, seized } = params;
  const starship = ctx.getStateValue("crewLog.starship");
  const hullDamage = num(ctx, "crewLog.starship.hullDamage");
  const hullThreshold = num(ctx, "crewLog.starship.hullThreshold");
  const wrecked = !seized && starship && hullThreshold > 0 && hullDamage >= hullThreshold;

  const cmds = [];

  if (wrecked) {
    const crewCount = (ctx.getStateValue("crewLog.crewMembers") || []).length;
    const keepCount = crewCount * 2;
    const pool = collectAllItems(ctx.state);
    const loseCount = Math.max(0, pool.length - keepCount);
    const lostNames = loseRandomItems(ctx, loseCount);
    const credits = num(ctx, "crewLog.credits");

    ctx.setStateValue("crewLog.starship", null);
    ctx.setStateValue("crewLog.credits", 0);

    cmds.push(popupCmd(ctx, {
      id: `${baseId}-ship-wrecked`,
      title: "Ship Wrecked",
      message: `${starship.name || "Your ship"} has taken more Hull damage than it can withstand and is now a wreck.\n\nYou lose all ${credits} credits and are limited to a Stash of ${keepCount} items (2 per crew member).${lostNames.length > 0 ? `\nLost: ${lostNames.join(", ")}.` : ""}`,
    }));
  }

  if (!ctx.getStateValue("crewLog.starship")) {
    cmds.push(...newShipOfferCmds(ctx, { baseId }));
  }

  if (cmds.length > 0) ctx.pushCommandsToTop(cmds);
}

function newShipOfferCmds(ctx, params) {
  const { baseId } = params;
  const cost = rollDice(2, 6).total + 3;
  const priceInCredits = cost * 10;
  ctx.setStateValue("worldPhase.newShipOfferPrice", priceInCredits);

  return [
    ctx.commandFactory.choice({
      id: `${baseId}-new-ship-offer`,
      title: "Getting a New Ship",
      prompt: `You may look for a new vessel this campaign turn. A ship is available for ${priceInCredits} credits (you can finance up to 70 credits of the cost). Look for one, or pass?`,
      options: [
        { id: "look", label: "Look for a Ship", value: "look" },
        { id: "pass", label: "Pass", value: "pass" },
      ],
      saveTo: "worldPhase.newShipChoice",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: `${baseId}-new-ship-offer-result`, dispatchKey: "newShipOfferResult", params: { baseId } }),
  ];
}

function newShipOffer(ctx, params) {
  ctx.pushCommandsToTop(newShipOfferCmds(ctx, params));
}

function newShipOfferResult(ctx, params) {
  const { baseId } = params;
  if (ctx.getStateValue("worldPhase.newShipChoice") !== "look") return;

  ctx.pushCommandsToTop([
    ctx.commandFactory.tableRoll({
      id: `${baseId}-new-ship-roll`,
      title: "Ship on Offer",
      table: SHIP_TABLE_DEFINITION,
      saveTo: "worldPhase.newShipRoll",
      buttonText: "Select",
      rollButtonText: "Roll D100",
      afterSelectionCommands: [
        ctx.commandFactory.postBattleDispatch({ id: `${baseId}-new-ship-buy`, dispatchKey: "newShipBuyOffer", params: { baseId } }),
      ],
      pauseAfter: false,
    }),
  ]);
}

function newShipBuyOffer(ctx, params) {
  const { baseId } = params;
  const roll = ctx.getStateValue("worldPhase.newShipRoll");
  const price = num(ctx, "worldPhase.newShipOfferPrice");
  const credits = num(ctx, "crewLog.credits");
  const maxFinance = 70;
  const canAfford = credits + maxFinance >= price;

  if (!canAfford) {
    popup(ctx, { id: `${baseId}-new-ship-cant-afford`, title: "Getting a New Ship", message: `${roll?.label} costs ${price} credits. Even financing 70 credits, you can't afford it (you have ${credits}). You pass for now.` });
    return;
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: `${baseId}-new-ship-confirm`,
      title: `Buy ${roll?.label}?`,
      prompt: `${roll?.label} — ${roll?.description}\nPrice: ${price} credits. You have ${credits}. Buy this ship?`,
      options: [
        { id: "buy", label: "Buy This Ship", value: "buy" },
        { id: "pass", label: "Pass — Keep Looking Next Turn", value: "pass" },
      ],
      saveTo: "worldPhase.newShipConfirm",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: `${baseId}-new-ship-buy-apply`, dispatchKey: "newShipBuyApply", params: { baseId } }),
  ]);
}

function newShipBuyApply(ctx, params) {
  const { baseId } = params;
  if (ctx.getStateValue("worldPhase.newShipConfirm") !== "buy") return;

  const roll = ctx.getStateValue("worldPhase.newShipRoll");
  const price = num(ctx, "worldPhase.newShipOfferPrice");
  const credits = num(ctx, "crewLog.credits");
  const financed = Math.max(0, Math.min(70, price - credits));
  const paidNow = price - financed;

  ctx.setStateValue("crewLog.credits", credits - paidNow);
  ctx.setStateValue("crewLog.debt", financed);
  ctx.setStateValue("crewLog.ship", roll?.label);
  ctx.setStateValue("crewLog.starship", {
    id: "crew-starship",
    name: roll?.label,
    shipType: roll?.label,
    hasShip: true,
    hullDamage: 0,
    hullThreshold: Number(roll?.hull || 0),
    debtOwed: financed,
    financedAmount: financed,
    traits: roll?.traits || [],
    components: [],
    source: "Getting a New Ship",
    createdAt: new Date().toISOString(),
  });

  popup(ctx, {
    id: `${baseId}-new-ship-bought`,
    title: "New Ship Acquired",
    message: `Bought ${roll?.label} for ${price} credits (paid ${paidNow} now${financed > 0 ? `, financed ${financed}` : ""}).`,
  });
}

// ─── Travel cost (Rulebook p.71) ────────────────────────────────────────────

function hasShipComponentLocal(ctx, componentId) {
  const turnNumber = num(ctx, "campaign.turnNumber");
  const installed = ctx.getStateValue("crewLog.starship.components") || [];
  return installed.some((c) => c.componentId === componentId && Number(c.installedAtTurn) < turnNumber);
}

function emergencyTakeoffResolve(ctx, params) {
  const { baseId } = params;
  const choice = ctx.getStateValue("worldPhase.emergencyTakeoffChoice");

  if (choice !== "emergency") {
    ctx.pushCommandsToTop([
      ctx.commandFactory.updateState({
        id: `${baseId}-travel-blocked`,
        title: "Travel Blocked",
        operations: [{ op: "set", path: "campaign.travelOccurredThisTurn", value: false }],
        pauseAfter: false,
        visible: false,
      }),
      ctx.commandFactory.popupMessage({
        id: `${baseId}-travel-blocked-msg`,
        title: "Waiting for Repairs",
        message: "The crew stays on this world while the ship's Hull damage is repaired.",
        buttonText: "Continue",
        pauseAfter: false,
      }),
    ]);
    return;
  }

  const roll = rollDice(3, 6).total;
  ctx.setStateValue("crewLog.starship.hullDamage", num(ctx, "crewLog.starship.hullDamage") + roll);

  ctx.pushCommandsToTop([
    ctx.commandFactory.popupMessage({ id: `${baseId}-emergency-takeoff-result`, title: "Emergency Take-off", message: `The drive vents super-heated plasma throughout the vessel — rolled 3D6: ${roll} additional Hull Point damage.`, buttonText: "Continue", pauseAfter: false }),
    ctx.commandFactory.postBattleDispatch({ id: `${baseId}-travel-cost-retry`, dispatchKey: "chargeTravelCostAndProceed", params: { ...params, emergencyResolved: true } }),
  ]);
}

function chargeTravelCostAndProceed(ctx, params) {
  const { baseId, turnPrefix, turnNumber, selectedReturn, targetWorldId, arrivalLabel, emergencyResolved } = params;
  const hasShip = Boolean(ctx.getStateValue("crewLog.starship"));
  const hullDamage = num(ctx, "crewLog.starship.hullDamage");

  if (hasShip && hullDamage > 0 && !emergencyResolved) {
    ctx.pushCommandsToTop([
      ctx.commandFactory.choice({
        id: `${baseId}-emergency-takeoff-offer`,
        title: "Damaged Ship",
        prompt: `Your ship has ${hullDamage} Hull Point${hullDamage === 1 ? "" : "s"} of damage and cannot safely leave for another planet. Wait for repairs (stay this turn), or force an Emergency Take-off (your ship suffers 3D6 more Hull Points of damage)?`,
        options: [
          { id: "wait", label: "Wait for Repairs (stay this turn)", value: "wait" },
          { id: "emergency", label: "Emergency Take-off (3D6 Hull damage)", value: "emergency" },
        ],
        saveTo: "worldPhase.emergencyTakeoffChoice",
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      ctx.commandFactory.postBattleDispatch({ id: `${baseId}-emergency-takeoff-resolve`, dispatchKey: "emergencyTakeoffResolve", params }),
    ]);
    return;
  }

  const credits = num(ctx, "crewLog.credits");
  const crewCount = (ctx.getStateValue("crewLog.crewMembers") || []).length;
  const traitTitle = ctx.getStateValue("worldLog.currentWorld.trait")?.title;

  let cost;
  let costNote;
  if (!hasShip) {
    cost = crewCount;
    costNote = `Commercial passage: ${cost} credit${cost === 1 ? "" : "s"} (1 per crew member). No packages or cargo may be carried, and no Starship Travel Event is rolled.`;
  } else {
    cost = traitTitle === "Fuel refinery" ? 3 : 5;
    if (traitTitle === "Fuel shortage") {
      const extra = rollDie(3);
      cost += extra;
      costNote = `Fuel and departure costs: ${cost} credits (base ${traitTitle === "Fuel refinery" ? 3 : 5} + ${extra} Fuel Shortage).`;
    } else {
      costNote = `Fuel and departure costs: ${cost} credits.`;
    }
    if (hasShipComponentLocal(ctx, "converters")) {
      cost = Math.max(0, cost - 2);
      costNote += " (Converters reduce cost by 2.)";
    }
  }

  if (credits < cost) {
    ctx.pushCommandsToTop([
      ctx.commandFactory.updateState({
        id: `${baseId}-travel-blocked`,
        title: "Travel Blocked",
        operations: [{ op: "set", path: "campaign.travelOccurredThisTurn", value: false }],
        pauseAfter: false,
        visible: false,
      }),
      ctx.commandFactory.popupMessage({
        id: `${baseId}-travel-blocked-msg`,
        title: "Can't Afford to Travel",
        message: `Travel requires ${cost} credits, but you only have ${credits}. The crew stays on this world for now.`,
        buttonText: "Continue",
        pauseAfter: false,
      }),
    ]);
    return;
  }

  ctx.setStateValue("crewLog.credits", credits - cost);

  const arrivalCmds = selectedReturn
    ? [ctx.commandFactory.returnToVisitedWorld({ id: `${turnPrefix}-return-to-visited-world`, title: arrivalLabel, targetWorldId, turnNumber, pauseAfter: false, visible: false })]
    : [ctx.commandFactory.newWorldArrival({ id: `${turnPrefix}-new-world-arrival`, title: "Travel: New World Arrival", turnNumber, pauseAfter: false, visible: true })];

  const costPopup = ctx.commandFactory.popupMessage({ id: `${baseId}-cost-msg`, title: "Travel Costs", message: costNote, buttonText: "Continue", pauseAfter: false });

  if (!hasShip) {
    ctx.pushCommandsToTop([costPopup, ...arrivalCmds]);
    return;
  }

  ctx.pushCommandsToTop([
    costPopup,
    ctx.commandFactory.starshipTravelEventRoll({ id: `${turnPrefix}-starship-travel-event`, title: "Travel: Starship Travel Event", turnNumber, pauseAfter: false, visible: true }),
    ...arrivalCmds,
  ]);
}

// ─── New World Arrival Steps (Rulebook p.72-74) ─────────────────────────────

function normalizeWorldTraitsTable() {
  const table = CAMPAIGN_TABLES.worldTraits;
  return {
    id: table.id,
    title: table.label,
    dice: table.dice || "D100",
    sides: 100,
    entries: (table.rows || []).map((row) => ({ min: row.min, max: row.max, label: row.title, value: row.title, description: row.description })),
  };
}

function newWorldArrivalSteps(ctx, params) {
  const { baseId, isStartingCampaign } = params;
  const cmds = [];

  if (!isStartingCampaign) {
    const rivals = ctx.getStateValue("worldLog.rivals") || [];
    if (rivals.length > 0) {
      const kept = [];
      const lines = [];
      for (const rival of rivals) {
        const roll = rollDie(6);
        const follows = roll >= 5;
        if (follows) kept.push(rival);
        lines.push(`${rival.name}: rolled ${roll} — ${follows ? "follows you" : "stays behind"}.`);
      }
      ctx.setStateValue("worldLog.rivals", kept);
      cmds.push(popupCmd(ctx, { id: `${baseId}-check-rivals`, title: "Check for Rivals", message: lines.join("\n") }));
    }

    const patrons = ctx.getStateValue("worldLog.patrons") || [];
    const keptPatrons = patrons.filter((p) => p.persistent === true);
    if (patrons.length > 0) {
      ctx.setStateValue("worldLog.patrons", keptPatrons);
      const dismissedCount = patrons.length - keptPatrons.length;
      cmds.push(popupCmd(ctx, { id: `${baseId}-dismiss-patrons`, title: "Dismiss Patrons", message: dismissedCount > 0 ? `${dismissedCount} Patron${dismissedCount === 1 ? "" : "s"} dismissed (none were Persistent).` : "No Patrons to dismiss." }));
    }
  }

  const licenseRoll = rollDie(6);
  const requiresLicense = licenseRoll >= 5;

  if (!requiresLicense) {
    cmds.push(popupCmd(ctx, { id: `${baseId}-licensing`, title: "Check for Licensing Requirements", message: `Rolled ${licenseRoll} — no Freelancer License required on this world.` }));
    ctx.pushCommandsToTop([...cmds, worldTraitsRollCmd(ctx, baseId)]);
    return;
  }

  const costRoll = rollDie(6);
  ctx.setStateValue("worldLog.currentWorld.license", { required: true, cost: costRoll, purchased: false });
  cmds.push(
    popupCmd(ctx, { id: `${baseId}-licensing`, title: "Check for Licensing Requirements", message: `Rolled ${licenseRoll} — this world requires a Freelancer License to perform Patron jobs. Cost: ${costRoll} credits.` }),
    ctx.commandFactory.choice({
      id: `${baseId}-license-choice`,
      title: "Freelancer License",
      prompt: `Pay ${costRoll} credits for the License, attempt to forge one, or skip for now (no Patron jobs on this world until licensed)?`,
      options: [
        { id: "pay", label: `Pay ${costRoll} credits`, value: "pay" },
        { id: "forge", label: "Attempt to forge one (1D6+Savvy, 6+)", value: "forge" },
        { id: "skip", label: "Skip for now", value: "skip" },
      ],
      saveTo: "worldPhase.licenseChoice",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: `${baseId}-license-resolve`, dispatchKey: "licenseResolve", params: { baseId } })
  );
  ctx.pushCommandsToTop(cmds);
}

function worldTraitsRollCmd(ctx, baseId) {
  return ctx.commandFactory.tableRoll({
    id: `${baseId}-world-traits`,
    title: "World Traits",
    table: normalizeWorldTraitsTable(),
    saveTo: "postBattleTemp.worldTraitRoll",
    buttonText: "Apply",
    rollButtonText: "Roll D100",
    afterSelectionCommands: [
      ctx.commandFactory.postBattleDispatch({ id: `${baseId}-world-traits-apply`, dispatchKey: "worldTraitApply", params: { baseId } }),
    ],
    pauseAfter: false,
  });
}

function licenseResolve(ctx, params) {
  const { baseId } = params;
  const choice = ctx.getStateValue("worldPhase.licenseChoice");
  const license = ctx.getStateValue("worldLog.currentWorld.license") || {};

  if (choice === "pay") {
    const credits = num(ctx, "crewLog.credits");
    if (credits >= license.cost) {
      inc(ctx, "crewLog.credits", -license.cost);
      ctx.setStateValue("worldLog.currentWorld.license", { ...license, purchased: true });
      ctx.pushCommandsToTop([popupCmd(ctx, { id: `${baseId}-license-result`, title: "Freelancer License", message: `Paid ${license.cost} credits for the License.` }), worldTraitsRollCmd(ctx, baseId)]);
    } else {
      ctx.pushCommandsToTop([popupCmd(ctx, { id: `${baseId}-license-result`, title: "Freelancer License", message: `Can't afford ${license.cost} credits (you have ${credits}). Remaining unlicensed for now.` }), worldTraitsRollCmd(ctx, baseId)]);
    }
    return;
  }

  if (choice === "forge") {
    const member = pickCrewMember(ctx.state);
    if (!member) {
      ctx.pushCommandsToTop([popupCmd(ctx, { id: `${baseId}-license-result`, title: "Freelancer License", message: "No crew member available to attempt the forgery." }), worldTraitsRollCmd(ctx, baseId)]);
      return;
    }
    const savvy = getSavvy(ctx.state, member.id);
    const roll = rollDie(6);
    const total = roll + savvy;
    let message;
    if (roll === 1) {
      ctx.appendStateValue("worldLog.rivals", { id: `rival-${Date.now()}-${Math.floor(Math.random() * 1000000)}`, name: "Local Law Enforcement", type: "rival", source: "New World Arrival: Forged License", status: "active", notes: "", createdAt: new Date().toISOString() });
      message = `${member.name} rolled a natural 1 — local law enforcement takes a dim view of the attempt. You gain a Rival.`;
    } else if (total >= 6) {
      ctx.setStateValue("worldLog.currentWorld.license", { ...license, purchased: true, forged: true });
      message = `${member.name} rolled ${roll} + Savvy ${savvy} = ${total} — the forged License passes inspection, free of charge.`;
    } else {
      message = `${member.name} rolled ${roll} + Savvy ${savvy} = ${total} — not enough. Remaining unlicensed for now.`;
    }
    ctx.pushCommandsToTop([popupCmd(ctx, { id: `${baseId}-license-result`, title: "Freelancer License — Forgery Attempt", message }), worldTraitsRollCmd(ctx, baseId)]);
    return;
  }

  ctx.pushCommandsToTop([popupCmd(ctx, { id: `${baseId}-license-result`, title: "Freelancer License", message: "Skipped for now — you cannot perform Patron jobs on this world until licensed." }), worldTraitsRollCmd(ctx, baseId)]);
}

function worldTraitApply(ctx, params) {
  const { baseId } = params;
  const result = ctx.getStateValue("postBattleTemp.worldTraitRoll");
  const title = result?.label || result?.value;

  ctx.setStateValue("worldLog.currentWorld.trait", { title, description: result?.description || "" });

  if (title === "Invasion risk") ctx.setStateValue("worldLog.currentWorld.invasionRollModifier", 1);
  if (title === "Imminent invasion" || title === "Military outpost") ctx.setStateValue("worldLog.currentWorld.invasionRollModifier", 2);
  if (title === "Unity safe sector") ctx.setStateValue("worldLog.currentWorld.invasion", "immune");

  popup(ctx, { id: `${baseId}-world-trait-result`, title: `World Trait: ${title}`, message: result?.description || "" });
}

// ─── Flee Invasion ───────────────────────────────────────────────────────────

export function collectAllItems(state) {
  const items = [];
  const crewMembers = state?.crewLog?.crewMembers || [];
  for (const member of crewMembers) {
    const equipment = state?.crewLog?.crewDetails?.[member.id]?.equipment || [];
    equipment.forEach((item, index) => {
      items.push({ path: `crewLog.crewDetails.${member.id}.equipment`, index, name: item.name });
    });
  }
  const stash = state?.crewLog?.inventory || [];
  stash.forEach((item, index) => items.push({ path: "crewLog.inventory", index, name: item.name }));
  return items;
}

export function loseRandomItems(ctx, count) {
  const lostNames = [];
  for (let i = 0; i < count; i += 1) {
    const pool = collectAllItems(ctx.state);
    if (pool.length === 0) break;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const list = ctx.getStateValue(pick.path) || [];
    ctx.setStateValue(pick.path, list.filter((_, idx) => idx !== pick.index));
    lostNames.push(pick.name);
  }
  return lostNames;
}

function fleeInvasionResolve(ctx, params) {
  const { baseId, turnNumber } = params;
  const roll = ctx.getStateValue("worldPhase.fleeInvasionRoll") ?? 0;
  const success = roll >= 8;

  if (!success) {
    ctx.setStateValue("worldLog.currentWorld.invasion", "");
    ctx.pushCommandsToTop([
      ctx.commandFactory.popupMessage({
        id: `${baseId}-fail`,
        title: "Flee Invasion — Failed",
        message: `Rolled ${roll} — needed 8+. There's no time for anything but Assign Equipment before the fighting reaches you.\n\nYou must fight a mandatory Invasion Battle. If you survive, you still make it off-world — remember to pay the usual departure costs (5 credits, or evacuate and lose all credits plus 1D6 items) and that all local Rivals and Patrons are left behind.`,
        buttonText: "Assign Equipment",
        pauseAfter: false,
      }),
      ctx.commandFactory.popupMessage({
        id: `${baseId}-assign-equipment`,
        title: "Assign Equipment",
        message: "Review your Stash and assign weapons and gear to your crew before the battle.",
        buttonText: "Fight",
        pauseAfter: false,
      }),
      ctx.commandFactory.updateState({
        id: `${baseId}-force-invasion-mission`,
        title: "Force Invasion Battle",
        operations: [
          { op: "set", path: "encounter.missionType", value: "invasion" },
          { op: "set", path: "encounter.missionTypeLabel", value: "Invasion Battle" },
        ],
        pauseAfter: false,
        visible: false,
      }),
      new TabletopBattlePhaseCommand({ id: `${baseId}-invasion-battle`, turnNumber, pauseAfter: false }),
    ]);
    return;
  }

  const hasShip = Boolean(ctx.getStateValue("crewLog.starship"));
  const credits = Number(ctx.getStateValue("crewLog.credits") || 0);
  const rivals = ctx.getStateValue("worldLog.rivals") || [];
  const patrons = ctx.getStateValue("worldLog.patrons") || [];

  ctx.setStateValue("worldLog.currentWorld.invasion", "");

  const lines = [`Rolled ${roll} — you make it safely off-world!`];

  if (hasShip && credits >= 5) {
    ctx.setStateValue("crewLog.credits", credits - 5);
    lines.push("Paid 5 credits in fuel and departure costs.");
  } else {
    const lostNames = loseRandomItems(ctx, rollDice(1, 6).total);
    ctx.setStateValue("crewLog.credits", 0);
    lines.push(
      hasShip
        ? "Couldn't afford the 5-credit fuel cost — abandoned the ship and took evacuation passage."
        : "No ship — took evacuation passage."
    );
    if (credits > 0) lines.push(`Lost all ${credits} credits.`);
    lines.push(lostNames.length > 0 ? `Lost items: ${lostNames.join(", ")}.` : "No items available to lose.");
  }

  if (rivals.length > 0 || patrons.length > 0) {
    ctx.setStateValue("worldLog.rivals", []);
    ctx.setStateValue("worldLog.patrons", []);
    lines.push(`Left behind ${rivals.length} Rival${rivals.length === 1 ? "" : "s"} and ${patrons.length} Patron${patrons.length === 1 ? "" : "s"} on this world.`);
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.popupMessage({
      id: `${baseId}-escape-summary`,
      title: "Flee Invasion — Escaped!",
      message: lines.join("\n"),
      buttonText: "Continue",
      pauseAfter: false,
    }),
    ctx.commandFactory.choice({
      id: `${baseId}-character-event-offer`,
      title: "Optional Character Event",
      prompt: "You may roll up a Character Event for a crew member (optional).",
      options: [
        { id: "yes", label: "Yes — roll a Character Event", value: "yes" },
        { id: "no", label: "No — skip", value: "no" },
      ],
      saveTo: "worldPhase.fleeCharacterEventChoice",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({
      id: `${baseId}-character-event-dispatch`,
      dispatchKey: "fleeInvasionCharacterEventCheck",
      params: { baseId },
    }),
  ]);
}

function fleeInvasionCharacterEventCheck(ctx, params) {
  const { baseId } = params;
  const wantsEvent = ctx.getStateValue("worldPhase.fleeCharacterEventChoice") === "yes";
  const cmds = [];

  if (wantsEvent) {
    cmds.push(new CharacterEventCommand({ id: `${baseId}-flee-character-event` }));
  }

  cmds.push(
    new DecideTravelCommand({
      id: `${baseId}-decide-travel`,
      title: "Travel: Stay or Travel?",
      options: [
        {
          id: "newWorld",
          label: "Travel to a new world",
          value: "newWorld",
          description: "Roll a starship travel event, then create a new current world.",
        },
      ],
      pauseAfter: false,
      visible: true,
    })
  );

  ctx.pushCommandsToTop(cmds);
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
  const categoryId = ctx.getStateValue("postBattleTemp.enemyGen.category")?.value;

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
  recruitAddMember,
  recruitResolve,
  trackResolve,
  repairKitResolve,
  checkShipWreckAndOffer,
  newShipOffer,
  newShipOfferResult,
  newShipBuyOffer,
  newShipBuyApply,
  emergencyTakeoffResolve,
  chargeTravelCostAndProceed,
  newWorldArrivalSteps,
  licenseResolve,
  worldTraitApply,
  fleeInvasionResolve,
  fleeInvasionCharacterEventCheck,
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
  noMinisFirefightSetup,
  noMinisFirefightEngagement,
};
