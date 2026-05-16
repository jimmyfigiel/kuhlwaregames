import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import "./PlayerPortal.css";

function makeJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 8; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

export default function CreateRoom({ player, onRoomCreated }) {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [creating, setCreating] = useState(false);

  const authorizedToCreate = player.authorizedToCreate || [];

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    setLoadingGames(true);
    setMessage("");

    try {
      if (authorizedToCreate.length === 0) {
        setGames([]);
        return;
      }

      const gamesSnapshot = await getDocs(collection(db, "games"));

      const loadedGames = gamesSnapshot.docs
        .map((gameDoc) => ({
          id: gameDoc.id,
          ...gameDoc.data(),
        }))
        .filter((game) => game.enabled !== false)
        .filter((game) => authorizedToCreate.includes(game.id))
        .sort((a, b) =>
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
      const joinCode = makeJoinCode();

      const roomDoc = await addDoc(collection(db, "rooms"), {
        title: cleanTitle,
        gameId: selectedGame.id,
        gameTitle: selectedGame.title || selectedGame.id,
        joinCode,
        joinCodeLower: joinCode.toLowerCase(),
        createdBy: player.id,
        createdByName: player.displayName,
        playerIds: [player.id],
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const roomSnap = await getDoc(doc(db, "rooms", roomDoc.id));

      const createdRoom = {
        id: roomSnap.id,
        ...roomSnap.data(),
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

  if (authorizedToCreate.length === 0) {
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