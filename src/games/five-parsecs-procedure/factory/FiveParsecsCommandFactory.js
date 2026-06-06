import { CommandFactory } from "../../../procedure-core/factory";
import {
  ApplyFixedTableResultCommand,
  BuildStartingCrewCommand,
  BuildStartingStashCommand,
  CrewMemberNameCommand,
  FinalizeCrewMemberCommand,
  QueueCrewMemberTableResultUpdateCommandsCommand,
  QueueEquipmentTableResultUpdateCommandsCommand,
  ResolveCreditRollCommand,
  ResolvePendingEffectsCommand,
} from "../commands";
import { buildCrewMemberTableResultUpdateCommands } from "../effects";
import { EQUIPMENT_ROLL_TABLES_BY_ID } from "../data/tables";
import {
  WEAPONS_TABLE,
  GUN_MODS_TABLE,
  GUN_SIGHTS_TABLE,
  CONSUMABLES_TABLE,
  PROTECTION_TABLE,
  IMPLANTS_TABLE,
  UTILITY_DEVICES_TABLE,
  ONBOARD_ITEMS_TABLE,
} from "../data/equipment";


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

function normalizeLookupName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const EQUIPMENT_NAME_ALIASES = {
  handgun: "hand gun",
  duelingpistol: "duelling pistol",
  brutalmeleeweapon: "brutal melee weapon",
  marksmanrifle: "marksman’s rifle",
};

function findCatalogItemByName(tables, name) {
  const wanted = normalizeLookupName(EQUIPMENT_NAME_ALIASES[normalizeLookupName(name)] || name);

  return tables.flat().find((item) => normalizeLookupName(item.name) === wanted) || null;
}

function getCatalogItemForTableSelection({ tableId, name }) {
  if (["lowTechWeapon", "militaryWeapon", "highTechWeapon"].includes(tableId)) {
    return {
      kind: "weapon",
      item: findCatalogItemByName([WEAPONS_TABLE], name),
    };
  }

  return {
    kind: "gear",
    item: findCatalogItemByName([
      GUN_MODS_TABLE,
      GUN_SIGHTS_TABLE,
      CONSUMABLES_TABLE,
      PROTECTION_TABLE,
      IMPLANTS_TABLE,
      UTILITY_DEVICES_TABLE,
      ONBOARD_ITEMS_TABLE,
    ], name),
  };
}

function blankEquipmentDetails() {
  return {
    weapon: { range: "", shots: "", damage: "", traits: [], mods: [], sight: "" },
    armor: { armorValue: "", save: "", traits: [] },
    gear: { effect: "", uses: "", traits: [] },
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
  const catalog = getCatalogItemForTableSelection({ tableId, name });
  const item = catalog?.item;
  const isWeapon = catalog?.kind === "weapon";
  const details = blankEquipmentDetails();

  if (isWeapon && item) {
    details.weapon = {
      range: item.range,
      shots: item.shots,
      damage: item.damage,
      traits: [...(item.traits || [])],
      mods: [],
      sight: "",
    };
  } else if (item) {
    details.gear = {
      effect: item.effect || "",
      uses: item.singleUse ? 1 : "",
      traits: [...(item.traits || []), item.type].filter(Boolean),
    };

    if (item.save || item.type) {
      details.armor = {
        armorValue: item.save || "",
        save: item.save || "",
        traits: [item.type].filter(Boolean),
      };
    }
  }

  return {
    id: `equipment-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
    name,
    category: isWeapon ? "weapon" : item?.save ? "protection" : "gear",
    locationType,
    crewMemberId,
    source: source || "",
    sourceTableId: tableId,
    sourceTableTitle: selectedRow?.tableTitle || "",
    sourceRoll: selectedRow?.roll ?? "",
    origin: locationType === "character" ? "characterCreation" : "stash",
    notes: source ? `Created from ${source}` : "",
    createdAt: new Date().toISOString(),
    ...details,
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


export class FiveParsecsCommandFactory extends CommandFactory {
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
    crewMemberDetail = {},
  }) {
    return buildCrewMemberTableResultUpdateCommands({
      commandFactory: this,
      crewMemberId,
      crewMemberNumber,
      sourcePath,
      resultKind,
      result,
      crewMemberDetail,
    });
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
    modifier = 0,
    title = null,
    pauseAfter = false,
    visible = true,
  }) {
    return new ResolveCreditRollCommand({
      id,
      title: title || `Roll ${dice} Credits`,
      pendingEffectId,
      dice,
      source,
      modifier,
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
    rolledTotal = null,
    modifier = 0,
    appRoll = null,
  }) {
    return [
      this.updateState({
        id: `${pendingEffectId}-apply-credit-roll`,
        title: `Add ${total} Credits`,
        operations: [
          {
            op: "increment",
            path: "crewLog.credits",
            amount: total,
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
              total,
              rolledTotal,
              modifier,
              appRoll,
              resolution: `Added ${total} credits${modifier ? ` after modifier ${modifier}` : ""}.`,
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
        case "addStoryPoints":
          updateOperations.push({ op: "increment", path: "worldLog.storyPoints", amount: safeCount });
          addResolved(effect, `Added ${safeCount} story point${safeCount === 1 ? "" : "s"}.`);
          return;

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
          const command = factory.creditRoll({
            id: `${effect.id}-credit-roll`,
            pendingEffectId: effect.id,
            dice: effect.dice || effect.amount || "1D6",
            source: effect.source || effect.label || "Credit Roll",
            modifier: effect.modifier || 0,
            title: effect.label || `Roll ${effect.dice || effect.amount || "1D6"} Credits`,
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
      case "applyFixedTableResult":
        return new ApplyFixedTableResultCommand(commandData);

      case "buildStartingCrew":
        return new BuildStartingCrewCommand(commandData);

      case "buildStartingStash":
        return new BuildStartingStashCommand(commandData);

      case "crewMemberName":
        return new CrewMemberNameCommand(commandData);

      case "finalizeCrewMember":
        return new FinalizeCrewMemberCommand(commandData);

      case "queueCrewMemberTableResultUpdateCommands":
        return new QueueCrewMemberTableResultUpdateCommandsCommand(commandData);

      case "queueEquipmentTableResultUpdateCommands":
        return new QueueEquipmentTableResultUpdateCommandsCommand(commandData);

      case "resolveCreditRoll":
        return new ResolveCreditRollCommand(commandData);

      case "resolvePendingEffects":
        return new ResolvePendingEffectsCommand(commandData);

      default:
        console.warn(`Unknown command type: ${commandData.type}`);
        return null;
    }
  }
}

export default FiveParsecsCommandFactory;
