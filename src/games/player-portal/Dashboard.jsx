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

  const authorizedToPlay = player.authorizedToPlay || [];

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
            Logged in as <strong>{player.displayName}</strong>
          </p>
          <p className="small-muted">
            Device session: {authUser?.uid || "not available"}
          </p>
        </div>

        <div className="header-actions">
          {player.isSuperuser ? (
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
            joinCode={pendingJoinCode}
            onJoined={onOpenRoom}
            onCancel={onJoinCodeHandled}
          />
        </section>
      )}

      <section className="portal-grid">
        <article className="card">
          <h2>Authorized Games</h2>

          {authorizedToPlay.length === 0 ? (
            <p className="muted">You are not authorized for any games yet.</p>
          ) : (
            <ul className="simple-list">
              {authorizedToPlay.map((gameId) => (
                <li key={gameId}>{gameId}</li>
              ))}
            </ul>
          )}
        </article>

        <CreateRoom
          player={player}
          onRoomCreated={(room) => {
            refreshRooms();
            onOpenRoom(room);
          }}
        />

        <RoomList
          player={player}
          refreshKey={roomRefreshKey}
          onOpenRoom={onOpenRoom}
        />

        {player.isSuperuser && (
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