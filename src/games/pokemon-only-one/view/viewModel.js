// src/games/pokemon-only-one/view/viewModel.js

export function resolveModel(props) {
  const candidates = [
    props?.gameState,
    props?.room?.gameState,
    props?.state,
    props?.room?.state,
    props?.state?.gameState,
    props?.state?.state,
    props?.game?.state,
  ];

  const found = candidates.find(isPokemonModel) || null;
  return found ? upgradeModelForView(found, props) : null;
}

export function upgradeModelForView(model, props = {}) {
  if (!model) {
    return model;
  }

  if (model.zones) {
    const upgradedModel = {
      ...model,
      settings: normalizeSettings(model.settings),
      setup: normalizeSetup(model.setup),
      display: {
        screen: "BATTLE_SCREEN",
        ...(model.display || {}),
        popup: model.display?.popup || (model.display?.zoomCardId ? { type: "CARD_ZOOM", cardId: model.display.zoomCardId } : null),
        selection: model.display?.selection || null,
      },
    };

    return {
      ...upgradedModel,
      view: {
        ...(upgradedModel.view || {}),
        sideNames: resolveSideDisplayNames(props, upgradedModel),
      },
    };
  }

  const zones = {};
  for (const [spaceId, space] of Object.entries(model.spaces || {})) {
    zones[spaceId] = {
      id: space.id || spaceId,
      ownerId: spaceId.startsWith("opponent") ? "opponent" : "player",
      zoneKind: spaceId.includes("Active") ? "active" : spaceId.includes("Bench") ? "bench" : spaceId.includes("Prize") ? "prize" : "space",
      name: space.name || spaceId,
      cardIds: space.cardId ? [space.cardId] : [],
      visibility: "public",
      capacity: 1,
      faceDown: spaceId.includes("Prize"),
    };
  }

  const playerSides = {};
  for (const [sideId, side] of Object.entries(model.playerSides || {})) {
    playerSides[sideId] = {
      ...side,
      activeZoneId: side.activeZoneId || side.activeSpaceId,
      benchZoneIds: side.benchZoneIds || side.benchSpaceIds || [],
      prizeZoneIds: side.prizeZoneIds || side.prizeSpaceIds || [],
      deckZoneId: side.deckZoneId || `${side.id}Deck`,
      discardZoneId: side.discardZoneId || `${side.id}Discard`,
      handZoneId: side.handZoneId || `${side.id}Hand`,
    };
  }

  const upgradedModel = {
    ...model,
    playerSides,
    zones,
    settings: normalizeSettings(model.settings),
    setup: normalizeSetup(model.setup),
    display: {
      screen: "BATTLE_SCREEN",
      ...(model.display || {}),
      popup: model.display?.popup || (model.display?.zoomCardId ? { type: "CARD_ZOOM", cardId: model.display.zoomCardId } : null),
      selection: model.display?.selection || null,
    },
  };

  return {
    ...upgradedModel,
    view: {
      ...(upgradedModel.view || {}),
      sideNames: resolveSideDisplayNames(props, upgradedModel),
    },
  };
}

export function isPokemonModel(value) {
  return Boolean(
    value &&
      value.gameId === "pokemon-only-one" &&
      value.playerSides &&
      (value.zones || value.spaces) &&
      value.cards &&
      value.display &&
      Array.isArray(value.log)
  );
}

export function formatLog(log) {
  return (log || [])
    .map((entry) => {
      const base = `#${String(entry.number).padStart(3, "0")} ${entry.time} | ${entry.type} | ${entry.message}`;
      return entry.details ? `${base} | ${JSON.stringify(entry.details)}` : base;
    })
    .join("\n");
}

export function getSideDisplayName(model, sideId) {
  const normalizedSideId = sideId === "opponent" ? "opponent" : "player";
  return (
    cleanNonGenericSideName(model?.view?.sideNames?.[normalizedSideId]) ||
    cleanNonGenericSideName(model?.playerSides?.[normalizedSideId]?.name) ||
    (normalizedSideId === "opponent" ? "Player 2" : "Player 1")
  );
}

export function getViewerRelationshipLabel(model, sideId, viewerSideId) {
  const displayName = getSideDisplayName(model, sideId);
  return sideId === viewerSideId ? `${displayName} (you)` : displayName;
}

export function getZoneDisplayName(model, zoneOrId) {
  const zone = typeof zoneOrId === "string" ? model?.zones?.[zoneOrId] : zoneOrId;
  if (!zone) {
    return typeof zoneOrId === "string" ? zoneOrId : "Zone";
  }

  const sideName = getSideDisplayName(model, zone.ownerId);
  const kind = zone.zoneKind || "zone";

  if (kind === "deck") return `${sideName} Deck`;
  if (kind === "discard") return `${sideName} Discard`;
  if (kind === "hand") return `${sideName} Hand`;
  if (kind === "active") return `${sideName} Active`;

  if (kind === "bench") {
    return `${sideName} Bench ${getTrailingNumber(zone.name || zone.id)}`.trim();
  }

  if (kind === "prize") {
    return `${sideName} Prize ${getTrailingNumber(zone.name || zone.id)}`.trim();
  }

  return cleanName(zone.name) || `${sideName} Zone`;
}

function normalizeSetup(setup = {}) {
  return {
    phase: setup.phase || "setup",
    step: setup.step || (setup.phase === "turn" ? "turn" : "coinFlip"),
    prizeCount: clampPrizeCount(setup.prizeCount),
    firstPlayerSideId: setup.firstPlayerSideId || null,
    currentTurnSideId: setup.currentTurnSideId || setup.firstPlayerSideId || null,
    pokemonRevealed: Boolean(setup.pokemonRevealed),
    sides: {
      player: normalizeSetupSide(setup.sides?.player),
      opponent: normalizeSetupSide(setup.sides?.opponent),
    },
    coinFlip: setup.coinFlip || null,
  };
}

function normalizeSetupSide(side = {}) {
  return {
    ready: Boolean(side.ready),
    openingHandDrawn: Boolean(side.openingHandDrawn),
    prizesSet: Boolean(side.prizesSet),
    mulliganCount: Number.isFinite(Number(side.mulliganCount)) ? Number(side.mulliganCount) : 0,
    hasBasicInHand: Boolean(side.hasBasicInHand),
    needsMulligan: Boolean(side.needsMulligan),
    activePlaced: Boolean(side.activePlaced),
  };
}

function clampPrizeCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Math.max(1, Math.min(6, Number.isFinite(parsed) ? parsed : 6));
}

function normalizeSettings(settings = {}) {
  const playMode = settings.playMode || (settings.onePlayerTestMode === false ? "twoPlayer" : "onePlayerTest");
  return {
    ...settings,
    playMode,
    onePlayerTestMode: playMode === "onePlayerTest",
  };
}

function resolveSideDisplayNames(props = {}, model = {}) {
  const names = {
    player: cleanNonGenericSideName(model.playerSides?.player?.name) || "Player 1",
    opponent: cleanNonGenericSideName(model.playerSides?.opponent?.name) || "Player 2",
  };

  applyObjectSideNames(names, props.room?.sideNames);
  applyObjectSideNames(names, props.room?.playerNames);
  applyObjectSideNames(names, props.room?.playersBySide);
  applyObjectSideNames(names, props.room?.slots);

  applyRoomPlayers(names, props.room, props.player, props.authUser);

  const currentPlayerName = getPersonName(props.player);
  const viewerSideId = resolveViewerSideId(props);
  if (currentPlayerName) {
    names[viewerSideId] = currentPlayerName;
  }

  return names;
}

function applyObjectSideNames(names, source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return;
  }

  for (const [rawKey, rawValue] of Object.entries(source)) {
    const sideId = normalizeSlot(rawKey);
    if (!sideId) continue;

    const name = getPersonName(rawValue) || cleanName(rawValue?.name || rawValue?.displayName || rawValue?.playerName || rawValue);
    if (name) {
      names[sideId] = name;
    }
  }
}

function applyRoomPlayers(names, room = {}, currentPlayer = {}, authUser = {}) {
  const roomPlayers = Array.isArray(room.players) ? room.players : [];
  const currentPlayerId = normalizeId(currentPlayer?.id || currentPlayer?.playerId || currentPlayer?.playerCode || "");
  const currentAuthUid = normalizeId(authUser?.uid || "");

  const usedSideIds = new Set();

  roomPlayers.forEach((roomPlayer, index) => {
    const explicitSideId = normalizeSlot(
      roomPlayer?.slotId ||
        roomPlayer?.slot ||
        roomPlayer?.sideId ||
        roomPlayer?.playerSlot ||
        roomPlayer?.position ||
        ""
    );

    const sideId = explicitSideId || (index === 0 ? "player" : index === 1 ? "opponent" : "");
    if (!sideId) return;

    const name = getPersonName(roomPlayer);
    if (name) {
      names[sideId] = name;
      usedSideIds.add(sideId);
    }
  });

  if (currentPlayerId || currentAuthUid) {
    const match = roomPlayers.find((roomPlayer) => {
      const roomPlayerId = normalizeId(roomPlayer?.playerId || roomPlayer?.id || roomPlayer?.playerCode || "");
      const roomAuthUid = normalizeId(roomPlayer?.authUid || roomPlayer?.uid || roomPlayer?.firebaseUid || "");
      return Boolean((currentPlayerId && roomPlayerId === currentPlayerId) || (currentAuthUid && roomAuthUid === currentAuthUid));
    });

    const matchedSideId = normalizeSlot(
      match?.slotId || match?.slot || match?.sideId || match?.playerSlot || match?.position || ""
    );

    const currentPlayerName = getPersonName(currentPlayer) || getPersonName(match);
    if (matchedSideId && currentPlayerName) {
      names[matchedSideId] = currentPlayerName;
      usedSideIds.add(matchedSideId);
    }
  }

  const playerIds = Array.isArray(room.playerIds) ? room.playerIds.map(normalizeId).filter(Boolean) : [];
  const playerNames = Array.isArray(room.playerNames) ? room.playerNames.map(cleanName) : [];

  playerNames.forEach((name, index) => {
    const sideId = index === 0 ? "player" : index === 1 ? "opponent" : "";
    if (sideId && name && !usedSideIds.has(sideId)) {
      names[sideId] = name;
    }
  });

  if (currentPlayerId && playerIds.includes(currentPlayerId)) {
    const sideId = playerIds.indexOf(currentPlayerId) === 0 ? "player" : "opponent";
    const currentPlayerName = getPersonName(currentPlayer);
    if (currentPlayerName) {
      names[sideId] = currentPlayerName;
    }
  }
}

function resolveViewerSideId(props = {}) {
  const explicitSlot = normalizeSlot(
    props.playerSlot ||
      props.currentPlayerSlot ||
      props.sideId ||
      props.player?.slotId ||
      props.player?.slot ||
      props.player?.playerSlot ||
      props.player?.sideId ||
      ""
  );

  if (explicitSlot) {
    return explicitSlot;
  }

  const room = props.room || {};
  const player = props.player || {};
  const authUser = props.authUser || {};
  const playerId = normalizeId(player.id || player.playerId || player.playerCode || "");
  const authUid = normalizeId(authUser.uid || "");

  const roomPlayers = Array.isArray(room.players) ? room.players : [];
  const matchingRoomPlayer = roomPlayers.find((roomPlayer) => {
    const roomPlayerId = normalizeId(roomPlayer.playerId || roomPlayer.id || roomPlayer.playerCode || "");
    const roomAuthUid = normalizeId(roomPlayer.authUid || roomPlayer.uid || roomPlayer.firebaseUid || "");
    return Boolean((playerId && roomPlayerId === playerId) || (authUid && roomAuthUid === authUid));
  });

  const savedRoomSlot = normalizeSlot(
    matchingRoomPlayer?.slotId ||
      matchingRoomPlayer?.slot ||
      matchingRoomPlayer?.sideId ||
      matchingRoomPlayer?.playerSlot ||
      matchingRoomPlayer?.position ||
      ""
  );

  if (savedRoomSlot) {
    return savedRoomSlot;
  }

  const playerIds = Array.isArray(room.playerIds) ? room.playerIds.map(normalizeId).filter(Boolean) : [];
  const index = playerId ? playerIds.indexOf(playerId) : -1;

  if (index === 1) {
    return "opponent";
  }

  return "player";
}

function getPersonName(value) {
  if (!value) return "";
  if (typeof value === "string") return cleanName(value);

  return cleanName(
    value.name ||
      value.displayName ||
      value.playerName ||
      value.nickname ||
      value.label ||
      value.profile?.name ||
      value.player?.name ||
      value.player?.displayName ||
      value.player?.playerName ||
      ""
  );
}

function getTrailingNumber(value) {
  const match = String(value || "").match(/(\d+)\s*$/);
  return match ? match[1] : "";
}

function normalizeSlot(value) {
  const raw = normalizeId(value).toLowerCase();

  if (!raw) {
    return "";
  }

  if (["p1", "player", "player1", "playerone", "one", "1", "side1", "slot1", "host", "creator"].includes(raw)) {
    return "player";
  }

  if (["p2", "opponent", "player2", "playertwo", "two", "2", "side2", "slot2", "guest", "joiner"].includes(raw)) {
    return "opponent";
  }

  return "";
}

function normalizeId(value) {
  return String(value || "").trim();
}

function cleanName(value) {
  const text = String(value || "").trim();
  return text || "";
}

function cleanNonGenericSideName(value) {
  const text = cleanName(value);
  const normalized = text.toLowerCase();

  if (["player", "opponent", "player side", "opponent side"].includes(normalized)) {
    return "";
  }

  return text;
}
