// /src/GameLoader.jsx

import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase.js";
import { loadGameDefinition } from "./gameRegistry.js";

function getPlayerSlot(room, player) {
  if (!room || !player) return null;

  const setup = room.gameSetup || {};

  if (setup.visitorsPlayerId === player.id) {
    return "visitors";
  }

  if (setup.homePlayerId === player.id) {
    return "home";
  }

  if (Array.isArray(room.players)) {
    const playerEntry = room.players.find(
      (roomPlayer) => roomPlayer.playerId === player.id
    );

    if (playerEntry?.slotId) {
      return playerEntry.slotId;
    }
  }

  return null;
}

function createInitialGameState(gameDefinition, room) {
  if (gameDefinition?.rules?.createInitialState) {
    return gameDefinition.rules.createInitialState({
      options: room?.options || {},
    });
  }

  return null;
}

export default function GameLoader({ room, player, authUser, onRoomChanged }) {
  const [loading, setLoading] = useState(true);
  const [gameDefinition, setGameDefinition] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.gameId]);

  async function loadGame() {
    setLoading(true);
    setGameDefinition(null);
    setMessage("");

    if (!room?.gameId) {
      setMessage("This room does not have a gameId.");
      setLoading(false);
      return;
    }

    try {
      const loadedDefinition = await loadGameDefinition(room.gameId);

      if (!loadedDefinition.Component) {
        setMessage(`Game plugin "${room.gameId}" does not export a Component.`);
        setLoading(false);
        return;
      }

      setGameDefinition(loadedDefinition);
    } catch (error) {
      console.error(error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateRoomData(updates) {
    try {
      await updateDoc(doc(db, "rooms", room.id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      if (onRoomChanged) {
        await onRoomChanged();
      }
    } catch (error) {
      console.error(error);
      setMessage(`Could not update room: ${error.message}`);
    }
  }

  async function initializeMissingGameState() {
    if (!gameDefinition) {
      setMessage("Game definition has not loaded yet.");
      return;
    }

    const initialGameState = createInitialGameState(gameDefinition, room);

    if (!initialGameState) {
      setMessage("This game does not have createInitialState.");
      return;
    }

    await updateRoomData({
      gameState: initialGameState,
    });
  }

  async function submitAction(action) {
    if (!gameDefinition?.rules?.submitAction) {
      setMessage("This game does not support submitAction.");
      return;
    }

    if (!room?.gameState) {
      setMessage("Game state has not been initialized.");
      return;
    }

    try {
      const playerSlot = getPlayerSlot(room, player);

      const nextGameState = gameDefinition.rules.submitAction({
        state: room.gameState,
        playerSlot,
        action,
      });

      await updateRoomData({
        gameState: nextGameState,
      });
    } catch (error) {
      console.error(error);
      setMessage(`Could not submit action: ${error.message}`);
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

        {message.includes("Game state") && (
          <button type="button" onClick={initializeMissingGameState}>
            Initialize Game State
          </button>
        )}
      </article>
    );
  }

  if (!gameDefinition) {
    return (
      <article className="card wide-card">
        <h2>Game Loader</h2>
        <p className="message">Game definition was not loaded.</p>
      </article>
    );
  }

  const GameComponent = gameDefinition.Component;
  const playerSlot = getPlayerSlot(room, player);

  return (
    <GameComponent
      room={room}
      player={player}
      authUser={authUser}
      gameDefinition={gameDefinition}
      playerSlot={playerSlot}
      gameState={room?.gameState || null}
      submitAction={submitAction}
      updateRoomData={updateRoomData}
      initializeMissingGameState={initializeMissingGameState}
      onRoomChanged={onRoomChanged}
    />
  );
}