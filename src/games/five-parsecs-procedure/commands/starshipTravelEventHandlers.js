// Mechanical resolution for the Starship Travel Events Table (5PFH Rulebook p.69-71).
// The table itself lives in data/tables/campaignTables.js (CAMPAIGN_TABLES.starshipTravelEvents)
// and is already rolled interactively by DecideTravelCommand -> ApplyStarshipTravelEventCommand,
// which dispatches here (keyed by each row's `value` slug) once the event is recorded.

import { CRIMINAL_ELEMENTS_TABLE, rollEnemyWeapon } from "../data/tables/enemyTables";
import { INJURY_TABLE, BOT_INJURY_TABLE } from "../data/tables/postBattleTables";
import {
  rollDie,
  rollDice,
  rollExpression,
  getActiveCrewMembers,
  pickRandomElement,
  pickRandomCarriedItem,
  isBotOrSoulless,
  isSpecies,
} from "./postBattleHelpers";
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
import CrewMemberNameCommand from "./CrewMemberNameCommand";
import { collectAllItems, loseRandomItems, nextCrewMemberNumber } from "./gameDispatchHandlers";

// pushCommandsToTop unshifts, so two SEPARATE calls run in reverse order — always
// batch a multi-step sequence into one array and call pushCommandsToTop once.
// popupCmd() builds a popup command object without pushing it, for exactly that.
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

function hasShipComponent(ctx, componentId) {
  const turnNumber = num(ctx, "campaign.turnNumber");
  const installed = ctx.getStateValue("crewLog.starship.components") || [];
  return installed.some((c) => c.componentId === componentId && Number(c.installedAtTurn) < turnNumber);
}

function damageShip(ctx, amount) {
  const reduction = hasShipComponent(ctx, "improvedShielding") ? 1 : 0;
  const finalAmount = Math.max(0, amount - reduction);
  inc(ctx, "crewLog.starship.hullDamage", finalAmount);
  return finalAmount;
}

function repairRandomDamagedItem(ctx) {
  const pool = collectAllItems(ctx.state).filter((entry) => {
    const list = ctx.getStateValue(entry.path) || [];
    return list[entry.index]?.damaged && !list[entry.index]?.destroyed;
  });
  if (pool.length === 0) return null;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const list = ctx.getStateValue(pick.path) || [];
  ctx.setStateValue(
    pick.path,
    list.map((item, idx) => (idx === pick.index ? { ...item, damaged: false } : item))
  );
  return pick.name;
}

function damageRandomCarriedItem(ctx, memberId) {
  const picked = pickRandomCarriedItem(ctx.state, memberId);
  if (!picked) return null;
  const equipment = [...(ctx.getStateValue(`crewLog.crewDetails.${memberId}.equipment`) || [])];
  equipment[picked.index] = { ...equipment[picked.index], damaged: true };
  ctx.setStateValue(`crewLog.crewDetails.${memberId}.equipment`, equipment);
  return picked.item?.name || "an item";
}

function rerollStarshipTravelEventCmd(ctx, baseId) {
  return ctx.commandFactory.starshipTravelEventRoll({ id: `${baseId}-reroll`, pauseAfter: false });
}

function rerollStarshipTravelEvent(ctx, baseId) {
  ctx.pushCommandsToTop([rerollStarshipTravelEventCmd(ctx, baseId)]);
}

function startGearLootChainCmd(ctx, { baseId, rollCount, damaged, title, singlePrefix, multiHeader }) {
  return ctx.commandFactory.postBattleDispatch({
    id: `${baseId}-gear-loot`,
    dispatchKey: "startLootChain",
    params: {
      chainId: `${baseId}-gear-loot-chain`,
      rollCount,
      startTableId: "gear",
      damaged,
      doneDispatchKey: "lootChainFinalize",
      doneParams: { title, singlePrefix, multiHeader },
    },
  });
}

function startGearLootChain(ctx, options) {
  ctx.pushCommandsToTop([startGearLootChainCmd(ctx, options)]);
}

function startFullLootRollCmd(ctx, { baseId, title, singlePrefix }) {
  return ctx.commandFactory.postBattleDispatch({
    id: `${baseId}-loot-roll`,
    dispatchKey: "startLootChain",
    params: {
      chainId: `${baseId}-loot-chain`,
      rollCount: 1,
      startTableId: "loot",
      doneDispatchKey: "lootChainFinalize",
      doneParams: { title, singlePrefix },
    },
  });
}

function startFullLootRoll(ctx, options) {
  ctx.pushCommandsToTop([startFullLootRollCmd(ctx, options)]);
}

// ─── 1-7: Asteroids ─────────────────────────────────────────────────────────

function asteroids(ctx, params) {
  const { baseId } = params;
  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: `${baseId}-choice`,
      title: "Asteroids",
      prompt:
        "Rocky debris everywhere, maybe from a recent collision. Chart a safe path around it, or push straight through the field?",
      options: [
        { id: "avoid", label: "Chart a safe path (1D6, need 5+)", value: "avoid" },
        { id: "through", label: "Go through the field (risk Hull damage)", value: "through" },
      ],
      saveTo: "worldPhase.asteroidsChoice",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({
      id: `${baseId}-resolve`,
      dispatchKey: "asteroidsResolve",
      params: { baseId },
    }),
  ]);
}

function asteroidsResolve(ctx, params) {
  const { baseId } = params;
  const choice = ctx.getStateValue("worldPhase.asteroidsChoice");
  const cmds = [];

  if (choice === "avoid") {
    const roll = rollDie(6);
    if (roll >= 5) {
      ctx.pushCommandsToTop([
        popupCmd(ctx, { id: `${baseId}-avoid-result`, title: "Asteroids — Safe Path", message: `Rolled ${roll} — you chart a safe path around the debris. Rolling again on the Starship Travel Events Table.` }),
        rerollStarshipTravelEventCmd(ctx, baseId),
      ]);
      return;
    }
    cmds.push(popupCmd(ctx, { id: `${baseId}-avoid-fail`, title: "Asteroids — No Safe Path", message: `Rolled ${roll} — no safe path found. You'll have to push through the field.` }));
  }

  const member = pickCrewMember(ctx.state);
  if (!member) {
    cmds.push(popupCmd(ctx, { id: `${baseId}-no-crew`, title: "Asteroids", message: "No crew available to navigate the field." }));
    ctx.pushCommandsToTop(cmds);
    return;
  }

  const savvy = getSavvy(ctx.state, member.id);
  const shielded = hasShipComponent(ctx, "improvedShielding");
  const lines = [`${member.name} navigates the field (1D6+${savvy}, need 4+ each attempt):`];
  let damage = 0;
  for (let i = 1; i <= 3; i += 1) {
    const roll = rollDie(6);
    const total = roll + savvy;
    const success = total >= 4;
    lines.push(`Attempt ${i}: rolled ${roll} + ${savvy} = ${total} — ${success ? "clear" : "hit! 1D6 Hull damage"}.`);
    if (!success) {
      const hullRoll = rollDie(6);
      const applied = damageShip(ctx, hullRoll);
      damage += applied;
      lines.push(`  Hull damage: ${hullRoll}${shielded ? ` (Improved Shielding reduces to ${applied})` : ""}.`);
    }
  }
  lines.push(damage > 0 ? `Total Hull damage taken: ${damage}.` : "The ship comes through unscathed.");

  cmds.push(popupCmd(ctx, { id: `${baseId}-through-result`, title: "Asteroids — Through the Field", message: lines.join("\n") }));
  ctx.pushCommandsToTop(cmds);
}

// ─── 8-12: Navigation trouble ───────────────────────────────────────────────

function navigationTrouble(ctx, params) {
  const { baseId } = params;
  const storyPoints = num(ctx, "worldLog.storyPoints");
  ctx.setStateValue("worldLog.storyPoints", Math.max(0, storyPoints - 1));

  const hasHullDamage = num(ctx, "crewLog.starship.hullDamage") > 0;

  if (!hasHullDamage) {
    ctx.pushCommandsToTop([
      popupCmd(ctx, { id: `${baseId}-msg`, title: "Navigation Trouble", message: "Lost 1 story point drifting through empty space. Rolling again on the Starship Travel Events Table." }),
      rerollStarshipTravelEventCmd(ctx, baseId),
    ]);
    return;
  }

  const member = pickCrewMember(ctx.state);
  const msgCmd = popupCmd(ctx, { id: `${baseId}-msg`, title: "Navigation Trouble", message: `Lost 1 story point drifting through empty space.\n\nThe ship's Hull damage causes life support malfunctions — ${member?.name || "a crew member"} must roll on the Injury Table, then you'll roll again on the Starship Travel Events Table.` });

  if (member) {
    const isBot = isBotOrSoulless(ctx.state?.crewLog?.crewDetails?.[member.id]) && String(ctx.state?.crewLog?.crewDetails?.[member.id]?.injuryTable || "").toLowerCase() === "bot";
    const table = isBot ? BOT_INJURY_TABLE : INJURY_TABLE;
    ctx.pushCommandsToTop([
      msgCmd,
      ctx.commandFactory.tableRoll({
        id: `${baseId}-injury-roll`,
        title: `${isBot ? "Bot Injury" : "Injury"} Table: ${member.name}`,
        table: {
          id: table.id,
          title: table.label,
          dice: table.dice || "D100",
          sides: 100,
          entries: (table.rows || []).map((row) => ({ min: row.min, max: row.max, label: row.title, value: row.title, description: row.description, resultType: row.resultType })),
        },
        saveTo: `postBattleTemp.injuryRolls.${member.id}`,
        buttonText: "Apply",
        rollButtonText: "Roll with App Dice",
        afterSelectionCommands: [
          ctx.commandFactory.postBattleDispatch({ id: `${baseId}-injury-dispatch`, dispatchKey: "injuryDispatch", params: { baseId, memberId: member.id, memberName: member.name, isBot } }),
          ctx.commandFactory.postBattleDispatch({ id: `${baseId}-reroll`, dispatchKey: "navigationTroubleReroll", params: { baseId } }),
        ],
        pauseAfter: false,
      }),
    ]);
  } else {
    ctx.pushCommandsToTop([msgCmd, rerollStarshipTravelEventCmd(ctx, baseId)]);
  }
}

function navigationTroubleReroll(ctx, params) {
  rerollStarshipTravelEvent(ctx, params.baseId);
}

// ─── 13-17: Raided ──────────────────────────────────────────────────────────

function raidEngagement(ctx, { crewMember, enemy, lines }) {
  const crewStats = ctx.state?.crewLog?.crewDetails?.[crewMember.id]?.stats || {};
  const crewWeapons = getCrewWeapons(ctx.state, crewMember.id);
  const crewRanged = pickBestRangedWeapon(crewWeapons);
  const crewMelee = pickBestMeleeWeapon(crewWeapons);
  const crewCombatSkill = crewStats.combatSkill ?? 0;
  const crewToughness = crewStats.toughness ?? 3;
  const crewLuck = Number(crewStats.luck || 0);
  const enemyMeleeOnly = isMeleeOnly(enemy.weapon);

  let enemyDefeated = false;
  let crewCasualty = false;
  let crewLuckLost = false;

  const onEnemyResult = (outcome) => { if (outcome === "casualty") enemyDefeated = true; };
  const onCrewResult = (outcome) => {
    if (outcome === "casualty") crewCasualty = true;
    if (outcome === "luckSaved") crewLuckLost = true;
  };

  function fireShot({ attackerLabel, attackerCombatSkill, weaponName, targetNumber, targetToughness, targetSaveThrow, targetLuck }) {
    const toHit = resolveToHit({ combatSkill: attackerCombatSkill, targetNumber });
    lines.push(`${attackerLabel} fires (${weaponName}): rolled ${toHit.roll} + ${attackerCombatSkill} = ${toHit.total} vs ${targetNumber}+.`);
    if (!toHit.hit) {
      lines.push("Miss.");
      return null;
    }
    return resolveDamage({ damage: getWeaponDamage(weaponName), toughness: targetToughness, saveThrow: targetSaveThrow, piercing: weaponHasTrait(weaponName, "Piercing"), luck: targetLuck });
  }

  function reportDamage(targetLabel, dmgResult, onCasualty) {
    lines.push(`Damage: rolled ${dmgResult.roll} + weapon = ${dmgResult.total}.`);
    if (!dmgResult.wouldBeCasualty) {
      lines.push(`${targetLabel} is Stunned but holds on.`);
    } else if (dmgResult.savedByArmor) {
      lines.push(`${targetLabel}'s armor saves them (Stunned).`);
    } else if (dmgResult.savedByLuck) {
      lines.push(`${targetLabel}'s Luck saves them!`);
      onCasualty("luckSaved");
    } else {
      lines.push(`${targetLabel} is taken out!`);
      onCasualty("casualty");
    }
  }

  function resolveBrawlExchange() {
    const meleeWeapon = crewMelee || crewRanged;
    const aBonus = weaponBonusForBrawl(meleeWeapon);
    const bBonus = weaponBonusForBrawl(enemy.weapon);
    const brawl = resolveBrawl({ aCombatSkill: crewCombatSkill, aWeaponBonus: aBonus, bCombatSkill: enemy.combatSkill, bWeaponBonus: bBonus });
    lines.push(`Brawl: ${crewMember.name} rolled ${brawl.aRoll} (+${crewCombatSkill}+${aBonus}=${brawl.aTotal}) vs ${enemy.name} rolled ${brawl.bRoll} (+${enemy.combatSkill}+${bBonus}=${brawl.bTotal}).`);
    if (brawl.bHitsA) {
      const dmg = resolveDamage({ damage: getWeaponDamage(enemy.weapon), toughness: crewToughness, luck: crewLuck });
      reportDamage(crewMember.name, dmg, onCrewResult);
    }
    if (brawl.aHitsB && !enemyDefeated) {
      const dmg = resolveDamage({ damage: getWeaponDamage(meleeWeapon), toughness: enemy.toughness, saveThrow: enemy.saveThrow });
      reportDamage(enemy.name, dmg, onEnemyResult);
    }
  }

  const crewHasRanged = Boolean(crewRanged);
  if (!enemyMeleeOnly && crewHasRanged) {
    const enemyFiresFirst = parseRangeInches(enemy.weapon) > parseRangeInches(crewRanged);
    const order = enemyFiresFirst ? ["enemy", "crew"] : ["crew", "enemy"];
    for (const side of order) {
      if (side === "enemy" && enemyDefeated) continue;
      if (side === "crew" && crewCasualty) continue;
      if (side === "enemy") {
        const dmg = fireShot({ attackerLabel: enemy.name, attackerCombatSkill: enemy.combatSkill, weaponName: enemy.weapon, targetNumber: 5, targetToughness: crewToughness, targetSaveThrow: null, targetLuck: crewLuck });
        if (dmg) reportDamage(crewMember.name, dmg, onCrewResult);
      } else {
        const dmg = fireShot({ attackerLabel: crewMember.name, attackerCombatSkill: crewCombatSkill, weaponName: crewRanged, targetNumber: 5, targetToughness: enemy.toughness, targetSaveThrow: enemy.saveThrow, targetLuck: 0 });
        if (dmg) reportDamage(enemy.name, dmg, onEnemyResult);
      }
    }
  } else {
    resolveBrawlExchange();
  }

  if (enemyDefeated) ctx.setStateValue("worldPhase.raidedBattle.defeatedEnemyIds", [...(ctx.getStateValue("worldPhase.raidedBattle.defeatedEnemyIds") || []), enemy.id]);
  if (crewCasualty) ctx.setStateValue("worldPhase.raidedBattle.crewCasualtyIds", [...(ctx.getStateValue("worldPhase.raidedBattle.crewCasualtyIds") || []), crewMember.id]);
  if (crewLuckLost) ctx.setStateValue(`crewLog.crewDetails.${crewMember.id}.stats.luck`, Math.max(0, crewLuck - 1));
}

function raided(ctx, params) {
  const { baseId } = params;
  const state = ctx.state;
  const member = pickCrewMember(state);

  if (!member) {
    popup(ctx, { id: `${baseId}-no-crew`, title: "Raided", message: "Pirates catch your ship's signature, but there's no one aboard to negotiate — you slip away unnoticed." });
    return;
  }

  const savvy = getSavvy(state, member.id);
  const roll = rollDie(6);
  const total = roll + savvy;
  const avoided = total >= 6;

  if (avoided) {
    popup(ctx, { id: `${baseId}-avoided`, title: "Raided — Avoided", message: `${member.name} talks the pirates down: rolled ${roll} + Savvy ${savvy} = ${total} (6+ needed). They lose interest and peel off.` });
    return;
  }

  const introCmd = popupCmd(ctx, { id: `${baseId}-intro`, title: "Raided", message: `${member.name} tries to talk the pirates down: rolled ${roll} + Savvy ${savvy} = ${total} — not enough. Pirates board for a fight in cramped quarters.` });

  const crewSize = Number(state?.campaign?.crewSize || 6);
  const diceCount = crewSize >= 6 ? 3 : crewSize === 5 ? 2 : 1;
  const rolls = Array.from({ length: diceCount }, () => rollDie(6));
  const picked = Math.max(...rolls);

  const catRoll = Math.ceil(Math.random() * 100);
  const row = CRIMINAL_ELEMENTS_TABLE.rows.find((r) => catRoll >= r.min && catRoll <= r.max) || CRIMINAL_ELEMENTS_TABLE.rows[0];
  const total_ = Math.max(1, picked + Number(row.numbers || 0) + 1);
  const weapon = row.weapon?.fixed || rollEnemyWeapon(row.weapon?.roll || 1);

  const enemies = Array.from({ length: total_ }, (_, i) => ({
    id: `raid-enemy-${i + 1}`,
    name: row.name,
    speed: row.speed,
    combatSkill: row.combatSkill,
    toughness: row.toughness,
    saveThrow: null,
    weapon,
  }));

  ctx.setStateValue("worldPhase.raidedBattle", { enemies, defeatedEnemyIds: [], crewCasualtyIds: [] });

  const lines = [`**${row.name}** (Criminal Elements) — rolled ${diceCount}D6 (${rolls.join(", ")}) pick highest = ${picked}, +${row.numbers || 0} (table) +1 (extra figure) = ${total_} opponents.`, `Weapon: ${weapon}`, ""];

  const MAX_EXCHANGES = 30;
  for (let i = 0; i < MAX_EXCHANGES; i += 1) {
    const remainingEnemies = enemies.filter((e) => !ctx.getStateValue("worldPhase.raidedBattle.defeatedEnemyIds").includes(e.id));
    const remainingCrew = getActiveCrewMembers(state).filter((m) => !ctx.getStateValue("worldPhase.raidedBattle.crewCasualtyIds").includes(m.id));
    if (remainingEnemies.length === 0 || remainingCrew.length === 0) break;

    const enemy = pickRandomElement(remainingEnemies);
    const crewMember = pickRandomElement(remainingCrew);
    lines.push(`--- ${crewMember.name} vs ${enemy.name} ---`);
    raidEngagement(ctx, { crewMember, enemy, lines });
  }

  const finalEnemiesLeft = enemies.length - (ctx.getStateValue("worldPhase.raidedBattle.defeatedEnemyIds") || []).length;
  const won = finalEnemiesLeft <= 0;

  if (won) {
    lines.push("", "The pirates flee back to their ship — you drive them off!");
    const easyMode = state?.campaign?.difficultyMode === "easy";
    let credit = rollDie(6);
    if (easyMode && credit <= 2) credit = 3;
    inc(ctx, "crewLog.credits", credit);
    lines.push(`Normal Opportunity-mission rewards: +${credit} credits.`);
  } else {
    const credits = num(ctx, "crewLog.credits");
    ctx.setStateValue("crewLog.credits", 0);
    ctx.setStateValue("crewLog.inventory", []);
    lines.push("", `Overwhelmed — you lose all ${credits} credits and everything in your Stash, though you keep the ship.`);
  }

  const resultCmd = popupCmd(ctx, { id: `${baseId}-battle-result`, title: won ? "Raided — Driven Off!" : "Raided — Overwhelmed", message: lines.join("\n") });

  const casualtyIds = ctx.getStateValue("worldPhase.raidedBattle.crewCasualtyIds") || [];
  const injuryCmds = casualtyIds.flatMap((memberId) => {
    const memberRecord = (state?.crewLog?.crewMembers || []).find((m) => m.id === memberId);
    if (!memberRecord) return [];
    const detail = state?.crewLog?.crewDetails?.[memberId] || {};
    const isBot = isBotOrSoulless(detail) && String(detail?.injuryTable || "").toLowerCase() === "bot";
    const table = isBot ? BOT_INJURY_TABLE : INJURY_TABLE;
    return [
      ctx.commandFactory.tableRoll({
        id: `${baseId}-injury-${memberId}`,
        title: `${isBot ? "Bot Injury" : "Injury"} Table: ${memberRecord.name}`,
        table: {
          id: table.id,
          title: table.label,
          dice: table.dice || "D100",
          sides: 100,
          entries: (table.rows || []).map((row) => ({ min: row.min, max: row.max, label: row.title, value: row.title, description: row.description, resultType: row.resultType })),
        },
        saveTo: `postBattleTemp.injuryRolls.${memberId}`,
        buttonText: "Apply",
        rollButtonText: "Roll with App Dice",
        afterSelectionCommands: [
          ctx.commandFactory.postBattleDispatch({ id: `${baseId}-injury-dispatch-${memberId}`, dispatchKey: "injuryDispatch", params: { baseId, memberId, memberName: memberRecord.name, isBot } }),
        ],
        pauseAfter: false,
      }),
    ];
  });

  ctx.pushCommandsToTop([
    introCmd,
    resultCmd,
    ...injuryCmds,
    ...(won ? [startFullLootRollCmd(ctx, { baseId: `${baseId}-bonus-loot`, title: "Raided — Bonus Loot Roll", singlePrefix: "Bonus item: " })] : []),
  ]);
}

// ─── 18-25: Deep space wreckage ─────────────────────────────────────────────

function deepSpaceWreckage(ctx, params) {
  const { baseId } = params;
  ctx.pushCommandsToTop([
    popupCmd(ctx, { id: `${baseId}-intro`, title: "Deep Space Wreckage", message: "You find an old wreck drifting through empty space. Scanning it, you get 2 rolls on the Gear Subtable — both items are damaged and need to be Repaired." }),
    startGearLootChainCmd(ctx, { baseId, rollCount: 2, damaged: true, title: "Deep Space Wreckage", multiHeader: "Salvaged (both damaged, need Repair):" }),
  ]);
}

// ─── 26-29: Drive trouble ───────────────────────────────────────────────────

function driveTrouble(ctx, params) {
  const { baseId } = params;
  const crew = getActiveCrewMembers(ctx.state).slice();
  const chosen = [];
  for (let i = 0; i < 3 && crew.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * crew.length);
    chosen.push(crew.splice(idx, 1)[0]);
  }

  const lines = ["It's not supposed to make that sound."];
  let failures = 0;
  for (const member of chosen) {
    const savvy = getSavvy(ctx.state, member.id);
    const roll = rollDie(6);
    const total = roll + savvy;
    const success = total >= 6;
    if (!success) failures += 1;
    lines.push(`${member.name}: rolled ${roll} + Savvy ${savvy} = ${total} — ${success ? "success" : "failure"}.`);
  }

  if (failures > 0) {
    ctx.setStateValue("campaign.pendingGroundedTurns", 1);
    lines.push(`${failures} failure${failures === 1 ? "" : "s"} — you'll be grounded on the next world for one campaign turn while the drive is reset.`);
  } else {
    lines.push("All checks passed — the drive holds together.");
  }

  popup(ctx, { id: `${baseId}-result`, title: "Drive Trouble", message: lines.join("\n") });
}

// ─── 30-38: Down-time ───────────────────────────────────────────────────────

function downTime(ctx, params) {
  const { baseId } = params;
  const member = pickCrewMember(ctx.state);
  const lines = ["It's a long time to just sit here."];

  if (member) {
    inc(ctx, `crewLog.crewDetails.${member.id}.xp`, 1);
    lines.push(`${member.name} earns +1 XP.`);
  }

  const repaired = repairRandomDamagedItem(ctx);
  lines.push(repaired ? `The crew has time for maintenance — ${repaired} is repaired (no roll required).` : "The crew has time for maintenance, but nothing needs repairing.");

  popup(ctx, { id: `${baseId}-result`, title: "Down-time", message: lines.join("\n") });
}

// ─── 39-44: Distress call ───────────────────────────────────────────────────

function distressCall(ctx, params) {
  const { baseId } = params;
  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: `${baseId}-choice`,
      title: "Distress Call",
      prompt: '"This is Licensed Trader Cyberwolf." Do you come to their aid?',
      options: [
        { id: "yes", label: "Come to their aid", value: "yes" },
        { id: "no", label: "Ignore the call", value: "no" },
      ],
      saveTo: "worldPhase.distressCallChoice",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: `${baseId}-resolve`, dispatchKey: "distressCallResolve", params: { baseId } }),
  ]);
}

function distressCallResolve(ctx, params) {
  const { baseId } = params;
  if (ctx.getStateValue("worldPhase.distressCallChoice") !== "yes") {
    popup(ctx, { id: `${baseId}-ignored`, title: "Distress Call", message: "You ignore the call and continue on your way." });
    return;
  }

  const roll = rollDie(6);
  if (roll === 1) {
    const dmg = rollExpression("1D6+1").total;
    damageShip(ctx, dmg);
    popup(ctx, { id: `${baseId}-result`, title: "Distress Call — Detonation", message: `Rolled ${roll}. The ship's drive must have detonated moments after you received the signal. Your ship is struck by debris, suffering ${dmg} Hull Point damage.` });
    return;
  }
  if (roll === 2) {
    popup(ctx, { id: `${baseId}-result`, title: "Distress Call — Wreckage", message: `Rolled ${roll}. You only find drifting wreckage.` });
    return;
  }
  if (roll === 3 || roll === 4) {
    const rescueIntroCmd = popupCmd(ctx, { id: `${baseId}-result`, title: "Distress Call — Rescue", message: `Rolled ${roll}. You find a survivor — treating this as the Escape Pod event.` });
    resolveEscapePodRescue(ctx, { baseId: `${baseId}-escape-pod`, leadingCmds: [rescueIntroCmd] });
    return;
  }

  const member = pickCrewMember(ctx.state);
  if (!member) {
    popup(ctx, { id: `${baseId}-result`, title: "Distress Call — No Crew", message: `Rolled ${roll}. You arrive in time to help, but have no crew member free to attempt the repair.` });
    return;
  }
  const savvy = getSavvy(ctx.state, member.id);
  const lines = [`Rolled ${roll}. You arrive in time to help save the ship from a drive malfunction. ${member.name} attempts the repair (1D6+Savvy, need 7+, up to 3 attempts):`];
  let success = false;
  for (let i = 1; i <= 3 && !success; i += 1) {
    const attemptRoll = rollDie(6);
    const total = attemptRoll + savvy;
    success = total >= 7;
    lines.push(`Attempt ${i}: rolled ${attemptRoll} + ${savvy} = ${total} — ${success ? "success!" : "failed"}.`);
  }

  if (success) {
    lines.push("The jubilant crew give you a bunch of stuff — 3 rolls on the Gear Subtable.");
    ctx.pushCommandsToTop([
      popupCmd(ctx, { id: `${baseId}-result`, title: "Distress Call — Saved the Ship", message: lines.join("\n") }),
      startGearLootChainCmd(ctx, { baseId: `${baseId}-gear`, rollCount: 3, damaged: false, title: "Distress Call — Reward", multiHeader: "The grateful crew gives you:" }),
    ]);
  } else {
    const dmg = rollExpression("1D6+1").total;
    damageShip(ctx, dmg);
    lines.push(`The drive detonates — your ship suffers ${dmg} Hull Point damage.`);
    popup(ctx, { id: `${baseId}-result`, title: "Distress Call — Failed", message: lines.join("\n") });
  }
}

// ─── 45-50: Patrol ship ─────────────────────────────────────────────────────

function patrolShip(ctx, params) {
  const { baseId } = params;
  const rollA = Math.max(0, rollDie(6) - 3);
  const rollB = Math.max(0, rollDie(6) - 3);
  const confiscateCount = rollA + rollB;

  const lines = ["A Unity patrol vessel hails you.", `Rolled 1D6-3 twice: ${rollA}, ${rollB} → ${confiscateCount} item${confiscateCount === 1 ? "" : "s"} confiscated as contraband.`];

  if (confiscateCount > 0) {
    const lost = loseRandomItems(ctx, confiscateCount);
    lines.push(lost.length > 0 ? `Confiscated: ${lost.join(", ")}.` : "You had nothing to confiscate.");
  }

  ctx.setStateValue("campaign.pendingInvasionImmunity", true);
  lines.push("Due to the military presence, the next world you visit cannot be Invaded.");

  popup(ctx, { id: `${baseId}-result`, title: "Patrol Ship", message: lines.join("\n") });
}

// ─── 51-53: Cosmic phenomenon ───────────────────────────────────────────────

function cosmicPhenomenon(ctx, params) {
  const { baseId } = params;

  if (ctx.getStateValue("campaign.cosmicPhenomenonUsed") === true) {
    popup(ctx, { id: `${baseId}-repeat`, title: "Cosmic Phenomenon", message: "A crew member sees a strange manifestation in space again — but this event can only ever happen once in a campaign. Nothing happens." });
    return;
  }

  ctx.setStateValue("campaign.cosmicPhenomenonUsed", true);
  const member = pickCrewMember(ctx.state);
  const lines = ["A crew member sees a strange manifestation in space. Nobody else saw anything, and the ship's computers confirm nothing was there."];

  if (member) {
    inc(ctx, `crewLog.crewDetails.${member.id}.stats.luck`, 1);
    lines.push(`${member.name} adds +1 Luck.`);
  }

  const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];
  const hasPrecursor = crewMembers.some((m) => isSpecies(ctx.state?.crewLog?.crewDetails?.[m.id], "Precursor"));
  if (hasPrecursor) {
    inc(ctx, "worldLog.storyPoints", 1);
    lines.push("Your Precursor crew member predicts it's a good omen — +1 story point.");
  }

  popup(ctx, { id: `${baseId}-result`, title: "Cosmic Phenomenon", message: lines.join("\n") });
}

// ─── 54-60: Escape pod ──────────────────────────────────────────────────────

function escapePod(ctx, params) {
  const { baseId } = params;
  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: `${baseId}-choice`,
      title: "Escape Pod",
      prompt: "You find an escape pod drifting through space. Do you rescue them?",
      options: [
        { id: "yes", label: "Rescue them", value: "yes" },
        { id: "no", label: "Leave them", value: "no" },
      ],
      saveTo: "worldPhase.escapePodChoice",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: `${baseId}-resolve`, dispatchKey: "escapePodResolve", params: { baseId } }),
  ]);
}

function escapePodResolve(ctx, params) {
  const { baseId } = params;
  if (ctx.getStateValue("worldPhase.escapePodChoice") !== "yes") {
    popup(ctx, { id: `${baseId}-ignored`, title: "Escape Pod", message: "You leave the pod drifting and continue on your way." });
    return;
  }
  resolveEscapePodRescue(ctx, { baseId });
}

function resolveEscapePodRescue(ctx, { baseId, leadingCmds = [] }) {
  const roll = rollDie(6);

  if (roll === 1) {
    ctx.pushCommandsToTop([
      ...leadingCmds,
      popupCmd(ctx, {
        id: `${baseId}-criminal-intro`,
        title: "Escape Pod — Wanted Criminal",
        message: `Rolled ${roll}. They're a wanted criminal. Turn them in for credits and a new Rival, or let them go for a possible future favor?`,
        buttonText: "Decide",
      }),
      ctx.commandFactory.choice({
        id: `${baseId}-criminal-choice`,
        title: "Wanted Criminal",
        prompt: "Turn them in, or let them go?",
        options: [
          { id: "turnIn", label: "Turn them in (1D6 credits, gain a Rival)", value: "turnIn" },
          { id: "letGo", label: "Let them go (chance to remove a future Rival)", value: "letGo" },
        ],
        saveTo: "worldPhase.escapePodCriminalChoice",
        buttonText: "Confirm",
        pauseAfter: false,
      }),
      ctx.commandFactory.postBattleDispatch({ id: `${baseId}-criminal-resolve`, dispatchKey: "escapePodCriminalResolve", params: { baseId } }),
    ]);
    return;
  }

  if (roll === 2 || roll === 3) {
    const credits = rollExpression("1D3").total;
    inc(ctx, "crewLog.credits", credits);
    ctx.pushCommandsToTop([
      ...leadingCmds,
      popupCmd(ctx, { id: `${baseId}-reward`, title: "Escape Pod — Grateful", message: `Rolled ${roll}. They reward you with ${credits} credits, plus a roll on the Loot Table.` }),
      startFullLootRollCmd(ctx, { baseId: `${baseId}-loot`, title: "Escape Pod — Reward", singlePrefix: "Also gained: " }),
    ]);
    return;
  }

  if (roll === 4) {
    inc(ctx, "worldLog.questRumors", 1);
    inc(ctx, "worldLog.storyPoints", 1);
    ctx.pushCommandsToTop([
      ...leadingCmds,
      popupCmd(ctx, { id: `${baseId}-info`, title: "Escape Pod — Interesting Information", message: `Rolled ${roll}. They have nothing to pay you with, but do have interesting information. +1 Quest Rumor, +1 story point.` }),
    ]);
    return;
  }

  const bonusXp = roll === 6 ? 10 : 0;
  const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];
  const nextNumber = nextCrewMemberNumber(crewMembers);
  ctx.pushCommandsToTop([
    ...leadingCmds,
    popupCmd(ctx, {
      id: `${baseId}-join`,
      title: "Escape Pod — New Recruit",
      message: `Rolled ${roll}. They are willing to join your crew${bonusXp ? ` with ${bonusXp} unspent XP` : ""}. Roll up their character now.`,
    }),
    new CrewMemberNameCommand({ id: `${baseId}-new-member-${nextNumber}`, crewMemberNumber: nextNumber, pauseAfter: false }),
    ...(bonusXp
      ? [
          ctx.commandFactory.updateState({
            id: `${baseId}-bonus-xp`,
            title: "Escape Pod: Bonus XP",
            operations: [{ op: "increment", path: `crewLog.crewDetails.crew-member-${nextNumber}.xp`, amount: bonusXp }],
            pauseAfter: false,
            visible: false,
          }),
        ]
      : []),
  ]);
}

function escapePodCriminalResolve(ctx, params) {
  const { baseId } = params;
  const choice = ctx.getStateValue("worldPhase.escapePodCriminalChoice");

  if (choice === "turnIn") {
    const credits = rollExpression("1D6").total;
    inc(ctx, "crewLog.credits", credits);
    ctx.appendStateValue("worldLog.rivals", { id: `rival-${Date.now()}-${Math.floor(Math.random() * 1000000)}`, name: "Their Old Gang", type: "rival", source: "Escape Pod: Wanted Criminal", status: "active", notes: "", createdAt: new Date().toISOString() });
    popup(ctx, { id: `${baseId}-turned-in`, title: "Turned In", message: `Claimed ${credits} credits — but their old gang now considers you a Rival.` });
    return;
  }

  ctx.setStateValue("worldPhase.pardonedCriminalPending", true);
  popup(ctx, { id: `${baseId}-let-go`, title: "Let Go", message: "They might do you a favor later. The next time you make a new Rival, roll 4+ on 1D6 to immediately remove them from the campaign." });
}

// ─── 61-66: Accident ────────────────────────────────────────────────────────

function accident(ctx, params) {
  const { baseId } = params;
  const member = pickCrewMember(ctx.state);
  if (!member) {
    popup(ctx, { id: `${baseId}-no-crew`, title: "Accident", message: "A routine maintenance task goes wrong, but no crew member is present to be hurt." });
    return;
  }

  const current = Number(ctx.getStateValue(`crewLog.crewDetails.${member.id}.sickBayTurnsRemaining`) || 0);
  ctx.setStateValue(`crewLog.crewDetails.${member.id}.sickBayTurnsRemaining`, Math.max(current, 1));
  const damagedName = damageRandomCarriedItem(ctx, member.id);

  popup(ctx, {
    id: `${baseId}-result`,
    title: "Accident",
    message: `${member.name} gets Injured during a routine maintenance task. They must rest up for one campaign turn to recover.${damagedName ? `\n${damagedName} is damaged.` : "\nThey carried nothing to damage."}`,
  });
}

// ─── 67-75: Travel-time ─────────────────────────────────────────────────────

function travelTime(ctx, params) {
  const { baseId } = params;
  popup(ctx, { id: `${baseId}-result`, title: "Travel-time", message: "Local conditions force you to jump to the very edge of the system and approach under standard drives. Any Injured crew rest for one campaign turn (already tracked via Sick Bay recovery)." });
}

// ─── 76-85: Uneventful trip ─────────────────────────────────────────────────

function uneventfulTrip(ctx, params) {
  const { baseId } = params;
  const repaired = repairRandomDamagedItem(ctx);
  popup(ctx, { id: `${baseId}-result`, title: "Uneventful Trip", message: `A lot of time playing cards and cleaning guns.${repaired ? ` You repair ${repaired}.` : " No damaged items needed repair."}` });
}

// ─── 86-91: Time to reflect ─────────────────────────────────────────────────

function timeToReflect(ctx, params) {
  const { baseId } = params;
  inc(ctx, "worldLog.storyPoints", 1);
  popup(ctx, { id: `${baseId}-result`, title: "Time to Reflect", message: "How is the story unfolding? What did it all mean? +1 story point." });
}

// ─── 92-95: Time to read a book ─────────────────────────────────────────────

function timeToReadABook(ctx, params) {
  const { baseId } = params;
  const roll = rollDie(6);
  const active = getActiveCrewMembers(ctx.state);
  const lines = [`Rolled ${roll}.`];

  if (active.length === 0) {
    popup(ctx, { id: `${baseId}-no-crew`, title: "Time to Read a Book", message: "There's time to read, but no crew is around to benefit." });
    return;
  }

  const shuffled = [...active].sort(() => Math.random() - 0.5);
  if (roll <= 2) {
    const m = shuffled[0];
    inc(ctx, `crewLog.crewDetails.${m.id}.xp`, 3);
    lines.push(`${m.name} earns +3 XP.`);
  } else if (roll <= 4) {
    const m1 = shuffled[0];
    inc(ctx, `crewLog.crewDetails.${m1.id}.xp`, 2);
    lines.push(`${m1.name} earns +2 XP.`);
    if (shuffled[1]) {
      inc(ctx, `crewLog.crewDetails.${shuffled[1].id}.xp`, 1);
      lines.push(`${shuffled[1].name} earns +1 XP.`);
    }
  } else {
    shuffled.slice(0, 3).forEach((m) => {
      inc(ctx, `crewLog.crewDetails.${m.id}.xp`, 1);
      lines.push(`${m.name} earns +1 XP.`);
    });
  }

  popup(ctx, { id: `${baseId}-result`, title: "Time to Read a Book", message: lines.join("\n") });
}

// ─── 96-100: Locked in the library data by night ────────────────────────────

function lockedInTheLibrary(ctx, params) {
  const { baseId } = params;
  popup(ctx, {
    id: `${baseId}-result`,
    title: "Locked in the Library Data by Night",
    message:
      "Pouring over old records and fragments of data, the captain unearths intriguing information about the sector ahead. (World Traits and Licensing generation aren't automated in this build, so this is flavor-only — name your next world as usual.)",
  });
}

// ─── Dispatch entry point ────────────────────────────────────────────────────

const HANDLERS_BY_VALUE = {
  asteroids,
  navigationTrouble,
  raided,
  deepSpaceWreckage,
  driveTrouble,
  downTime,
  distressCall,
  patrolShip,
  cosmicPhenomenon,
  escapePod,
  accident,
  travelTime,
  uneventfulTrip,
  timeToReflect,
  timeToReadABook,
  lockedInTheLibrary,
};

function starshipTravelEventResolve(ctx, params) {
  const { baseId, eventValue, eventTitle } = params;
  const handler = HANDLERS_BY_VALUE[eventValue];

  if (typeof handler !== "function") {
    popup(ctx, { id: `${baseId}-fallback`, title: `Starship Travel Event: ${eventTitle}`, message: "This event has been recorded in the campaign and world logs. Resolve any listed effects manually for now." });
    return;
  }

  handler(ctx, { baseId });
}

export const STARSHIP_TRAVEL_EVENT_HANDLERS = {
  starshipTravelEventResolve,
  asteroidsResolve,
  navigationTroubleReroll,
  distressCallResolve,
  escapePodResolve,
  escapePodCriminalResolve,
};
