import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase.js";

export default function App() {
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    const cleanPin = pin.trim();

    if (!cleanPin) {
      setMessage("Enter a PIN.");
      return;
    }

    setMessage("Checking PIN...");

    try {
      const playersRef = collection(db, "players");
      const playerQuery = query(
        playersRef,
        where("pin", "==", cleanPin),
        where("active", "==", true)
      );

      const snapshot = await getDocs(playerQuery);

      if (snapshot.empty) {
        setMessage("No active player found with that PIN.");
        return;
      }

      const docSnap = snapshot.docs[0];

      setCurrentPlayer({
        id: docSnap.id,
        ...docSnap.data(),
      });

      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage(`Login failed: ${error.message}`);
    }
  }

  function handleLogout() {
    setCurrentPlayer(null);
    setPin("");
    setMessage("");
  }

  if (currentPlayer) {
    return (
      <main className="app-shell">
        <section className="card">
          <h1>Kuhlware Games</h1>

          <p>
            Logged in as <strong>{currentPlayer.displayName}</strong>
          </p>

          <h2>Player Details</h2>

          <pre>{JSON.stringify(currentPlayer, null, 2)}</pre>

          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="card">
        <h1>Kuhlware Games</h1>
        <p className="muted">Player portal login test</p>

        <form onSubmit={handleLogin}>
          <label htmlFor="pinInput">PIN</label>

          <input
            id="pinInput"
            type="password"
            placeholder="Enter PIN"
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