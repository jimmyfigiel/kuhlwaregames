import { useState } from "react";
import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import "./PlayerPortal.css";

export default function Login({
  authUser,
  onLoginSuccess,
  sessionMessage = "",
}) {
  const [playerCode, setPlayerCode] = useState("");
  const [pin, setPin] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [message, setMessage] = useState(sessionMessage);

  async function handleLogin(event) {
    event.preventDefault();

    const cleanPlayerCode = playerCode.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!authUser?.uid) {
      setMessage("Device authentication is not ready yet. Try again.");
      return;
    }

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

      if (rememberDevice) {
        await updateDoc(playerRef, {
          authUids: arrayUnion(authUser.uid),
          updatedAt: serverTimestamp(),
        });
      }

      onLoginSuccess({
        id: playerSnap.id,
        ...playerData,
        authUids: rememberDevice
          ? Array.from(new Set([...(playerData.authUids || []), authUser.uid]))
          : playerData.authUids || [],
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

          <label className="remember-device-row">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(event) => setRememberDevice(event.target.checked)}
            />
            Remember this device
          </label>

          <button type="submit">Log in</button>
        </form>

        {message && <p className="message">{message}</p>}

        <p className="small-muted">
          Device ID: {authUser?.uid ? authUser.uid : "not ready"}
        </p>
      </section>
    </main>
  );
}