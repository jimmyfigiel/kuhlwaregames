// /src/games/player-portal/Dashboard.jsx

import { useState } from "react";

import AdminPanel from "./AdminPanel.jsx";
import ChangePin from "./ChangePin.jsx";
import CreateRoom from "./CreateRoom.jsx";
import DeviceManager from "./DeviceManager.jsx";
import JoinRoom from "./JoinRoom.jsx";
import RoomList from "./RoomList.jsx";
import "./PlayerPortal.css";

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

  const isSuperuser = player.isSuperuser || player.isSuperUser || false;

  const authorizedGames =
    player.authorizedGames ||
    player.authorizedToCreate ||
    player.authorizedToPlay ||
    [];

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
    <main className="player-portal portal-shell">
      <header className="portal-header">
        <div>
          <h1>Kuhlware Games</h1>

          <p className="muted">
            Logged in as{" "}
            <strong>{player.displayName || player.name || player.id}</strong>
          </p>

          <p className="small-muted">
            Device session: {authUser?.uid || "not available"}
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
            className="secondary-button"
            onClick={() => setShowChangePin(true)}
          >
            Change PIN
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowDevices(true)}
          >
            Devices
          </button>

          <button type="button" className="secondary-button" onClick={onLogout}>
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

      <section className="portal-grid">
        <RoomList
          player={player}
          refreshKey={roomRefreshKey}
          onOpenRoom={onOpenRoom}
        />

        <CreateRoom
          player={{
            ...player,
            isSuperuser,
            isSuperUser: isSuperuser,
            authorizedGames,
            authorizedToCreate: authorizedGames,
            authorizedToPlay: authorizedGames,
          }}
          onRoomCreated={(room) => {
            refreshRooms();
            onOpenRoom(room);
          }}
        />

        {isSuperuser && (
          <article className="card">
            <h2>Admin</h2>

            <p className="muted">
              Manage players, games, permissions, and setup data.
            </p>

            <button type="button" onClick={() => setShowAdmin(true)}>
              Open Admin
            </button>
          </article>
        )}
      </section>
    </main>
  );
}