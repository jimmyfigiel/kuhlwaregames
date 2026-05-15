import { useState } from "react";
import AdminPanel from "./AdminPanel.jsx";
import "./PlayerPortal.css";

export default function Dashboard({ player, onLogout }) {
  const [showAdmin, setShowAdmin] = useState(false);

  const authorizedToPlay = player.authorizedToPlay || [];
  const authorizedToCreate = player.authorizedToCreate || [];

  if (showAdmin) {
    return <AdminPanel onClose={() => setShowAdmin(false)} />;
  }

  return (
    <main className="player-portal portal-shell">
      <header className="portal-header">
        <div>
          <h1>Kuhlware Games</h1>
          <p className="muted">
            Logged in as <strong>{player.displayName}</strong>
          </p>
        </div>

        <div className="header-actions">
          {player.isSuperuser ? (
            <span className="badge">Superuser</span>
          ) : (
            <span className="badge muted-badge">Player</span>
          )}

          <button type="button" className="secondary-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

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

        <article className="card">
          <h2>Create New Room</h2>

          {authorizedToCreate.length === 0 ? (
            <p className="muted">You are not authorized to create rooms yet.</p>
          ) : (
            <>
              <p className="muted">Choose a game to create a new room.</p>

              <div className="button-list">
                {authorizedToCreate.map((gameId) => (
                  <button
                    key={gameId}
                    type="button"
                    onClick={() =>
                      alert(`Create room for ${gameId} will be added next.`)
                    }
                  >
                    Create {gameId}
                  </button>
                ))}
              </div>
            </>
          )}
        </article>

        <article className="card">
          <h2>Active Rooms</h2>
          <p className="muted">
            Room list will appear here once we add the rooms collection query.
          </p>
        </article>

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