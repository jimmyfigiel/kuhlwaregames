// /src/roomService.js

import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase.js";
import { ensurePlayerCanUseGame, addRoomToPlayer } from "./playerService.js";

export async function getRoomByCode(roomCode) {
  if (!roomCode) {
    throw new Error("Missing room code.");
  }

  const roomRef = doc(db, "rooms", roomCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    return null;
  }

  return {
    id: roomSnap.id,
    code: roomSnap.id,
    ...roomSnap.data(),
  };
}

export function getRoomGameId(room) {
  return room?.gameId || room?.gameType || room?.game || null;
}

export async function joinInvitedRoom({
  roomCode,
  player,
  authUser,
  slotId = null,
}) {
  const room = await getRoomByCode(roomCode);

  if (!room) {
    throw new Error(`Room ${roomCode} was not found.`);
  }

  const gameId = getRoomGameId(room);

  if (!gameId) {
    throw new Error("This room does not have a game type.");
  }

  const updatedPlayer = await ensurePlayerCanUseGame(
    player.id,
    player.name,
    gameId,
    authUser?.uid || null
  );

  const roomRef = doc(db, "rooms", roomCode);

  const playerEntry = {
    playerId: player.id,
    name: player.name,
    slotId,
    joinedAt: Date.now(),
  };

  await updateDoc(roomRef, {
    players: arrayUnion(playerEntry),
    updatedAt: serverTimestamp(),
  });

  await addRoomToPlayer(player.id, roomCode);

  const updatedRoom = await getRoomByCode(roomCode);

  return {
    room: updatedRoom,
    player: updatedPlayer,
  };
}