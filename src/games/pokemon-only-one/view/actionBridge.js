// src/games/pokemon-only-one/view/actionBridge.js

export function createActionBridge(props) {
  const callback = props?.submitAction;
  const playerSlot = resolvePlayerSlot(props);
  const viewerSideId = playerSlotToSideId(playerSlot);

  if (typeof callback !== "function") {
    return {
      ready: false,
      playerSlot,
      viewerSideId,
      send(action) {
        console.error("[pokemon-only-one view] missing props.submitAction", { action, propKeys: Object.keys(props || {}) });
      },
    };
  }

  return {
    ready: true,
    playerSlot,
    viewerSideId,
    send(action) {
      const cleanAction = {
        ...(action || {}),
        type: action?.type || "UNKNOWN",
        playerSlot,
        viewerSideId,
      };

      console.log("[pokemon-only-one view] submitAction(action)", cleanAction);
      callback(cleanAction);
    },
  };
}

export function resolvePlayerSlot(props = {}) {
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

  const playerIds = getRoomPlayerIds(room);
  const index = playerId ? playerIds.indexOf(playerId) : -1;

  if (index === 0) {
    return "player";
  }

  if (index === 1) {
    return "opponent";
  }

  if (playerId && normalizeId(room.createdBy || room.createdByPlayerId || room.ownerId || "") === playerId) {
    return "player";
  }

  return "player";
}

function getRoomPlayerIds(room = {}) {
  if (Array.isArray(room.playerIds)) {
    return room.playerIds.map(normalizeId).filter(Boolean);
  }

  if (Array.isArray(room.players)) {
    return room.players
      .map((roomPlayer) => normalizeId(roomPlayer.playerId || roomPlayer.id || roomPlayer.playerCode || ""))
      .filter(Boolean);
  }

  return [];
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

  return raw;
}

function playerSlotToSideId(playerSlot) {
  return normalizeSlot(playerSlot) === "opponent" ? "opponent" : "player";
}

function normalizeId(value) {
  return String(value || "").trim();
}
