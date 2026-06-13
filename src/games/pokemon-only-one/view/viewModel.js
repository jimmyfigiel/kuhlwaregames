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
  return found ? upgradeModelForView(found) : null;
}

export function upgradeModelForView(model) {
  if (!model) {
    return model;
  }

  if (model.zones) {
    return {
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

  return {
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


function normalizeSetup(setup = {}) {
  return {
    phase: setup.phase || "setup",
    prizeCount: clampPrizeCount(setup.prizeCount),
    currentTurnSideId: setup.currentTurnSideId || null,
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
