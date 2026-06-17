// /src/games/player-portal/RoomList.jsx

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../firebase.js";
import "./PlayerPortal.css";

const FINISHED_STATUSES = new Set([
  "archived",
  "complete",
  "completed",
  "deleted",
  "finished",
]);

function formatDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  return String(value);
}

function getDateMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSuperuser(player) {
  return player.isSuperuser || player.isSuperUser || false;
}

function getPlayersText(room) {
  if (Array.isArray(room.players) && room.players.length > 0) {
    return room.players
      .map((player) => player.name || player.displayName || player.playerId)
      .filter(Boolean)
      .join(" + ");
  }

  if (Array.isArray(room.playerIds) && room.playerIds.length > 0) {
    return room.playerIds.join(" + ");
  }

  return "No players yet";
}

function getGenericTurnPlayerId(room) {
  const gameState = room.gameState || {};
  const gameSetup = room.gameSetup || {};

  return (
    room.currentPlayerId ||
    room.currentTurnPlayerId ||
    room.activePlayerId ||
    room.turnPlayerId ||
    gameState.currentPlayerId ||
    gameState.currentTurnPlayerId ||
    gameState.activePlayerId ||
    gameState.turnPlayerId ||
    gameState.turn?.playerId ||
    gameState.activeTurn?.playerId ||
    gameSetup.currentPlayerId ||
    gameSetup.activePlayerId ||
    null
  );
}

function getGameBadge(room, playerId) {
  const status = String(room.status || "active").toLowerCase();

  if (FINISHED_STATUSES.has(status)) {
    return "Finished";
  }

  const turnPlayerId = getGenericTurnPlayerId(room);

  if (turnPlayerId && turnPlayerId === playerId) {
    return "Your Turn";
  }

  if (turnPlayerId && turnPlayerId !== playerId) {
    return "Waiting";
  }

  if (status === "setup") {
    return "Setup";
  }

  if (status === "invited") {
    return "Invited";
  }

  return "Continue";
}

function isFinishedRoom(room) {
  return FINISHED_STATUSES.has(String(room.status || "").toLowerCase());
}

function buildSubtitle(room) {
  const gameName = room.gameTitle || room.gameId || "Game";
  const players = getPlayersText(room);
  return `${gameName} · ${players}`;
}

export default function RoomList({
  player,
  refreshKey = 0,
  onOpenRoom,
  onRoomsLoaded,
}) {
  const [rooms, setRooms] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [showFinished, setShowFinished] = useState(false);

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id, refreshKey]);

  const activeRooms = useMemo(
    () => rooms.filter((room) => !isFinishedRoom(room)),
    [rooms]
  );

  const finishedRooms = useMemo(
    () => rooms.filter((room) => isFinishedRoom(room)),
    [rooms]
  );

  async function loadRooms() {
    setLoadingRooms(true);
    setMessage("");

    try {
      const roomsSnapshot = await getDocs(
        query(
          collection(db, "rooms"),
          where("playerIds", "array-contains", player.id)
        )
      );

      const loadedRooms = roomsSnapshot.docs
        .map((roomDoc) => ({
          id: roomDoc.id,
          ...roomDoc.data(),
        }))
        .sort((a, b) => getDateMillis(b.updatedAt) - getDateMillis(a.updatedAt));

      setRooms(loadedRooms);

      if (onRoomsLoaded) {
        onRoomsLoaded(loadedRooms.filter((room) => !isFinishedRoom(room)));
      }
    } catch (error) {
      console.error(error);
      setMessage(`Could not load games: ${error.message}`);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function deleteRoom(room) {
    if (room.createdBy !== player.id && !isSuperuser(player)) {
      setMessage("Only the game creator or a superuser can delete this game.");
      return;
    }

    const confirmed = window.confirm(
      `Delete game "${room.title || room.id}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "rooms", room.id));
      setMessage(`Deleted game ${room.title || room.id}.`);
      await loadRooms();
    } catch (error) {
      console.error(error);
      setMessage(`Could not delete game: ${error.message}`);
    }
  }

  function renderGameCard(room) {
    const badge = getGameBadge(room, player.id);
    const canDelete = room.createdBy === player.id || isSuperuser(player);

    return (
      <div className="game-card" key={room.id}>
        <button
          type="button"
          className="game-card-button"
          onClick={() => onOpenRoom(room)}
        >
          <div className="game-card-main-text">
            <span className="game-status-badge">{badge}</span>
            <h3>{room.title || "Untitled Game"}</h3>
            <p className="muted">{buildSubtitle(room)}</p>
            <p className="small-muted">
              Updated: {formatDate(room.updatedAt) || "Not available"}
            </p>
          </div>

          <span className="game-card-chevron" aria-hidden="true">
            ›
          </span>
        </button>

        {canDelete && (
          <button
            type="button"
            className="danger-button compact-button game-card-delete"
            onClick={() => deleteRoom(room)}
          >
            Delete
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="dashboard-section">
      <article className="card wide-card games-dashboard-card">
        <div className="section-heading-row">
          <div>
            <h2>Your Games</h2>
            <p className="muted">
              Tap a game card to continue. Finished games stay hidden unless you need them.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button compact-button"
            onClick={loadRooms}
            disabled={loadingRooms}
          >
            Refresh
          </button>
        </div>

        {loadingRooms ? (
          <p className="muted">Loading games...</p>
        ) : activeRooms.length === 0 ? (
          <p className="muted">You are not currently playing any games.</p>
        ) : (
          <div className="game-list">{activeRooms.map(renderGameCard)}</div>
        )}

        {finishedRooms.length > 0 && (
          <div className="finished-games-panel">
            <button
              type="button"
              className="secondary-button compact-button"
              onClick={() => setShowFinished((currentValue) => !currentValue)}
            >
              {showFinished
                ? "Hide Finished Games"
                : `Show Finished Games (${finishedRooms.length})`}
            </button>

            {showFinished && (
              <div className="game-list finished-game-list">
                {finishedRooms.map(renderGameCard)}
              </div>
            )}
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </article>
    </section>
  );
}
