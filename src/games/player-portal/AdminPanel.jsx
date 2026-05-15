import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import "./PlayerPortal.css";

function arrayToText(value) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value.join(", ");
}

function hasGamePermission(permissionArray, gameId) {
  return Array.isArray(permissionArray) && permissionArray.includes(gameId);
}

function toggleGamePermission(permissionArray, gameId, checked) {
  const currentArray = Array.isArray(permissionArray) ? permissionArray : [];

  if (checked) {
    return Array.from(new Set([...currentArray, gameId])).sort();
  }

  return currentArray.filter((id) => id !== gameId);
}

const blankPlayerForm = {
  playerCode: "",
  displayName: "",
  pin: "",
  active: true,
  isSuperuser: false,
  authorizedToPlay: ["player-portal"],
  authorizedToCreate: [],
};

const blankGameForm = {
  gameId: "",
  title: "",
  enabled: true,
  minPlayers: 1,
  maxPlayers: 0,
};

export default function AdminPanel({ onClose }) {
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [playerForm, setPlayerForm] = useState(blankPlayerForm);
  const [gameForm, setGameForm] = useState(blankGameForm);
  const [message, setMessage] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState("players");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    setMessage("");

    try {
      const playersSnapshot = await getDocs(query(collection(db, "players")));
      const gamesSnapshot = await getDocs(
        query(collection(db, "games"), orderBy("title"))
      );

      const loadedPlayers = playersSnapshot.docs
        .map((playerDoc) => ({
          id: playerDoc.id,
          ...playerDoc.data(),
        }))
        .sort((a, b) =>
          String(a.displayName || a.id).localeCompare(
            String(b.displayName || b.id)
          )
        );

      const loadedGames = gamesSnapshot.docs.map((gameDoc) => ({
        id: gameDoc.id,
        ...gameDoc.data(),
      }));

      setPlayers(loadedPlayers);
      setGames(loadedGames);
    } catch (error) {
      console.error(error);
      setMessage(`Could not load admin data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function startNewPlayer() {
    setPlayerForm(blankPlayerForm);
    setActiveAdminTab("players");
    setMessage("");
  }

  function editPlayer(player) {
    setPlayerForm({
      playerCode: player.id,
      displayName: player.displayName || "",
      pin: player.pin || "",
      active: player.active !== false,
      isSuperuser: player.isSuperuser === true,
      authorizedToPlay: Array.isArray(player.authorizedToPlay)
        ? player.authorizedToPlay
        : [],
      authorizedToCreate: Array.isArray(player.authorizedToCreate)
        ? player.authorizedToCreate
        : [],
    });

    setActiveAdminTab("players");
    setMessage("");
  }

  function updatePlayerPermission(permissionName, gameId, checked) {
    setPlayerForm({
      ...playerForm,
      [permissionName]: toggleGamePermission(
        playerForm[permissionName],
        gameId,
        checked
      ),
    });
  }

  async function savePlayer(event) {
    event.preventDefault();

    const playerCode = playerForm.playerCode.trim().toLowerCase();

    if (!playerCode) {
      setMessage("Player code is required.");
      return;
    }

    if (!playerForm.displayName.trim()) {
      setMessage("Display name is required.");
      return;
    }

    if (!playerForm.pin.trim()) {
      setMessage("PIN is required.");
      return;
    }

    try {
      await setDoc(
        doc(db, "players", playerCode),
        {
          displayName: playerForm.displayName.trim(),
          pin: playerForm.pin.trim(),
          active: playerForm.active,
          isSuperuser: playerForm.isSuperuser,
          authorizedToPlay: playerForm.authorizedToPlay,
          authorizedToCreate: playerForm.authorizedToCreate,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage(`Saved player ${playerCode}.`);
      setPlayerForm(blankPlayerForm);
      await loadAdminData();
    } catch (error) {
      console.error(error);
      setMessage(`Could not save player: ${error.message}`);
    }
  }

  async function deletePlayer(player) {
    const confirmed = window.confirm(
      `Delete player "${player.displayName || player.id}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "players", player.id));
      setMessage(`Deleted player ${player.id}.`);
      await loadAdminData();
    } catch (error) {
      console.error(error);
      setMessage(`Could not delete player: ${error.message}`);
    }
  }

  function startNewGame() {
    setGameForm(blankGameForm);
    setActiveAdminTab("games");
    setMessage("");
  }

  function editGame(game) {
    setGameForm({
      gameId: game.id,
      title: game.title || "",
      enabled: game.enabled !== false,
      minPlayers: Number(game.minPlayers ?? 1),
      maxPlayers: Number(game.maxPlayers ?? 0),
    });

    setActiveAdminTab("games");
    setMessage("");
  }

  async function saveGame(event) {
    event.preventDefault();

    const gameId = gameForm.gameId.trim().toLowerCase();

    if (!gameId) {
      setMessage("Game ID is required.");
      return;
    }

    if (!gameForm.title.trim()) {
      setMessage("Game title is required.");
      return;
    }

    try {
      await setDoc(
        doc(db, "games", gameId),
        {
          gameId,
          title: gameForm.title.trim(),
          enabled: gameForm.enabled,
          minPlayers: Number(gameForm.minPlayers),
          maxPlayers: Number(gameForm.maxPlayers),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage(`Saved game ${gameId}.`);
      setGameForm(blankGameForm);
      await loadAdminData();
    } catch (error) {
      console.error(error);
      setMessage(`Could not save game: ${error.message}`);
    }
  }

  async function deleteGame(game) {
    const confirmed = window.confirm(
      `Delete game "${game.title || game.id}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "games", game.id));
      setMessage(`Deleted game ${game.id}.`);
      await loadAdminData();
    } catch (error) {
      console.error(error);
      setMessage(`Could not delete game: ${error.message}`);
    }
  }

  return (
    <main className="player-portal portal-shell">
      <header className="portal-header">
        <div>
          <h1>Admin</h1>
          <p className="muted">Manage players, games, and permissions.</p>
        </div>

        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Back to Portal
          </button>
        </div>
      </header>

      <section className="admin-layout">
        <aside className="card admin-sidebar">
          <h2>Admin Tools</h2>

          <button
            type="button"
            className={activeAdminTab === "players" ? "selected-button" : ""}
            onClick={() => setActiveAdminTab("players")}
          >
            Manage Players
          </button>

          <button
            type="button"
            className={activeAdminTab === "games" ? "selected-button" : ""}
            onClick={() => setActiveAdminTab("games")}
          >
            Manage Games
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={loadAdminData}
          >
            Refresh
          </button>

          {message && <p className="message">{message}</p>}
        </aside>

        {activeAdminTab === "players" && (
          <section className="admin-main">
            <article className="card">
              <div className="section-heading-row">
                <h2>Players</h2>

                <button type="button" onClick={startNewPlayer}>
                  New Player
                </button>
              </div>

              {loading ? (
                <p className="muted">Loading players...</p>
              ) : players.length === 0 ? (
                <p className="muted">No players found.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Role</th>
                        <th>Can Play</th>
                        <th>Can Create</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {players.map((player) => (
                        <tr key={player.id}>
                          <td>{player.id}</td>
                          <td>{player.displayName}</td>
                          <td>{player.active === false ? "Inactive" : "Active"}</td>
                          <td>{player.isSuperuser ? "Superuser" : "Player"}</td>
                          <td>{arrayToText(player.authorizedToPlay)}</td>
                          <td>{arrayToText(player.authorizedToCreate)}</td>
                          <td>
                            <div className="row-actions">
                              <button type="button" onClick={() => editPlayer(player)}>
                                Edit
                              </button>

                              <button
                                type="button"
                                className="danger-button"
                                onClick={() => deletePlayer(player)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="card">
              <h2>{playerForm.playerCode ? "Edit Player" : "New Player"}</h2>

              <form onSubmit={savePlayer}>
                <label htmlFor="playerCode">Player Code</label>
                <input
                  id="playerCode"
                  type="text"
                  placeholder="example: jimmy"
                  value={playerForm.playerCode}
                  onChange={(event) =>
                    setPlayerForm({
                      ...playerForm,
                      playerCode: event.target.value,
                    })
                  }
                />

                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="example: Jimmy"
                  value={playerForm.displayName}
                  onChange={(event) =>
                    setPlayerForm({
                      ...playerForm,
                      displayName: event.target.value,
                    })
                  }
                />

                <label htmlFor="pin">PIN</label>
                <input
                  id="pin"
                  type="text"
                  placeholder="example: 1234"
                  value={playerForm.pin}
                  onChange={(event) =>
                    setPlayerForm({
                      ...playerForm,
                      pin: event.target.value,
                    })
                  }
                />

                <div className="checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={playerForm.active}
                      onChange={(event) =>
                        setPlayerForm({
                          ...playerForm,
                          active: event.target.checked,
                        })
                      }
                    />
                    Active
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={playerForm.isSuperuser}
                      onChange={(event) =>
                        setPlayerForm({
                          ...playerForm,
                          isSuperuser: event.target.checked,
                        })
                      }
                    />
                    Superuser
                  </label>
                </div>

                <h3>Game Permissions</h3>

                {games.length === 0 ? (
                  <p className="muted">
                    No games found. Add games in Manage Games first.
                  </p>
                ) : (
                  <div className="permission-grid">
                    <div className="permission-grid-header">Game</div>
                    <div className="permission-grid-header">Can Play</div>
                    <div className="permission-grid-header">Can Create</div>

                    {games.map((game) => (
                      <div className="permission-row" key={game.id}>
                        <div className="permission-game-name">
                          <strong>{game.title || game.id}</strong>
                          <span>{game.id}</span>
                        </div>

                        <label className="permission-checkbox">
                          <input
                            type="checkbox"
                            checked={hasGamePermission(
                              playerForm.authorizedToPlay,
                              game.id
                            )}
                            onChange={(event) =>
                              updatePlayerPermission(
                                "authorizedToPlay",
                                game.id,
                                event.target.checked
                              )
                            }
                          />
                          Play
                        </label>

                        <label className="permission-checkbox">
                          <input
                            type="checkbox"
                            checked={hasGamePermission(
                              playerForm.authorizedToCreate,
                              game.id
                            )}
                            onChange={(event) =>
                              updatePlayerPermission(
                                "authorizedToCreate",
                                game.id,
                                event.target.checked
                              )
                            }
                          />
                          Create
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit">Save Player</button>
              </form>
            </article>
          </section>
        )}

        {activeAdminTab === "games" && (
          <section className="admin-main">
            <article className="card">
              <div className="section-heading-row">
                <h2>Games</h2>

                <button type="button" onClick={startNewGame}>
                  New Game
                </button>
              </div>

              {loading ? (
                <p className="muted">Loading games...</p>
              ) : games.length === 0 ? (
                <p className="muted">No games found.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Game ID</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Players</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {games.map((game) => (
                        <tr key={game.id}>
                          <td>{game.id}</td>
                          <td>{game.title}</td>
                          <td>{game.enabled === false ? "Disabled" : "Enabled"}</td>
                          <td>
                            {game.minPlayers} to{" "}
                            {Number(game.maxPlayers) === 0
                              ? "unlimited"
                              : game.maxPlayers}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button type="button" onClick={() => editGame(game)}>
                                Edit
                              </button>

                              <button
                                type="button"
                                className="danger-button"
                                onClick={() => deleteGame(game)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="card">
              <h2>{gameForm.gameId ? "Edit Game" : "New Game"}</h2>

              <form onSubmit={saveGame}>
                <label htmlFor="gameId">Game ID</label>
                <input
                  id="gameId"
                  type="text"
                  placeholder="example: baseball"
                  value={gameForm.gameId}
                  onChange={(event) =>
                    setGameForm({
                      ...gameForm,
                      gameId: event.target.value,
                    })
                  }
                />

                <label htmlFor="gameTitle">Game Title</label>
                <input
                  id="gameTitle"
                  type="text"
                  placeholder="example: Baseball"
                  value={gameForm.title}
                  onChange={(event) =>
                    setGameForm({
                      ...gameForm,
                      title: event.target.value,
                    })
                  }
                />

                <label htmlFor="minPlayers">Minimum Players</label>
                <input
                  id="minPlayers"
                  type="number"
                  min="1"
                  value={gameForm.minPlayers}
                  onChange={(event) =>
                    setGameForm({
                      ...gameForm,
                      minPlayers: event.target.value,
                    })
                  }
                />

                <label htmlFor="maxPlayers">
                  Maximum Players, use 0 for unlimited
                </label>
                <input
                  id="maxPlayers"
                  type="number"
                  min="0"
                  value={gameForm.maxPlayers}
                  onChange={(event) =>
                    setGameForm({
                      ...gameForm,
                      maxPlayers: event.target.value,
                    })
                  }
                />

                <div className="checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={gameForm.enabled}
                      onChange={(event) =>
                        setGameForm({
                          ...gameForm,
                          enabled: event.target.checked,
                        })
                      }
                    />
                    Enabled
                  </label>
                </div>

                <button type="submit">Save Game</button>
              </form>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}