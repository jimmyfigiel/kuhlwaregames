import { useState } from "react";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import "./PlayerPortal.css";

export default function ChangePin({ player, onCancel, onPlayerUpdated }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");

  async function handleChangePin(event) {
    event.preventDefault();

    const cleanCurrentPin = currentPin.trim();
    const cleanNewPin = newPin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!cleanCurrentPin) {
      setMessage("Enter your current PIN.");
      return;
    }

    if (!cleanNewPin) {
      setMessage("Enter a new PIN.");
      return;
    }

    if (cleanNewPin.length < 4) {
      setMessage("New PIN should be at least 4 characters.");
      return;
    }

    if (cleanNewPin !== cleanConfirmPin) {
      setMessage("New PIN and confirmation do not match.");
      return;
    }

    try {
      const playerRef = doc(db, "players", player.id);
      const playerSnap = await getDoc(playerRef);

      if (!playerSnap.exists()) {
        setMessage("Could not find your player account.");
        return;
      }

      const latestPlayerData = playerSnap.data();

      if (latestPlayerData.pin !== cleanCurrentPin) {
        setMessage("Current PIN is incorrect.");
        return;
      }

      await updateDoc(playerRef, {
        pin: cleanNewPin,
        updatedAt: serverTimestamp(),
      });

      onPlayerUpdated({
        id: player.id,
        ...latestPlayerData,
        pin: cleanNewPin,
      });

      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setMessage("PIN changed.");
    } catch (error) {
      console.error(error);
      setMessage(`Could not change PIN: ${error.message}`);
    }
  }

  return (
    <main className="player-portal portal-shell">
      <header className="portal-header">
        <div>
          <h1>Change My PIN</h1>
          <p className="muted">
            Logged in as <strong>{player.displayName}</strong>
          </p>
        </div>

        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Back to Portal
          </button>
        </div>
      </header>

      <section className="single-card-layout">
        <article className="card">
          <h2>Update PIN</h2>

          <form onSubmit={handleChangePin}>
            <label htmlFor="currentPin">Current PIN</label>
            <input
              id="currentPin"
              type="password"
              value={currentPin}
              onChange={(event) => setCurrentPin(event.target.value)}
            />

            <label htmlFor="newPin">New PIN</label>
            <input
              id="newPin"
              type="password"
              value={newPin}
              onChange={(event) => setNewPin(event.target.value)}
            />

            <label htmlFor="confirmPin">Confirm New PIN</label>
            <input
              id="confirmPin"
              type="password"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value)}
            />

            <button type="submit">Change PIN</button>
          </form>

          {message && <p className="message">{message}</p>}
        </article>
      </section>
    </main>
  );
}