import { useEffect, useRef, useState } from "react";
import "./DndAdventure.css";
import { ensureSignedIn, listenCharacter, listenLog, sendCommand } from "./rtdb.js";

function resolvePlayerId(room, player) {
  if (!room?.players?.length || !player) return "pc_1";
  const idx = room.players.findIndex((p) => p.playerId === player.id);
  return idx === 1 ? "pc_2" : "pc_1";
}

function hpColor(pct) {
  if (pct <= 25) return "var(--dnd-danger)";
  if (pct <= 60) return "var(--dnd-accent-warm)";
  return "var(--dnd-accent)";
}

export default function DndAdventureView({ room, player, gameState, initializeMissingGameState }) {
  const sessionId = gameState?.bridgeSessionId || "session-aidm-1";
  const playerId = resolvePlayerId(room, player);

  const [entries, setEntries] = useState([]);
  const [character, setCharacter] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState(false);
  const logEndRef = useRef(null);
  const entriesCountAtSendRef = useRef(0);

  useEffect(() => {
    if (!gameState) initializeMissingGameState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  useEffect(() => {
    let unsubLog;
    let unsubChar;
    let cancelled = false;
    ensureSignedIn().then(() => {
      if (cancelled) return;
      unsubLog = listenLog(sessionId, (newEntries) => {
        setEntries(newEntries);
        // The server echoes the player's own message to the log before the
        // DM actually responds -- only clear on a *non-player* entry, or
        // this flips off the instant our own line shows up.
        const added = newEntries.slice(entriesCountAtSendRef.current);
        if (added.some((entry) => entry.kind !== "player")) {
          setPending(false);
        }
      });
      unsubChar = listenCharacter(sessionId, playerId, setCharacter);
    });
    return () => {
      cancelled = true;
      if (unsubLog) unsubLog();
      if (unsubChar) unsubChar();
    };
  }, [sessionId, playerId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [entries]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setText("");
    entriesCountAtSendRef.current = entries.length;
    setPending(true);
    try {
      await sendCommand(sessionId, playerId, trimmed);
    } catch (err) {
      setPending(false);
    } finally {
      setSending(false);
    }
  }

  const hpPct = character ? Math.max(0, Math.min(100, (character.hp / character.max_hp) * 100)) : 100;

  return (
    <article className="card wide-card" style={{ padding: 0 }}>
      <div className="dnd-app">
        <div className="dnd-stats">
          <span className="name">{character?.name || playerId}</span>
          <div className="dnd-hp-track">
            <div className="dnd-hp-fill" style={{ width: `${hpPct}%`, background: hpColor(hpPct) }} />
          </div>
          <span className="muted-text">{character ? `${character.hp}/${character.max_hp} HP` : "—"}</span>
          <span className="muted-text">{character ? `AC ${character.ac}` : ""}</span>
        </div>

        <div className="dnd-log">
          {entries.map((entry, i) => (
            <div key={i} className={`dnd-entry ${entry.kind}`}>
              <div className="speaker">{entry.speaker}</div>
              <div className="text">{entry.text}</div>
            </div>
          ))}
          {pending && (
            <div className="dnd-entry narration">
              <div className="speaker">DM</div>
              <div className="text">
                <span className="dnd-typing-dots"><span></span><span></span><span></span></span>
              </div>
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        <form className="dnd-input-bar" onSubmit={handleSubmit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What do you do?"
            autoComplete="off"
          />
          <button type="submit" disabled={sending}>Send</button>
        </form>
      </div>
    </article>
  );
}
