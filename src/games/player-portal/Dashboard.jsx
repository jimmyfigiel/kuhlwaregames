// /src/games/player-portal/Dashboard.jsx

import { useState } from "react";

import AdminPanel from "./AdminPanel.jsx";
import ChangePin from "./ChangePin.jsx";
import CreateRoom from "./CreateRoom.jsx";
import DeviceManager from "./DeviceManager.jsx";
import JoinRoom from "./JoinRoom.jsx";
import RoomList from "./RoomList.jsx";
import "./PlayerPortal.css";

function uniqueArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter(Boolean))).sort();
}

export default function Dashboard({
  player,
  authUser,
  pendingJoinCode,
  onJoinCodeHandled,
  onOpenRoom,
  onLogout,
  onPlayerUpdated,
}) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [roomRefreshKey, setRoomRefreshKey] = useState(0);
  const [latestRoom, setLatestRoom] = useState(null);

  const isSuperuser = player.isSuperuser || player.isSuperUser || false;

  const authorizedToCreate = uniqueArray(
    player.authorizedToCreate || player.authorizedGames || []
  );

  const authorizedToPlay = uniqueArray(
    player.authorizedToPlay || player.authorizedGames || authorizedToCreate
  );

  function refreshRooms() {
    setRoomRefreshKey((currentValue) => currentValue + 1);
  }

  if (showAdmin) {
    return <AdminPanel onClose={() => setShowAdmin(false)} />;
  }

  if (showChangePin) {
    return (
      <ChangePin
        player={player}
        onCancel={() => setShowChangePin(false)}
        onPlayerUpdated={onPlayerUpdated}
      />
    );
  }

  if (showDevices) {
    return (
      <DeviceManager
        player={player}
        authUser={authUser}
        onBack={() => setShowDevices(false)}
        onLogout={onLogout}
        onPlayerUpdated={onPlayerUpdated}
      />
    );
  }

  return (
    <main className="player-portal portal-shell dashboard-shell">
      <header className="portal-header dashboard-header">
        <div>
          <h1>Kuhlware Games</h1>

          <p className="muted">
            Playing as{" "}
            <strong>{player.displayName || player.name || player.id}</strong>
          </p>
        </div>

        <div className="header-actions">
          {isSuperuser ? (
            <span className="badge">Superuser</span>
          ) : (
            <span className="badge muted-badge">Player</span>
          )}

          <button
            type="button"
            className="secondary-button compact-button"
            onClick={() => setShowChangePin(true)}
          >
            Change PIN
          </button>

          <button
            type="button"
            className="secondary-button compact-button"
            onClick={() => setShowDevices(true)}
          >
            Devices
          </button>

          <button
            type="button"
            className="secondary-button compact-button"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </header>

      {pendingJoinCode && (
        <section className="portal-wide-row">
          <JoinRoom
            player={player}
            authUser={authUser}
            joinCode={pendingJoinCode}
            onJoined={(result) => {
              if (result?.player && onPlayerUpdated) {
                onPlayerUpdated(result.player);
              }

              if (result?.room) {
                refreshRooms();
                onOpenRoom(result.room);
                return;
              }

              refreshRooms();
              onOpenRoom(result);
            }}
            onCancel={onJoinCodeHandled}
          />
        </section>
      )}

      <section className="portal-stack">
        {latestRoom && (
          <section className="dashboard-section resume-section">
            <button
              type="button"
              className="resume-game-button"
              onClick={() => onOpenRoom(latestRoom)}
            >
              <span>Resume Last Game</span>
              <strong>{latestRoom.title || latestRoom.gameTitle || "Untitled Game"}</strong>
            </button>
          </section>
        )}

        <RoomList
          player={player}
          refreshKey={roomRefreshKey}
          onOpenRoom={onOpenRoom}
          onRoomsLoaded={(rooms) => setLatestRoom(rooms[0] || null)}
        />

        <CreateRoom
          player={{
            ...player,
            isSuperuser,
            isSuperUser: isSuperuser,
            authorizedGames: authorizedToPlay,
            authorizedToCreate,
            authorizedToPlay,
          }}
          onRoomCreated={(room) => {
            refreshRooms();
            onOpenRoom(room);
          }}
        />

        {isSuperuser && (
          <section className="dashboard-section admin-dashboard-section">
            <article className="card wide-card admin-card">
              <div>
                <h2>Admin</h2>

                <p className="muted">
                  Manage players, games, permissions, and setup data.
                </p>
              </div>

              <button type="button" onClick={() => setShowAdmin(true)}>
                Open Admin
              </button>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
