export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createCrew({ roomId, playerId }) {
  const timestamp = nowIso();

  return {
    crewId: "default",

    roomId,

    crewName: "New Adventure",
    captainCrewMemberId: "",

    storyPoints: 0,
    credits: 0,
    debt: 0,
    campaignTurn: 1,

    rulesCurrentPage: 1,
    rulesPageOffset: 0,

    starship: {
      name: "",
      shipType: "",
      hasShip: true,

      hullDamage: 0,
      hullThreshold: 0,

      debtOwed: 0,
      financedAmount: 0,

      notes: "",

      components: [],
    },

    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createCrewMember({ roomId, crewId, playerId }) {
  const timestamp = nowIso();

  return {
    crewMemberId: makeId("crewMember"),

    roomId,
    crewId,

    name: "New Crew Member",
    speciesType: "",
    background: "",
    motivation: "",
    class: "",

    reactions: 0,
    speed: 0,
    combatSkill: 0,
    toughness: 0,
    savvy: 0,
    luck: 0,

    xp: 0,
    currentStatus: "active",
    injuryRecoveryTurns: 0,

    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

function blankWeapon() {
  return {
    range: "",
    shots: 0,
    damage: 0,
    traits: [],
    mods: [],
    sight: "",
  };
}

function blankArmor() {
  return {
    armorValue: "",
    save: "",
    traits: [],
  };
}

function blankGear() {
  return {
    effect: "",
    uses: "",
    traits: [],
  };
}

function blankConsumable() {
  return {
    singleUse: false,
    freeAction: false,
    carriedByCrew: true,
    usableFromStash: false,
    cannotUseSpecies: [],
    duplicateUseBenefit: true,
  };
}

function blankImplant() {
  return {
    permanent: false,
    removable: true,
    maxPerCharacter: 0,
    cannotUseSpecies: [],
  };
}

function blankUtility() {
  return {
    maxPerCharacter: 0,
  };
}

function blankOnboard() {
  return {
    carriedByCrew: true,
    usedFromShip: false,
    campaignTurnItem: false,
    singleUse: false,
    cannotUseSpecies: [],
  };
}

export function createEquipment({ roomId, crewId, playerId }) {
  const timestamp = nowIso();

  return {
    equipmentId: makeId("equipment"),

    roomId,
    crewId,
    equipmentTemplateId: "",

    name: "New Equipment",
    category: "gear",
    subtype: "",

    quantity: 1,

    locationType: "stash",
    crewMemberId: "",

    damaged: false,
    destroyed: false,

    weapon: blankWeapon(),
    armor: blankArmor(),
    gear: blankGear(),
    consumable: blankConsumable(),
    implant: blankImplant(),
    utility: blankUtility(),
    onboard: blankOnboard(),

    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createWorld({ roomId, crewId, playerId }) {
  const timestamp = nowIso();

  return {
    worldId: makeId("world"),

    roomId,
    crewId,

    name: "New World",
    type: "",
    currentWorld: false,
    visited: true,

    worldTraits: [],

    licensing: {
      required: false,
      licenseType: "",
      status: "not_required",
      notes: "",
    },

    invasion: {
      status: "none",
      invaderType: "",
      progress: "",
      notes: "",
    },

    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createPatron({ roomId, crewId, worldId = "", playerId }) {
  const timestamp = nowIso();

  return {
    patronId: makeId("patron"),

    roomId,
    crewId,
    worldId,

    name: "New Patron",
    type: "",
    relationship: "",
    benefits: "",
    status: "active",

    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createRival({ roomId, crewId, worldId = "", playerId }) {
  const timestamp = nowIso();

  return {
    rivalId: makeId("rival"),

    roomId,
    crewId,
    worldId,

    name: "New Rival",
    type: "",
    reason: "",
    status: "active",

    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createQuest({ roomId, crewId, playerId }) {
  const timestamp = nowIso();

  return {
    questId: makeId("quest"),

    roomId,
    crewId,

    name: "New Quest",
    status: "active",
    progress: "",
    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createRumor({ roomId, crewId, playerId }) {
  const timestamp = nowIso();

  return {
    rumorId: makeId("rumor"),

    roomId,
    crewId,

    name: "New Rumor",
    status: "active",
    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createEncounter({ roomId, crewId, playerId }) {
  const timestamp = nowIso();

  return {
    encounterId: makeId("encounter"),

    roomId,
    crewId,

    name: "New Encounter",
    worldId: "",
    objective: "",
    enemyType: "",
    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createEncounterEnemy({
  roomId,
  crewId,
  encounterId,
  template = null,
  playerId,
}) {
  const timestamp = nowIso();

  return {
    encounterEnemyId: makeId("encounterEnemy"),

    roomId,
    crewId,
    encounterId,

    name: template?.name || "Enemy",
    count: template?.count || 1,

    reactions: template?.reactions || 0,
    speed: template?.speed || 0,
    combatSkill: template?.combatSkill || 0,
    toughness: template?.toughness || 0,
    savvy: template?.savvy || 0,

    weapon: {
      name: template?.weapon?.name || "",
      range: template?.weapon?.range || "",
      shots: template?.weapon?.shots || 0,
      damage: template?.weapon?.damage || 0,
      traits: [...(template?.weapon?.traits || [])],
      mods: [...(template?.weapon?.mods || [])],
      sight: template?.weapon?.sight || "",
    },

    notes: template?.notes || "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createEnemyTemplate({ roomId, crewId, playerId }) {
  const timestamp = nowIso();

  return {
    enemyTemplateId: makeId("enemyTemplate"),

    roomId,
    crewId,

    name: "New Enemy",
    count: 1,

    reactions: 0,
    speed: 0,
    combatSkill: 0,
    toughness: 0,
    savvy: 0,

    weapon: {
      name: "",
      range: "",
      shots: 0,
      damage: 0,
      traits: [],
      mods: [],
      sight: "",
    },

    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

const CAMPAIGN_STEPS = [
  {
    stepOrder: 1,
    stepName: "Step 1: Travel",
    pageReference: "p. 69",
    status: "not_started",
    notes: "",
    tasks: [
      { taskOrder: 1, taskName: "Flee Invasion", condition: "if applicable", status: "not_started", notes: "" },
      { taskOrder: 2, taskName: "Decide whether to travel", condition: "", status: "not_started", notes: "" },
      { taskOrder: 3, taskName: "Starship travel event", condition: "if applicable", status: "not_started", notes: "" },
      { taskOrder: 4, taskName: "New world arrival steps", condition: "if applicable", status: "not_started", notes: "" },
    ],
  },
  {
    stepOrder: 2,
    stepName: "Step 2: World",
    pageReference: "p. 76",
    status: "not_started",
    notes: "",
    tasks: [
      { taskOrder: 1, taskName: "Upkeep and ship repairs", condition: "", status: "not_started", notes: "" },
      { taskOrder: 2, taskName: "Assign and resolve crew tasks", condition: "", status: "not_started", notes: "" },
      { taskOrder: 3, taskName: "Determine job offers", condition: "", status: "not_started", notes: "" },
      { taskOrder: 4, taskName: "Assign equipment", condition: "", status: "not_started", notes: "" },
      { taskOrder: 5, taskName: "Resolve any Rumors", condition: "", status: "not_started", notes: "" },
      { taskOrder: 6, taskName: "Choose your battle", condition: "", status: "not_started", notes: "" },
    ],
  },
  {
    stepOrder: 3,
    stepName: "Step 3: Tabletop Battle",
    pageReference: "p. 87",
    status: "not_started",
    notes: "",
    tasks: [
      { taskOrder: 1, taskName: "Resolve the battle", condition: "use no-minis rules if applicable", status: "not_started", notes: "" },
    ],
  },
  {
    stepOrder: 4,
    stepName: "Step 4: Post-Battle Sequence",
    pageReference: "p. 119",
    status: "not_started",
    notes: "",
    tasks: [
      { taskOrder: 1, taskName: "Resolve Rival status", condition: "", status: "not_started", notes: "" },
      { taskOrder: 2, taskName: "Resolve Patron status", condition: "", status: "not_started", notes: "" },
      { taskOrder: 3, taskName: "Determine Quest progress", condition: "", status: "not_started", notes: "" },
      { taskOrder: 4, taskName: "Get paid", condition: "", status: "not_started", notes: "" },
      { taskOrder: 5, taskName: "Battlefield finds", condition: "", status: "not_started", notes: "" },
      { taskOrder: 6, taskName: "Check for Invasion", condition: "", status: "not_started", notes: "" },
      { taskOrder: 7, taskName: "Gather the Loot", condition: "", status: "not_started", notes: "" },
      { taskOrder: 8, taskName: "Determine Injuries and recovery", condition: "", status: "not_started", notes: "" },
      { taskOrder: 9, taskName: "Experience and Character Upgrades", condition: "", status: "not_started", notes: "" },
      { taskOrder: 10, taskName: "Invest in Advanced Training", condition: "", status: "not_started", notes: "" },
      { taskOrder: 11, taskName: "Purchase items", condition: "", status: "not_started", notes: "" },
      { taskOrder: 12, taskName: "Roll for a Campaign Event", condition: "", status: "not_started", notes: "" },
      { taskOrder: 13, taskName: "Roll for a Character Event", condition: "", status: "not_started", notes: "" },
      { taskOrder: 14, taskName: "Check for Galactic War progress", condition: "", status: "not_started", notes: "" },
    ],
  },
];

export function createCampaignTurn({ roomId, crewId, playerId, turnNumber }) {
  const timestamp = nowIso();

  return {
    campaignTurnId: makeId("campaignTurn"),

    roomId,
    crewId,

    turnNumber,
    status: "active",
    notes: "",

    steps: CAMPAIGN_STEPS.map((step) => ({
      ...step,
      tasks: step.tasks.map((task) => ({ ...task })),
    })),

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function createLogEntry({
  roomId,
  crewId,
  targetType = "crew",
  targetId = crewId,
  playerId,
}) {
  const timestamp = nowIso();

  return {
    logEntryId: makeId("logEntry"),

    roomId,
    crewId,

    targetType,
    targetId,

    title: "Manual note",
    body: "",
    changeSummary: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}