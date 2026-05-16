import { arrayUnion, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../firebase.js";
import "./PlayerPortal.css";

export default function JoinRoom({ player, joinCode, onJoined, onCancel }) {
  const [room, setRoom] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    findRoom();
  }, [joinCode]);

  async function findRoom() {
    setLoading(true);
    setMessage("");

    try {
      const cleanJoinCode = joinCode.trim().toLowerCase();

      const roomSnapshot = await getDocs(
        query(collection(db, "rooms"), where("joinCodeLower", "==", cleanJoinCode))
      );

      if (roomSnapshot.empty) {
        setRoom(null);
        setMessage("No room was found for that join link.");
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

    const authorizedToPlay = player.authorizedToPlay || [];

    if (!authorizedToPlay.includes(room.gameId) && !player.isSuperuser) {
      setMessage("You are not authorized to play this game.");
      return;
    }

    setJoining(true);
    setMessage("Joining room...");

    try {
      const gameSnap = await getDoc(doc(db, "games", room.gameId));

      if (gameSnap.exists()) {
        const game = gameSnap.data();
        const maxPlayers = Number(game.maxPlayers || 0);
        const playerIds = Array.isArray(room.playerIds) ? room.playerIds : [];

        if (
          maxPlayers > 0 &&
          playerIds.length >= maxPlayers &&
          !playerIds.includes(player.id)
        ) {
          setMessage("This room is full.");
          setJoining(false);
          return;
        }
      }

      const roomRef = doc(db, "rooms", room.id);

      await updateDoc(roomRef, {
        playerIds: arrayUnion(player.id),
        updatedAt: serverTimestamp(),
      });

      const updatedRoomSnap = await getDoc(roomRef);

      onJoined({
        id: updatedRoomSnap.id,
        ...updatedRoomSnap.data(),
      });
    } catch (error) {
      console.error(error);
      setMessage(`Could not join room: ${error.message}`);
    } finally {
      setJoining(false);
    }
  }

  return (
    <article className="card wide-card">
      <h2>Join Room</h2>

      {loading ? (
        <p className="muted">Looking up room...</p>
      ) : room ? (
        <>
          <p>
            Join <strong>{room.title || "Untitled Room"}</strong>?
          </p>
          <p className="muted">
            {room.gameTitle || room.gameId} · Created by{" "}
            {room.createdByName || room.createdBy}
          </p>

          <div className="button-list">
            <button type="button" onClick={joinRoom} disabled={joining}>
              {joining ? "Joining..." : "Join Room"}
            </button>

            <button type="button" className="secondary-button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="secondary-button" onClick={onCancel}>
          Back to Portal
        </button>
      )}

      {message && <p className="message">{message}</p>}
    </article>
  );
}