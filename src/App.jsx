import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

import { auth, db } from "./firebase.js";
import Login from "./games/player-portal/Login.jsx";
import Dashboard from "./games/player-portal/Dashboard.jsx";
import RoomScreen from "./games/player-portal/RoomScreen.jsx";

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [pendingJoinCode, setPendingJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");

    if (joinCode) {
      setPendingJoinCode(joinCode.trim());
    }

    let alreadyTriedAnonymousSignIn = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);

        if (!firebaseUser) {
          if (!alreadyTriedAnonymousSignIn) {
            alreadyTriedAnonymousSignIn = true;
            await signInAnonymously(auth);
          }
          return;
        }

        setAuthUser(firebaseUser);
        await restorePlayerFromAuthUid(firebaseUser.uid);
      } catch (error) {
        console.error(error);
        setSessionMessage(`Auth failed: ${error.message}`);
        setAuthUser(null);
        setCurrentPlayer(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function restorePlayerFromAuthUid(uid) {
    try {
      const playersSnapshot = await getDocs(
        query(collection(db, "players"), where("authUids", "array-contains", uid))
      );

      if (playersSnapshot.empty) {
        setCurrentPlayer(null);
        return;
      }

      const activePlayer = playersSnapshot.docs
        .map((playerSnap) => ({
          id: playerSnap.id,
          ...playerSnap.data(),
        }))
        .find((player) => player.active !== false);

      setCurrentPlayer(activePlayer || null);
    } catch (error) {
      console.error(error);
      setSessionMessage(`Could not restore player session: ${error.message}`);
      setCurrentPlayer(null);
    }
  }

  function handleLoginSuccess(player) {
    setCurrentPlayer(player);
  }

  function handleLogout() {
    setCurrentRoom(null);
    setCurrentPlayer(null);
  }

  function handlePlayerUpdated(updatedPlayer) {
    setCurrentPlayer(updatedPlayer);
  }

  function handleOpenRoom(room) {
    setCurrentRoom(room);

    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    window.history.replaceState({}, "", url.toString());

    setPendingJoinCode("");
  }

  function handleLeaveRoomScreen() {
    setCurrentRoom(null);
  }

  function handleJoinCodeHandled() {
    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    window.history.replaceState({}, "", url.toString());

    setPendingJoinCode("");
  }

  if (loading) {
    return (
      <main className="player-portal app-shell">
        <section className="card">
          <h1>Kuhlware Games</h1>
          <p className="muted">Checking device authentication...</p>
          {sessionMessage && <p className="message">{sessionMessage}</p>}
        </section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="player-portal app-shell">
        <section className="card">
          <h1>Kuhlware Games</h1>
          <p className="message">
            Device authentication is not available. Make sure Anonymous Auth is
            enabled in Firebase.
          </p>
          {sessionMessage && <p className="message">{sessionMessage}</p>}
        </section>
      </main>
    );
  }

  if (!currentPlayer) {
    return (
      <Login
        authUser={authUser}
        onLoginSuccess={handleLoginSuccess}
        sessionMessage={sessionMessage}
        pendingJoinCode={pendingJoinCode}
      />
    );
  }

  if (currentRoom) {
    return (
      <RoomScreen
        room={currentRoom}
        player={currentPlayer}
        authUser={authUser}
        onBack={handleLeaveRoomScreen}
        onRoomDeleted={handleLeaveRoomScreen}
      />
    );
  }

  return (
    <Dashboard
      player={currentPlayer}
      authUser={authUser}
      pendingJoinCode={pendingJoinCode}
      onJoinCodeHandled={handleJoinCodeHandled}
      onOpenRoom={handleOpenRoom}
      onLogout={handleLogout}
      onPlayerUpdated={handlePlayerUpdated}
    />
  );
}