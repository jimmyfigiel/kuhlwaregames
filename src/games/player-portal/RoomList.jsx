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

function isSuperuser(player) {
  return player?.isSuperuser || player?.isSuperUser || false;
}

function getUpdatedAtMillis(room) {
  if (room.updatedAt?.toMillis) {
    return room.updatedAt.toMillis();
  }

  if (room.updatedAt?.toDate) {
    return room.updatedAt.toDate().getTime();
  }

  if (typeof room.updatedAt === "number") {
    return room.updatedAt;
  }

  if (typeof room.updatedAt === "string") {
    const parsedDate = Date.parse(room.updatedAt);
    return Number.isNaN(parsedDate) ? 0 : parsedDate;
  }

  return 0;
}

export default function RoomList({ player, refreshKey = 0, onOpenRoom }) {
  const [rooms, setRooms] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);

  const superuser = isSuperuser(player);

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id, player.isSuperuser, player.isSuperUser, refreshKey]);

  async function loadRooms() {
    setLoadingRooms(true);
    setMessage("");

    try {
      const roomsQuery = superuser
        ? query(collection(db, "rooms"))
        : query(
            collection(db, "rooms"),
            where("playerIds", "array-contains", player.id)
          );

      const roomsSnapshot = await getDocs(roomsQuery);

      const loadedRooms = roomsSnapshot.docs
        .map((roomDoc) => ({
          id: roomDoc.id,
          ...roomDoc.data(),
        }))
        .sort((a, b) => getUpdatedAtMillis(b) - getUpdatedAtMillis(a));

      setRooms(loadedRooms);
    } catch (error) {
      console.error(error);
      setMessage(`Could not load rooms: ${error.message}`);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function deleteRoom(room) {
    if (room.createdBy !== player.id && !superuser) {
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
      setMessage(
        "Could not copy link. Your browser may have blocked clipboard access."
      );
    }
  }

  return (
    <article className="card">
      <div className="section-heading-row">
        <div>
          <h2>{superuser ? "All Rooms" : "Active Rooms"}</h2>
          {superuser && (
            <p className="muted">
              Superuser view: all rooms sorted by last used.
            </p>
          )}
        </div>

        <button type="button" className="secondary-button" onClick={loadRooms}>
          Refresh
        </button>
      </div>

      {loadingRooms ? (
        <p className="muted">Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <p className="muted">
          {superuser
            ? "There are no rooms in the system."
            : "You are not in any active rooms yet."}
        </p>
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
                {superuser && (
                  <p className="small-muted">Room ID: {room.id}</p>
                )}
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

                {(room.createdBy === player.id || superuser) && (
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
