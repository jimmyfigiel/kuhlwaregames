// /src/games/player-portal/Login.jsx

import { useEffect, useState } from "react";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../firebase.js";
import "./PlayerPortal.css";

function normalizePlayerCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function makePlayerCodeFromName(name) {
  const baseCode = normalizePlayerCode(name);

  if (baseCode) {
    return baseCode;
  }

  return `player-${Math.floor(100000 + Math.random() * 900000)}`;
}

function getDisplayNameFromPlayer(playerCode, displayName) {
  return displayName.trim() || playerCode;
}

export default function Login({
  authUser,
  onLoginSuccess,
  sessionMessage = "",
  pendingJoinCode = "",
}) {
  const [mode, setMode] = useState(pendingJoinCode ? "create" : "login");

  const [playerCode, setPlayerCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [rememberDevice, setRememberDevice] = useState(true);
  const [message, setMessage] = useState(sessionMessage);
  const [inviteRoom, setInviteRoom] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  useEffect(() => {
    if (pendingJoinCode) {
      loadInviteRoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingJoinCode]);

  async function loadInviteRoom() {
    setLoadingInvite(true);
    setMessage(sessionMessage || "");

    try {
      const cleanJoinCode = String(pendingJoinCode || "").trim().toLowerCase();

      if (!cleanJoinCode) {
        setInviteRoom(null);
        return;
      }

      const roomSnapshot = await getDocs(
        query(
          collection(db, "rooms"),
          where("joinCodeLower", "==", cleanJoinCode)
        )
      );

      if (roomSnapshot.empty) {
        setInviteRoom(null);
        setMessage("This invite link does not match an active room.");
        return;
      }

      const roomSnap = roomSnapshot.docs[0];

      setInviteRoom({
        id: roomSnap.id,
        ...roomSnap.data(),
      });

      setMode("create");
    } catch (error) {
      console.error(error);
      setMessage(`Could not load invite: ${error.message}`);
    } finally {
      setLoadingInvite(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    const cleanPlayerCode = normalizePlayerCode(playerCode);
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
        setMessage(
          pendingJoinCode
            ? "No player found with that code. Use Create Invited Player below to make a new account for this invite."
            : "No player found with that player code."
        );
        return;
      }

      const playerData = playerSnap.data();

      if (playerData.active === false) {
        setMessage("This player account is inactive.");
        return;
      }

      if (playerData.pin !== cleanPin) {
        setMessage("Incorrect PIN.");
        return;
      }

      const updatedAuthUids = rememberDevice
        ? Array.from(new Set([...(playerData.authUids || []), authUser.uid]))
        : playerData.authUids || [];

      if (rememberDevice) {
        await updateDoc(playerRef, {
          authUids: arrayUnion(authUser.uid),
          updatedAt: serverTimestamp(),
        });
      }

      onLoginSuccess({
        id: playerSnap.id,
        ...playerData,
        authUids: updatedAuthUids,
      });
    } catch (error) {
      console.error(error);
      setMessage(`Login failed: ${error.message}`);
    }
  }

  async function handleCreateInvitedPlayer(event) {
    event.preventDefault();

    if (!authUser?.uid) {
      setMessage("Device authentication is not ready yet. Try again.");
      return;
    }

    if (!pendingJoinCode) {
      setMessage("New players can only be created from an invite link.");
      return;
    }

    const cleanDisplayName = displayName.trim();
    const cleanPlayerCode = normalizePlayerCode(
      playerCode || makePlayerCodeFromName(cleanDisplayName)
    );
    const cleanPin = pin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!cleanDisplayName) {
      setMessage("Enter your name.");
      return;
    }

    if (!cleanPlayerCode) {
      setMessage("Enter a player code.");
      return;
    }

    if (!cleanPin) {
      setMessage("Choose a PIN.");
      return;
    }

    if (cleanPin.length < 4) {
      setMessage("PIN should be at least 4 characters.");
      return;
    }

    if (cleanPin !== cleanConfirmPin) {
      setMessage("PIN and confirmation do not match.");
      return;
    }

    setMessage("Creating invited player...");

    try {
      let room = inviteRoom;

      if (!room) {
        await loadInviteRoom();
        room = inviteRoom;
      }

      if (!room?.gameId) {
        const cleanJoinCode = String(pendingJoinCode || "")
          .trim()
          .toLowerCase();

        const roomSnapshot = await getDocs(
          query(
            collection(db, "rooms"),
            where("joinCodeLower", "==", cleanJoinCode)
          )
        );

        if (roomSnapshot.empty) {
          setMessage("This invite link does not match an active room.");
          return;
        }

        const roomSnap = roomSnapshot.docs[0];
        room = {
          id: roomSnap.id,
          ...roomSnap.data(),
        };
      }

      const playerRef = doc(db, "players", cleanPlayerCode);
      const existingPlayerSnap = await getDoc(playerRef);

      if (existingPlayerSnap.exists()) {
        setMessage(
          "That player code already exists. Choose a different player code or log in."
        );
        return;
      }

      const playerName = getDisplayNameFromPlayer(
        cleanPlayerCode,
        cleanDisplayName
      );

      const newPlayerData = {
        displayName: playerName,
        name: playerName,
        playerCode: cleanPlayerCode,

        pin: cleanPin,

        active: true,
        isSuperuser: false,
        isSuperUser: false,

        authUids: rememberDevice ? [authUser.uid] : [],

        authorizedGames: room.gameId ? [room.gameId] : [],
        authorizedToPlay: room.gameId ? [room.gameId] : [],
        authorizedToCreate: room.gameId ? [room.gameId] : [],

        createdFromInviteCode: pendingJoinCode,
        createdFromRoomId: room.id || null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(playerRef, newPlayerData);

      onLoginSuccess({
        id: cleanPlayerCode,
        ...newPlayerData,
        authUids: rememberDevice ? [authUser.uid] : [],
      });
    } catch (error) {
      console.error(error);
      setMessage(`Could not create invited player: ${error.message}`);
    }
  }

  return (
    <main className="player-portal app-shell">
      <section className="card">
        <h1>Kuhlware Games</h1>

        {pendingJoinCode ? (
          <>
            <p className="muted">You were invited to join a game.</p>

            {loadingInvite ? (
              <p className="muted">Loading invite...</p>
            ) : inviteRoom ? (
              <p className="message">
                Invite: {inviteRoom.gameTitle || inviteRoom.gameId} ·{" "}
                {inviteRoom.title || "Untitled Room"}
              </p>
            ) : (
              <p className="message">
                Invite code: {pendingJoinCode}
              </p>
            )}
          </>
        ) : (
          <p className="muted">Player portal login</p>
        )}

        {pendingJoinCode && (
          <div className="button-list">
            <button
              type="button"
              className={mode === "login" ? "" : "secondary-button"}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Existing Player
            </button>

            <button
              type="button"
              className={mode === "create" ? "" : "secondary-button"}
              onClick={() => {
                setMode("create");
                setMessage("");
              }}
            >
              Create Invited Player
            </button>
          </div>
        )}

        {mode === "login" && (
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
        )}

        {mode === "create" && (
          <form onSubmit={handleCreateInvitedPlayer}>
            <label htmlFor="displayNameInput">Your Name</label>

            <input
              id="displayNameInput"
              type="text"
              placeholder="Example: Jimmy"
              autoComplete="name"
              value={displayName}
              onChange={(event) => {
                const nextDisplayName = event.target.value;
                setDisplayName(nextDisplayName);

                if (!playerCode.trim()) {
                  setPlayerCode(makePlayerCodeFromName(nextDisplayName));
                }
              }}
            />

            <label htmlFor="newPlayerCodeInput">Player Code</label>

            <input
              id="newPlayerCodeInput"
              type="text"
              placeholder="Example: jimmy"
              autoComplete="username"
              value={playerCode}
              onChange={(event) => setPlayerCode(event.target.value)}
            />

            <label htmlFor="newPinInput">Choose PIN</label>

            <input
              id="newPinInput"
              type="password"
              placeholder="Choose PIN"
              autoComplete="new-password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />

            <label htmlFor="confirmPinInput">Confirm PIN</label>

            <input
              id="confirmPinInput"
              type="password"
              placeholder="Confirm PIN"
              autoComplete="new-password"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value)}
            />

            <label className="remember-device-row">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(event) => setRememberDevice(event.target.checked)}
              />
              Remember this device
            </label>

            <button type="submit">Create Player and Continue</button>
          </form>
        )}

        {message && <p className="message">{message}</p>}

        <p className="small-muted">
          Device ID: {authUser?.uid ? authUser.uid : "not ready"}
        </p>
      </section>
    </main>
  );
}