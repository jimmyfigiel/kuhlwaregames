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

export default function RoomScreen({
  room,
  player,
  authUser,
  onBack,
  onRoomDeleted,
}) {
  const [currentRoom, setCurrentRoom] = useState(room);
  const [message, setMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("Connecting to room...");

  const isCreator = currentRoom.createdBy === player.id;
  const canManage =
    isCreator || player.isSuperuser || player.isSuperUser || false;

  useEffect(() => {
    if (!room?.id) {
      return undefined;
    }

    const roomRef = doc(db, "rooms", room.id);

    const unsubscribe = onSnapshot(
      roomRef,
      (roomSnap) => {
        if (!roomSnap.exists()) {
          setSyncMessage("This room no longer exists.");
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
        setMessage("This room no longer exists.");
        return;
      }

      setCurrentRoom({
        id: roomSnap.id,
        ...roomSnap.data(),
      });

      setMessage("Room refreshed.");
    } catch (error) {
      console.error(error);
      setMessage(`Could not refresh room: ${error.message}`);
    }
  }

  async function copyJoinLink() {
    if (!currentRoom.joinCode) {
      setMessage("This room does not have a join code.");
      return;
    }

    try {
      await navigator.clipboard.writeText(getJoinUrl(currentRoom.joinCode));
      setMessage("Join link copied.");
    } catch (error) {
      console.error(error);
      setMessage("Could not copy link.");
    }
  }

  async function leaveRoom() {
    if (isCreator) {
      setMessage(
        "Room creators cannot leave their own room. Delete it instead."
      );
      return;
    }

    const confirmed = window.confirm("Leave this room?");

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
      setMessage(`Could not leave room: ${error.message}`);
    }
  }

  async function deleteRoom() {
    if (!canManage) {
      setMessage("Only the room creator or a superuser can delete this room.");
      return;
    }

    const confirmed = window.confirm(
      `Delete room "${
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
      setMessage(`Could not delete room: ${error.message}`);
    }
  }

  return (
    <main className="player-portal portal-shell">
      <header
        className="portal-header"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "4px 6px",
          marginBottom: "6px",
          minHeight: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <strong
            style={{
              fontSize: "14px",
              lineHeight: 1,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            Kuhlware Games
          </strong>

          <span
            style={{
              fontSize: "12px",
              lineHeight: 1,
              color: "#ddd",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Playing as {player.displayName || player.name || player.id}
          </span>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
          style={{
            fontSize: "12px",
            padding: "4px 8px",
            lineHeight: 1.1,
            flexShrink: 0,
          }}
        >
          Back
        </button>
      </header>

      <section
        className="game-loader-layout"
        style={{
          marginTop: 0,
          paddingTop: 0,
        }}
      >
        <GameLoader
          room={currentRoom}
          player={player}
          authUser={authUser}
          onRoomChanged={refreshRoom}
        />
      </section>

      <section className="single-card-layout room-details-layout">
        <article className="card">
          <h2>{currentRoom.title || "Untitled Room"}</h2>

          <p className="muted">
            {currentRoom.gameTitle || currentRoom.gameId} · Room screen
          </p>

          {currentRoom.joinCode && (
            <p className="small-muted">Join Code: {currentRoom.joinCode}</p>
          )}

          <p className="small-muted">{syncMessage}</p>
        </article>
      </section>

      <section className="single-card-layout room-details-layout">
        <article className="card">
          <h2>Room Details</h2>

          <p>
            <strong>Created by:</strong>{" "}
            {currentRoom.createdByName || currentRoom.createdBy}
          </p>

          <p>
            <strong>Status:</strong> {currentRoom.status || "active"}
          </p>

          <p>
            <strong>Players:</strong>{" "}
            {(currentRoom.playerIds || []).join(", ") || "None"}
          </p>

          {currentRoom.joinCode && (
            <p>
              <strong>Invite Link:</strong>
              <br />
              {getJoinUrl(currentRoom.joinCode)}
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
                Copy Join Link
              </button>
            )}

            {!isCreator && (
              <button
                type="button"
                className="secondary-button"
                onClick={leaveRoom}
              >
                Leave Room
              </button>
            )}

            {canManage && (
              <button
                type="button"
                className="danger-button"
                onClick={deleteRoom}
              >
                Delete Room
              </button>
            )}
          </div>

          {message && <p className="message">{message}</p>}
        </article>
      </section>
    </main>
  );
}