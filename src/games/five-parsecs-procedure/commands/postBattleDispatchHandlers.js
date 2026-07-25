// Pure handler functions for PostBattleDispatchCommand, keyed by dispatchKey.
// Each handler receives (engineContext, params, commandId). `params` is plain,
// serializable data (survives the JSON round-trip this app does on every player
// interaction); handlers must not rely on closures over anything but `params`
// and must read everything else fresh from `engineContext.state`.

import { ABILITY_INCREASE_TABLE, ADVANCED_TRAINING_COURSES } from "../data/tables/postBattleTables";
import { CAMPAIGN_TABLES } from "../data/tables/campaignTables";
import { MOTIVATION_TABLE } from "../data/tables/motivationTables";
import { rollD100, findByRoll } from "../data/tables/tableUtils";
import { getLootTableById, resolveLootLeafItem } from "../data/tables/lootTables";
import { WEAPONS_TABLE, catalogItemToEquipment } from "../data/equipment/equipmentCatalog";
import {
  rollDie,
  rollDice,
  rollExpression,
  isObjectiveAchieved,
  isSpecies,
  isBotOrSoulless,
  getActiveCrewMembers,
  makeContactRecord,
  makeStashEquipmentRecord,
  pickRandomElement,
  pickRandomStashItem,
  pickRandomCarriedItem,
} from "./postBattleHelpers";

function makeEquipmentId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function normalizeLootTable(table) {
  return {
    id: table.id,
    title: table.label,
    dice: table.dice || "D100",
    sides: 100,
    entries: (table.rows || []).map((row) => ({
      min: row.min,
      max: row.max,
      label: row.title,
      value: row.title,
      description: row.description,
      resultType: row.resultType,
      quantity: row.quantity,
      itemName: row.itemName,
      amount: row.amount,
    })),
  };
}

function normalizeCampaignTable(table) {
  return {
    id: table.id,
    title: table.label,
    dice: table.dice || "D100",
    sides: table.dice === "D10" ? 10 : table.dice === "D6" ? 6 : 100,
    entries: (table.rows || []).map((row) => ({
      min: row.min,
      max: row.max,
      label: row.title,
      value: row.title,
      description: row.description,
    })),
  };
}

function popup(ctx, { id, title, message, buttonText = "Continue" }) {
  ctx.pushCommandsToTop([
    ctx.commandFactory.popupMessage({ id, title, message, buttonText, pauseAfter: false }),
  ]);
}

function num(ctx, path) {
  return Number(ctx.getStateValue(path) || 0);
}

function inc(ctx, path, amount) {
  ctx.setStateValue(path, num(ctx, path) + amount);
}

// ─── Battle Roster ──────────────────────────────────────────────────────────

function consolidateHeldField(ctx) {
  if (typeof ctx.getStateValue("encounter.heldField") !== "boolean") {
    const heldFieldChoice = ctx.getStateValue("battleRosterTemp.heldFieldChoice");
    ctx.setStateValue("encounter.heldField", heldFieldChoice === "yes");
  }
}

// ─── Resolve Rival Status ───────────────────────────────────────────────────

function resolveRivalRoll(ctx, params) {
  const state = ctx.state;
  const rivals = state?.worldLog?.rivals || [];
  const rivalId = rivals.length > 1 ? ctx.getStateValue("postBattleTemp.rivalStatus.rivalId") : rivals[0]?.id;
  const tracked = ctx.getStateValue("postBattleTemp.rivalStatus.tracked") === "yes";
  const uniqueKill = state?.encounter?.killedUniqueIndividual === "yes";
  const roll = rollDie(6);
  const modifier = (tracked ? 1 : 0) + (uniqueKill ? 1 : 0);
  const total = roll + modifier;
  const removed = total >= 4;
  const rival = rivals.find((r) => r.id === rivalId);

  if (removed && rival) {
    ctx.setStateValue("worldLog.rivals", rivals.filter((r) => r.id !== rivalId));
  }

  popup(ctx, {
    id: `${params.baseId}-result`,
    title: "Resolve Rival Status",
    message: `Rolled 1D6: ${roll} + ${modifier} modifier = ${total}.\n${
      removed
        ? `${rival?.name || "The Rival"} has had enough and is removed from your Rivals list.`
        : `${rival?.name || "The Rival"} remains on your Rivals list.`
    }`,
  });
}

function resolveRivalNewRoll(ctx, params) {
  const roll = rollDie(6);
  const becomesRival = roll === 1;
  const enemyLabel = ctx.state?.encounter?.missionTypeLabel || "Unknown Hostiles";
  const pardonPending = ctx.getStateValue("worldPhase.pardonedCriminalPending") === true;

  const lines = [`Rolled 1D6: ${roll}.`];

  if (becomesRival) {
    if (pardonPending) {
      ctx.setStateValue("worldPhase.pardonedCriminalPending", false);
      const pardonRoll = rollDie(6);
      if (pardonRoll >= 4) {
        lines.push(`These opponents (${enemyLabel}) hold a grudge — they'd become a Rival, but the criminal you pardoned calls in a favor (rolled ${pardonRoll}, 4+) and the grudge disappears.`);
      } else {
        ctx.appendStateValue("worldLog.rivals", makeContactRecord({ type: "rival", name: enemyLabel, source: "Post-Battle: Resolve Rival Status" }));
        lines.push(`These opponents (${enemyLabel}) hold a grudge — they are now a Rival. Your pardoned contact tried to help (rolled ${pardonRoll}, needed 4+) but couldn't stop it this time.`);
      }
    } else {
      ctx.appendStateValue("worldLog.rivals", makeContactRecord({ type: "rival", name: enemyLabel, source: "Post-Battle: Resolve Rival Status" }));
      lines.push(`These opponents (${enemyLabel}) hold a grudge — they are now a Rival.`);
    }
  } else {
    lines.push("They've had enough, or it was just business. No new Rival.");
  }

  popup(ctx, { id: `${params.baseId}-result`, title: "Resolve Rival Status", message: lines.join("\n") });
}

// ─── Resolve Patron Status ──────────────────────────────────────────────────

function resolvePatronDispatch(ctx, params) {
  const state = ctx.state;
  const patronJobs = state?.worldPhase?.patronJobs || {};
  const jobEntries = Object.entries(patronJobs);
  const jobIndex = jobEntries.length > 1 ? ctx.getStateValue("postBattleTemp.patronStatus.jobIndex") : jobEntries[0]?.[0];
  const job = jobIndex !== undefined ? patronJobs[jobIndex] : null;
  const patronName = job?.patronType?.title || job?.patronType?.label || "New Patron";
  const isOneTime = job?.condition?.title === "One-time Contract";

  if (!isOneTime) {
    ctx.appendStateValue("worldLog.patrons", makeContactRecord({ type: "patron", name: patronName, source: "Post-Battle: Resolve Patron Status" }));
  }

  popup(ctx, {
    id: `${params.baseId}-result`,
    title: "Resolve Patron Status",
    message: isOneTime
      ? `${patronName} was a One-time Contract and cannot be retained as a contact.`
      : `${patronName} has been added to your list of contacts on this planet.`,
  });
}

// ─── Get Paid ───────────────────────────────────────────────────────────────

function parseLeadingCredits(label) {
  const match = String(label || "").match(/\+?(\d+)/);
  return match ? Number(match[1]) : 0;
}

function getPaidDispatch(ctx, params) {
  const state = ctx.state;
  const won = isObjectiveAchieved(state);
  const isPatronMission = state?.encounter?.missionType === "patron";
  const isRivalMission = state?.encounter?.missionType === "rival";
  const questWasFinale = state?.encounter?.questWasFinale === true;
  const easyMode = state?.campaign?.difficultyMode === "easy";

  const patronJobs = state?.worldPhase?.patronJobs || {};
  const jobEntries = Object.entries(patronJobs);
  const jobIndex = jobEntries.length > 0 ? (jobEntries.length > 1 ? ctx.getStateValue("postBattleTemp.patronStatus.jobIndex") : jobEntries[0][0]) : null;
  const job = jobIndex !== null && jobIndex !== undefined ? patronJobs[jobIndex] : null;
  const dangerPayLabel = job?.dangerPay?.title || "";
  const dangerPayCredits = parseLeadingCredits(dangerPayLabel);
  const dangerPayBetterRoll = /better mission pay roll/i.test(dangerPayLabel);

  const rollTwiceTakeHigher = questWasFinale || dangerPayBetterRoll;
  const rollA = rollDie(6);
  const rollB = rollTwiceTakeHigher ? rollDie(6) : null;
  let baseRoll = rollTwiceTakeHigher ? Math.max(rollA, rollB) : rollA;

  let adjustedForWin = false;
  if (won && !isRivalMission && baseRoll <= 2) {
    baseRoll = 3;
    adjustedForWin = true;
  }

  let total = baseRoll;
  if (questWasFinale) total += 1;
  if (easyMode) total += 1;
  if (isPatronMission) total += dangerPayCredits;

  inc(ctx, "crewLog.credits", total);

  const rollText = rollTwiceTakeHigher
    ? `Rolled 1D6 twice: ${rollA}, ${rollB} → took ${Math.max(rollA, rollB)}${adjustedForWin ? " (raised to 3 for winning)" : ""}`
    : `Rolled 1D6: ${rollA}${adjustedForWin ? " (raised to 3 for winning)" : ""}`;
  const modifierLines = [
    questWasFinale ? "• +1 for completing the Quest finale" : null,
    easyMode ? "• +1 for Easy mode" : null,
    isPatronMission && dangerPayCredits ? `• +${dangerPayCredits} Danger Pay (${dangerPayLabel})` : null,
  ].filter(Boolean);

  popup(ctx, {
    id: `${params.baseId}-result`,
    title: "Get Paid",
    message: `${rollText}.\n${modifierLines.join("\n")}${modifierLines.length ? "\n" : ""}Total earned: ${total} credit${total === 1 ? "" : "s"}.`,
  });
}

// ─── Loot rolling (shared chain: Battlefield Finds consumable, Gather the Loot, Campaign/Character Event gifts) ──

function advanceLootChain(ctx, chainId) {
  const chain = ctx.getStateValue(`postBattleTemp.lootChain.${chainId}`);
  if (!chain) return;
  const pendingDrills = chain.pendingDrills || [];

  if (pendingDrills.length === 0) {
    const handler = POST_BATTLE_DISPATCH_HANDLERS[chain.doneDispatchKey];
    if (typeof handler === "function") {
      handler(ctx, { ...chain.doneParams, items: chain.collected || [] });
    }
    return;
  }

  const [nextDrill, ...rest] = pendingDrills;
  ctx.setStateValue(`postBattleTemp.lootChain.${chainId}.pendingDrills`, rest);

  const table = getLootTableById(nextDrill.tableId);
  if (!table) {
    advanceLootChain(ctx, chainId);
    return;
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.tableRoll({
      id: makeEquipmentId(`loot-roll-${chainId}`),
      title: table.label,
      table: normalizeLootTable(table),
      saveTo: `postBattleTemp.lootChain.${chainId}.currentRoll`,
      buttonText: "Claim",
      rollButtonText: "Roll with App Dice",
      afterSelectionCommands: [
        ctx.commandFactory.postBattleDispatch({
          id: makeEquipmentId(`loot-drill-${chainId}`),
          dispatchKey: "lootDrillStep",
          params: { chainId, damaged: nextDrill.damaged },
        }),
      ],
      pauseAfter: false,
    }),
  ]);
}

function applyLootReward(ctx, row) {
  switch (row.resultType) {
    case "reward:rumors":
      inc(ctx, "worldLog.rumors", Number(row.amount) || 0);
      return row.description || row.label;
    case "reward:credits": {
      const { total } = rollExpression(row.amount);
      inc(ctx, "crewLog.credits", total);
      return `${row.label}: +${total} credits.`;
    }
    case "reward:creditsHigherOf2D6": {
      const a = rollDie(6);
      const b = rollDie(6);
      const higher = Math.max(a, b);
      inc(ctx, "crewLog.credits", higher);
      return `${row.label}: rolled 2D6 (${a}, ${b}) → ${higher} credits.`;
    }
    case "reward:shipDiscount": {
      const { total } = rollExpression(row.amount);
      ctx.appendStateValue("crewLog.shipComponentDiscounts", { amount: total, source: `Loot: ${row.label}` });
      return `${row.label}: ${total} credits discount toward your next Starship Component purchase.`;
    }
    case "reward:storyPoints":
      inc(ctx, "worldLog.storyPoints", Number(row.amount) || 0);
      return row.description || row.label;
    default:
      return row.description || row.label;
  }
}

function lootDrillStep(ctx, params) {
  const { chainId, damaged } = params;
  const row = ctx.getStateValue(`postBattleTemp.lootChain.${chainId}.currentRoll`);
  const resultType = row?.resultType;
  const chain = ctx.getStateValue(`postBattleTemp.lootChain.${chainId}`) || {};

  if (String(resultType || "").startsWith("nextTable:")) {
    const nextTableId = resultType.split(":")[1];
    ctx.setStateValue(`postBattleTemp.lootChain.${chainId}.pendingDrills`, [{ tableId: nextTableId, damaged }, ...(chain.pendingDrills || [])]);
    advanceLootChain(ctx, chainId);
    return;
  }

  if (String(resultType || "").startsWith("doubleDamagedTable:")) {
    const nextTableId = resultType.split(":")[1];
    ctx.setStateValue(`postBattleTemp.lootChain.${chainId}.pendingDrills`, [
      { tableId: nextTableId, damaged: true },
      { tableId: nextTableId, damaged: true },
      ...(chain.pendingDrills || []),
    ]);
    advanceLootChain(ctx, chainId);
    return;
  }

  let message;
  if (String(resultType || "").startsWith("reward:")) {
    message = applyLootReward(ctx, row);
  } else {
    const record = resolveLootLeafItem({ row: { ...row, title: row?.itemName || row?.label }, damaged });
    if (record) {
      ctx.appendStateValue("crewLog.inventory", record);
      message = `${record.name}${damaged ? " (Damaged — needs Repair)" : ""}`;
    } else {
      message = row?.label || "Nothing of value.";
    }
  }

  ctx.setStateValue(`postBattleTemp.lootChain.${chainId}.collected`, [...(chain.collected || []), message]);
  advanceLootChain(ctx, chainId);
}

function startLootChain(ctx, params) {
  const { chainId, rollCount = 1, doneDispatchKey, doneParams = {}, startTableId = "loot", damaged = false } = params;
  ctx.setStateValue(`postBattleTemp.lootChain.${chainId}`, {
    pendingDrills: Array.from({ length: Math.max(1, rollCount) }, () => ({ tableId: startTableId, damaged })),
    collected: [],
    doneDispatchKey,
    doneParams,
  });
  advanceLootChain(ctx, chainId);
}

function lootChainFinalize(ctx, params) {
  const items = params.items || [];
  const message =
    params.singlePrefix && items.length <= 1
      ? `${params.singlePrefix}${items[0] || "nothing of note"}`
      : `${params.multiHeader || "You gained:"}\n${items.map((i) => `• ${i}`).join("\n")}`;

  popup(ctx, {
    id: makeEquipmentId("loot-finalize"),
    title: params.title || "Gather the Loot",
    message,
  });
}

// ─── Battlefield Finds ──────────────────────────────────────────────────────

function battlefieldFindsDispatch(ctx, params) {
  const st = ctx.state;
  const result = st?.postBattleTemp?.battlefieldFinds;
  const resultType = result?.resultType;
  const isInvasionThreat = st?.encounter?.enemyWasInvasionThreat === "yes";
  let message = result?.description || "";

  if (resultType === "weapon") {
    const weapon = pickRandomElement(WEAPONS_TABLE);
    if (weapon) {
      ctx.appendStateValue("crewLog.inventory", {
        equipmentId: makeEquipmentId("equipment"),
        name: weapon.name,
        category: "weapon",
        locationType: "stash",
        crewMemberId: "",
        damaged: false,
        destroyed: false,
        weapon: { range: weapon.range, shots: weapon.shots, damage: weapon.damage, traits: [...(weapon.traits || [])], mods: [], sight: "" },
        notes: "Battlefield Find",
        createdAt: new Date().toISOString(),
      });
      message = `You claim a slain enemy's weapon: ${weapon.name}.`;
    }
    popup(ctx, { id: `${params.baseId}-result`, title: "Battlefield Finds", message });
    return;
  }

  if (resultType === "consumable") {
    // Restrict this chain to just the Consumables Subtable, not the full Loot Table.
    const chainId = `battlefield-${params.baseId}`;
    ctx.setStateValue(`postBattleTemp.lootChain.${chainId}`, {
      pendingDrills: [{ tableId: "consumables", damaged: false }],
      collected: [],
      doneDispatchKey: "lootChainFinalize",
      doneParams: { title: "Battlefield Finds", singlePrefix: "You find usable goods: " },
    });
    advanceLootChain(ctx, chainId);
    return;
  }

  if (resultType === "questRumorOrInvasionEvidence" || resultType === "vitalInfoOrInvasionEvidence") {
    if (isInvasionThreat) {
      inc(ctx, "crewLog.credits", 1);
      inc(ctx, "encounter.invasionRollBonus", 1);
      message = "You find Invasion Evidence: +1 credit, and +1 when checking for Invasion next.";
    } else if (resultType === "questRumorOrInvasionEvidence") {
      inc(ctx, "worldLog.questRumors", 1);
      message = "A curious data stick yields a Quest Rumor.";
    } else {
      ctx.appendStateValue("worldLog.patrons", makeContactRecord({ type: "patron", name: "Corporate Patron", source: "Post-Battle: Battlefield Finds" }));
      message = "Vital info nets you a Corporate Patron on this world, automatically.";
    }
  } else if (resultType === "shipPartCredit") {
    ctx.appendStateValue("crewLog.shipComponentDiscounts", { amount: 2, source: "Battlefield Find: Starship Part" });
    message = "A salvaged starship part is worth 2 credits toward your next Starship Component purchase.";
  } else if (resultType === "personalTrinket") {
    ctx.appendStateValue(
      "crewLog.inventory",
      makeStashEquipmentRecord({ name: "Personal Trinket", effect: "On a future planet visit, roll 2D6 — on a 9+ you find the owner and receive a Loot roll as payment.", category: "gear" })
    );
    message = "A personal trinket, added to your Stash (owner check on future worlds is not automated — track manually).";
  } else if (resultType === "debris") {
    const credits = rollDie(3);
    inc(ctx, "crewLog.credits", credits);
    message = `Debris worth ${credits} credit${credits === 1 ? "" : "s"} on the scrap market.`;
  } else {
    message = "Nothing of value.";
  }

  popup(ctx, { id: `${params.baseId}-result`, title: "Battlefield Finds", message });
}

// ─── Determine Injuries and Recovery ────────────────────────────────────────

function injuryDispatch(ctx, params) {
  const { baseId, memberId, memberName, isBot } = params;
  const row = ctx.getStateValue(`postBattleTemp.injuryRolls.${memberId}`);
  const resultType = row?.resultType;
  const luck = num(ctx, `crewLog.crewDetails.${memberId}.stats.luck`);
  let message = `${memberName}: ${row?.label} — ${row?.description || ""}`;

  if (resultType === "dead") {
    if (luck > 0) {
      ctx.setStateValue(`crewLog.crewDetails.${memberId}.stats.luck`, 0);
      message = `${memberName}: ${row?.label}. Luck saves them! They lose all Luck but miraculously survive.`;
    } else {
      ctx.setStateValue(`crewLog.crewDetails.${memberId}.removedFromCrew`, true);
      const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];
      ctx.setStateValue("crewLog.crewMembers", crewMembers.filter((m) => m.id !== memberId));
      const equipment = ctx.getStateValue(`crewLog.crewDetails.${memberId}.equipment`) || [];
      if (equipment.length > 0) {
        ctx.setStateValue(`crewLog.crewDetails.${memberId}.equipment`, equipment.map((e) => ({ ...e, damaged: true })));
      }
      message = `${memberName}: ${row?.label}. They are ${isBot ? "destroyed" : "dead"}, and all carried equipment is damaged.`;
    }
  } else if (resultType === "miraculousEscape") {
    inc(ctx, `crewLog.crewDetails.${memberId}.stats.luck`, 1);
    ctx.setStateValue(`crewLog.crewDetails.${memberId}.equipment`, []);
    message = `${memberName}: Miraculous Escape! +1 Luck, but all carried items are permanently lost.`;
  } else if (resultType === "equipmentDamaged") {
    const picked = pickRandomCarriedItem(ctx.state, memberId);
    if (picked) {
      const equipment = [...(ctx.getStateValue(`crewLog.crewDetails.${memberId}.equipment`) || [])];
      equipment[picked.index] = { ...equipment[picked.index], damaged: true };
      ctx.setStateValue(`crewLog.crewDetails.${memberId}.equipment`, equipment);
      message = `${memberName}: Equipment loss — ${picked.item?.name || "an item"} is damaged.`;
    } else {
      message = `${memberName}: Equipment loss — but they carried nothing to damage.`;
    }
  } else if (resultType === "cripplingWound") {
    const speed = num(ctx, `crewLog.crewDetails.${memberId}.stats.speed`);
    const toughness = num(ctx, `crewLog.crewDetails.${memberId}.stats.toughness`);
    const surgeryCost = rollExpression("1D6").total;
    const credits = num(ctx, "crewLog.credits");
    const canAffordSurgery = credits >= surgeryCost;
    const recoveryTurns = rollExpression(row?.recoveryTurns).total;

    ctx.setStateValue(`crewLog.crewDetails.${memberId}.sickBayTurnsRemaining`, recoveryTurns);

    if (canAffordSurgery) {
      inc(ctx, "crewLog.credits", -surgeryCost);
      message = `${memberName}: Crippling Wound — paid ${surgeryCost} credits for immediate surgery, avoiding permanent injury. ${recoveryTurns} turn(s) in Sick Bay.`;
    } else {
      const statPath = speed >= toughness ? "speed" : "toughness";
      inc(ctx, `crewLog.crewDetails.${memberId}.stats.${statPath}`, -1);
      message = `${memberName}: Crippling Wound — could not afford ${surgeryCost} credits for surgery. Permanent -1 ${statPath}. ${recoveryTurns} turn(s) in Sick Bay.`;
    }
  } else if (resultType === "noLongTermEffect") {
    const recoveryTurns = rollExpression(row?.recoveryTurns).total;
    if (recoveryTurns > 0) {
      ctx.setStateValue(`crewLog.crewDetails.${memberId}.sickBayTurnsRemaining`, recoveryTurns);
    }
    message = `${memberName}: ${row?.label}. ${recoveryTurns > 0 ? `${recoveryTurns} turn(s) in Sick Bay.` : "No time in Sick Bay needed."}`;
  } else if (resultType === "earnXp") {
    inc(ctx, `crewLog.crewDetails.${memberId}.xp`, 1);
    message = `${memberName}: School of Hard Knocks — earns +1 XP.`;
  }

  popup(ctx, { id: `${baseId}-result-${memberId}`, title: "Determine Injuries and Recovery", message });
}

// ─── Experience and Character Upgrades ──────────────────────────────────────

function getEffectiveMax(detail, entry) {
  if (entry.ability === "luck") {
    return isSpecies(detail, "Human") ? entry.maxHuman : entry.max;
  }
  if (entry.ability === "toughness" && isSpecies(detail, "Engineer")) {
    return Math.min(entry.max, 4);
  }
  return entry.max;
}

function uniqueKillXpDispatch(ctx) {
  const memberId = ctx.getStateValue("postBattleTemp.uniqueKillCreditMemberId");
  if (memberId) {
    inc(ctx, `crewLog.crewDetails.${memberId}.xp`, 1);
  }
}

function upgradeOffer(ctx) {
  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("upgrade-offer"),
      title: "Character Upgrade",
      prompt: "Spend XP (or, for Bots, credits) on a Character Upgrade for a crew member?",
      options: [
        { id: "yes", label: "Yes — Purchase an Upgrade", value: "yes" },
        { id: "no", label: "No — Done with Upgrades", value: "no" },
      ],
      saveTo: "postBattleTemp.upgradeOffer",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("upgrade-offer-result"), dispatchKey: "upgradeOfferResult" }),
  ]);
}

function eligibleUpgradeEntries(state, detail) {
  const isBot = isSpecies(detail, "Bot");
  const currency = isBot ? Number(state?.crewLog?.credits || 0) : Number(detail.xp || 0);
  return ABILITY_INCREASE_TABLE.filter((entry) => {
    const currentValue = Number(detail?.stats?.[entry.ability] || 0);
    const alreadyBotUpgraded = isBot && (detail.botUpgradedAbilities || []).includes(entry.ability);
    return currency >= entry.xpCost && currentValue < getEffectiveMax(detail, entry) && !alreadyBotUpgraded;
  });
}

function upgradeOfferResult(ctx) {
  if (ctx.getStateValue("postBattleTemp.upgradeOffer") !== "yes") {
    return;
  }

  const state = ctx.state;
  const crewMembers = getActiveCrewMembers(state);
  const eligible = crewMembers.filter((m) => {
    const detail = state?.crewLog?.crewDetails?.[m.id] || {};
    return eligibleUpgradeEntries(state, detail).length > 0;
  });

  if (eligible.length === 0) {
    popup(ctx, { id: makeEquipmentId("upgrade-none"), title: "Character Upgrade", message: "No crew member currently has enough XP/credits (or room to grow) for an upgrade.", buttonText: "OK" });
    return;
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("upgrade-pick-member"),
      title: "Character Upgrade: Choose Crew Member",
      prompt: "Which crew member is training?",
      options: eligible.map((m) => ({ id: m.id, label: m.name, value: m.id })),
      saveTo: "postBattleTemp.upgradePick.memberId",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("upgrade-pick-ability-dispatch"), dispatchKey: "upgradePickAbility" }),
  ]);
}

function upgradePickAbility(ctx) {
  const memberId = ctx.getStateValue("postBattleTemp.upgradePick.memberId");
  const detail = ctx.state?.crewLog?.crewDetails?.[memberId] || {};
  const isBot = isSpecies(detail, "Bot");
  const affordable = eligibleUpgradeEntries(ctx.state, detail);

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("upgrade-pick-ability"),
      title: `Character Upgrade: ${detail.name || "Crew Member"}`,
      prompt: `Choose an ability to increase by +1 (${isBot ? "paid in credits" : "paid in XP"}).`,
      options: affordable.map((entry) => ({
        id: entry.ability,
        label: `${entry.label} (+1, cost ${entry.xpCost})`,
        value: entry.ability,
        description: `Current: ${detail?.stats?.[entry.ability] ?? 0}. Max: ${entry.maxLabel}.`,
      })),
      saveTo: "postBattleTemp.upgradePick.ability",
      buttonText: "Purchase",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("upgrade-apply-dispatch"), dispatchKey: "upgradeApply" }),
  ]);
}

function upgradeApply(ctx) {
  const memberId = ctx.getStateValue("postBattleTemp.upgradePick.memberId");
  const ability = ctx.getStateValue("postBattleTemp.upgradePick.ability");
  const detail = ctx.state?.crewLog?.crewDetails?.[memberId] || {};
  const isBot = isSpecies(detail, "Bot");
  const entry = ABILITY_INCREASE_TABLE.find((e) => e.ability === ability);

  if (!entry) {
    upgradeOffer(ctx);
    return;
  }

  inc(ctx, `crewLog.crewDetails.${memberId}.stats.${ability}`, 1);

  if (isBot) {
    inc(ctx, "crewLog.credits", -entry.xpCost);
    ctx.appendStateValue(`crewLog.crewDetails.${memberId}.botUpgradedAbilities`, ability);
  } else {
    inc(ctx, `crewLog.crewDetails.${memberId}.xp`, -entry.xpCost);
  }

  popup(ctx, {
    id: makeEquipmentId("upgrade-result"),
    title: "Character Upgrade",
    message: `${detail.name || "Crew member"}'s ${entry.label} increases by +1 (paid ${entry.xpCost} ${isBot ? "credits" : "XP"}).`,
  });

  upgradeOffer(ctx);
}

// ─── Invest in Advanced Training ────────────────────────────────────────────

function advancedTrainingOffer(ctx) {
  if (ctx.getStateValue("postBattleTemp.advancedTraining.offer") !== "yes") {
    return;
  }

  const eligible = getActiveCrewMembers(ctx.state).filter((m) => !ctx.state?.crewLog?.crewDetails?.[m.id]?.advancedTraining);

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("advanced-training-pick-member"),
      title: "Advanced Training: Choose Crew Member",
      prompt: "Who is applying for Advanced Training?",
      options: eligible.map((m) => ({ id: m.id, label: m.name, value: m.id })),
      saveTo: "postBattleTemp.advancedTraining.memberId",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("advanced-training-approval"), dispatchKey: "advancedTrainingApproval" }),
  ]);
}

function advancedTrainingApproval(ctx) {
  const memberId = ctx.getStateValue("postBattleTemp.advancedTraining.memberId");
  const member = getActiveCrewMembers(ctx.state).find((m) => m.id === memberId);
  const roll = rollDice(2, 6);
  const approved = roll.total >= 4;

  inc(ctx, "crewLog.credits", -1);

  if (!approved) {
    popup(ctx, {
      id: makeEquipmentId("advanced-training-rejected"),
      title: "Advanced Training",
      message: `Rolled 2D6: ${roll.rolls.join(" + ")} = ${roll.total}. Below 4 — ${member?.name || "the applicant"} was not approved this time. The 1 credit fee is spent; you can try again next campaign turn.`,
    });
    return;
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("advanced-training-pick-course"),
      title: `Advanced Training: ${member?.name || "Crew Member"}`,
      prompt: `Approved! Rolled 2D6: ${roll.rolls.join(" + ")} = ${roll.total}. Choose a course.`,
      options: ADVANCED_TRAINING_COURSES.map((course) => ({
        id: course.id,
        label: `${course.label} (cost ${course.cost})`,
        value: course.id,
        description: course.effect,
      })),
      saveTo: "postBattleTemp.advancedTraining.courseId",
      buttonText: "Enroll",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("advanced-training-course"), dispatchKey: "advancedTrainingCourse" }),
  ]);
}

function advancedTrainingCourse(ctx) {
  const memberId = ctx.getStateValue("postBattleTemp.advancedTraining.memberId");
  const member = getActiveCrewMembers(ctx.state).find((m) => m.id === memberId);
  const courseId = ctx.getStateValue("postBattleTemp.advancedTraining.courseId");
  const course = ADVANCED_TRAINING_COURSES.find((c) => c.id === courseId);
  const availableXp = num(ctx, `crewLog.crewDetails.${memberId}.xp`);
  const availableCredits = num(ctx, "crewLog.credits");
  const xpUsed = Math.min(availableXp, course.cost);
  const creditsUsed = course.cost - xpUsed;

  if (creditsUsed > availableCredits) {
    popup(ctx, {
      id: makeEquipmentId("advanced-training-cant-afford"),
      title: "Advanced Training",
      message: `${member?.name || "This crew member"} doesn't have enough XP + credits (needs ${course.cost}, has ${availableXp} XP + ${availableCredits} credits) to pay for ${course.label}. Training is not obtained this turn.`,
    });
    return;
  }

  inc(ctx, `crewLog.crewDetails.${memberId}.xp`, -xpUsed);
  inc(ctx, "crewLog.credits", -creditsUsed);
  ctx.setStateValue(`crewLog.crewDetails.${memberId}.advancedTraining`, course.label);

  popup(ctx, {
    id: makeEquipmentId("advanced-training-course-result"),
    title: "Advanced Training",
    message: `${member?.name || "The crew member"} enrolls in ${course.label} (paid ${xpUsed} XP + ${creditsUsed} credits). They may use it starting next campaign turn.\n\n${course.effect}`,
  });
}

// ─── Purchase Items ──────────────────────────────────────────────────────────

const DIRECT_WEAPON_NAMES = ["Hand gun", "Blade", "Colony rifle", "Shotgun"];
const ROLL_TABLE_OPTIONS = [
  { id: "militaryWeapon", label: "Military Weapon Table (3 credits)" },
  { id: "gear", label: "Gear Table (3 credits)" },
  { id: "gadget", label: "Gadget Table (3 credits)" },
];

function purchaseSellOffer(ctx) {
  const inventory = ctx.getStateValue("crewLog.inventory") || [];
  const sellable = inventory.filter((item) => !item.damaged && !item.destroyed);
  const soldCount = num(ctx, "postBattleTemp.purchaseItems.soldCount");

  if (soldCount >= 3 || sellable.length === 0) {
    popup(ctx, { id: makeEquipmentId("purchase-done"), title: "Purchase Items", message: "Done purchasing items for this campaign turn." });
    return;
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("sell-offer"),
      title: "Sell an Item?",
      prompt: `Sell an un-damaged item for 1 credit? (${soldCount}/3 sold this turn)`,
      options: [
        { id: "yes", label: "Yes — Sell an Item", value: "yes" },
        { id: "no", label: "No — Done Selling", value: "no" },
      ],
      saveTo: "postBattleTemp.purchaseItems.sellOffer",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("sell-offer-result"), dispatchKey: "purchaseSellOfferResult" }),
  ]);
}

function purchaseSellOfferResult(ctx) {
  if (ctx.getStateValue("postBattleTemp.purchaseItems.sellOffer") !== "yes") {
    popup(ctx, { id: makeEquipmentId("purchase-done"), title: "Purchase Items", message: "Done purchasing items for this campaign turn." });
    return;
  }

  const inventory = ctx.getStateValue("crewLog.inventory") || [];
  const sellable = inventory.filter((item) => !item.damaged && !item.destroyed);

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("sell-pick-item"),
      title: "Sell Which Item?",
      prompt: "Select an item to sell for 1 credit.",
      options: sellable.map((item, index) => ({ id: String(index), label: item.name, value: String(index) })),
      saveTo: "postBattleTemp.purchaseItems.sellItemIndex",
      buttonText: "Sell",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("sell-apply"), dispatchKey: "purchaseSellApply" }),
  ]);
}

function purchaseSellApply(ctx) {
  const inventory = ctx.getStateValue("crewLog.inventory") || [];
  const sellable = inventory.filter((item) => !item.damaged && !item.destroyed);
  const index = Number(ctx.getStateValue("postBattleTemp.purchaseItems.sellItemIndex"));
  const item = sellable[index];

  ctx.setStateValue("crewLog.inventory", inventory.filter((i) => i !== item));
  inc(ctx, "crewLog.credits", 1);
  inc(ctx, "postBattleTemp.purchaseItems.soldCount", 1);

  popup(ctx, { id: makeEquipmentId("sell-result"), title: "Sell an Item", message: `Sold ${item?.name || "the item"} for 1 credit.` });

  purchaseSellOffer(ctx);
}

function purchaseDirectOffer(ctx) {
  const credits = num(ctx, "crewLog.credits");

  if (credits < 1) {
    purchaseSellOffer(ctx);
    return;
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("direct-offer"),
      title: "Buy a Basic Weapon?",
      prompt: "Buy a Hand Gun, Blade, Colony Rifle, or Shotgun for 1 credit?",
      options: [
        { id: "yes", label: "Yes — Buy One", value: "yes" },
        { id: "no", label: "No — Done", value: "no" },
      ],
      saveTo: "postBattleTemp.purchaseItems.directOffer",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("direct-offer-result"), dispatchKey: "purchaseDirectOfferResult" }),
  ]);
}

function purchaseDirectOfferResult(ctx) {
  if (ctx.getStateValue("postBattleTemp.purchaseItems.directOffer") !== "yes") {
    purchaseSellOffer(ctx);
    return;
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("direct-pick-weapon"),
      title: "Buy a Basic Weapon",
      prompt: "Choose a weapon (1 credit).",
      options: DIRECT_WEAPON_NAMES.map((name) => ({ id: name, label: name, value: name })),
      saveTo: "postBattleTemp.purchaseItems.directWeapon",
      buttonText: "Buy",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("direct-buy-apply"), dispatchKey: "purchaseDirectBuyApply" }),
  ]);
}

function purchaseDirectBuyApply(ctx) {
  const name = ctx.getStateValue("postBattleTemp.purchaseItems.directWeapon");
  const catalogItem = WEAPONS_TABLE.find((w) => w.name.toLowerCase() === String(name || "").toLowerCase());
  const record = catalogItem
    ? catalogItemToEquipment({ catalogId: "weapons", item: catalogItem, roomId: "", crewId: "", playerId: "", makeId: makeEquipmentId, nowIso: () => new Date().toISOString() })
    : null;

  inc(ctx, "crewLog.credits", -1);
  if (record) ctx.appendStateValue("crewLog.inventory", record);

  popup(ctx, { id: makeEquipmentId("direct-buy-result"), title: "Buy a Basic Weapon", message: `Bought a ${name} for 1 credit.` });

  purchaseDirectOffer(ctx);
}

function purchaseRollOffer(ctx) {
  const credits = num(ctx, "crewLog.credits");

  if (credits < 3) {
    purchaseDirectOffer(ctx);
    return;
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("roll-offer"),
      title: "Buy an Equipment Roll?",
      prompt: "Pay 3 credits for a roll on the Military Weapon, Gear, or Gadget table?",
      options: [
        { id: "yes", label: "Yes — Buy a Roll", value: "yes" },
        { id: "no", label: "No — Done", value: "no" },
      ],
      saveTo: "postBattleTemp.purchaseItems.rollOffer",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("roll-offer-result"), dispatchKey: "purchaseRollOfferResult" }),
  ]);
}

function purchaseRollOfferResult(ctx) {
  if (ctx.getStateValue("postBattleTemp.purchaseItems.rollOffer") !== "yes") {
    purchaseDirectOffer(ctx);
    return;
  }

  ctx.pushCommandsToTop([
    ctx.commandFactory.choice({
      id: makeEquipmentId("roll-pick-table"),
      title: "Buy an Equipment Roll",
      prompt: "Which table? (3 credits)",
      options: ROLL_TABLE_OPTIONS.map((o) => ({ id: o.id, label: o.label, value: o.id })),
      saveTo: "postBattleTemp.purchaseItems.rollTableId",
      buttonText: "Confirm",
      pauseAfter: false,
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("roll-table-apply"), dispatchKey: "purchaseRollTableApply" }),
  ]);
}

function purchaseRollTableApply(ctx) {
  const tableId = ctx.getStateValue("postBattleTemp.purchaseItems.rollTableId");
  const pendingEffectId = makeEquipmentId("purchase-items-roll");

  inc(ctx, "crewLog.credits", -3);

  ctx.pushCommandsToTop([
    ctx.commandFactory.equipmentTableRoll({
      id: makeEquipmentId("purchase-equipment-roll"),
      pendingEffectId,
      tableId,
      source: "Post-Battle: Purchase Items",
    }),
    ctx.commandFactory.postBattleDispatch({ id: makeEquipmentId("roll-offer-loop"), dispatchKey: "purchaseRollOffer" }),
  ]);
}

// ─── Campaign Event ──────────────────────────────────────────────────────────

function makeBasicRecruit(name) {
  return {
    id: makeEquipmentId("crew-member"),
    name,
    stats: { reactions: 1, speed: 4, combatSkill: 0, toughness: 3, savvy: 0, luck: 0 },
    xp: 0,
    equipment: [],
    creationComplete: true,
  };
}

function addCrewMember(ctx, recruit) {
  const crewMembers = ctx.getStateValue("crewLog.crewMembers") || [];
  ctx.appendStateValue("crewLog.crewMembers", { id: recruit.id, number: crewMembers.length + 1, name: recruit.name });
  ctx.setStateValue(`crewLog.crewDetails.${recruit.id}`, recruit);
}

function campaignEventDispatch(ctx, params) {
  const state = ctx.state;
  const row = state?.postBattleTemp?.campaignEvent;
  const resultType = row?.resultType;
  const crewMembers = getActiveCrewMembers(state);
  let message = `${row?.label}\n${row?.description || ""}`;
  let handledSeparately = false;

  switch (resultType) {
    case "reduceSickBay": {
      const inSickBay = crewMembers.filter((m) => num(ctx, `crewLog.crewDetails.${m.id}.sickBayTurnsRemaining`) > 0);
      const chosen = inSickBay.slice(0, 2);
      chosen.forEach((m) => {
        const current = num(ctx, `crewLog.crewDetails.${m.id}.sickBayTurnsRemaining`);
        ctx.setStateValue(`crewLog.crewDetails.${m.id}.sickBayTurnsRemaining`, Math.max(0, current - 1));
      });
      message = chosen.length ? `Reduced Sick Bay recovery by 1 turn for: ${chosen.map((m) => m.name).join(", ")}.` : "Nobody is in Sick Bay right now.";
      break;
    }
    case "lifeSupportUpgrade": {
      const hasEngineer = crewMembers.some((m) => isSpecies(state?.crewLog?.crewDetails?.[m.id] || {}, "Engineer"));
      const cost = Math.max(0, rollExpression("1D6").total - (hasEngineer ? 1 : 0));
      inc(ctx, "crewLog.credits", -cost);
      message = `Life support upgrade costs ${cost} credits${hasEngineer ? " (reduced for having an Engineer)" : ""}.`;
      break;
    }
    case "newAllyOrStoryPoint": {
      addCrewMember(ctx, makeBasicRecruit("New Ally"));
      inc(ctx, "worldLog.storyPoints", 1);
      message = "A chance meeting turns into a new ally — added to the crew, and +1 story point either way.";
      break;
    }
    case "addStoryPoints":
      inc(ctx, "worldLog.storyPoints", row.amount);
      break;
    case "addRival":
      ctx.appendStateValue("worldLog.rivals", makeContactRecord({ type: "rival", name: "Unknown Hostiles", source: "Post-Battle: Campaign Event" }));
      break;
    case "addTrackingRival":
      ctx.appendStateValue("worldLog.rivals", makeContactRecord({ type: "rival", name: "Persistent Nemesis", source: "Post-Battle: Campaign Event" }));
      message += "\nThis Rival follows you from planet to planet and adds +1 to enemy numbers until resolved.";
      break;
    case "tradeAwayItem": {
      const picked = pickRandomStashItem(state);
      if (picked) {
        const inventory = (state?.crewLog?.inventory || []).filter((i) => i !== picked.item);
        ctx.setStateValue("crewLog.inventory", inventory);
        message = `You give away ${picked.item?.name || "an item"}. Roll on the Trade Table for what you get in return.`;
        handledSeparately = true;
        ctx.pushCommandsToTop([
          ctx.commandFactory.popupMessage({ id: `${params.baseId}-trade-msg`, title: "Campaign Event", message, buttonText: "Continue", pauseAfter: false }),
          ctx.commandFactory.tableRoll({
            id: `${params.baseId}-trade-roll`,
            title: "Trade Table",
            table: normalizeCampaignTable(CAMPAIGN_TABLES.tradeTable),
            saveTo: "postBattleTemp.campaignEventTradeResult",
            buttonText: "OK",
            rollButtonText: "Roll with App Dice",
            pauseAfter: false,
          }),
        ]);
      } else {
        message = "You have nothing to trade away — no effect.";
      }
      break;
    }
    case "addCredits": {
      const { total } = rollExpression(row.amount);
      inc(ctx, "crewLog.credits", total);
      message = `Earn ${total} credits.`;
      break;
    }
    case "addRumors":
      inc(ctx, "worldLog.rumors", row.amount);
      break;
    case "removeRivalOrXp": {
      const rivals = state?.worldLog?.rivals || [];
      if (rivals.length > 0) {
        ctx.setStateValue("worldLog.rivals", rivals.slice(1));
        message = `Old business settled — ${rivals[0].name} is removed from your Rivals list.`;
      } else if (crewMembers.length > 0) {
        inc(ctx, `crewLog.crewDetails.${crewMembers[0].id}.xp`, 1);
        message = `No Rivals to settle — ${crewMembers[0].name} earns +1 XP instead.`;
      }
      break;
    }
    case "newBasicRecruit":
      if (crewMembers.length < 20) {
        addCrewMember(ctx, makeBasicRecruit("New Recruit"));
      }
      break;
    case "buyLootRoll": {
      const credits = num(ctx, "crewLog.credits");
      if (credits >= row.cost) {
        handledSeparately = true;
        inc(ctx, "crewLog.credits", -row.cost);
        ctx.pushCommandsToTop([
          ctx.commandFactory.postBattleDispatch({
            id: `${params.baseId}-loot-start`,
            dispatchKey: "startLootChain",
            params: {
              chainId: `campaign-event-${params.baseId}`,
              rollCount: 1,
              doneDispatchKey: "lootChainFinalize",
              doneParams: { title: "Campaign Event", singlePrefix: "An alien merchant's strange device turns out to be: " },
            },
          }),
        ]);
      } else {
        message = "You can't afford the alien merchant's price this time.";
      }
      break;
    }
    case "damageRandomStashItem": {
      const picked = pickRandomStashItem(state);
      if (picked) {
        const inventory = [...(state?.crewLog?.inventory || [])];
        inventory[picked.index] = { ...inventory[picked.index], damaged: true };
        ctx.setStateValue("crewLog.inventory", inventory);
        message = `Equipment malfunction — ${picked.item?.name || "an item"} in your Stash is damaged.`;
      } else {
        message = "Equipment malfunction — but your Stash is empty. No effect.";
      }
      break;
    }
    case "loseRandomPatron": {
      const patrons = state?.worldLog?.patrons || [];
      if (patrons.length > 0) {
        const lost = pickRandomElement(patrons);
        ctx.setStateValue("worldLog.patrons", patrons.filter((p) => p !== lost));
        message = `Bad reputation — ${lost.name} will no longer work with you.`;
      } else {
        message = "You have no Patrons to lose. Shrug and move on.";
      }
      break;
    }
    case "taxMan": {
      const { rolls } = rollDice(2, 6);
      const higher = Math.max(...rolls);
      inc(ctx, "crewLog.credits", -higher);
      message = `The tax man takes ${higher} credits (rolled 2D6: ${rolls.join(", ")}).`;
      break;
    }
    case "newCaptain": {
      if (crewMembers.length > 0) {
        const newCaptain = pickRandomElement(crewMembers);
        const oldCaptainId = state?.campaign?.captainId || crewMembers[0].id;
        ctx.setStateValue("campaign.captainId", newCaptain.id);
        inc(ctx, `crewLog.crewDetails.${newCaptain.id}.xp`, 3);
        const leavesRoll = rollDie(6);
        if (leavesRoll === 1 && oldCaptainId !== newCaptain.id) {
          ctx.setStateValue(`crewLog.crewDetails.${oldCaptainId}.removedFromCrew`, true);
          ctx.setStateValue("crewLog.crewMembers", (ctx.getStateValue("crewLog.crewMembers") || []).filter((m) => m.id !== oldCaptainId));
          message = `${newCaptain.name} becomes the new captain (+3 XP). Rolled a 1 — the old captain leaves the campaign permanently, taking their gear.`;
        } else {
          message = `${newCaptain.name} becomes the new captain (+3 XP).`;
        }
      }
      break;
    }
    case "addPatron":
      ctx.appendStateValue("worldLog.patrons", makeContactRecord({ type: "patron", name: "New Business Contact", source: "Post-Battle: Campaign Event" }));
      break;
    case "allCrewXp":
      crewMembers.forEach((m) => inc(ctx, `crewLog.crewDetails.${m.id}.xp`, row.amount));
      break;
    case "hullDamage": {
      const { total } = rollExpression(row.amount);
      inc(ctx, "crewLog.starship.hullDamage", total);
      message = `Your ship suffers ${total} Hull Point damage.`;
      break;
    }
    case "chooseFreeWeapons": {
      const names = ["Hand cannon", "Military rifle", "Shotgun", "Machine pistol"];
      for (let i = 0; i < 3; i += 1) {
        const name = names[Math.floor(Math.random() * names.length)];
        const catalogItem = WEAPONS_TABLE.find((w) => w.name.toLowerCase() === name.toLowerCase());
        if (catalogItem) {
          ctx.appendStateValue(
            "crewLog.inventory",
            catalogItemToEquipment({ catalogId: "weapons", item: catalogItem, roomId: "", crewId: "", playerId: "", makeId: makeEquipmentId, nowIso: () => new Date().toISOString() })
          );
        }
      }
      message = "An old arms dealer contact gives you 3 weapons for your Stash.";
      break;
    }
    case "renegotiateDebt": {
      const debt = num(ctx, "crewLog.debt");
      if (debt > 0) {
        const reduction = rollExpression("1D6+1").total;
        inc(ctx, "crewLog.debt", -Math.min(debt, reduction));
        message = `You renegotiate your debt down by ${reduction} credits.`;
      } else {
        inc(ctx, "crewLog.credits", 2);
        message = "You owe nothing — earn 2 credits for being prudent.";
      }
      break;
    }
    case "invasionRollBonus":
      ctx.setStateValue("worldLog.currentWorld.invasionRollModifier", 2);
      break;
    case "twoExplorationRolls": {
      const chosen = [...crewMembers].sort(() => Math.random() - 0.5).slice(0, 2);
      if (chosen.length > 0) {
        handledSeparately = true;
        const explorationCmds = chosen.map((m, idx) =>
          ctx.commandFactory.tableRoll({
            id: `${params.baseId}-explore-${idx}`,
            title: `Exploration Table: ${m.name}`,
            table: normalizeCampaignTable(CAMPAIGN_TABLES.explorationTable),
            saveTo: `postBattleTemp.campaignEventExploration.${m.id}`,
            buttonText: "OK",
            rollButtonText: "Roll with App Dice",
            pauseAfter: false,
          })
        );
        ctx.pushCommandsToTop(explorationCmds);
      } else {
        message = "No crew members available to explore.";
      }
      break;
    }
    case "addRivalQuestBattle":
      ctx.appendStateValue("worldLog.rivals", makeContactRecord({ type: "rival", name: "Unknown Hostiles", source: "Post-Battle: Campaign Event" }));
      message += "\nIf you're currently on a Quest, next turn's battle is automatically against this Rival (+1 enemy) — track this manually.";
      break;
    case "stayAddsRival":
      message += "\nTrack this manually: every campaign turn you stay on this planet, add another Rival.";
      break;
    case "grounded":
      message += `\nTrack this manually: you cannot leave this planet for the next ${row.turns} campaign turns.`;
      break;
    case "luckOrStoryPointForCasualty": {
      const casualty = crewMembers.find((m) => state?.crewLog?.crewDetails?.[m.id]?.battleOutcome === "casualty");
      if (casualty) {
        inc(ctx, `crewLog.crewDetails.${casualty.id}.stats.luck`, 1);
        message = `${casualty.name} receives +1 Luck for their trouble last battle.`;
      } else {
        inc(ctx, "worldLog.storyPoints", 1);
        message = "Nobody got hurt last battle — receive +1 story point instead.";
      }
      break;
    }
    default:
      break;
  }

  if (!handledSeparately) {
    popup(ctx, { id: `${params.baseId}-result`, title: "Campaign Event", message });
  }
}

// ─── Character Event ─────────────────────────────────────────────────────────

function characterEventDispatch(ctx, params) {
  const { baseId, targetId, targetName } = params;
  const st = ctx.state;
  const row = st?.postBattleTemp?.characterEvent;
  const resultType = row?.resultType;
  const crewMembers = getActiveCrewMembers(st);
  const detail = st?.crewLog?.crewDetails?.[targetId] || {};
  const isEngineer = isSpecies(detail, "Engineer");
  const isKErin = isSpecies(detail, "K'Erin") || isSpecies(detail, "K’Erin");
  const isPrecursor = isSpecies(detail, "Precursor");
  let message = `${targetName}: ${row?.label}\n${row?.description || ""}`;
  let handledSeparately = false;

  switch (resultType) {
    case "refusesNextBattle":
      if (!isKErin) {
        ctx.setStateValue(`crewLog.crewDetails.${targetId}.refusesNextBattle`, true);
        inc(ctx, "worldLog.storyPoints", 1);
        message = `${targetName} refuses to fight next campaign turn (track manually). +1 story point.`;
      } else {
        message = `${targetName} is K'Erin and is unaffected.`;
      }
      break;
    case "unavailableTwoTurns":
      ctx.setStateValue(`crewLog.crewDetails.${targetId}.unavailableTurnsRemaining`, 2);
      message = `${targetName} is unavailable for the next 2 campaign turns (no Upkeep, no events). Award 1D6 XP and a Loot roll when they return — track manually.`;
      break;
    case "characterXp": {
      const { total } = rollExpression(row.amount);
      inc(ctx, `crewLog.crewDetails.${targetId}.xp`, total);
      message = `${targetName} earns +${total} XP.`;
      break;
    }
    case "mayLeaveIfSickBay": {
      const sickBayTurns = num(ctx, `crewLog.crewDetails.${targetId}.sickBayTurnsRemaining`);
      if (sickBayTurns > 0) {
        const roll = rollDie(6);
        if (roll <= sickBayTurns) {
          ctx.setStateValue(`crewLog.crewDetails.${targetId}.removedFromCrew`, true);
          ctx.setStateValue("crewLog.crewMembers", crewMembers.filter((m) => m.id !== targetId));
          message = `${targetName} rolled ${roll} (≤ ${sickBayTurns} turns left) — they decide to leave the crew.`;
        } else {
          message = `${targetName} rolled ${roll} — they stay with the crew.`;
        }
      } else {
        message = `${targetName} is not in Sick Bay — no effect.`;
      }
      break;
    }
    case "xpAndMaybeQuest": {
      inc(ctx, `crewLog.crewDetails.${targetId}.xp`, row.amount);
      const roll = rollDie(6);
      if (roll >= 5) {
        inc(ctx, "worldLog.questRumors", 1);
        message = `${targetName} earns +1 XP. Rolled ${roll} — a letter from home leads to a Quest Rumor.`;
      } else {
        message = `${targetName} earns +1 XP. Rolled ${roll} — just a letter, nothing more.`;
      }
      break;
    }
    case "refusesTasksNextTurn":
      ctx.setStateValue(`crewLog.crewDetails.${targetId}.refusesTasksNextTurn`, true);
      message = `${targetName} refuses to do any tasks next campaign turn (still fights normally) — track manually.`;
      break;
    case "brawlAnotherMember": {
      const others = crewMembers.filter((m) => m.id !== targetId);
      if (others.length > 0) {
        const opponent = pickRandomElement(others);
        const targetCs = num(ctx, `crewLog.crewDetails.${targetId}.stats.combatSkill`);
        const opponentCs = num(ctx, `crewLog.crewDetails.${opponent.id}.stats.combatSkill`);
        const targetRoll = rollDie(6) + targetCs;
        const opponentRoll = rollDie(6) + opponentCs;
        const loserIds = targetRoll === opponentRoll ? [targetId, opponent.id] : targetRoll < opponentRoll ? [targetId] : [opponent.id];
        loserIds.forEach((id) => {
          const current = num(ctx, `crewLog.crewDetails.${id}.sickBayTurnsRemaining`);
          ctx.setStateValue(`crewLog.crewDetails.${id}.sickBayTurnsRemaining`, Math.max(current, 1));
        });
        message = `${targetName} (${targetRoll}) vs ${opponent.name} (${opponentRoll}) — ${loserIds.map((id) => (id === targetId ? targetName : opponent.name)).join(" and ")} spend 1 turn in Sick Bay.`;
      } else {
        message = `${targetName} has nobody to scrap with.`;
      }
      break;
    }
    case "sickBayReliefOrXp": {
      if (isEngineer) {
        message = `${targetName} is an Engineer and receives no benefit from this event.`;
      } else if (num(ctx, `crewLog.crewDetails.${targetId}.sickBayTurnsRemaining`) > 0) {
        inc(ctx, `crewLog.crewDetails.${targetId}.sickBayTurnsRemaining`, -1);
        message = `${targetName}'s Sick Bay recovery time is reduced by 1 turn.`;
      } else {
        inc(ctx, `crewLog.crewDetails.${targetId}.xp`, 1);
        message = `${targetName} earns +1 XP.`;
      }
      break;
    }
    case "rerollMotivation": {
      const roll = rollD100();
      const motivation = findByRoll(MOTIVATION_TABLE, roll);
      ctx.setStateValue(`crewLog.crewDetails.${targetId}.motivation`, motivation);
      inc(ctx, "worldLog.storyPoints", 1);
      message = `${targetName}'s new motivation: ${motivation?.title || motivation?.label || "Unknown"}. +1 story point.`;
      break;
    }
    case "cosmeticOnly":
      break;
    case "addQuestRumor":
      inc(ctx, "worldLog.questRumors", row.amount);
      break;
    case "addCredits":
      inc(ctx, "crewLog.credits", row.amount);
      break;
    case "bothMembersXp": {
      const others = crewMembers.filter((m) => m.id !== targetId);
      inc(ctx, `crewLog.crewDetails.${targetId}.xp`, row.amount);
      if (others.length > 0) {
        const other = pickRandomElement(others);
        inc(ctx, `crewLog.crewDetails.${other.id}.xp`, row.amount);
        message = `${targetName} and ${other.name} both earn +${row.amount} XP.`;
      } else {
        message = `${targetName} earns +${row.amount} XP.`;
      }
      break;
    }
    case "storyPointAndMaybeXp": {
      inc(ctx, "worldLog.storyPoints", 1);
      const isSwiftOrPrecursor = isSpecies(detail, "Swift") || isPrecursor;
      if (isSwiftOrPrecursor) {
        inc(ctx, `crewLog.crewDetails.${targetId}.xp`, 2);
        message = `${targetName} picks up a hobby: +1 story point, +2 XP (Swift/Precursor).`;
      } else {
        message = `${targetName} picks up a hobby: +1 story point.`;
      }
      break;
    }
    case "xpIfInjured": {
      const wasInjured = detail.battleOutcome === "casualty" || num(ctx, `crewLog.crewDetails.${targetId}.sickBayTurnsRemaining`) > 0;
      if (wasInjured) {
        inc(ctx, `crewLog.crewDetails.${targetId}.xp`, row.amount);
        message = `${targetName} was injured recently — earns +${row.amount} XP.`;
      } else {
        message = `${targetName} was not injured recently — no effect.`;
      }
      break;
    }
    case "freeAbilityIncrease":
      message = `${targetName} made a personal breakthrough — pick one ability that hasn't changed from its starting value and increase it by +1 during the Experience and Character Upgrades step.`;
      break;
    case "sickBayAndHullDamage":
      ctx.setStateValue(`crewLog.crewDetails.${targetId}.sickBayTurnsRemaining`, Math.max(num(ctx, `crewLog.crewDetails.${targetId}.sickBayTurnsRemaining`), 1));
      inc(ctx, "crewLog.starship.hullDamage", 1);
      message = `${targetName} spends 1 turn in Sick Bay; the ship takes 1 Hull Point damage.`;
      break;
    case "trueLove": {
      inc(ctx, "worldLog.storyPoints", 1);
      const motivationLabel = String(detail?.motivation?.title || detail?.motivation?.label || "");
      if (motivationLabel.toLowerCase().includes("true love")) {
        const { total } = rollExpression("1D6");
        inc(ctx, `crewLog.crewDetails.${targetId}.xp`, total);
        message = `${targetName} finds true love — +${total} XP (motivation match) and +1 story point.`;
      } else {
        message = `${targetName} finds true love — +1 story point.`;
      }
      break;
    }
    case "addPersonalRival":
      ctx.appendStateValue("worldLog.rivals", { ...makeContactRecord({ type: "rival", name: `${targetName}'s Rival`, source: "Post-Battle: Character Event" }), personalTo: targetId, notes: `Leaves if ${targetName} leaves the crew.` });
      break;
    case "lootRoll":
      handledSeparately = true;
      ctx.pushCommandsToTop([
        ctx.commandFactory.postBattleDispatch({
          id: `${baseId}-loot-start`,
          dispatchKey: "startLootChain",
          params: {
            chainId: `character-event-${baseId}`,
            rollCount: 1,
            doneDispatchKey: "lootChainFinalize",
            doneParams: { title: "Character Event", singlePrefix: `${targetName} receives a gift: ` },
          },
        }),
      ]);
      break;
    case "ignoreNextInjuryRoll":
      if (!isEngineer) {
        ctx.setStateValue(`crewLog.crewDetails.${targetId}.ignoreNextInjuryRoll`, true);
        message = `${targetName}'s next Injury Table roll is ignored.`;
      } else {
        message = `${targetName} is an Engineer and cannot benefit from this event.`;
      }
      break;
    case "addPatron":
      ctx.appendStateValue("worldLog.patrons", makeContactRecord({ type: "patron", name: "New Contact", source: "Post-Battle: Character Event" }));
      break;
    case "addLuck":
      inc(ctx, `crewLog.crewDetails.${targetId}.stats.luck`, row.amount);
      break;
    case "repairHullOrItem": {
      const picked = pickRandomCarriedItem(st, targetId);
      inc(ctx, "crewLog.starship.hullDamage", -2);
      if (isEngineer && picked) {
        const equipment = [...(st?.crewLog?.crewDetails?.[targetId]?.equipment || [])];
        equipment[picked.index] = { ...equipment[picked.index], damaged: false };
        ctx.setStateValue(`crewLog.crewDetails.${targetId}.equipment`, equipment);
        message = `${targetName} is an Engineer — repairs 2 Hull Points AND a damaged item.`;
      } else {
        message = `${targetName} repairs 2 Hull Point damage.`;
      }
      break;
    }
    case "damageCarriedItem": {
      if (!isEngineer) {
        const picked = pickRandomCarriedItem(st, targetId);
        if (picked) {
          const equipment = [...(st?.crewLog?.crewDetails?.[targetId]?.equipment || [])];
          equipment[picked.index] = { ...equipment[picked.index], damaged: true };
          ctx.setStateValue(`crewLog.crewDetails.${targetId}.equipment`, equipment);
          message = `${targetName}'s ${picked.item?.name || "item"} is damaged and needs Repair.`;
        } else {
          message = `${targetName} carries nothing that could be damaged.`;
        }
      } else {
        message = `${targetName} is an Engineer and is unaffected.`;
      }
      break;
    }
    case "loseCarriedItem": {
      const picked = pickRandomCarriedItem(st, targetId);
      if (picked) {
        const equipment = (st?.crewLog?.crewDetails?.[targetId]?.equipment || []).filter((_, idx) => idx !== picked.index);
        ctx.setStateValue(`crewLog.crewDetails.${targetId}.equipment`, equipment);
        message = `${targetName} loses ${picked.item?.name || "an item"}. Roll 1D6+Savvy next Character Event — on a 5+ it turns up again (track manually).`;
      } else {
        message = `${targetName} carries nothing to lose.`;
      }
      break;
    }
    case "noXpNextTurn":
      if (!isKErin) {
        ctx.setStateValue(`crewLog.crewDetails.${targetId}.noXpNextTurn`, true);
      } else {
        message = `${targetName} is K'Erin and is unaffected.`;
      }
      break;
    case "extraActionNextTurn":
      ctx.setStateValue(`crewLog.crewDetails.${targetId}.extraActionNextTurn`, true);
      break;
    default:
      break;
  }

  if (!handledSeparately) {
    popup(ctx, { id: `${baseId}-result`, title: "Character Event", message });
  }
}

// ─── Registry ─────────────────────────────────────────────────────────────

export const POST_BATTLE_DISPATCH_HANDLERS = {
  consolidateHeldField,
  resolveRivalRoll,
  resolveRivalNewRoll,
  resolvePatronDispatch,
  getPaidDispatch,
  battlefieldFindsDispatch,
  startLootChain,
  lootDrillStep,
  lootChainFinalize,
  injuryDispatch,
  uniqueKillXpDispatch,
  upgradeOffer,
  upgradeOfferResult,
  upgradePickAbility,
  upgradeApply,
  advancedTrainingOffer,
  advancedTrainingApproval,
  advancedTrainingCourse,
  purchaseRollOffer,
  purchaseRollOfferResult,
  purchaseRollTableApply,
  purchaseDirectOffer,
  purchaseDirectOfferResult,
  purchaseDirectBuyApply,
  purchaseSellOffer,
  purchaseSellOfferResult,
  purchaseSellApply,
  campaignEventDispatch,
  characterEventDispatch,
};
