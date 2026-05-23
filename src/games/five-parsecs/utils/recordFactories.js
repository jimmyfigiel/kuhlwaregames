function id(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function base({ roomId, crewId = "default", playerId }) {
  return {
    roomId,
    crewId,
    createdBy: playerId,
    updatedBy: playerId,
  };
}

export function createCrew({ roomId, playerId }) {
  return {
    crewId: "default",
    roomId,
    crewName: "",
    captainCrewMemberId: "",
    credits: 0,
    storyPoints: 0,
    storyTrack: "",
    campaignTurn: 1,
    clock: "",
    event: "",
    ship: {
      name: "",
      type: "",
      traits: [],
      upgrades: [],
      debt: 0,
      hullPoints: 0,
      notes: "",
    },
    createdBy: playerId,
    updatedBy: playerId,
  };
}

export function createCrewMember({ roomId, crewId, playerId }) {
  return {
    crewMemberId: id("member"),
    ...base({ roomId, crewId, playerId }),
    name: "",
    role: "",
    isCaptain: false,
    speciesType: "",
    background: "",
    motivation: "",
    class: "",
    stats: {
      reactions: 0,
      speed: 0,
      combat: 0,
      toughness: 0,
      savvy: 0,
      luck: 0,
    },
    xp: 0,
    injury: "",
    status: "active",
  };
}

export function createEquipment({ roomId, crewId, playerId }) {
  return {
    equipmentId: id("eq"),
    ...base({ roomId, crewId, playerId }),
    name: "",
    category: "item",
    subtype: "",
    locationType: "stash",
    crewMemberId: "",
    quantity: 1,
    weapon: {
      range: "",
      shots: 0,
      damage: 0,
      traits: [],
    },
    armor: {
      armorValue: 0,
      traits: [],
    },
    gear: {
      effect: "",
      uses: 0,
      traits: [],
    },
    notes: "",
  };
}

export function createWorld({ roomId, crewId, playerId }) {
  return {
    worldId: id("world"),
    ...base({ roomId, crewId, playerId }),
    name: "",
    type: "",
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
    currentWorld: false,
    visited: true,
  };
}

export function createPatron({ roomId, crewId, worldId = "", playerId }) {
  return {
    patronId: id("patron"),
    ...base({ roomId, crewId, playerId }),
    worldId,
    name: "",
    type: "",
    relationship: "",
    benefits: "",
    status: "active",
  };
}

export function createRival({ roomId, crewId, worldId = "", playerId }) {
  return {
    rivalId: id("rival"),
    ...base({ roomId, crewId, playerId }),
    worldId,
    name: "",
    type: "",
    reason: "",
    status: "active",
  };
}

export function createQuest({ roomId, crewId, playerId }) {
  return {
    questId: id("quest"),
    ...base({ roomId, crewId, playerId }),
    name: "",
    source: "",
    status: "active",
    progress: "",
  };
}

export function createRumor({ roomId, crewId, playerId }) {
  return {
    rumorId: id("rumor"),
    ...base({ roomId, crewId, playerId }),
    text: "",
    source: "",
    status: "unresolved",
  };
}

export function createEncounter({ roomId, crewId, playerId }) {
  return {
    encounterId: id("enc"),
    ...base({ roomId, crewId, playerId }),
    worldId: "",
    mission: "",
    encounterType: "",
    shinyBits: "",
    deploymentConditions: "",
    outcomeNotableEvents: "",
    enemyWeaponsSummary: "",
    enemyTypesSummary: "",
  };
}

export function createEnemyTemplate({ roomId, crewId, playerId }) {
  return {
    enemyTemplateId: id("tmpl"),
    ...base({ roomId, crewId, playerId }),
    name: "",
    type: "",
    ai: "",
    speed: 0,
    panic: "",
    combat: 0,
    toughness: 0,
    weapon: {
      name: "",
      shots: 0,
      range: "",
      damage: 0,
      traits: [],
    },
    traits: [],
    notes: "",
  };
}

export function createEncounterEnemy({ roomId, crewId, encounterId, template = null, playerId }) {
  const copied = template
    ? {
        sourceTemplateId: template.enemyTemplateId,
        name: template.name || "",
        type: template.type || "",
        ai: template.ai || "",
        speed: template.speed || 0,
        panic: template.panic || "",
        combat: template.combat || 0,
        toughness: template.toughness || 0,
        weapon: { ...(template.weapon || {}) },
        traits: [...(template.traits || [])],
        notes: template.notes || "",
      }
    : {
        sourceTemplateId: "",
        name: "",
        type: "",
        ai: "",
        speed: 0,
        panic: "",
        combat: 0,
        toughness: 0,
        weapon: {
          name: "",
          shots: 0,
          range: "",
          damage: 0,
          traits: [],
        },
        traits: [],
        notes: "",
      };

  return {
    encounterEnemyId: id("enemy"),
    ...base({ roomId, crewId, playerId }),
    encounterId,
    number: 1,
    ...copied,
  };
}

export function createLogEntry({ roomId, crewId, targetType = "crew", targetId = "default", playerId }) {
  return {
    logEntryId: id("log"),
    ...base({ roomId, crewId, playerId }),
    targetType,
    targetId,
    title: "",
    body: "",
    turnNumber: 1,
    dateLabel: "",
  };
}
