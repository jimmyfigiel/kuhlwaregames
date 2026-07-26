import { useEffect, useRef, useState } from "react";
import "./DndAdventure.css";
import {
  ensureSignedIn,
  listenCharacter,
  listenCharacterRequest,
  listenLog,
  sendCommand,
  submitCharacterRequest,
} from "./rtdb.js";

// Matches aidm/character_gen/extract.py's RACES/CLASSES exactly -- just the
// names (a fixed picklist), not the mechanical data, which stays server-side
// and SRD-grounded.
const RACES = ["Human", "Elf", "Dwarf", "Halfling", "Dragonborn", "Gnome", "Half-Elf", "Half-Orc", "Tiefling"];
const CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
  "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const ABILITIES = [
  { key: "str_", label: "Strength" },
  { key: "dex", label: "Dexterity" },
  { key: "con", label: "Constitution" },
  { key: "int_", label: "Intelligence" },
  { key: "wis", label: "Wisdom" },
  { key: "cha", label: "Charisma" },
];

function CharacterCreationForm({ onSubmit, pendingError }) {
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [charClass, setCharClass] = useState("");
  const [scores, setScores] = useState({});

  const assignedValues = Object.values(scores).filter((v) => v !== undefined);
  const remainingFor = (ability) => {
    const used = Object.entries(scores)
      .filter(([k, v]) => k !== ability && v !== undefined)
      .map(([, v]) => v);
    const pool = [...STANDARD_ARRAY];
    for (const v of used) pool.splice(pool.indexOf(v), 1);
    return pool;
  };

  const canSubmit =
    name.trim() && race && charClass && assignedValues.length === ABILITIES.length;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), race, charClass, abilities: scores });
  }

  return (
    <form className="dnd-chargen" onSubmit={handleSubmit}>
      <h3>Create your character</h3>
      {pendingError && <p className="dnd-chargen-error">{pendingError}</p>}

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adventurer's name" />
      </label>

      <label>
        Race
        <select value={race} onChange={(e) => setRace(e.target.value)}>
          <option value="" disabled>Choose a race</option>
          {RACES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      <label>
        Class
        <select value={charClass} onChange={(e) => setCharClass(e.target.value)}>
          <option value="" disabled>Choose a class</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <div className="dnd-chargen-abilities">
        <p className="dnd-chargen-hint">Assign the standard array {STANDARD_ARRAY.join(", ")} to your abilities.</p>
        {ABILITIES.map(({ key, label }) => (
          <label key={key}>
            {label}
            <select
              value={scores[key] ?? ""}
              onChange={(e) =>
                setScores((s) => ({ ...s, [key]: e.target.value ? Number(e.target.value) : undefined }))
              }
            >
              <option value="">—</option>
              {/* remainingFor(key) already keeps this ability's own current
                  value in the pool (it only excludes values other abilities
                  have taken) -- re-adding it here would render two <option>s
                  with the same value/key. */}
              {remainingFor(key).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <button type="submit" disabled={!canSubmit}>Join the table</button>
    </form>
  );
}

export default function DndAdventureView({ room, player, gameState, initializeMissingGameState }) {
  const sessionId = gameState?.bridgeSessionId || "session-aidm-1";
  // The character sheet belongs to the player's own stable identity (their
  // kuhlwaregames player code), never join order or room-array position --
  // room.players isn't reliably deduped across leave/rejoin, so it can't be
  // used as a key at all.
  const playerId = player?.id;

  const [entries, setEntries] = useState([]);
  const [character, setCharacter] = useState(null);
  const [characterRequest, setCharacterRequest] = useState(null);
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
    if (!playerId) return;
    let unsubLog;
    let unsubChar;
    let unsubReq;
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
      unsubReq = listenCharacterRequest(sessionId, playerId, setCharacterRequest);
    });
    return () => {
      cancelled = true;
      if (unsubLog) unsubLog();
      if (unsubChar) unsubChar();
      if (unsubReq) unsubReq();
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

  async function handleCreateCharacter(payload) {
    await submitCharacterRequest(sessionId, playerId, payload);
  }

  if (!playerId) {
    return <article className="card wide-card"><p className="muted-text">Sign in to play.</p></article>;
  }

  if (!character) {
    if (characterRequest?.status === "pending") {
      return (
        <article className="card wide-card">
          <div className="dnd-app dnd-chargen-wrap">
            <p>The DM is bringing your character to life...</p>
          </div>
        </article>
      );
    }
    return (
      <article className="card wide-card">
        <div className="dnd-app dnd-chargen-wrap">
          <CharacterCreationForm
            onSubmit={handleCreateCharacter}
            pendingError={characterRequest?.status === "error" ? characterRequest.error : null}
          />
        </div>
      </article>
    );
  }

  const hpPct = Math.max(0, Math.min(100, (character.hp / character.max_hp) * 100));

  return (
    <article className="card wide-card" style={{ padding: 0 }}>
      <div className="dnd-app">
        <div className="dnd-stats">
          <span className="name">{character.name}</span>
          <div className="dnd-hp-track">
            <div className="dnd-hp-fill" style={{ width: `${hpPct}%`, background: hpColor(hpPct) }} />
          </div>
          <span className="muted-text">{`${character.hp}/${character.max_hp} HP`}</span>
          <span className="muted-text">{`AC ${character.ac}`}</span>
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

function hpColor(pct) {
  if (pct <= 25) return "var(--dnd-danger)";
  if (pct <= 60) return "var(--dnd-accent-warm)";
  return "var(--dnd-accent)";
}
