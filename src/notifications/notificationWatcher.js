// src/notifications/notificationWatcher.js

import {
  notifyYourTurn,
  notifyOpponentJoined,
  notifyOpponentLeft,
  notifyGameEnded,
} from "./notificationManager.js";

function getPlayerIds(roomState) {
  if (!roomState?.gameState?.players) {
    return [];
  }

  return Object.keys(roomState.gameState.players);
}

function getCurrentTurnPlayerId(roomState) {
  return (
    roomState?.gameState?.gameData?.currentTurnPlayerId ??
    roomState?.gameState?.gameData?.activePlayerId ??
    roomState?.gameState?.currentTurnPlayerId ??
    roomState?.gameState?.activePlayerId ??
    null
  );
}

function getGameTitle(roomState) {
  return (
    roomState?.gameTitle ??
    roomState?.game?.title ??
    roomState?.gameState?.gameData?.gameTitle ??
    "Kuhlware Games"
  );
}

function getWinnerId(roomState) {
  return (
    roomState?.gameState?.gameData?.winnerId ??
    roomState?.gameState?.winnerId ??
    null
  );
}

function getPlayerDisplayName(roomState, playerId) {
  return (
    roomState?.gameState?.players?.[playerId]?.displayName ??
    roomState?.players?.[playerId]?.displayName ??
    "Player"
  );
}

export function checkRoomNotifications({
  previousRoomState,
  nextRoomState,
  localPlayerId,
}) {
  if (!nextRoomState || !localPlayerId) {
    return;
  }

  const previousTurnPlayerId = getCurrentTurnPlayerId(previousRoomState);
  const nextTurnPlayerId = getCurrentTurnPlayerId(nextRoomState);

  const gameTitle = getGameTitle(nextRoomState);

  if (
    previousTurnPlayerId &&
    previousTurnPlayerId !== localPlayerId &&
    nextTurnPlayerId === localPlayerId
  ) {
    notifyYourTurn(gameTitle);
  }

  const previousPlayerIds = new Set(getPlayerIds(previousRoomState));
  const nextPlayerIds = new Set(getPlayerIds(nextRoomState));

  for (const playerId of nextPlayerIds) {
    if (playerId !== localPlayerId && !previousPlayerIds.has(playerId)) {
      notifyOpponentJoined(getPlayerDisplayName(nextRoomState, playerId));
    }
  }

  for (const playerId of previousPlayerIds) {
    if (playerId !== localPlayerId && !nextPlayerIds.has(playerId)) {
      notifyOpponentLeft(getPlayerDisplayName(previousRoomState, playerId));
    }
  }

  const previousWinnerId = getWinnerId(previousRoomState);
  const nextWinnerId = getWinnerId(nextRoomState);

  if (!previousWinnerId && nextWinnerId) {
    if (nextWinnerId === localPlayerId) {
      notifyGameEnded("You won!");
    } else {
      notifyGameEnded(`${getPlayerDisplayName(nextRoomState, nextWinnerId)} won.`);
    }
  }
}