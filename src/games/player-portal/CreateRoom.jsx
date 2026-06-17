// /src/games/player-portal/CreateRoom.jsx

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase.js";
import { loadGameDefinition } from "../../gameRegistry.js";
import "./PlayerPortal.css";

function makeJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 8; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function getPlayerDisplayName(player) {
  return player.displayName || player.name || player.id || "Unknown Player";
}

function isSuperuser(player) {
  return player.isSuperuser || player.isSuperUser || false;
}

function normalizeGameList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(Boolean);
}

function playerCanPlayGame(player, gameId) {
  if (!player || !gameId) {
    return false;
  }

  if (isSuperuser(player)) {
    return true;
  }

  const authorizedGames = normalizeGameList(
    player.authorizedToPlay || player.authorizedGames
  );

  return authorizedGames.includes(gameId);
}

function canInviteOpponentToGame(game) {
  const maxPlayers = Number(game?.maxPlayers ?? 0);
  return maxPlayers !== 1;
}

function buildDefaultGameTitle(selectedGame, creatorName, opponent) {
  const gameTitle = selectedGame?.title || selectedGame?.id || "Game";

  if (opponent) {
    return `${gameTitle}: ${creatorName} vs ${getPlayerDisplayName(opponent)}`;
  }

  return `${gameTitle}: Solo`;
}

export default function CreateRoom({ player, onRoomCreated }) {
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedOpponentId, setSelectedOpponentId] = useState("");
  const [gameTitle, setGameTitle] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [creating, setCreating] = useState(false);

  const creatorIsSuperuser = isSuperuser(player);
  const authorizedToCreate = normalizeGameList(
    player.authorizedToCreate || player.authorizedGames
  );

  useEffect(() => {
    loadSetupData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) || null,
    [games, selectedGameId]
  );

  const eligibleOpponents = useMemo(() => {
    if (!selectedGame || !canInviteOpponentToGame(selectedGame)) {
      return [];
    }

    return players.filter((candidate) => {
      if (!candidate?.id || candidate.id === player.id) {
        return false;
      }

      if (candidate.active === false) {
        return false;
      }

      return playerCanPlayGame(candidate, selectedGame.id);
    });
  }, [players, player.id, selectedGame]);

  useEffect(() => {
    if (!selectedOpponentId) {
      return;
    }

    const stillEligible = eligibleOpponents.some(
      (candidate) => candidate.id === selectedOpponentId
    );

    if (!stillEligible) {
      setSelectedOpponentId("");
    }
  }, [eligibleOpponents, selectedOpponentId]);

  async function loadSetupData() {
    setLoadingGames(true);
    setMessage("");

    try {
      if (authorizedToCreate.length === 0 && !creatorIsSuperuser) {
        setGames([]);
        setPlayers([]);
        return;
      }

      const [gamesSnapshot, playersSnapshot] = await Promise.all([
        getDocs(collection(db, "games")),
        getDocs(collection(db, "players")),
      ]);

      let loadedGames = gamesSnapshot.docs
        .map((gameDoc) => ({
          id: gameDoc.id,
          ...gameDoc.data(),
        }))
        .filter((game) => game.enabled !== false);

      if (!creatorIsSuperuser) {
        loadedGames = loadedGames.filter((game) =>
          authorizedToCreate.includes(game.id)
        );
      }

      loadedGames.sort((a, b) =>
        String(a.title || a.id).localeCompare(String(b.title || b.id))
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

      setGames(loadedGames);
      setPlayers(loadedPlayers);

      if (loadedGames.length > 0) {
        setSelectedGameId((currentGameId) => currentGameId || loadedGames[0].id);
      }
    } catch (error) {
      console.error(error);
      setMessage(`Could not load games: ${error.message}`);
    } finally {
      setLoadingGames(false);
    }
  }

  async function handleCreateRoom(event) {
    event.preventDefault();

    if (!selectedGameId) {
      setMessage("Choose a game first.");
      return;
    }

    if (!selectedGame) {
      setMessage("Selected game was not found.");
      return;
    }

    const selectedOpponent = eligibleOpponents.find(
      (candidate) => candidate.id === selectedOpponentId
    );

    if (selectedOpponentId && !selectedOpponent) {
      setMessage("Selected opponent is not available for this game.");
      return;
    }

    const joinCode = makeJoinCode();
    const playerName = getPlayerDisplayName(player);
    const cleanTitle =
      gameTitle.trim() || buildDefaultGameTitle(selectedGame, playerName, selectedOpponent);

    setCreating(true);
    setMessage("Starting game...");

    try {
      const gameDefinition = await loadGameDefinition(selectedGame.id);

      const initialGameState = gameDefinition?.rules?.createInitialState
        ? gameDefinition.rules.createInitialState({ options: {} })
        : gameDefinition?.createInitialState
          ? gameDefinition.createInitialState({ options: {} })
          : null;

      if (!initialGameState) {
        throw new Error(
          `Game "${selectedGame.id}" does not provide createInitialState().`
        );
      }

      const createdAtMillis = Date.now();
      const playerIds = selectedOpponent
        ? [player.id, selectedOpponent.id]
        : [player.id];

      const playersForGame = [
        {
          playerId: player.id,
          name: playerName,
          slotId: null,
          joinedAt: createdAtMillis,
          invited: false,
        },
      ];

      if (selectedOpponent) {
        playersForGame.push({
          playerId: selectedOpponent.id,
          name: getPlayerDisplayName(selectedOpponent),
          slotId: null,
          joinedAt: null,
          invitedAt: createdAtMillis,
          invitedBy: player.id,
          invited: true,
        });
      }

      const gameSetup = {
        started: false,

        visitorsPlayerId: selectedOpponent ? selectedOpponent.id : null,
        homePlayerId: player.id,

        visitorsTeamName: selectedOpponent
          ? getPlayerDisplayName(selectedOpponent)
          : "Visitors",
        homeTeamName: playerName,

        visitorsTeamColor: "#991b1b",
        homeTeamColor: "#1d4ed8",
      };

      const roomPayload = {
        title: cleanTitle,

        gameId: selectedGame.id,
        gameTitle: selectedGame.title || selectedGame.id,

        joinCode,
        joinCodeLower: joinCode.toLowerCase(),

        createdBy: player.id,
        createdByName: playerName,

        playerIds,
        players: playersForGame,

        invitedPlayerIds: selectedOpponent ? [selectedOpponent.id] : [],
        invitedBy: player.id,

        gameSetup,
        gameState: initialGameState,

        status: "setup",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const roomDoc = await addDoc(collection(db, "rooms"), roomPayload);

      const createdRoom = {
        ...roomPayload,
        id: roomDoc.id,
        createdAt: null,
        updatedAt: null,
      };

      setGameTitle("");
      setSelectedOpponentId("");
      setMessage(`Started game: ${cleanTitle}`);

      if (onRoomCreated) {
        onRoomCreated(createdRoom);
      }
    } catch (error) {
      console.error(error);
      setMessage(`Could not start game: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  if (authorizedToCreate.length === 0 && !creatorIsSuperuser) {
    return (
      <section className="dashboard-section">
        <article className="card wide-card">
          <h2>Start a New Game</h2>
          <p className="muted">You are not authorized to create games yet.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <article className="card wide-card start-game-card">
        <div className="section-heading-row">
          <div>
            <h2>Start a New Game</h2>
            <p className="muted">
              Pick a game, optionally select an opponent, and start playing.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button compact-button"
            onClick={loadSetupData}
            disabled={loadingGames || creating}
          >
            Refresh
          </button>
        </div>

        {loadingGames ? (
          <p className="muted">Loading games...</p>
        ) : games.length === 0 ? (
          <p className="muted">
            No enabled games are available for you to create.
          </p>
        ) : (
          <form onSubmit={handleCreateRoom} className="start-game-form">
            <div className="create-game-grid" role="list" aria-label="Games you can start">
              {games.map((game) => {
                const selected = game.id === selectedGameId;

                return (
                  <button
                    key={game.id}
                    type="button"
                    className={selected ? "create-game-option selected-button" : "create-game-option"}
                    onClick={() => setSelectedGameId(game.id)}
                    aria-pressed={selected}
                  >
                    <strong>{game.title || game.id}</strong>
                    <span>
                      {Number(game.maxPlayers) === 1
                        ? "Solo"
                        : Number(game.maxPlayers) > 1
                          ? `Up to ${game.maxPlayers} players`
                          : "Solo or multiplayer"}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedGame && canInviteOpponentToGame(selectedGame) && (
              <>
                <label htmlFor="opponentSelect">Opponent</label>

                <select
                  id="opponentSelect"
                  value={selectedOpponentId}
                  onChange={(event) => setSelectedOpponentId(event.target.value)}
                >
                  <option value="">Solo / Test Mode</option>
                  {eligibleOpponents.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {getPlayerDisplayName(candidate)}
                    </option>
                  ))}
                </select>

                {eligibleOpponents.length === 0 && (
                  <p className="small-muted">
                    No other active players are authorized for this game yet.
                  </p>
                )}
              </>
            )}

            <button
              type="button"
              className="secondary-button compact-button advanced-toggle"
              onClick={() => setShowAdvanced((currentValue) => !currentValue)}
            >
              {showAdvanced ? "Hide Advanced Setup" : "Advanced Setup"}
            </button>

            {showAdvanced && (
              <div className="advanced-setup-panel">
                <label htmlFor="gameTitle">Game Name</label>

                <input
                  id="gameTitle"
                  type="text"
                  placeholder="Leave blank for automatic name"
                  value={gameTitle}
                  onChange={(event) => setGameTitle(event.target.value)}
                />

                <p className="small-muted">
                  Internal database names stay unchanged for compatibility. Players only see games.
                </p>
              </div>
            )}

            <button type="submit" className="primary-action-button" disabled={creating}>
              {creating ? "Starting..." : "Start Game"}
            </button>
          </form>
        )}

        {message && <p className="message">{message}</p>}
      </article>
    </section>
  );
}
