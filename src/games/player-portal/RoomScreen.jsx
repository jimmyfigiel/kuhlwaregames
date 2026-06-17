// /src/games/player-portal/RoomScreen.jsx

import {
  arrayRemove,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import GameLoader from "../../GameLoader.jsx";
import { db } from "../../firebase.js";
import "./PlayerPortal.css";

function getJoinUrl(joinCode) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("join", joinCode);
  return url.toString();
}

function getPlayersText(room) {
  if (Array.isArray(room.players) && room.players.length > 0) {
    return room.players
      .map((player) => player.name || player.displayName || player.playerId)
      .filter(Boolean)
      .join(", ");
  }

  return (room.playerIds || []).join(", ") || "None";
}

function isSuperuser(player) {
  return player.isSuperuser || player.isSuperUser || false;
}

export default function RoomScreen({
  room,
  player,
  authUser,
  onBack,
  onRoomDeleted,
}) {
  const [currentRoom, setCurrentRoom] = useState(room);
  const [message, setMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("Connecting to game...");

  const isCreator = currentRoom.createdBy === player.id;
  const canManage = isCreator || isSuperuser(player);

  useEffect(() => {
    if (!room?.id) {
      return undefined;
    }

    const roomRef = doc(db, "rooms", room.id);

    const unsubscribe = onSnapshot(
      roomRef,
      (roomSnap) => {
        if (!roomSnap.exists()) {
          setSyncMessage("This game no longer exists.");
          return;
        }

        setCurrentRoom({
          id: roomSnap.id,
          ...roomSnap.data(),
        });

        setSyncMessage("Live sync active.");
      },
      (error) => {
        console.error(error);
        setSyncMessage(`Live sync error: ${error.message}`);
      }
    );

    return () => unsubscribe();
  }, [room?.id]);

  async function refreshRoom() {
    try {
      const roomSnap = await getDoc(doc(db, "rooms", currentRoom.id));

      if (!roomSnap.exists()) {
        setMessage("This game no longer exists.");
        return;
      }

      setCurrentRoom({
        id: roomSnap.id,
        ...roomSnap.data(),
      });

      setMessage("Game refreshed.");
    } catch (error) {
      console.error(error);
      setMessage(`Could not refresh game: ${error.message}`);
    }
  }

  async function copyJoinLink() {
    if (!currentRoom.joinCode) {
      setMessage("This game does not have an invite code.");
      return;
    }

    try {
      await navigator.clipboard.writeText(getJoinUrl(currentRoom.joinCode));
      setMessage("Invite link copied.");
    } catch (error) {
      console.error(error);
      setMessage("Could not copy link.");
    }
  }

  async function leaveRoom() {
    if (isCreator) {
      setMessage("Game creators cannot leave their own game. Delete it instead.");
      return;
    }

    const confirmed = window.confirm("Leave this game?");

    if (!confirmed) {
      return;
    }

    try {
      await updateDoc(doc(db, "rooms", currentRoom.id), {
        playerIds: arrayRemove(player.id),
        updatedAt: serverTimestamp(),
      });

      onBack();
    } catch (error) {
      console.error(error);
      setMessage(`Could not leave game: ${error.message}`);
    }
  }

  async function deleteRoom() {
    if (!canManage) {
      setMessage("Only the game creator or a superuser can delete this game.");
      return;
    }

    const confirmed = window.confirm(
      `Delete game "${
        currentRoom.title || currentRoom.id
      }"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "rooms", currentRoom.id));
      onRoomDeleted();
    } catch (error) {
      console.error(error);
      setMessage(`Could not delete game: ${error.message}`);
    }
  }

  return (
    <main className="player-portal portal-shell">
      <header className="portal-header compact-game-header">
        <div className="compact-game-title-row">
          <strong>Kuhlware Games</strong>
          <span>Playing as {player.displayName || player.name || player.id}</span>
        </div>

        <button
          type="button"
          className="secondary-button compact-button"
          onClick={onBack}
        >
          Back to Games
        </button>
      </header>

      <section className="game-loader-layout compact-game-loader">
        <GameLoader
          room={currentRoom}
          player={player}
          authUser={authUser}
          onRoomChanged={refreshRoom}
        />
      </section>

      <section className="single-card-layout room-details-layout">
        <article className="card">
          <h2>{currentRoom.title || "Untitled Game"}</h2>

          <p className="muted">
            {currentRoom.gameTitle || currentRoom.gameId} · Game screen
          </p>

          <p className="small-muted">{syncMessage}</p>
        </article>
      </section>

      <section className="single-card-layout room-details-layout">
        <article className="card">
          <h2>Game Details</h2>

          <p>
            <strong>Created by:</strong>{" "}
            {currentRoom.createdByName || currentRoom.createdBy}
          </p>

          <p>
            <strong>Status:</strong> {currentRoom.status || "active"}
          </p>

          <p>
            <strong>Players:</strong> {getPlayersText(currentRoom)}
          </p>

          {currentRoom.joinCode && (
            <p className="small-muted">
              Backup Invite Code: {currentRoom.joinCode}
            </p>
          )}

          <div className="button-list">
            <button type="button" onClick={refreshRoom}>
              Refresh
            </button>

            {currentRoom.joinCode && (
              <button
                type="button"
                className="secondary-button"
                onClick={copyJoinLink}
              >
                Copy Backup Invite Link
              </button>
            )}

            {!isCreator && (
              <button
                type="button"
                className="secondary-button"
                onClick={leaveRoom}
              >
                Leave Game
              </button>
            )}

            {canManage && (
              <button
                type="button"
                className="danger-button"
                onClick={deleteRoom}
              >
                Delete Game
              </button>
            )}
          </div>

          {message && <p className="message">{message}</p>}
        </article>
      </section>
    </main>
  );
}
