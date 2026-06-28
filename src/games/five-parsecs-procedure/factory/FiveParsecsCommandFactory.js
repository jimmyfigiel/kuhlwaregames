import { CommandFactory } from "../../../procedure-core/factory";
import {
  BuildWorldCommand,
  BuildCrewCommand,
  BuildShipCommand,
  BuildStartingCrewCommand,
  StartTurnCommand,
  TravelPhaseCommand,
  DecideTravelCommand,
  NewWorldArrivalCommand,
  ReturnToVisitedWorldCommand,
  WorldPhaseCommand,
  TabletopBattlePhaseCommand,
  PostBattlePhaseCommand,
  CrewMemberNameCommand,
  FinalizeCrewMemberCommand,
  QueueCrewMemberTableResultUpdateCommandsCommand,
  QueueEquipmentTableResultUpdateCommandsCommand,
  ResolveCreditRollCommand,
  ResolveShipDebtCommand,
  ResolvePendingEffectsCommand,
  QueueShipTableResultUpdateCommandsCommand,
  ApplyShipSetupCommand,
  CampaignPrepCommand,
  ResolveStartingStoryPointsCommand,
  BuildStartingStashCommand,
  ApplyStarshipTravelEventCommand,
  TerrainGeneratorCommand,
  NoMinisCombatCommand,
  NoMinisCombatRoundCommand,
  NoMinisContinueCommand,
  NoMinisInitiativeCommand,
  NoMinisFirefightCommand,
  TabletopCombatCommand,
  TabletopCombatRoundCommand,
  TabletopContinueCommand,
} from "../commands";
import { buildCrewMemberTableResultUpdateCommands } from "../effects";
import { EQUIPMENT_ROLL_TABLES_BY_ID, SHIP_TABLE_DEFINITION, CAMPAIGN_TABLES } from "../data/tables";



function normalizeCampaignTable(table) {
  if (!table) {
    return null;
  }

  const dice = String(table.dice || "D100").toUpperCase();
  const sides = dice === "D10" ? 10 : dice === "D6" ? 6 : 100;

  return {
    id: table.id,
    title: table.label || table.title || table.id || "Campaign Table",
    dice,
    sides,
    note: table.description || "",
    rulesPage: table.rulesPage || null,
    entries: (table.rows || table.entries || []).map((row) => ({
      ...row,
      min: row.min ?? row.rollMin ?? row.roll,
      max: row.max ?? row.rollMax ?? row.roll ?? row.min,
      label: row.label || row.title || row.name || row.value,
      value: row.value || row.title || row.name || row.label,
      rulesPage: row.rulesPage || table.rulesPage || null,
    })),
  };
}

function normalizeEquipmentTable(table) {
  if (!table) {
    return null;
  }

  return {
    id: table.id,
    title: table.title,
    dice: table.dice || "D100",
    sides: 100,
    entries: (table.rows || []).map((row) => ({
      ...row,
      min: row.rollMin,
      max: row.rollMax,
      label: row.name,
      value: row.name,
    })),
  };
}


function normalizeShipTable(table) {
  if (!table) {
    return null;
  }

  return {
    id: table.id,
    title: table.title,
    dice: table.dice || "D100",
    sides: table.sides || 100,
    entries: (table.entries || []).map((row) => ({
      ...row,
      min: row.min ?? row.rollMin,
      max: row.max ?? row.rollMax,
      label: row.label || row.name || row.ship,
      value: row.value || row.name || row.ship,
    })),
  };
}

function makeEquipmentRecord({
  selectedRow,
  tableId,
  source,
  crewMemberId = "",
  locationType = "character",
}) {
  const name = selectedRow?.label || selectedRow?.name || selectedRow?.value || "Unknown Equipment";
  const isWeapon = ["lowTechWeapon", "militaryWeapon", "highTechWeapon"].includes(tableId);

  return {
    id: `equipment-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    name,
    category: isWeapon ? "weapon" : "gear",
    locationType,
    crewMemberId,
    source: source || "",
    sourceTableId: tableId,
    sourceTableTitle: selectedRow?.tableTitle || "",
    sourceRoll: selectedRow?.roll ?? "",
    origin: locationType === "character" ? "characterCreation" : "stash",
    notes: source ? `Created from ${source}` : "",
    createdAt: new Date().toISOString(),
  };
}

function filterPendingEffectById(effects, pendingEffectId) {
  return Array.isArray(effects)
    ? effects.filter((effect) => effect?.id !== pendingEffectId)
    : [];
}

function findPendingEffectById(state, pendingEffectId) {
  const allEffectGroups = [
    ...(Array.isArray(state?.crewLog?.pendingEffects) ? state.crewLog.pendingEffects : []),
    ...(Array.isArray(state?.worldLog?.pendingEffects) ? state.worldLog.pendingEffects : []),
  ];

  Object.values(state?.crewLog?.crewDetails || {}).forEach((detail) => {
    if (Array.isArray(detail?.pendingEffects)) {
      allEffectGroups.push(...detail.pendingEffects);
    }
  });

  return allEffectGroups.find((effect) => effect?.id === pendingEffectId) || null;
}

function buildPendingEffectRemovalOperations(state, pendingEffectId) {
  const operations = [
    {
      op: "set",
      path: "crewLog.pendingEffects",
      value: filterPendingEffectById(state?.crewLog?.pendingEffects, pendingEffectId),
    },
    {
      op: "set",
      path: "worldLog.pendingEffects",
      value: filterPendingEffectById(state?.worldLog?.pendingEffects, pendingEffectId),
    },
  ];

  Object.entries(state?.crewLog?.crewDetails || {}).forEach(([crewMemberId, detail]) => {
    operations.push({
      op: "set",
      path: `crewLog.crewDetails.${crewMemberId}.pendingEffects`,
      value: filterPendingEffectById(detail?.pendingEffects, pendingEffectId),
    });
  });

  return operations;
}

function makeWorldContactRecords({ type, count, source }) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : 1;
  const label = type === "patron" ? "Patron" : "Rival";

  return Array.from({ length: safeCount }, (_, index) => ({
    id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000000)}-${index + 1}`,
    name: `Unnamed ${label}`,
    type,
    source: source || "",
    status: "needsDetails",
    notes: source ? `Created from ${source}` : "",
    createdAt: new Date().toISOString(),
  }));
}


const CREATION_RESULT_KINDS = new Set([
  "background",
  "motivation",
  "class",
  "fixedBackground",
  "fixedMotivation",
  "fixedClass",
]);

function isCreationResultEffect(effect) {
  return CREATION_RESULT_KINDS.has(String(effect?.resultKind || ""));
}

function getCrewMemberDetail(state, crewMemberId) {
  if (!crewMemberId) {
    return null;
  }

  return state?.crewLog?.crewDetails?.[crewMemberId] || null;
}

function getCrewMemberFlags(state, crewMemberId) {
  const detail = getCrewMemberDetail(state, crewMemberId);
  return detail?.flags && typeof detail.flags === "object" ? detail.flags : {};
}

function describeAdjustment(parts) {
  return parts.filter(Boolean).join(" ");
}

function getCreditEffectAdjustment({ state, effect }) {
  const flags = getCrewMemberFlags(state, effect?.crewMemberId);
  const resultKind = String(effect?.resultKind || "");
  const adjustmentParts = [];
  let adjustment = 0;
  let ignored = false;

  if (flags.ignoreBackgroundCreditGains && resultKind === "background") {
    ignored = true;
    adjustmentParts.push("Ignored because this character ignores Background credit gains.");
  }

  if (!ignored && isCreationResultEffect(effect)) {
    const bioUpgradeReduction = Number(flags.reduceCreationCreditsBy || 0);
    const minorAlienReduction = Number(flags.reduceCreationCreditsAndStoryPointsBy || 0);

    if (Number.isFinite(bioUpgradeReduction) && bioUpgradeReduction > 0) {
      const reduction = Math.floor(bioUpgradeReduction);
      adjustment -= reduction;
      adjustmentParts.push(`Reduced by ${reduction} credit${reduction === 1 ? "" : "s"}.`);
    }

    if (Number.isFinite(minorAlienReduction) && minorAlienReduction > 0) {
      const reduction = Math.floor(minorAlienReduction);
      adjustment -= reduction;
      adjustmentParts.push(`Reduced by ${reduction} credit${reduction === 1 ? "" : "s"}.`);
    }
  }

  return {
    ignored,
    adjustment,
    adjustmentLabel: describeAdjustment(adjustmentParts),
  };
}

function getStoryPointEffectAdjustment({ state, effect, count }) {
  const flags = getCrewMemberFlags(state, effect?.crewMemberId);
  const adjustmentParts = [];
  let adjustedCount = Math.max(0, Math.floor(Number(count) || 0));
  let ignored = false;

  if (flags.ignoreCreationStoryPointBonuses && isCreationResultEffect(effect)) {
    ignored = true;
    adjustedCount = 0;
    adjustmentParts.push("Ignored because this character ignores creation story point bonuses.");
  }

  if (!ignored && flags.reduceCreationCreditsAndStoryPointsBy && isCreationResultEffect(effect)) {
    const reduction = Math.floor(Number(flags.reduceCreationCreditsAndStoryPointsBy) || 0);

    if (reduction > 0) {
      adjustedCount = Math.max(0, adjustedCount - reduction);
      adjustmentParts.push(`Reduced by ${reduction} story point${reduction === 1 ? "" : "s"}.`);
    }
  }

  return {
    ignored,
    adjustedCount,
    adjustmentLabel: describeAdjustment(adjustmentParts),
  };
}



const VICTORY_CONDITION_OPTIONS = [
  { id: "none", label: "No Victory Condition", value: "none", description: "Play an open-ended campaign." },
  { id: "turns-20", label: "Play 20 campaign turns", value: "turns-20" },
  { id: "turns-50", label: "Play 50 campaign turns", value: "turns-50" },
  { id: "turns-100", label: "Play 100 campaign turns", value: "turns-100" },
  { id: "quests-3", label: "Complete 3 Quests", value: "quests-3" },
  { id: "quests-5", label: "Complete 5 Quests", value: "quests-5" },
  { id: "quests-10", label: "Complete 10 Quests", value: "quests-10" },
  { id: "battle-wins-20", label: "Win 20 tabletop battles", value: "battle-wins-20" },
  { id: "battle-wins-50", label: "Win 50 tabletop battles", value: "battle-wins-50" },
  { id: "battle-wins-100", label: "Win 100 tabletop battles", value: "battle-wins-100" },
  { id: "unique-kills-10", label: "Kill 10 Unique Individuals", value: "unique-kills-10" },
  { id: "unique-kills-25", label: "Kill 25 Unique Individuals", value: "unique-kills-25" },
  { id: "one-character-10-upgrades", label: "Upgrade a single character 10 times", value: "one-character-10-upgrades" },
  { id: "three-characters-10-upgrades", label: "Upgrade 3 characters 10 times", value: "three-characters-10-upgrades" },
  { id: "five-characters-10-upgrades", label: "Upgrade 5 characters 10 times", value: "five-characters-10-upgrades" },
  { id: "challenging-turns-50", label: "Play 50 campaign turns in Challenging mode", value: "challenging-turns-50" },
  { id: "hardcore-turns-50", label: "Play 50 campaign turns in Hardcore mode", value: "hardcore-turns-50" },
  { id: "insanity-turns-50", label: "Play 50 campaign turns in Insanity mode", value: "insanity-turns-50" },
];

const DIFFICULTY_MODE_OPTIONS = [
  {
    id: "easy",
    label: "Easy",
    value: "easy",
    description: "Easier battles and improved rewards. Only the 20-turn and 20-battle victory conditions can be completed.",
  },
  {
    id: "normal",
    label: "Normal",
    value: "normal",
    description: "No changes to game mechanics.",
  },
  {
    id: "challenging",
    label: "Challenging",
    value: "challenging",
    description: "Enemy-number dice that roll 1 or 2 count as 3.",
  },
  {
    id: "hardcore",
    label: "Hardcore",
    value: "hardcore",
    description: "Challenging plus tougher battle and campaign penalties. Starting story points are reduced by 1.",
  },
  {
    id: "insanity",
    label: "Insanity",
    value: "insanity",
    description: "Hardcore plus severe battle penalties. Story points and Stars of the Story are not available.",
  },
];

export class FiveParsecsCommandFactory extends CommandFactory {

  buildWorld({
    id = "build-world",
    title = "Build World",
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new BuildWorldCommand({
      id,
      title,
      pauseAfter,
      visible,
    });
  }

  buildCrew({
    id = "build-crew",
    title = "Build Crew",
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new BuildCrewCommand({
      id,
      title,
      pauseAfter,
      visible,
    });
  }

  buildShip({
    id = "build-ship",
    title = "Build Ship",
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new BuildShipCommand({
      id,
      title,
      pauseAfter,
      visible,
    });
  }

  startTurn({
    id = "start-turn",
    title = "Start Turn",
    turnNumber = null,
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new StartTurnCommand({
      id,
      title,
      turnNumber,
      pauseAfter,
      visible,
    });
  }

  travelPhase({
    id,
    title = "Step 1: Travel",
    turnNumber = null,
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new TravelPhaseCommand({
      id,
      title,
      turnNumber,
      pauseAfter,
      visible,
    });
  }

  decideTravel({
    id,
    title = "Travel: Stay or Travel?",
    prompt = "Will the crew stay on the current world or travel to a new world?",
    turnNumber = null,
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new DecideTravelCommand({
      id,
      title,
      prompt,
      turnNumber,
      pauseAfter,
      visible,
    });
  }

  newWorldArrival({
    id,
    title = "Travel: New World Arrival",
    prompt = "Name the world your crew arrives at.",
    turnNumber = null,
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new NewWorldArrivalCommand({
      id,
      title,
      prompt,
      turnNumber,
      pauseAfter,
      visible,
    });
  }

  returnToVisitedWorld({
    id,
    title = "Travel: Return to Previous World",
    targetWorldId = "",
    turnNumber = null,
    pauseAfter = false,
    visible = false,
  } = {}) {
    return new ReturnToVisitedWorldCommand({
      id,
      title,
      targetWorldId,
      turnNumber,
      pauseAfter,
      visible,
    });
  }


  starshipTravelEventRoll({
    id = "starship-travel-event",
    title = "Travel: Starship Travel Event",
    turnNumber = null,
    pauseAfter = false,
    visible = true,
  } = {}) {
    const table = normalizeCampaignTable(CAMPAIGN_TABLES.starshipTravelEvents);

    return this.tableRoll({
      id,
      title,
      table,
      saveTo: "campaign.lastStarshipTravelEvent",
      buttonText: "Select Event",
      rollButtonText: "Roll Starship Travel Event",
      afterSelectionCommands: [
        new ApplyStarshipTravelEventCommand({
          id: `${id}-apply`,
          title: "Record Starship Travel Event",
          sourcePath: "campaign.lastStarshipTravelEvent",
          turnNumber,
          pauseAfter: false,
          visible: false,
        }),
      ],
      pauseAfter,
      visible,
    });
  }

  worldPhase({
    id,
    title = "Step 2: World",
    turnNumber = null,
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new WorldPhaseCommand({
      id,
      title,
      turnNumber,
      pauseAfter,
      visible,
    });
  }

  tabletopBattlePhase({
    id,
    title = "Step 3: Tabletop Battle",
    turnNumber = null,
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new TabletopBattlePhaseCommand({
      id,
      title,
      turnNumber,
      pauseAfter,
      visible,
    });
  }

  postBattlePhase({
    id,
    title = "Step 4: Post-Battle Sequence",
    turnNumber = null,
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new PostBattlePhaseCommand({
      id,
      title,
      turnNumber,
      pauseAfter,
      visible,
    });
  }

  terrainGenerator({
    id,
    title = "Terrain Generator",
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new TerrainGeneratorCommand({ id, title, pauseAfter, visible });
  }

  noMinisCombat({
    id,
    title = "No-Minis Combat Resolution",
    missionType = "standard",
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new NoMinisCombatCommand({ id, title, missionType, pauseAfter, visible });
  }

  noMinisInitiative({
    id,
    title = "Initiative Action",
    characterName = "Crew Member",
    roundNumber = 1,
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new NoMinisInitiativeCommand({ id, title, characterName, roundNumber, pauseAfter, visible });
  }

  noMinisFirefight({
    id,
    title = "The Firefight",
    roundNumber = 1,
    firefightModifier = 0,
    blocksBrawling = false,
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new NoMinisFirefightCommand({ id, title, roundNumber, firefightModifier, blocksBrawling, pauseAfter, visible });
  }

  tabletopCombat({
    id,
    title = "Tabletop Battle",
    missionType = "opportunity",
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new TabletopCombatCommand({ id, title, missionType, pauseAfter, visible });
  }



  campaignPrep({
    id = "campaign-prep",
    title = "Campaign Prep",
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new CampaignPrepCommand({
      id,
      title,
      pauseAfter,
      visible,
    });
  }

  buildStartingStash({
    id = "build-starting-stash",
    title = "Build Starting Crew Stash",
    crewCountPath = "crewLog.startingCrewCount",
    pauseAfter = false,
    visible = false,
  } = {}) {
    return new BuildStartingStashCommand({
      id,
      title,
      crewCountPath,
      pauseAfter,
      visible,
    });
  }

  resolveStartingStoryPoints({
    id = "resolve-starting-story-points",
    title = "Starting Story Points",
    pauseAfter = false,
    visible = true,
  } = {}) {
    return new ResolveStartingStoryPointsCommand({
      id,
      title,
      pauseAfter,
      visible,
    });
  }

  getVictoryConditionOptions() {
    return VICTORY_CONDITION_OPTIONS;
  }

  getDifficultyModeOptions() {
    return DIFFICULTY_MODE_OPTIONS;
  }

  buildStartingCrew({
    id,
    title = "Build Starting Crew",
    crewCountPath = "crewLog.startingCrewCount",
    pauseAfter = false,
    visible = false,
  }) {
    return new BuildStartingCrewCommand({
      id,
      title,
      crewCountPath,
      pauseAfter,
      visible,
    });
  }

  crewMemberName({
    id,
    crewMemberNumber = 1,
    title = null,
    prompt = null,
    defaultValue = "",
    buttonText = "OK",
    allowRandomName = true,
    randomNameSet = "five_parsecs_pulp",
    randomNameButtonText = "Generate Name",
    pauseAfter = false,
  }) {
    return new CrewMemberNameCommand({
      id,
      crewMemberNumber,
      title,
      prompt,
      defaultValue,
      buttonText,
      allowRandomName,
      randomNameSet,
      randomNameButtonText,
      pauseAfter,
    });
  }

  queueCrewMemberTableResultUpdateCommands({
    id,
    crewMemberId,
    crewMemberNumber = 1,
    sourcePath,
    resultKind = "tableResult",
    title = null,
    pauseAfter = false,
    visible = false,
  }) {
    return new QueueCrewMemberTableResultUpdateCommandsCommand({
      id,
      crewMemberId,
      crewMemberNumber,
      sourcePath,
      resultKind,
      title,
      pauseAfter,
      visible,
    });
  }

  createCrewMemberTableResultUpdateCommands({
    crewMemberId,
    crewMemberNumber,
    sourcePath,
    resultKind,
    result,
  }) {
    return buildCrewMemberTableResultUpdateCommands({
      commandFactory: this,
      crewMemberId,
      crewMemberNumber,
      sourcePath,
      resultKind,
      result,
    });
  }



  shipTableRoll({
    id = "choose-starting-ship",
    title = "Choose Starting Ship",
    pauseAfter = false,
    visible = true,
  } = {}) {
    const table = normalizeShipTable(SHIP_TABLE_DEFINITION);

    return this.tableRoll({
      id,
      title,
      table,
      saveTo: "shipSetup.selectedShip",
      buttonText: "Select Ship",
      rollButtonText: "Roll with App Dice",
      afterSelectionCommands: [
        new QueueShipTableResultUpdateCommandsCommand({
          id: "queue-starting-ship-result-updates",
          title: "Apply Ship Result",
          sourcePath: "shipSetup.selectedShip",
          pauseAfter: false,
          visible: false,
        }),
      ],
      pauseAfter,
      visible,
    });
  }

  createCommandsForShipSelection({ selectedShip }) {
    const shipLabel = selectedShip?.name || selectedShip?.label || "Starting Ship";

    return [
      new ResolveShipDebtCommand({
        id: "resolve-starting-ship-debt",
        title: `Resolve Debt: ${shipLabel}`,
        sourcePath: "shipSetup.selectedShip",
        saveRollTo: "shipSetup.debtRoll",
        saveDebtTo: "shipSetup.generatedDebt",
        pauseAfter: false,
        visible: true,
      }),
      this.textInput({
        id: "name-starting-ship",
        title: "Name Your Ship",
        prompt: "Name your crew's starship.",
        label: "Ship Name",
        defaultValue: shipLabel,
        saveTo: "shipSetup.shipName",
        buttonText: "OK",
        allowRandomName: true,
        randomNameSet: "five_parsecs_ship",
        randomNameButtonText: "Generate Ship Name",
        pauseAfter: false,
      }),
      new ApplyShipSetupCommand({
        id: "apply-starting-ship",
        title: "Apply Starting Ship",
        sourcePath: "shipSetup.selectedShip",
        debtPath: "shipSetup.generatedDebt",
        namePath: "shipSetup.shipName",
        shipData: selectedShip,
        pauseAfter: false,
        visible: false,
      }),
    ];
  }


  equipmentTableRoll({
    id,
    pendingEffectId,
    tableId,
    source = "",
    title = null,
    pauseAfter = false,
    visible = true,
  }) {
    const table = normalizeEquipmentTable(EQUIPMENT_ROLL_TABLES_BY_ID[tableId]);

    if (!table) {
      return null;
    }

    return this.tableRoll({
      id,
      title: title || table.title,
      table,
      saveTo: `equipmentRollSelections.${pendingEffectId}`,
      buttonText: "Add to Stash",
      rollButtonText: "Roll with App Dice",
      afterSelectionCommands: [
        new QueueEquipmentTableResultUpdateCommandsCommand({
          id: `${pendingEffectId}-queue-equipment-result-updates`,
          title: `Apply ${table.title} Result`,
          pendingEffectId,
          tableId,
          source,
          pauseAfter: false,
          visible: false,
        }),
      ],
      pauseAfter,
      visible,
    });
  }

  createCommandsForEquipmentSelection({
    state,
    pendingEffectId,
    tableId,
    source,
    selectedRow,
  }) {
    const pendingEffect = findPendingEffectById(state, pendingEffectId);
    const crewMemberId = pendingEffect?.crewMemberId || "";
    const attachToCharacter = Boolean(crewMemberId);
    const equipmentRecord = makeEquipmentRecord({
      selectedRow,
      tableId,
      source,
      crewMemberId,
      locationType: attachToCharacter ? "character" : "stash",
    });
    const selectedName = equipmentRecord.name || "Equipment";
    const targetPath = attachToCharacter
      ? `crewLog.crewDetails.${crewMemberId}.equipment`
      : "crewLog.inventory";
    const targetLabel = attachToCharacter ? "Character Gear" : "Stash";

    return [
      this.updateState({
        id: `${pendingEffectId}-add-equipment`,
        title: `Add ${selectedName} to ${targetLabel}`,
        operations: [
          {
            op: "append",
            path: targetPath,
            value: equipmentRecord,
          },
          {
            op: "append",
            path: "crewLog.resolvedEffects",
            value: {
              id: pendingEffectId,
              status: "resolved",
              effectType: "startingRoll",
              source,
              crewMemberId,
              resolution: attachToCharacter
                ? `Added ${selectedName} to character gear.`
                : `Added ${selectedName} to stash.`,
              resolvedAt: new Date().toISOString(),
            },
          },
          ...buildPendingEffectRemovalOperations(state, pendingEffectId),
        ],
        pauseAfter: false,
        visible: false,
      }),
    ];
  }



  creditRoll({
    id,
    pendingEffectId,
    dice = "1D6",
    source = "",
    title = null,
    adjustment = 0,
    adjustmentLabel = "",
    pauseAfter = false,
    visible = true,
  }) {
    return new ResolveCreditRollCommand({
      id,
      title: title || `Roll ${dice} Credits`,
      pendingEffectId,
      dice,
      source,
      adjustment,
      adjustmentLabel,
      pauseAfter,
      visible,
    });
  }

  createCommandsForCreditRollResolution({
    state,
    pendingEffectId,
    dice,
    source,
    total,
    rawTotal = null,
    adjustment = 0,
    adjustmentLabel = "",
    appRoll = null,
  }) {
    const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
    const safeRawTotal = rawTotal === null || rawTotal === undefined
      ? safeTotal
      : Math.max(0, Math.floor(Number(rawTotal) || 0));
    const resolution = adjustmentLabel
      ? `Rolled ${safeRawTotal}; ${adjustmentLabel} Added ${safeTotal} credits.`
      : `Added ${safeTotal} credits.`;

    return [
      this.updateState({
        id: `${pendingEffectId}-apply-credit-roll`,
        title: `Add ${safeTotal} Credits`,
        operations: [
          {
            op: "increment",
            path: "crewLog.credits",
            amount: safeTotal,
          },
          {
            op: "append",
            path: "crewLog.resolvedEffects",
            value: {
              id: pendingEffectId,
              status: "resolved",
              effectType: "creditRoll",
              source,
              dice,
              rawTotal: safeRawTotal,
              adjustment,
              adjustmentLabel,
              total: safeTotal,
              appRoll,
              resolution,
              resolvedAt: new Date().toISOString(),
            },
          },
          ...buildPendingEffectRemovalOperations(state, pendingEffectId),
        ],
        pauseAfter: false,
        visible: false,
      }),
    ];
  }


  createPendingEffectResolutionCommands({ state }) {
    const updateOperations = [];
    const creditCommands = [];
    const equipmentCommands = [];
    const factory = this;
    const resolvedEffects = [];
    const unresolvedByPath = new Map();

    function addUnresolved(path, effect) {
      if (!unresolvedByPath.has(path)) {
        unresolvedByPath.set(path, []);
      }
      unresolvedByPath.get(path).push(effect);
    }

    function addResolved(effect, resolution) {
      resolvedEffects.push({
        ...effect,
        status: "resolved",
        resolvedAt: new Date().toISOString(),
        resolution,
      });
    }

    function processEffect(path, effect) {
      if (!effect || typeof effect !== "object") {
        return;
      }

      const count = Number(effect.count ?? 1);
      const safeCount = Number.isFinite(count) ? count : 1;

      switch (effect.effectType) {
        case "addStoryPoints": {
          const storyAdjustment = getStoryPointEffectAdjustment({
            state,
            effect,
            count: safeCount,
          });

          if (storyAdjustment.adjustedCount > 0) {
            updateOperations.push({
              op: "increment",
              path: "worldLog.storyPoints",
              amount: storyAdjustment.adjustedCount,
            });
          }

          const adjustmentText = storyAdjustment.adjustmentLabel
            ? ` ${storyAdjustment.adjustmentLabel}`
            : "";
          addResolved(
            effect,
            `Added ${storyAdjustment.adjustedCount} story point${storyAdjustment.adjustedCount === 1 ? "" : "s"}.${adjustmentText}`
          );
          return;
        }

        case "addRumors":
          updateOperations.push({ op: "increment", path: "worldLog.rumors", amount: safeCount });
          addResolved(effect, `Added ${safeCount} rumor${safeCount === 1 ? "" : "s"}.`);
          return;

        case "addQuestRumors":
          updateOperations.push({ op: "increment", path: "worldLog.questRumors", amount: safeCount });
          addResolved(effect, `Added ${safeCount} quest rumor${safeCount === 1 ? "" : "s"}.`);
          return;

        case "addXp": {
          if (effect.crewMemberId) {
            updateOperations.push({
              op: "increment",
              path: `crewLog.crewDetails.${effect.crewMemberId}.xp`,
              amount: safeCount,
            });
            addResolved(effect, `Added ${safeCount} XP.`);
            return;
          }
          break;
        }

        case "addPatrons": {
          const records = makeWorldContactRecords({
            type: "patron",
            count: safeCount,
            source: effect.source || effect.label || "Character Creation",
          });

          updateOperations.push({
            op: "appendMany",
            path: "worldLog.patrons",
            values: records,
          });
          addResolved(effect, `Added ${safeCount} patron${safeCount === 1 ? "" : "s"} to the World Log.`);
          return;
        }

        case "addRivals": {
          const records = makeWorldContactRecords({
            type: "rival",
            count: safeCount,
            source: effect.source || effect.label || "Character Creation",
          });

          updateOperations.push({
            op: "appendMany",
            path: "worldLog.rivals",
            values: records,
          });
          addResolved(effect, `Added ${safeCount} rival${safeCount === 1 ? "" : "s"} to the World Log.`);
          return;
        }

        case "creditRoll": {
          const creditAdjustment = getCreditEffectAdjustment({ state, effect });

          if (creditAdjustment.ignored) {
            addResolved(
              effect,
              creditAdjustment.adjustmentLabel || "Ignored this credit gain."
            );
            return;
          }

          const command = factory.creditRoll({
            id: `${effect.id}-credit-roll`,
            pendingEffectId: effect.id,
            dice: effect.dice || effect.amount || "1D6",
            source: effect.source || effect.label || "Credit Roll",
            title: effect.label || `Roll ${effect.dice || effect.amount || "1D6"} Credits`,
            adjustment: creditAdjustment.adjustment,
            adjustmentLabel: creditAdjustment.adjustmentLabel,
            pauseAfter: false,
            visible: true,
          });

          // Do not also keep this as an unresolved effect in the resolver cleanup.
          // The credit command itself removes the pending effect after the player confirms the roll.
          creditCommands.push(command);
          return;
        }

        case "startingRoll": {
          const tableId = effect.rollType || effect.tableId || effect.raw?.type;
          const table = EQUIPMENT_ROLL_TABLES_BY_ID[tableId];

          if (!table) {
            break;
          }

          for (let index = 0; index < safeCount; index += 1) {
            const indexedEffectId = safeCount === 1 ? effect.id : `${effect.id}-${index + 1}`;
            const command = factory.equipmentTableRoll({
              id: `${indexedEffectId}-equipment-table`,
              pendingEffectId: indexedEffectId,
              tableId,
              source: effect.source || effect.label || "Starting Roll",
              title: `${effect.label || table.title}${safeCount > 1 ? ` ${index + 1}` : ""}`,
              pauseAfter: false,
              visible: true,
            });

            if (command) {
              equipmentCommands.push(command);
            }
          }

          addResolved(effect, `Queued ${safeCount} ${table.title} roll${safeCount === 1 ? "" : "s"}.`);
          return;
        }

        default:
          break;
      }

      addUnresolved(path, effect);
    }

    function processPath(path, effects) {
      if (!Array.isArray(effects)) {
        return;
      }

      effects.forEach((effect) => processEffect(path, effect));
    }

    processPath("crewLog.pendingEffects", state?.crewLog?.pendingEffects);
    processPath("worldLog.pendingEffects", state?.worldLog?.pendingEffects);

    Object.entries(state?.crewLog?.crewDetails || {}).forEach(([crewMemberId, detail]) => {
      processPath(`crewLog.crewDetails.${crewMemberId}.pendingEffects`, detail?.pendingEffects);
    });

    for (const [path, effects] of unresolvedByPath.entries()) {
      updateOperations.push({
        op: "set",
        path,
        value: effects,
      });
    }

    if (!unresolvedByPath.has("crewLog.pendingEffects")) {
      updateOperations.push({ op: "set", path: "crewLog.pendingEffects", value: [] });
    }

    if (!unresolvedByPath.has("worldLog.pendingEffects")) {
      updateOperations.push({ op: "set", path: "worldLog.pendingEffects", value: [] });
    }

    Object.keys(state?.crewLog?.crewDetails || {}).forEach((crewMemberId) => {
      const path = `crewLog.crewDetails.${crewMemberId}.pendingEffects`;
      if (!unresolvedByPath.has(path)) {
        updateOperations.push({ op: "set", path, value: [] });
      }
    });

    if (resolvedEffects.length > 0) {
      updateOperations.push({
        op: "appendMany",
        path: "crewLog.resolvedEffects",
        values: resolvedEffects,
      });
    }

    const commands = [];

    if (updateOperations.length > 0) {
      commands.push(
        this.updateState({
          id: "apply-pending-creation-effects",
          title: "Apply Pending Creation Effects",
          operations: updateOperations,
          pauseAfter: false,
          visible: false,
        })
      );
    }

    return [
      ...creditCommands,
      ...equipmentCommands,
      ...commands,
    ];
  }


  fromJSON(commandData) {
    const coreCommand = super.fromJSON(commandData);

    if (coreCommand) {
      return coreCommand;
    }

    if (!commandData || !commandData.type) {
      return null;
    }

    switch (commandData.type) {
      case "buildWorld":
        return new BuildWorldCommand(commandData);

      case "buildCrew":
        return new BuildCrewCommand(commandData);

      case "buildShip":
        return new BuildShipCommand(commandData);

      case "startTurn":
        return new StartTurnCommand(commandData);

      case "travelPhase":
        return new TravelPhaseCommand(commandData);

      case "decideTravel":
        return new DecideTravelCommand(commandData);

      case "newWorldArrival":
        return new NewWorldArrivalCommand(commandData);

      case "returnToVisitedWorld":
        return new ReturnToVisitedWorldCommand(commandData);

      case "applyStarshipTravelEvent":
        return new ApplyStarshipTravelEventCommand(commandData);

      case "worldPhase":
        return new WorldPhaseCommand(commandData);

      case "tabletopBattlePhase":
        return new TabletopBattlePhaseCommand(commandData);

      case "postBattlePhase":
        return new PostBattlePhaseCommand(commandData);

      case "buildStartingCrew":
        return new BuildStartingCrewCommand(commandData);

      case "crewMemberName":
        return new CrewMemberNameCommand(commandData);

      case "finalizeCrewMember":
        return new FinalizeCrewMemberCommand(commandData);

      case "queueCrewMemberTableResultUpdateCommands":
        return new QueueCrewMemberTableResultUpdateCommandsCommand(commandData);

      case "queueEquipmentTableResultUpdateCommands":
        return new QueueEquipmentTableResultUpdateCommandsCommand(commandData);

      case "queueShipTableResultUpdateCommands":
        return new QueueShipTableResultUpdateCommandsCommand(commandData);

      case "resolveCreditRoll":
        return new ResolveCreditRollCommand(commandData);

      case "resolveShipDebt":
        return new ResolveShipDebtCommand(commandData);

      case "applyShipSetup":
        return new ApplyShipSetupCommand(commandData);

      case "resolvePendingEffects":
        return new ResolvePendingEffectsCommand(commandData);

      case "campaignPrep":
        return new CampaignPrepCommand(commandData);

      case "resolveStartingStoryPoints":
        return new ResolveStartingStoryPointsCommand(commandData);

      case "buildStartingStash":
        return new BuildStartingStashCommand(commandData);

      case "terrainGenerator":
        return new TerrainGeneratorCommand(commandData);

      case "noMinisCombat":
        return new NoMinisCombatCommand(commandData);

      case "noMinisCombatRound":
        return new NoMinisCombatRoundCommand(commandData);

      case "noMinisContinue":
        return new NoMinisContinueCommand(commandData);

      case "noMinisInitiative":
        return new NoMinisInitiativeCommand(commandData);

      case "noMinisFirefight":
        return new NoMinisFirefightCommand(commandData);

      case "tabletopCombat":
        return new TabletopCombatCommand(commandData);

      case "tabletopCombatRound":
        return new TabletopCombatRoundCommand(commandData);

      case "tabletopContinue":
        return new TabletopContinueCommand(commandData);

      default:
        console.warn(`Unknown command type: ${commandData.type}`);
        return null;
    }
  }
}

export default FiveParsecsCommandFactory;
