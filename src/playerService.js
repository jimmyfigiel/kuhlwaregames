// /src/playerService.js

import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase.js";

export async function getPlayerByAuthUid(authUid) {
  const playersSnapshot = await getDocs(
    query(collection(db, "players"), where("authUids", "array-contains", authUid))
  );

  if (playersSnapshot.empty) {
    return null;
  }

  const activePlayer = playersSnapshot.docs
    .map((playerSnap) => ({
      id: playerSnap.id,
      ...playerSnap.data(),
    }))
    .find((player) => player.active !== false);

  return activePlayer || null;
}

export async function getPlayerById(playerId) {
  const playerRef = doc(db, "players", playerId);
  const playerSnap = await getDoc(playerRef);

  if (!playerSnap.exists()) {
    return null;
  }

  return {
    id: playerSnap.id,
    ...playerSnap.data(),
  };
}

export async function ensurePlayerCanUseGame(playerId, playerName, gameId, authUid = null) {
  if (!playerId) {
    throw new Error("Missing player id.");
  }

  if (!gameId) {
    throw new Error("Missing game id.");
  }

  const playerRef = doc(db, "players", playerId);
  const playerSnap = await getDoc(playerRef);

  if (!playerSnap.exists()) {
    const newPlayer = {
      id: playerId,
      name: playerName || playerId,
      active: true,
      isSuperUser: false,
      authUids: authUid ? [authUid] : [],
      authorizedGames: [gameId],
      activeRoomIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(playerRef, newPlayer);

    return {
      ...newPlayer,
      createdAt: null,
      updatedAt: null,
    };
  }

  await updateDoc(playerRef, {
    authorizedGames: arrayUnion(gameId),
    updatedAt: serverTimestamp(),
  });

  return await getPlayerById(playerId);
}

export async function addRoomToPlayer(playerId, roomCode) {
  const playerRef = doc(db, "players", playerId);

  await updateDoc(playerRef, {
    activeRoomIds: arrayUnion(roomCode),
    updatedAt: serverTimestamp(),
  });
}

export function canCreateGame(player, gameId) {
  if (!player) return false;
  if (player.isSuperUser) return true;
  return player.authorizedGames?.includes(gameId) || false;
}