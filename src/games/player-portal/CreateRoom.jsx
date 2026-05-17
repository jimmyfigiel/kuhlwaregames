// /src/games/player-portal/CreateRoom.jsx

import { useEffect, useState } from "react";
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

export default function CreateRoom({ player, onRoomCreated }) {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [creating, setCreating] = useState(false);

  const authorizedToCreate =
    player.authorizedGames ||
    player.authorizedToCreate ||
    player.authorizedToPlay ||
    [];

  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadGames() {
    setLoadingGames(true);
    setMessage("");

    try {
      if (
        authorizedToCreate.length === 0 &&
        !player.isSuperuser &&
        !player.isSuperUser
      ) {
        setGames([]);
        return;
      }

      const gamesSnapshot = await getDocs(collection(db, "games"));

      let loadedGames = gamesSnapshot.docs
        .map((gameDoc) => ({
          id: gameDoc.id,
          ...gameDoc.data(),
        }))
        .filter((game) => game.enabled !== false);

      if (!player.isSuperuser && !player.isSuperUser) {
        loadedGames = loadedGames.filter((game) =>
          authorizedToCreate.includes(game.id)
        );
      }

      loadedGames.sort((a, b) =>
        String(a.title || a.id).localeCompare(String(b.title || b.id))
      );

      setGames(loadedGames);

      if (loadedGames.length > 0) {
        setSelectedGameId(loadedGames[0].id);
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

    const selectedGame = games.find((game) => game.id === selectedGameId);

    if (!selectedGame) {
      setMessage("Selected game was not found.");
      return;
    }

    const cleanTitle =
      roomTitle.trim() || `${selectedGame.title || selectedGame.id} Room`;

    setCreating(true);
    setMessage("Creating room...");

    try {
      const gameDefinition = await loadGameDefinition(selectedGame.id);

      const initialGameState =
        gameDefinition?.rules?.createInitialState
          ? gameDefinition.rules.createInitialState({ options: {} })
          : gameDefinition?.createInitialState
            ? gameDefinition.createInitialState({ options: {} })
            : null;

      if (!initialGameState) {
        throw new Error(
          `Game "${selectedGame.id}" does not provide createInitialState().`
        );
      }

      const joinCode = makeJoinCode();
      const playerName = getPlayerDisplayName(player);

      const gameSetup = {
        started: false,

        visitorsPlayerId: null,
        homePlayerId: null,

        visitorsTeamName: "Visitors",
        homeTeamName: "Home",

        visitorsTeamColor: "#991b1b",
        homeTeamColor: "#1d4ed8",
      };

      const roomDoc = await addDoc(collection(db, "rooms"), {
        title: cleanTitle,

        gameId: selectedGame.id,
        gameTitle: selectedGame.title || selectedGame.id,

        joinCode,
        joinCodeLower: joinCode.toLowerCase(),

        createdBy: player.id,
        createdByName: playerName,

        playerIds: [player.id],

        players: [
          {
            playerId: player.id,
            name: playerName,
            slotId: null,
            joinedAt: Date.now(),
          },
        ],

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
        createdByName: playerName,
        playerIds: [player.id],
        players: [
          {
            playerId: player.id,
            name: playerName,
            slotId: null,
          },
        ],
        gameSetup,
        gameState: initialGameState,
        status: "setup",
      };

      setRoomTitle("");
      setMessage(`Created room: ${cleanTitle}`);

      if (onRoomCreated) {
        onRoomCreated(createdRoom);
      }
    } catch (error) {
      console.error(error);
      setMessage(`Could not create room: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  if (
    authorizedToCreate.length === 0 &&
    !player.isSuperuser &&
    !player.isSuperUser
  ) {
    return (
      <article className="card">
        <h2>Create New Room</h2>
        <p className="muted">You are not authorized to create rooms yet.</p>
      </article>
    );
  }

  return (
    <article className="card">
      <h2>Create New Room</h2>

      {loadingGames ? (
        <p className="muted">Loading games...</p>
      ) : games.length === 0 ? (
        <p className="muted">
          No enabled games are available for you to create.
        </p>
      ) : (
        <form onSubmit={handleCreateRoom}>
          <label htmlFor="gameSelect">Game</label>

          <select
            id="gameSelect"
            value={selectedGameId}
            onChange={(event) => setSelectedGameId(event.target.value)}
          >
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.title || game.id}
              </option>
            ))}
          </select>

          <label htmlFor="roomTitle">Room Title</label>

          <input
            id="roomTitle"
            type="text"
            placeholder="Leave blank for default room name"
            value={roomTitle}
            onChange={(event) => setRoomTitle(event.target.value)}
          />

          <button type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create Room"}
          </button>
        </form>
      )}

      {message && <p className="message">{message}</p>}
    </article>
  );
}