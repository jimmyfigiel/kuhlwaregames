import "./PlayerPortal.css";

export default function PlayerPortalGame({
  room,
  player,
  authUser,
  onRoomChanged,
}) {
  return (
    <article className="card wide-card">
      <h2>Player Portal Test Game</h2>

      <p className="muted">
        This is the first loaded game module. It confirms that the room screen
        can load a game from the registry using <strong>{room.gameId}</strong>.
      </p>

      <div className="game-test-grid">
        <section>
          <h3>Room</h3>
          <p>
            <strong>Title:</strong> {room.title || "Untitled Room"}
          </p>
          <p>
            <strong>Game ID:</strong> {room.gameId}
          </p>
          <p>
            <strong>Join Code:</strong> {room.joinCode || "None"}
          </p>
        </section>

        <section>
          <h3>Player</h3>
          <p>
            <strong>Player:</strong> {player.displayName}
          </p>
          <p>
            <strong>Player Code:</strong> {player.id}
          </p>
          <p>
            <strong>Device UID:</strong>{" "}
            <span className="small-muted">{authUser?.uid || "not available"}</span>
          </p>
        </section>
      </div>

      <p className="muted">
        Later, this placeholder can be replaced with a real game module. The
        important thing is that the game receives the room, player, and device
        session as props.
      </p>

      <button type="button" className="secondary-button" onClick={onRoomChanged}>
        Refresh Room From Game
      </button>
    </article>
  );
}