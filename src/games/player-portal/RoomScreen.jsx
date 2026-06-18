// /src/games/player-portal/RoomScreen.jsx

import {
  arrayRemove,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

import GameLoader from "../../GameLoader.jsx";
import { db } from "../../firebase.js";
import { FONT_SCALE_OPTIONS, applyFontScale, getSavedFontScale } from "../../fontScale.js";
import ConfirmModal from "./ConfirmModal.jsx";
import "./PlayerPortal.css";

function getJoinUrl(joinCode) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("join", joinCode);
  return url.toString();
}

function getSyncState(message) {
  if (message.startsWith("Live sync")) return "live";
  if (message.toLowerCase().includes("error")) return "error";
  return "connecting";
}

function getPlayerNames(room) {
  if (room.players?.length) {
    return room.players.map((p) => p.name || p.playerId).join(", ");
  }
  return (room.playerIds || []).join(", ") || "None";
}

export default function RoomScreen({ room, player, authUser, onBack, onRoomDeleted }) {
  const [currentRoom, setCurrentRoom] = useState(room);
  const [message, setMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("Connecting to room...");
  const [confirmProps, setConfirmProps] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fontScale, setFontScale] = useState(getSavedFontScale);
  const menuRef = useRef(null);

  const isCreator = currentRoom.createdBy === player.id;
  const canManage = isCreator || player.isSuperuser || player.isSuperUser || false;
  const syncState = getSyncState(syncMessage);

  useEffect(() => {
    if (!room?.id) return undefined;
    const unsubscribe = onSnapshot(
      doc(db, "rooms", room.id),
      (snap) => {
        if (!snap.exists()) { setSyncMessage("This room no longer exists."); return; }
        setCurrentRoom({ id: snap.id, ...snap.data() });
        setSyncMessage("Live sync active.");
      },
      (error) => { console.error(error); setSyncMessage(`Live sync error: ${error.message}`); }
    );
    return () => unsubscribe();
  }, [room?.id]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function refreshRoom() {
    try {
      const snap = await getDoc(doc(db, "rooms", currentRoom.id));
      if (!snap.exists()) { setMessage("This room no longer exists."); return; }
      setCurrentRoom({ id: snap.id, ...snap.data() });
      setMessage("Room refreshed.");
    } catch (error) { setMessage(`Could not refresh: ${error.message}`); }
    setMenuOpen(false);
  }

  async function copyJoinLink() {
    if (!currentRoom.joinCode) { setMessage("No join code."); return; }
    try {
      await navigator.clipboard.writeText(getJoinUrl(currentRoom.joinCode));
      setMessage("Join link copied.");
    } catch { setMessage("Could not copy link."); }
    setMenuOpen(false);
  }

  function confirmLeave() {
    if (isCreator) { setMessage("Creators cannot leave — delete instead."); setMenuOpen(false); return; }
    setMenuOpen(false);
    setConfirmProps({
      message: "Leave this game? You can rejoin with the invite link.",
      confirmLabel: "Leave Game",
      onConfirm: async () => {
        setConfirmProps(null);
        try {
          await updateDoc(doc(db, "rooms", currentRoom.id), { playerIds: arrayRemove(player.id), updatedAt: serverTimestamp() });
          onBack();
        } catch (error) { setMessage(`Could not leave: ${error.message}`); }
      },
    });
  }

  function confirmDelete() {
    if (!canManage) { setMessage("Only the creator or superuser can delete."); setMenuOpen(false); return; }
    setMenuOpen(false);
    setConfirmProps({
      message: `Delete "${currentRoom.title || "this game"}"? This cannot be undone.`,
      confirmLabel: "Delete Game",
      onConfirm: async () => {
        setConfirmProps(null);
        try { await deleteDoc(doc(db, "rooms", currentRoom.id)); onRoomDeleted(); }
        catch (error) { setMessage(`Could not delete: ${error.message}`); }
      },
    });
  }

  return (
    <main className="player-portal room-shell">

      {/* ── Anchored header ── */}
      <header className="room-header">
        <div className="room-header-identity">
          <span className="room-header-brand">Kuhlware Games</span>
          <span className="room-header-player">
            {player.displayName || player.name || player.id}
          </span>
        </div>

        <div className="room-header-actions">
          <button type="button" className="secondary-button room-header-back" onClick={onBack}>
            ← Back
          </button>

          {/* Hamburger */}
          <div className="room-menu-wrapper" ref={menuRef}>
            <button
              type="button"
              className="room-hamburger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Game menu"
              aria-expanded={menuOpen}
            >
              ☰
            </button>

            {menuOpen && (
              <div className="room-menu-dropdown">
                {/* Info section */}
                <div className="room-menu-info">
                  <p className="room-menu-title">{currentRoom.title || "Untitled Game"}</p>
                  <p className="room-menu-meta">
                    <span className={`sync-dot ${syncState}`} />
                    {syncState === "live" ? "Live" : syncState === "error" ? "Sync error" : "Connecting"}
                  </p>
                  {currentRoom.joinCode && (
                    <p className="room-menu-meta">Code: <strong>{currentRoom.joinCode}</strong></p>
                  )}
                  <p className="room-menu-meta">{currentRoom.gameTitle || currentRoom.gameId}</p>
                  <p className="room-menu-meta">Players: {getPlayerNames(currentRoom)}</p>
                  {message && <p className="room-menu-message">{message}</p>}
                </div>

                <hr className="room-menu-divider" />

                {/* Font scale */}
                <div className="room-menu-scale">
                  <span className="room-menu-scale-label">Text size</span>
                  <div className="room-menu-scale-btns">
                    {FONT_SCALE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`room-menu-scale-btn${fontScale === opt.value ? " active" : ""}`}
                        onClick={() => { applyFontScale(opt.value); setFontScale(opt.value); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="room-menu-divider" />

                {/* Actions */}
                <button type="button" className="room-menu-item" onClick={refreshRoom}>
                  ↻ Refresh
                </button>
                {currentRoom.joinCode && (
                  <button type="button" className="room-menu-item" onClick={copyJoinLink}>
                    🔗 Copy Invite Link
                  </button>
                )}
                {!isCreator && (
                  <button type="button" className="room-menu-item" onClick={confirmLeave}>
                    Leave Game
                  </button>
                )}
                {canManage && (
                  <button type="button" className="room-menu-item room-menu-danger" onClick={confirmDelete}>
                    🗑 Delete Game
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Single scroll area — no nested scroll ── */}
      <div className="room-content">
        <GameLoader
          room={currentRoom}
          player={player}
          authUser={authUser}
          onRoomChanged={refreshRoom}
        />
      </div>

      {confirmProps && (
        <ConfirmModal
          message={confirmProps.message}
          confirmLabel={confirmProps.confirmLabel}
          onConfirm={confirmProps.onConfirm}
          onCancel={() => setConfirmProps(null)}
        />
      )}
    </main>
  );
}
