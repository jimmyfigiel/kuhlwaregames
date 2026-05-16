import { arrayRemove, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { db } from "../../firebase.js";
import "./PlayerPortal.css";

export default function DeviceManager({
  player,
  authUser,
  onBack,
  onLogout,
  onPlayerUpdated,
}) {
  const [message, setMessage] = useState("");

  const authUids = Array.isArray(player.authUids) ? player.authUids : [];
  const currentUid = authUser?.uid || "";

  async function forgetThisDevice() {
    if (!currentUid) {
      setMessage("No current device session was found.");
      return;
    }

    const confirmed = window.confirm(
      "Forget this device? You will need to enter your Player Code and PIN next time."
    );

    if (!confirmed) {
      return;
    }

    try {
      const playerRef = doc(db, "players", player.id);

      await updateDoc(playerRef, {
        authUids: arrayRemove(currentUid),
        updatedAt: serverTimestamp(),
      });

      const playerSnap = await getDoc(playerRef);
      const updatedPlayer = {
        id: playerSnap.id,
        ...playerSnap.data(),
      };

      onPlayerUpdated(updatedPlayer);
      onLogout();
    } catch (error) {
      console.error(error);
      setMessage(`Could not forget device: ${error.message}`);
    }
  }

  return (
    <main className="player-portal portal-shell">
      <header className="portal-header">
        <div>
          <h1>Known Devices</h1>
          <p className="muted">
            Logged in as <strong>{player.displayName}</strong>
          </p>
        </div>

        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to Portal
          </button>
        </div>
      </header>

      <section className="single-card-layout">
        <article className="card">
          <h2>This Device</h2>

          <p className="small-muted">{currentUid || "No device UID available"}</p>

          <button type="button" className="danger-button" onClick={forgetThisDevice}>
            Forget This Device
          </button>

          <h2>Remembered Device Count</h2>
          <p>{authUids.length}</p>

          <p className="muted">
            This first version stores device IDs only. Later we can store labels,
            browser names, and last-used dates.
          </p>

          {message && <p className="message">{message}</p>}
        </article>
      </section>
    </main>
  );
}