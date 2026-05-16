import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.js";
import "./PlayerPortal.css";

function formatDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  return String(value);
}

function getJoinUrl(joinCode) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("join", joinCode);
  return url.toString();
}

export default function RoomList({ player, refreshKey = 0, onOpenRoom }) {
  const [rooms, setRooms] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    loadRooms();
  }, [player.id, refreshKey]);

  async function loadRooms() {
    setLoadingRooms(true);
    setMessage("");

    try {
      const roomsSnapshot = await getDocs(
        query(collection(db, "rooms"), where("playerIds", "array-contains", player.id))
      );

      const loadedRooms = roomsSnapshot.docs
        .map((roomDoc) => ({
          id: roomDoc.id,
          ...roomDoc.data(),
        }))
        .sort((a, b) => {
          const aDate = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const bDate = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return bDate - aDate;
        });

      setRooms(loadedRooms);
    } catch (error) {
      console.error(error);
      setMessage(`Could not load rooms: ${error.message}`);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function deleteRoom(room) {
    if (room.createdBy !== player.id && !player.isSuperuser) {
      setMessage("Only the room creator or a superuser can delete this room.");
      return;
    }

    const confirmed = window.confirm(
      `Delete room "${room.title || room.id}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "rooms", room.id));
      setMessage(`Deleted room ${room.title || room.id}.`);
      await loadRooms();
    } catch (error) {
      console.error(error);
      setMessage(`Could not delete room: ${error.message}`);
    }
  }

  async function copyJoinLink(room) {
    if (!room.joinCode) {
      setMessage("This room does not have a join code.");
      return;
    }

    try {
      await navigator.clipboard.writeText(getJoinUrl(room.joinCode));
      setMessage("Join link copied.");
    } catch (error) {
      console.error(error);
      setMessage("Could not copy link. Your browser may have blocked clipboard access.");
    }
  }

  return (
    <article className="card">
      <div className="section-heading-row">
        <h2>Active Rooms</h2>

        <button type="button" className="secondary-button" onClick={loadRooms}>
          Refresh
        </button>
      </div>

      {loadingRooms ? (
        <p className="muted">Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <p className="muted">You are not in any active rooms yet.</p>
      ) : (
        <div className="room-list">
          {rooms.map((room) => (
            <div className="room-card" key={room.id}>
              <div>
                <h3>{room.title || "Untitled Room"}</h3>
                <p className="muted">
                  {room.gameTitle || room.gameId} · Created by{" "}
                  {room.createdByName || room.createdBy}
                </p>
                <p className="muted">Updated: {formatDate(room.updatedAt)}</p>
                {room.joinCode && (
                  <p className="small-muted">Join Code: {room.joinCode}</p>
                )}
              </div>

              <div className="room-actions">
                <button type="button" onClick={() => onOpenRoom(room)}>
                  Rejoin
                </button>

                {room.joinCode && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copyJoinLink(room)}
                  >
                    Copy Link
                  </button>
                )}

                {(room.createdBy === player.id || player.isSuperuser) && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => deleteRoom(room)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {message && <p className="message">{message}</p>}
    </article>
  );
}