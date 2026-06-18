// /src/games/player-portal/CreateRoom.jsx

import { useEffect, useRef, useState } from "react";
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
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function getPlayerDisplayName(player) {
  return player.displayName || player.name || player.id || "Unknown Player";
}

export default function CreateRoom({ player, onRoomCreated }) {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [creating, setCreating] = useState(false);

  // Opponent picker
  const [activePlayers, setActivePlayers] = useState([]);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [opponentSearch, setOpponentSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const pickerRef = useRef(null);

  const authorizedToCreate =
    player.authorizedGames ||
    player.authorizedToCreate ||
    player.authorizedToPlay ||
    [];

  const isSuperuser = player.isSuperuser || player.isSuperUser || false;

  useEffect(() => {
    loadGames();
    loadActivePlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close suggestions when clicking outside the picker
  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadGames() {
    setLoadingGames(true);
    setMessage("");
    try {
      if (authorizedToCreate.length === 0 && !isSuperuser) {
        setGames([]);
        return;
      }

      const gamesSnapshot = await getDocs(collection(db, "games"));
      let loadedGames = gamesSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((g) => g.enabled !== false);

      if (!isSuperuser) {
        loadedGames = loadedGames.filter((g) => authorizedToCreate.includes(g.id));
      }

      loadedGames.sort((a, b) =>
        String(a.title || a.id).localeCompare(String(b.title || b.id))
      );

      setGames(loadedGames);
      if (loadedGames.length > 0) setSelectedGameId(loadedGames[0].id);
    } catch (error) {
      console.error(error);
      setMessage(`Could not load games: ${error.message}`);
    } finally {
      setLoadingGames(false);
    }
  }

  async function loadActivePlayers() {
    try {
      const snapshot = await getDocs(collection(db, "players"));
      const others = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.active !== false && p.id !== player.id);
      setActivePlayers(others);
    } catch {
      // non-fatal — opponent picker stays empty
    }
  }

  async function handleCreateRoom(event) {
    event.preventDefault();

    if (!selectedGameId) {
      setMessage("Choose a game first.");
      return;
    }

    const selectedGame = games.find((g) => g.id === selectedGameId);
    if (!selectedGame) {
      setMessage("Selected game was not found.");
      return;
    }

    const cleanTitle =
      roomTitle.trim() || `${selectedGame.title || selectedGame.id} Game`;

    setCreating(true);
    setMessage("Creating game...");

    try {
      const gameDefinition = await loadGameDefinition(selectedGame.id);

      const initialGameState =
        gameDefinition?.rules?.createInitialState
          ? gameDefinition.rules.createInitialState({ options: {} })
          : gameDefinition?.createInitialState
            ? gameDefinition.createInitialState({ options: {} })
            : null;

      if (!initialGameState) {
        throw new Error(`Game "${selectedGame.id}" does not provide createInitialState().`);
      }

      const joinCode = makeJoinCode();
      const creatorName = getPlayerDisplayName(player);

      const gameSetup = {
        started: false,
        visitorsPlayerId: null,
        homePlayerId: null,
        visitorsTeamName: "Visitors",
        homeTeamName: "Home",
        visitorsTeamColor: "#991b1b",
        homeTeamColor: "#1d4ed8",
      };

      // Build player arrays — creator always first
      const playerIds = [player.id];
      const players = [
        {
          playerId: player.id,
          name: creatorName,
          slotId: null,
          joinedAt: Date.now(),
        },
      ];

      // If an opponent was selected, pre-add them
      const opponent = selectedOpponent;
      if (opponent) {
        playerIds.push(opponent.id);
        players.push({
          playerId: opponent.id,
          name: getPlayerDisplayName(opponent),
          slotId: null,
          joinedAt: Date.now(),
        });
      }

      const roomDoc = await addDoc(collection(db, "rooms"), {
        title: cleanTitle,
        gameId: selectedGame.id,
        gameTitle: selectedGame.title || selectedGame.id,
        joinCode,
        joinCodeLower: joinCode.toLowerCase(),
        createdBy: player.id,
        createdByName: creatorName,
        playerIds,
        players,
        gameSetup,
        gameState: initialGameState,
        status: "setup",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const createdRoom = {
        id: roomDoc.id,
        title: cleanTitle,
        gameId: selectedGame.id,
        gameTitle: selectedGame.title || selectedGame.id,
        joinCode,
        createdBy: player.id,
        createdByName: creatorName,
        playerIds,
        players,
        gameSetup,
        gameState: initialGameState,
        status: "setup",
      };

      setRoomTitle("");
      setSelectedOpponent(null);
      setOpponentSearch("");
      setMessage(`Game created!`);

      if (onRoomCreated) onRoomCreated(createdRoom);
    } catch (error) {
      console.error(error);
      setMessage(`Could not create game: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  if (authorizedToCreate.length === 0 && !isSuperuser) {
    return (
      <article className="card">
        <h2>New Game</h2>
        <p className="muted">You are not authorized to create games yet.</p>
      </article>
    );
  }

  return (
    <article className="card">
      <h2>New Game</h2>

      {loadingGames ? (
        <p className="muted">Loading...</p>
      ) : games.length === 0 ? (
        <p className="muted">No games available to create.</p>
      ) : (
        <form onSubmit={handleCreateRoom}>
          <label htmlFor="gameSelect">Game</label>
          <select
            id="gameSelect"
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title || g.id}
              </option>
            ))}
          </select>

          <label htmlFor="roomTitle">Game Name (optional)</label>
          <input
            id="roomTitle"
            type="text"
            placeholder="Leave blank for default name"
            value={roomTitle}
            onChange={(e) => setRoomTitle(e.target.value)}
          />

          {activePlayers.length > 0 && (
            <>
              <label htmlFor="opponentSearch">Invite Opponent</label>
              <div className="opponent-picker" ref={pickerRef}>
                {selectedOpponent ? (
                  <div className="opponent-selected">
                    <span className="opponent-selected-name">
                      {getPlayerDisplayName(selectedOpponent)}
                    </span>
                    <button
                      type="button"
                      className="opponent-clear"
                      onClick={() => {
                        setSelectedOpponent(null);
                        setOpponentSearch("");
                      }}
                      aria-label="Remove opponent"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <input
                    id="opponentSearch"
                    type="text"
                    placeholder="Search players..."
                    autoComplete="off"
                    value={opponentSearch}
                    onChange={(e) => {
                      setOpponentSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                )}
                {!selectedOpponent && showSuggestions && (() => {
                  const q = opponentSearch.trim().toLowerCase();
                  const filtered = activePlayers.filter((p) => {
                    const name = getPlayerDisplayName(p).toLowerCase();
                    return q === "" || name.includes(q) || p.id.includes(q);
                  });
                  return filtered.length > 0 ? (
                    <ul className="opponent-suggestions">
                      {filtered.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOpponent(p);
                              setOpponentSearch("");
                              setShowSuggestions(false);
                            }}
                          >
                            <span className="suggestion-name">{getPlayerDisplayName(p)}</span>
                            <span className="suggestion-code">{p.id}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : q ? (
                    <div className="opponent-no-results">No players match "{opponentSearch}"</div>
                  ) : null;
                })()}
              </div>
            </>
          )}

          <button type="submit" disabled={creating} style={{ marginTop: 20, width: "100%" }}>
            {creating ? "Creating..." : "Create Game"}
          </button>
        </form>
      )}

      {message && <p className="message">{message}</p>}
    </article>
  );
}
