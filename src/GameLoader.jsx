import { useEffect, useState } from "react";
import { getGameDefinition } from "./gameRegistry.js";

export default function GameLoader({
  room,
  player,
  authUser,
  onRoomChanged,
}) {
  const [loading, setLoading] = useState(true);
  const [LoadedGame, setLoadedGame] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadGameComponent();
  }, [room?.gameId]);

  async function loadGameComponent() {
    setLoading(true);
    setLoadedGame(null);
    setMessage("");

    if (!room?.gameId) {
      setMessage("This room does not have a gameId.");
      setLoading(false);
      return;
    }

    const gameDefinition = getGameDefinition(room.gameId);

    if (!gameDefinition) {
      setMessage(`No game module is registered for gameId "${room.gameId}".`);
      setLoading(false);
      return;
    }

    try {
      const module = await gameDefinition.load();

      if (!module.default) {
        setMessage(`Game module "${room.gameId}" does not have a default export.`);
        setLoading(false);
        return;
      }

      setLoadedGame(() => module.default);
    } catch (error) {
      console.error(error);
      setMessage(`Could not load game module: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <article className="card wide-card">
        <h2>Loading Game</h2>
        <p className="muted">Loading {room.gameTitle || room.gameId}...</p>
      </article>
    );
  }

  if (message) {
    return (
      <article className="card wide-card">
        <h2>Game Loader</h2>
        <p className="message">{message}</p>
        <p className="muted">
          Add this game to <code>src/gameRegistry.js</code> before rooms using
          this game can open.
        </p>
      </article>
    );
  }

  return (
    <LoadedGame
      room={room}
      player={player}
      authUser={authUser}
      onRoomChanged={onRoomChanged}
    />
  );
}