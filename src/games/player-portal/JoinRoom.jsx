// /src/games/player-portal/JoinRoom.jsx

import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "../../firebase.js";
import { ensurePlayerCanUseGame } from "../../playerService.js";
import "./PlayerPortal.css";

function getPlayerDisplayName(player) {
  return player.displayName || player.name || player.id || "Unknown Player";
}

function isSuperuser(player) {
  return player.isSuperuser || player.isSuperUser || false;
}

export default function JoinRoom({
  player,
  authUser,
  joinCode,
  onJoined,
  onCancel,
}) {
  const [room, setRoom] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    findRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  async function findRoom() {
    setLoading(true);
    setMessage("");

    try {
      const cleanJoinCode = String(joinCode || "").trim().toLowerCase();

      const roomSnapshot = await getDocs(
        query(
          collection(db, "rooms"),
          where("joinCodeLower", "==", cleanJoinCode)
        )
      );

      if (roomSnapshot.empty) {
        setRoom(null);
        setMessage("No game was found for that invite link.");
        return;
      }

      const roomSnap = roomSnapshot.docs[0];

      setRoom({
        id: roomSnap.id,
        ...roomSnap.data(),
      });
    } catch (error) {
      console.error(error);
      setMessage(`Could not find room: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    if (!room) {
      return;
    }

    if (!player?.id) {
      setMessage("No player is logged in.");
      return;
    }

    setJoining(true);
    setMessage("Joining room...");

    try {
      const playerIds = Array.isArray(room.playerIds) ? room.playerIds : [];
      const alreadyInRoom = playerIds.includes(player.id);

      if (playerIds.length >= 2 && !alreadyInRoom) {
        setMessage("This room already has two players.");
        setJoining(false);
        return;
      }

      const playerName = getPlayerDisplayName(player);

      const updatedPlayer = isSuperuser(player)
        ? player
        : await ensurePlayerCanUseGame(
            player.id,
            playerName,
            room.gameId,
            authUser?.uid || null
          );

      const roomRef = doc(db, "rooms", room.id);

      await updateDoc(roomRef, {
        playerIds: arrayUnion(player.id),
        players: arrayUnion({
          playerId: player.id,
          name: playerName,
          slotId: null,
          joinedAt: Date.now(),
        }),
        updatedAt: serverTimestamp(),
      });

      const updatedRoomSnap = await getDoc(roomRef);

      const updatedRoom = {
        id: updatedRoomSnap.id,
        ...updatedRoomSnap.data(),
      };

      if (onJoined) {
        onJoined({
          room: updatedRoom,
          player: updatedPlayer,
        });
      }
    } catch (error) {
      console.error(error);
      setMessage(`Could not join room: ${error.message}`);
    } finally {
      setJoining(false);
    }
  }

  return (
    <article className="card wide-card">
      <h2>Join Game</h2>

      {loading ? (
        <p className="muted">Looking up game...</p>
      ) : room ? (
        <>
          <p>
            Join <strong>{room.title || "Untitled Game"}</strong>?
          </p>

          <p className="muted">
            {room.gameTitle || room.gameId} · Created by{" "}
            {room.createdByName || room.createdBy}
          </p>

          <div className="button-list">
            <button type="button" onClick={joinRoom} disabled={joining}>
              {joining ? "Joining..." : "Join Game"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="secondary-button" onClick={onCancel}>
          Back
        </button>
      )}

      {message && <p className="message">{message}</p>}
    </article>
  );
}