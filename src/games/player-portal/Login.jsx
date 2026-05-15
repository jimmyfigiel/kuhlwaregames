import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import "./PlayerPortal.css";

export default function Login({ onLoginSuccess }) {
  const [playerCode, setPlayerCode] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    const cleanPlayerCode = playerCode.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanPlayerCode) {
      setMessage("Enter your player code.");
      return;
    }

    if (!cleanPin) {
      setMessage("Enter your PIN.");
      return;
    }

    setMessage("Checking login...");

    try {
      const playerRef = doc(db, "players", cleanPlayerCode);
      const playerSnap = await getDoc(playerRef);

      if (!playerSnap.exists()) {
        setMessage("No player found with that player code.");
        return;
      }

      const playerData = playerSnap.data();

      if (!playerData.active) {
        setMessage("This player account is inactive.");
        return;
      }

      if (playerData.pin !== cleanPin) {
        setMessage("Incorrect PIN.");
        return;
      }

      onLoginSuccess({
        id: playerSnap.id,
        ...playerData,
      });
    } catch (error) {
      console.error(error);
      setMessage(`Login failed: ${error.message}`);
    }
  }

  return (
    <main className="player-portal app-shell">
      <section className="card">
        <h1>Kuhlware Games</h1>
        <p className="muted">Player portal login</p>

        <form onSubmit={handleLogin}>
          <label htmlFor="playerCodeInput">Player Code</label>

          <input
            id="playerCodeInput"
            type="text"
            placeholder="Example: jimmy"
            autoComplete="username"
            value={playerCode}
            onChange={(event) => setPlayerCode(event.target.value)}
          />

          <label htmlFor="pinInput">PIN</label>

          <input
            id="pinInput"
            type="password"
            placeholder="Enter PIN"
            autoComplete="current-password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />

          <button type="submit">Log in</button>
        </form>

        <p className="message">{message}</p>
      </section>
    </main>
  );
}