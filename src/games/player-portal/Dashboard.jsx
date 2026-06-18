// /src/games/player-portal/Dashboard.jsx

import { useEffect, useRef, useState } from "react";

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
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("games");
  const [roomRefreshKey, setRoomRefreshKey] = useState(0);
  const settingsRef = useRef(null);

  const isSuperuser = player.isSuperuser || player.isSuperUser || false;

  const authorizedGames =
    player.authorizedGames ||
    player.authorizedToCreate ||
    player.authorizedToPlay ||
    [];

  function refreshRooms() {
    setRoomRefreshKey((v) => v + 1);
  }

  useEffect(() => {
    function handleClick(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    }
    if (showSettings) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSettings]);

  if (showAdmin)      return <AdminPanel onClose={() => setShowAdmin(false)} />;
  if (showChangePin)  return <ChangePin player={player} onCancel={() => setShowChangePin(false)} onPlayerUpdated={onPlayerUpdated} />;
  if (showDevices)    return <DeviceManager player={player} authUser={authUser} onBack={() => setShowDevices(false)} onLogout={onLogout} onPlayerUpdated={onPlayerUpdated} />;

  const enrichedPlayer = {
    ...player,
    isSuperuser,
    isSuperUser: isSuperuser,
    authorizedGames,
    authorizedToCreate: authorizedGames,
    authorizedToPlay: authorizedGames,
  };

  function handleGameCreated(room) {
    refreshRooms();
    onOpenRoom(room);
  }

  function handleJoined(result) {
    if (result?.player && onPlayerUpdated) onPlayerUpdated(result.player);
    refreshRooms();
    onOpenRoom(result?.room ?? result);
  }

  return (
    <main className="player-portal portal-shell">

      {/* ── Top bar ── */}
      <header className="portal-header">
        <div className="portal-header-identity">
          <h1>Kuhlware Games</h1>
          <p className="muted">
            {player.displayName || player.name || player.id}
          </p>
        </div>

        <div className="header-actions">
          {isSuperuser && <span className="badge">Superuser</span>}

          <div className="settings-wrapper" ref={settingsRef}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowSettings((v) => !v)}
              aria-expanded={showSettings}
            >
              Account ▾
            </button>
            {showSettings && (
              <div className="settings-dropdown">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => { setShowSettings(false); setShowChangePin(true); }}
                >
                  Change PIN
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => { setShowSettings(false); setShowDevices(true); }}
                >
                  Devices
                </button>
              </div>
            )}
          </div>

          <button type="button" className="secondary-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div className="portal-body">

        {pendingJoinCode && (
          <div className="portal-wide-row">
            <JoinRoom
              player={player}
              authUser={authUser}
              joinCode={pendingJoinCode}
              onJoined={handleJoined}
              onCancel={onJoinCodeHandled}
            />
          </div>
        )}

        <section className="portal-grid">

          {/* My Games tab */}
          <div className={`portal-tab-panel ${activeTab === "games" ? "tab-panel--active" : ""}`}>
            <RoomList
              player={player}
              refreshKey={roomRefreshKey}
              onOpenRoom={onOpenRoom}
            />
          </div>

          {/* New Game tab */}
          <div className={`portal-tab-panel ${activeTab === "new" ? "tab-panel--active" : ""}`}>
            <CreateRoom
              player={enrichedPlayer}
              onRoomCreated={handleGameCreated}
            />
          </div>

          {/* Admin tab (superuser only) */}
          {isSuperuser && (
            <div className={`portal-tab-panel ${activeTab === "admin" ? "tab-panel--active" : ""}`}>
              <article className="card">
                <h2>Admin</h2>
                <p className="muted">Manage players, games, permissions, and setup data.</p>
                <button type="button" onClick={() => setShowAdmin(true)}>
                  Open Admin
                </button>
              </article>
            </div>
          )}

        </section>
      </div>

      {/* ── Bottom tab bar (mobile only) ── */}
      <nav className="portal-tab-bar" aria-label="Navigation">
        <button
          type="button"
          className={activeTab === "games" ? "tab-active" : ""}
          onClick={() => setActiveTab("games")}
        >
          <span className="tab-icon">🎮</span>
          My Games
        </button>

        <button
          type="button"
          className={activeTab === "new" ? "tab-active" : ""}
          onClick={() => setActiveTab("new")}
        >
          <span className="tab-icon">＋</span>
          New Game
        </button>

        {isSuperuser && (
          <button
            type="button"
            className={activeTab === "admin" ? "tab-active" : ""}
            onClick={() => setActiveTab("admin")}
          >
            <span className="tab-icon">⚙</span>
            Admin
          </button>
        )}
      </nav>

    </main>
  );
}
