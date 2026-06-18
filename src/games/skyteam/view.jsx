// src/games/skyteam/view.jsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, DIFFICULTY_ORDER, SCENARIOS } from "./scenarios.js";
import "./view.css";

const ROLES = ["pilot", "copilot"];
const ROLE_LABELS = { pilot: "Pilot", copilot: "Co-Pilot" };

function playerName(player) {
  return player?.displayName || player?.name || player?.id || "Player";
}

function isMine(state, role, player) {
  if (!state || !player) return false;
  if (state.mode === "solo" || state.mode === "onePlayerTest") return true;
  return state.roles?.[role]?.playerId === player.id;
}

function rolesForViewer(state, player) {
  if (!state || !player) return [];
  if (state.mode === "solo" || state.mode === "onePlayerTest") return ROLES;
  return ROLES.filter((role) => state.roles?.[role]?.playerId === player.id);
}

function formatAltitude(value) {
  if (value === 0) return "Landing";
  return `${Number(value || 0).toLocaleString()} ft`;
}

function axisLabel(position) {
  if (position === 0) return "Level";
  if (position < 0) return `Pilot ${Math.abs(position)}`;
  return `Co-Pilot ${position}`;
}

function sendWithPlayer(submitAction, player, action) {
  submitAction({
    ...action,
    playerId: player?.id || null,
    playerName: playerName(player),
  });
}

function getTargetsForRole(state, role, value) {
  const targets = [];
  targets.push({ id: `axis-${role}`,   ok: !state.cockpit.axis[role] });
  targets.push({ id: `engine-${role}`, ok: !state.cockpit.engines[role] });

  if (role === "pilot") {
    targets.push({ id: "radio-pilot", ok: state.cockpit.radio.pilot.length === 0 });
    state.switches.landingGear.forEach((gear) =>
      targets.push({ id: gear.id, ok: !gear.deployed && gear.allowed.includes(value) })
    );
    const firstBrake = state.switches.brakes.findIndex((b) => !b.deployed);
    state.switches.brakes.forEach((brake, i) =>
      targets.push({ id: brake.id, ok: i === firstBrake && !brake.deployed && brake.allowed.includes(value) })
    );
  } else {
    targets.push({ id: "radio-copilot-a", ok: state.cockpit.radio.copilotA.length === 0 });
    targets.push({ id: "radio-copilot-b", ok: state.cockpit.radio.copilotB.length === 0 });
    const firstFlap = state.switches.flaps.findIndex((f) => !f.deployed);
    state.switches.flaps.forEach((flap, i) =>
      targets.push({ id: flap.id, ok: i === firstFlap && !flap.deployed && flap.allowed.includes(value) })
    );
  }

  state.cockpit.concentration.forEach((space, i) =>
    targets.push({ id: `concentration-${i}`, ok: !space })
  );

  return targets;
}

// Cockpit slot: renders as a pulsing button when it's a valid target, otherwise a plain span
function SlotButton({ id, validTargets, onPlace, children, className }) {
  const isTarget = validTargets && validTargets.has(id);
  if (isTarget) {
    return (
      <button
        type="button"
        className={`sky-slot-target ${className || ""}`}
        onClick={() => onPlace(id)}
        aria-label={`Place die on ${id}`}
      >
        {children}
      </button>
    );
  }
  return <span className={className}>{children}</span>;
}

export default function SkyTeamView({ room, gameState, player, submitAction, initializeMissingGameState }) {
  const state = gameState || room?.gameState || null;
  const [rerollSelection, setRerollSelection] = useState({ pilot: {}, copilot: {} });
  const [selectedDie, setSelectedDie] = useState(null); // { role, dieId }
  const [coffeeDelta, setCoffeeDelta] = useState(0);
  const [activeTab, setActiveTab] = useState("dice"); // "dice" | "board"
  const swipeRef = useRef(null);

  if (!state || state.gameId !== "skyteam") {
    return (
      <main className="skyteam-shell">
        <section className="sky-card">
          <h2>Sky Team</h2>
          <p>Game state not initialized.</p>
          {initializeMissingGameState && (
            <button className="sky-primary" onClick={initializeMissingGameState}>Initialize Game State</button>
          )}
        </section>
      </main>
    );
  }

  const myRoles = rolesForViewer(state, player);

  function act(action) {
    sendWithPlayer(submitAction, player, action);
  }

  // Derive valid placement targets for the selected die
  const selectedDieObj = selectedDie
    ? state.roles[selectedDie.role]?.dice?.find((d) => d.id === selectedDie.dieId)
    : null;
  const effectiveValue = selectedDieObj ? selectedDieObj.value + coffeeDelta : null;
  const isMyTurnToPlace = selectedDie && state.phase === "placement" && state.activeRole === selectedDie.role;
  const validTargets = isMyTurnToPlace && selectedDieObj
    ? new Set(getTargetsForRole(state, selectedDie.role, effectiveValue).filter((t) => t.ok).map((t) => t.id))
    : new Set();

  const scrollToPanel = useCallback((panel) => {
    if (!swipeRef.current) return;
    const idx = panel === "dice" ? 0 : 1;
    swipeRef.current.scrollTo({ left: idx * swipeRef.current.offsetWidth, behavior: "smooth" });
  }, []);

  function handleSwipeScroll() {
    if (!swipeRef.current) return;
    const { scrollLeft, offsetWidth } = swipeRef.current;
    setActiveTab(scrollLeft < offsetWidth / 2 ? "dice" : "board");
  }

  function handleSelectDie(role, dieId) {
    if (selectedDie?.dieId === dieId) {
      setSelectedDie(null);
      setCoffeeDelta(0);
    } else {
      setSelectedDie({ role, dieId });
      setCoffeeDelta(0);
    }
  }

  function handlePlaceDie(targetId) {
    if (!selectedDie || !selectedDieObj) return;
    act({ type: "PLACE_DIE", role: selectedDie.role, dieId: selectedDie.dieId, targetId, coffeeDelta });
    setSelectedDie(null);
    setCoffeeDelta(0);
  }

  function cancelSelection() {
    setSelectedDie(null);
    setCoffeeDelta(0);
  }

  const isPlaying = state.phase !== "setup";

  return (
    <main className={`skyteam-shell skyteam-mode-${state.mode}`}>

      <header className="sky-topbar">
        <span className="sky-topbar-title">Sky Team</span>
        {isPlaying && (
          <div className="sky-topbar-status">
            <span className="sky-topbar-chip">{formatAltitude(state.currentAltitude)}</span>
            <span className="sky-topbar-chip">Round {state.round}</span>
            <span className={`sky-topbar-chip sky-phase-${state.phase}`}>
              {state.phase === "briefing"  && "Briefing"}
              {state.phase === "rolling"   && "Rolling"}
              {state.phase === "placement" && (state.activeRole ? `${ROLE_LABELS[state.activeRole]} placing` : "Placement")}
              {state.phase === "endRound"  && "End Round"}
              {state.phase === "won"       && "✓ Landed!"}
              {state.phase === "lost"      && "✕ Crashed"}
            </span>
          </div>
        )}
        {!isPlaying && <span className="sky-topbar-chip">{state.scenarioName}</span>}
      </header>

      {/* End round / game-over action bar */}
      {isPlaying && (state.phase === "endRound" || state.phase === "won" || state.phase === "lost") && (
        <div className="sky-action-bar">
          {state.phase === "endRound" && (
            <button className="sky-primary sky-big-button" onClick={() => act({ type: "END_ROUND" })}>
              End Round / Descend
            </button>
          )}
          {state.phase === "won" && (
            <>
              <span className="sky-win">✓ {state.winReason}</span>
              <button className="sky-primary" onClick={() => act({ type: "RESET_GAME" })}>Play Again</button>
            </>
          )}
          {state.phase === "lost" && (
            <>
              <span className="sky-loss">✕ {state.lossReason}</span>
              <button className="sky-primary" onClick={() => act({ type: "RESET_GAME" })}>Try Again</button>
            </>
          )}
        </div>
      )}

      {/* Placement bar — appears when a die is selected */}
      {isPlaying && selectedDie && selectedDieObj && (
        <div className="sky-placement-bar">
          <div className={`sky-die-button sky-die-${selectedDie.role} sky-die-selected-preview`}>
            <DieFace value={effectiveValue} role={selectedDie.role} />
          </div>
          {state.tokens.coffee > 0 && (
            <div className="sky-coffee-adj">
              <span className="sky-coffee-label">☕</span>
              <button
                type="button"
                className="sky-coffee-btn"
                disabled={coffeeDelta <= -state.tokens.coffee || (selectedDieObj.value + coffeeDelta) <= 1}
                onClick={() => setCoffeeDelta((d) => d - 1)}
              >−</button>
              <span className="sky-coffee-val">{coffeeDelta > 0 ? `+${coffeeDelta}` : coffeeDelta}</span>
              <button
                type="button"
                className="sky-coffee-btn"
                disabled={coffeeDelta >= state.tokens.coffee || (selectedDieObj.value + coffeeDelta) >= 6}
                onClick={() => setCoffeeDelta((d) => d + 1)}
              >+</button>
            </div>
          )}
          {isMyTurnToPlace
            ? <span className="sky-placement-hint">Tap a glowing slot ↗</span>
            : <span className="sky-placement-hint sky-placement-wrong-turn">Not {ROLE_LABELS[selectedDie.role]}'s turn</span>
          }
          <button type="button" className="sky-cancel-placement" onClick={cancelSelection}>✕</button>
        </div>
      )}

      {state.phase === "setup" ? (
        <div className="sky-scroll-body">
          <SetupView state={state} player={player} act={act} />
        </div>
      ) : (
        <>
          {/* Nav bar — tapping scrolls to that panel */}
          <div className="sky-tab-bar">
            <button
              type="button"
              className={`sky-tab${activeTab === "dice" ? " active" : ""}`}
              onClick={() => scrollToPanel("dice")}
            >
              🎲 Dice
            </button>
            <button
              type="button"
              className={`sky-tab${activeTab === "board" ? " active" : ""}`}
              onClick={() => scrollToPanel("board")}
            >
              ✈ Board
            </button>
          </div>

          {/* Swipe container */}
          <div className="sky-swipe-container" ref={swipeRef} onScroll={handleSwipeScroll}>
            {/* Panel 0 — Dice */}
            <div className="sky-swipe-panel">
              <PlayerDiceDock
                state={state}
                player={player}
                myRoles={myRoles}
                act={act}
                rerollSelection={rerollSelection}
                setRerollSelection={setRerollSelection}
                selectedDie={selectedDie}
                onSelectDie={handleSelectDie}
              />
              {state.mode !== "solo" && (state.phase === "briefing" || state.phase === "rolling") && (
                <BriefingChat state={state} act={act} />
              )}
              {(state.phase === "briefing" || state.phase === "rolling" || state.phase === "placement") && (
                <p className="sky-phase-hint">
                  {state.phase === "briefing"  && (state.mode === "solo" ? "Roll the starting seat's dice." : "Talk strategy. Don't mention die values. Then roll.")}
                  {state.phase === "rolling"   && "Waiting for both crew to roll."}
                  {state.phase === "placement" && (state.mode === "solo" ? "Solo: place a die — the other seat's die is then revealed." : "Silent phase — tap a die, then tap a glowing slot to place it.")}
                </p>
              )}
              {state.message && (state.phase === "briefing" || state.phase === "rolling" || state.phase === "placement" || state.phase === "endRound") && (
                <p className="sky-game-message">{state.message}</p>
              )}
            </div>

            {/* Panel 1 — Cockpit board */}
            <div className="sky-swipe-panel">
              <CockpitPanel
                state={state}
                validTargets={validTargets}
                onPlace={handlePlaceDie}
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const MODE_DESCRIPTIONS = {
  twoPlayer:     "Two players each claim a role and play from separate devices.",
  solo:          "One player controls both seats with the official alternating dice flow.",
  onePlayerTest: "One browser controls both seats with normal two-player dice rolling.",
};

// Group scenarios by airport code, sorted by difficulty within each group
const SCENARIO_GROUPS = Object.values(
  SCENARIOS.reduce((acc, s) => {
    if (!acc[s.code]) acc[s.code] = { code: s.code, airport: s.airport, scenarios: [] };
    acc[s.code].scenarios.push(s);
    return acc;
  }, {})
);

function SetupView({ state, player, act }) {
  const pid = player?.id;
  const isTwoPlayer = state.mode === "twoPlayer";
  const bothClaimed  = state.roles.pilot.playerId && state.roles.copilot.playerId;
  const canStart     = !isTwoPlayer || bothClaimed;

  return (
    <section className="sky-setup-grid">
      {/* Scenario picker */}
      <section className="sky-card sky-scenario-card">
        <h2>Approach</h2>
        <div className="sky-scenario-list">
          {SCENARIO_GROUPS.map(({ code, airport, scenarios }) => (
            <div key={code} className="sky-scenario-airport">
              <span className="sky-scenario-code">{code}</span>
              <span className="sky-scenario-airport-name">{airport}</span>
              <div className="sky-scenario-sides">
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sky-scenario-btn${state.scenarioId === s.id ? " active" : ""}`}
                    style={{ "--diff-color": DIFFICULTY_COLORS[s.difficulty] }}
                    onClick={() => act({ type: "SET_SCENARIO", scenarioId: s.id })}
                  >
                    {s.side} · {DIFFICULTY_LABELS[s.difficulty]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sky-card sky-control-card">
        <h2>Game Mode</h2>
        <p className="sky-muted">{MODE_DESCRIPTIONS[state.mode]}</p>
        <div className="sky-button-row">
          <button className={state.mode === "twoPlayer"     ? "sky-primary" : ""} onClick={() => act({ type: "SET_MODE", mode: "twoPlayer" })}>Two Player</button>
          <button className={state.mode === "solo"          ? "sky-primary" : ""} onClick={() => act({ type: "SET_MODE", mode: "solo" })}>Solo</button>
          <button className={state.mode === "onePlayerTest" ? "sky-primary" : ""} onClick={() => act({ type: "SET_MODE", mode: "onePlayerTest" })}>1P Test</button>
        </div>
      </section>

      {ROLES.map((role) => {
        const claimed   = Boolean(state.roles[role].playerId);
        const isMyClaim = state.roles[role].playerId === pid;
        return (
          <section className={`sky-card sky-role-card sky-${role}${isMyClaim ? " sky-role-mine" : ""}`} key={role}>
            <h2>{ROLE_LABELS[role]}</h2>
            <p className="sky-muted">{state.roles[role].playerName || "Unclaimed"}</p>
            {isMyClaim
              ? <button onClick={() => act({ type: "RELEASE_ROLE", role })}>Release</button>
              : <button className="sky-primary" onClick={() => act({ type: "CLAIM_ROLE", role })}>
                  {claimed ? "Take Seat" : "Claim"}
                </button>
            }
          </section>
        );
      })}

      <section className="sky-card sky-start-card">
        <h2>Ready to Fly?</h2>
        <p className="sky-muted">
          {isTwoPlayer && !bothClaimed
            ? "Both seats must be claimed before starting."
            : `${playerName(player)} · ${state.scenarioName}`}
        </p>
        <button
          className="sky-primary sky-big-button"
          disabled={!canStart}
          onClick={() => act({ type: "START_GAME" })}
        >
          Start Approach ✈
        </button>
      </section>

      {state.message && (
        <p className="sky-setup-message">{state.message}</p>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function PlayerDiceDock({ state, player, myRoles, act, rerollSelection, setRerollSelection, selectedDie, onSelectDie }) {
  if (myRoles.length === 0) {
    return (
      <section className="sky-card sky-dice-dock">
        <p className="sky-muted">You are spectating. Claim a role before the game starts.</p>
      </section>
    );
  }

  function toggleReroll(role, dieId) {
    setRerollSelection((old) => ({
      ...old,
      [role]: { ...old[role], [dieId]: !old[role]?.[dieId] },
    }));
  }

  function doReroll(role) {
    const dieIds = Object.entries(rerollSelection[role] || {})
      .filter(([, selected]) => selected)
      .map(([dieId]) => dieId);
    act({ type: "REROLL_DICE", role, dieIds });
    setRerollSelection((old) => ({ ...old, [role]: {} }));
  }

  return (
    <section className={`sky-dice-dock ${state.mode === "solo" ? "sky-dice-dock-solo" : ""}`}>
      <div className="sky-dice-dock-header">
        <h2>Dice</h2>
        <div className="sky-token-strip">
          <span className="sky-token">☕ <strong>{state.tokens.coffee}</strong></span>
          <span className="sky-token">↻ <strong>{state.tokens.rerolls}</strong></span>
        </div>
      </div>

      {myRoles.map((role) => {
        const dice        = state.roles[role]?.dice || [];
        const canRoll     = isMine(state, role, player)
          && (state.phase === "briefing" || state.phase === "rolling")
          && !state.roles[role]?.rolledThisRound
          && (state.mode !== "solo" || role === state.activeRole);
        const isMyTurn    = state.phase === "placement" && state.activeRole === role;
        const hasRolled   = Boolean(state.roles[role]?.rolledThisRound);

        return (
          <div className={`sky-dice-rack sky-${role}`} key={role}>
            <div className="sky-rack-header">
              <strong className="sky-rack-label-text">{ROLE_LABELS[role]}</strong>
              {isMyTurn  && <span className="sky-pill sky-pill-turn">Your turn — tap a die</span>}
              {hasRolled && !isMyTurn && <span className="sky-pill sky-pill-wait">Rolled ✓</span>}
              {canRoll && (
                <button className="sky-primary sky-roll-btn" onClick={() => act({ type: "ROLL_ROLE_DICE", role })}>
                  Roll Dice
                </button>
              )}
            </div>

            <div className="sky-dice-row">
              {dice.length === 0
                ? (state.mode === "solo" && state.phase === "placement"
                    ? <span className="sky-muted sky-solo-waiting">Waiting…</span>
                    : [0, 1, 2, 3].map((i) => (
                        <button key={i} className={`sky-die-button sky-die-${role}`} disabled>
                          <DieFace value={null} role={role} />
                        </button>
                      )))
                : dice.map((die) => {
                    const isSelected = selectedDie?.dieId === die.id;
                    const canSelect  = state.phase === "placement" && !die.placed && state.activeRole === role && isMine(state, role, player);
                    return (
                      <div key={die.id} className="sky-die-slot">
                        <button
                          className={`sky-die-button sky-die-${role} ${die.placed ? "sky-die-placed" : ""} ${isSelected ? "sky-die-selected" : ""}`}
                          disabled={die.placed}
                          onClick={() => (canSelect || isSelected) ? onSelectDie(role, die.id) : undefined}
                          aria-label={`${ROLE_LABELS[role]} die ${die.value}${die.placed ? " placed" : isSelected ? " selected" : ""}`}
                        >
                          <DieFace value={die.value} role={role} />
                        </button>
                        {state.phase === "placement" && !die.placed && state.tokens.rerolls > 0 && (
                          <label className="sky-reroll-check">
                            <input
                              type="checkbox"
                              checked={Boolean(rerollSelection[role]?.[die.id])}
                              onChange={() => toggleReroll(role, die.id)}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
            </div>

            {state.phase === "placement" && state.tokens.rerolls > 0 && dice.some((d) => !d.placed) && (
              <button className="sky-secondary sky-reroll-btn" onClick={() => doReroll(role)}>
                ↻ Spend Reroll Token
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BriefingChat({ state, act }) {
  const [text, setText] = useState("");
  const chatOpen = state.phase === "briefing";

  function submit(event) {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    act({ type: "ADD_BRIEFING_CHAT", text: clean });
    setText("");
  }

  return (
    <section className={`sky-card sky-briefing-chat ${chatOpen ? "open" : "locked"}`}>
      <div className="sky-chat-heading">
        <h2>Briefing</h2>
        <p className="sky-muted">{chatOpen ? "Strategy only — no die values." : "Silent phase active."}</p>
      </div>
      <div className="sky-chat-log">
        {(state.briefingChat || []).length === 0
          ? <p className="sky-muted">No messages yet.</p>
          : [...(state.briefingChat || [])].slice(-12).reverse().map((entry) => (
              <article className="sky-chat-message" key={entry.id}>
                <strong>{entry.playerName || "Player"}</strong>
                <span>{entry.text}</span>
              </article>
            ))}
      </div>
      {chatOpen && (
        <form className="sky-chat-form" onSubmit={submit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={400}
            placeholder="Talk strategy..."
            autoComplete="off"
          />
          <button className="sky-primary" type="submit">Send</button>
        </form>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RadioPanel({ state, validTargets, onPlace }) {
  const pilot    = state.cockpit.radio.pilot[0]    || null;
  const copilotA = state.cockpit.radio.copilotA[0] || null;
  const copilotB = state.cockpit.radio.copilotB[0] || null;
  return (
    <section className="sky-module sky-radio-module">
      <h3>Radio</h3>
      <div className="sky-radio-slots">
        <div className="sky-radio-slot-wrap">
          <span className="sky-radio-label sky-radio-label-blue">Pilot</span>
          <SlotButton id="radio-pilot" validTargets={validTargets} onPlace={onPlace} className="sky-radio-slot sky-radio-slot-blue">
            <span className="sky-mini-die sky-mini-die-blue">{pilot?.value || "—"}</span>
          </SlotButton>
        </div>
        <div className="sky-radio-slot-wrap">
          <span className="sky-radio-label sky-radio-label-orange">Co-Pilot</span>
          <SlotButton id="radio-copilot-a" validTargets={validTargets} onPlace={onPlace} className="sky-radio-slot sky-radio-slot-orange">
            <span className="sky-mini-die sky-mini-die-orange">{copilotA?.value || "—"}</span>
          </SlotButton>
        </div>
        <div className="sky-radio-slot-wrap">
          <span className="sky-radio-label sky-radio-label-orange">Co-Pilot</span>
          <SlotButton id="radio-copilot-b" validTargets={validTargets} onPlace={onPlace} className="sky-radio-slot sky-radio-slot-orange">
            <span className="sky-mini-die sky-mini-die-orange">{copilotB?.value || "—"}</span>
          </SlotButton>
        </div>
      </div>
    </section>
  );
}

function ConcentrationPanel({ state, validTargets, onPlace }) {
  return (
    <section className="sky-module sky-concentration-module">
      <h3>☕ Concentration</h3>
      <div className="sky-concentration-slots">
        {state.cockpit.concentration.map((placed, i) => (
          <SlotButton key={i} id={`concentration-${i}`} validTargets={validTargets} onPlace={onPlace} className="sky-concentration-slot">
            <span className="sky-mini-die sky-mini-die-neutral">{placed?.value || "—"}</span>
          </SlotButton>
        ))}
      </div>
      <small className="sky-muted">Place any die to earn a ☕ token</small>
    </section>
  );
}

function CockpitPanel({ state, validTargets, onPlace }) {
  return (
    <section className="sky-cockpit sky-card">
      <ApproachTrack state={state} />
      <div className="sky-cockpit-board">
        <RadioPanel state={state} validTargets={validTargets} onPlace={onPlace} />
        <div className="sky-cockpit-top-row">
          <SwitchPanel title="Landing Gear" icon="🛬" switches={state.switches.landingGear} validTargets={validTargets} onPlace={onPlace} />
          <AxisGauge state={state} validTargets={validTargets} onPlace={onPlace} />
          <SwitchPanel title="Flaps" icon="◢" switches={state.switches.flaps} validTargets={validTargets} onPlace={onPlace} />
        </div>
        <div className="sky-cockpit-bottom-row">
          <EngineGauge state={state} validTargets={validTargets} onPlace={onPlace} />
          <BrakesGauge state={state} validTargets={validTargets} onPlace={onPlace} />
        </div>
        <ConcentrationPanel state={state} validTargets={validTargets} onPlace={onPlace} />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function approachSpaceLabel(space) {
  if (space.kind === "airport") return { icon: "▰▰▰", text: "RWY" };
  if (space.traffic > 0)        return { icon: "✈".repeat(space.traffic), text: `×${space.traffic}` };
  return { icon: "•", text: "Clear" };
}

function ApproachTrack({ state }) {
  const [expanded, setExpanded] = useState(false);

  const spaces       = state.approach.spaces;
  const currentIndex = state.approach.currentIndex;
  const currentSpace = spaces[currentIndex];

  // Summary strip: current space + up to 5 upcoming
  const summarySpaces = spaces
    .slice(currentIndex)
    .slice(0, 6)
    .map((space, i) => ({ space, isCurrent: i === 0, step: i }));

  // Full expanded list (current → runway, reversed so runway is at top)
  const renderedSpaces = spaces
    .map((space, index) => ({ space, index }))
    .filter(({ index }) => index >= currentIndex)
    .reverse();

  return (
    <section className="sky-route-panel">
      {/* Tap header to toggle */}
      <button
        type="button"
        className="sky-route-header sky-route-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="sky-route-header-scenario">{state.scenarioName}</span>
        <span className={`sky-route-chevron${expanded ? " open" : ""}`}>▼</span>
      </button>

      {/* Collapsed: one-line summary */}
      {!expanded && (
        <div className="sky-route-summary">
          {summarySpaces.map(({ space, isCurrent, step }, i) => {
            const { icon, text } = approachSpaceLabel(space);
            return (
              <React.Fragment key={step}>
                {i > 0 && <span className="sky-route-arrow">›</span>}
                <span className={`sky-route-sum-space${isCurrent ? " current" : ""}${space.traffic > 0 && !isCurrent ? " warn" : ""}`}>
                  <span className="sky-route-sum-icon">{isCurrent ? <AxisPlaneSvg /> : icon}</span>
                  <span className="sky-route-sum-text">{text}</span>
                </span>
              </React.Fragment>
            );
          })}
          {spaces.length - currentIndex > 6 && (
            <><span className="sky-route-arrow">›</span><span className="sky-route-sum-more">+{spaces.length - currentIndex - 6}</span></>
          )}
        </div>
      )}

      {/* Expanded: full track */}
      {expanded && (
        <div className="sky-route-track">
          {renderedSpaces.map(({ space, index }, renderIndex) => {
            const isCurrent = index === currentIndex;
            const aheadBy   = index - currentIndex + 1;
            const isLast    = renderIndex === renderedSpaces.length - 1;
            return (
              <div
                className={`sky-route-space${isCurrent ? " current" : ""}${space.kind === "airport" ? " airport" : ""}`}
                key={space.id}
              >
                <div className="sky-route-left">
                  <span className="sky-route-number">{space.kind === "airport" ? "RWY" : Math.max(1, aheadBy)}</span>
                  {!isLast && <span className="sky-route-line" />}
                </div>
                <div className="sky-route-screen">
                  {isCurrent && <span className="sky-own-plane"><AxisPlaneSvg /></span>}
                  {!isCurrent && space.kind === "airport" && <span className="sky-runway-icon">▰▰▰</span>}
                  {!isCurrent && space.kind !== "airport" && space.traffic > 0 && <span className="sky-traffic-icons">{"✈".repeat(space.traffic)}</span>}
                  {!isCurrent && space.kind !== "airport" && space.traffic === 0 && <span className="sky-clear-dot">•</span>}
                  {space.trafficDie > 0 && (
                    <span className="sky-traffic-die-icon" title={`Roll traffic die ${space.trafficDie}× at round start`}>
                      {"🎲".repeat(space.trafficDie)}
                    </span>
                  )}
                  {space.axisPaths && space.axisPaths.some((p) => p === false) && (
                    <span className="sky-axis-paths" title="Axis path indicators (P2 P1 Lvl CP1 CP2)">
                      {space.axisPaths.map((ok, pi) => (
                        <span key={pi} className={ok ? "sky-axis-path-ok" : "sky-axis-path-x"}>
                          {ok ? "△" : "✕"}
                        </span>
                      ))}
                    </span>
                  )}
                  <small>{space.kind === "airport" ? "Airport" : space.traffic > 0 ? `${space.traffic} traffic` : "Clear"}</small>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AxisGauge({ state, validTargets, onPlace }) {
  const pilot    = state.cockpit.axis.pilot;
  const copilot  = state.cockpit.axis.copilot;
  const position = state.cockpit.axis.position; // -3 to +3
  const degrees  = position * 24;

  // SVG dimensions — doubled from original
  const W = 300, H = 330;
  const cx = W / 2, cy = 152;
  const ballR  = 112;  // ball radius
  const bezelR = 140;  // outer dark ring radius
  const markR  = 128;  // where turn markers sit

  const toRad = (a) => (a * Math.PI) / 180;
  const mxy   = (angle, r) => ({
    x: cx + r * Math.sin(toRad(angle)),
    y: cy - r * Math.cos(toRad(angle)),
  });

  // Turn-position markers on the bezel ring
  // each "step" is 24°; ±3 are crash zones (red X)
  const turnMarkers = [
    { angle: -72, kind: "crash" },
    { angle: -48, kind: "tick" },
    { angle: -24, kind: "tick" },
    { angle:   0, kind: "center" },
    { angle:  24, kind: "tick" },
    { angle:  48, kind: "tick" },
    { angle:  72, kind: "crash" },
  ];

  // Tick marks around entire bezel (every 10° from -80 to +80)
  const ticks = [];
  for (let a = -80; a <= 80; a += 10) {
    const inner = mxy(a, bezelR - 5);
    const outer = mxy(a, bezelR - 1);
    ticks.push({ a, inner, outer });
  }

  return (
    <section className="sky-module sky-attitude-module">
      <h3>{formatAltitude(state.currentAltitude)}</h3>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-label="Axis attitude indicator" className="sky-axis-svg">
        <defs>
          <clipPath id="axis-ball-clip">
            <circle cx={cx} cy={cy} r={ballR} />
          </clipPath>
        </defs>

        {/* ── Outer bezel ring ── */}
        <circle cx={cx} cy={cy} r={bezelR} fill="#1c2438" stroke="#3a4a60" strokeWidth="3" />

        {/* Subtle tick marks on bezel */}
        {ticks.map((t) => (
          <line key={t.a}
            x1={t.inner.x} y1={t.inner.y}
            x2={t.outer.x} y2={t.outer.y}
            stroke="#3a4a60" strokeWidth="1"
          />
        ))}

        {/* ── Ball: earth (bottom) + sky (top), clipped ── */}
        <rect x={0} y={cy} width={W} height={H} fill="#b8893a" clipPath="url(#axis-ball-clip)" />
        <rect x={0} y={0} width={W} height={cy} fill="#4a78bb" clipPath="url(#axis-ball-clip)" />

        {/* Center grid lines on ball */}
        <line x1={cx - ballR} y1={cy} x2={cx + ballR} y2={cy}
          stroke="rgba(255,255,255,0.35)" strokeWidth="1" clipPath="url(#axis-ball-clip)" />
        <line x1={cx} y1={cy - ballR} x2={cx} y2={cy + ballR}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" clipPath="url(#axis-ball-clip)" />

        {/* Ball border */}
        <circle cx={cx} cy={cy} r={ballR} fill="none" stroke="#1c2438" strokeWidth="3" />

        {/* ── Rotating plane (original SVG path, scaled to fit ball) ── */}
        <g transform={`rotate(${degrees}, ${cx}, ${cy})`}>
          {/* Original 100×100 path translated so its center (50,50) sits at (cx,cy) and scaled ×1.8 */}
          <g transform={`translate(${cx - 90}, ${cy - 90}) scale(1.8)`}>
            <path
              d="M50 4 L57 16 L57 42 L94 58 L94 70 L57 62 L57 78 L70 89 L70 97 L50 88 L30 97 L30 89 L43 78 L43 62 L6 70 L6 58 L43 42 L43 16 Z"
              fill="white"
              opacity="0.93"
              filter="drop-shadow(0 0 6px rgba(100,160,255,0.7))"
            />
          </g>
        </g>

        {/* ── Turn-position markers on bezel ── */}
        {turnMarkers.map((m, i) => {
          const p = mxy(m.angle, markR);
          if (m.kind === "crash") {
            return (
              <text key={i} x={p.x} y={p.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fill="#ef4444" fontWeight="bold">✕</text>
            );
          }
          if (m.kind === "center") {
            // Large downward-pointing triangle at top
            const s = 6;
            const pts = `${p.x},${p.y + s} ${p.x - s * 0.75},${p.y - s * 0.5} ${p.x + s * 0.75},${p.y - s * 0.5}`;
            return <polygon key={i} points={pts} fill="white" />;
          }
          // Smaller tick triangles pointing inward (toward center)
          const inward = mxy(m.angle, markR - 4);
          const left   = mxy(m.angle + 90, 3);
          const right  = mxy(m.angle - 90, 3);
          const pts = `${inward.x},${inward.y} ${p.x + left.x - cx},${p.y + left.y - cy} ${p.x + right.x - cx},${p.y + right.y - cy}`;
          return <polygon key={i} points={pts} fill="#8899bb" />;
        })}

      </svg>

      {/* Die slots rendered outside SVG to avoid foreignObject issues */}
      <div className="sky-axis-display">
        <SlotButton id="axis-pilot" validTargets={validTargets} onPlace={onPlace} className="sky-axis-slot">
          <span className="sky-mini-die sky-mini-die-blue">{pilot?.value || "—"}</span>
        </SlotButton>
        <strong className="sky-axis-label">{axisLabel(position)}</strong>
        <SlotButton id="axis-copilot" validTargets={validTargets} onPlace={onPlace} className="sky-axis-slot">
          <span className="sky-mini-die sky-mini-die-orange">{copilot?.value || "—"}</span>
        </SlotButton>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function EngineGauge({ state, validTargets, onPlace }) {
  const pilot   = state.cockpit.engines.pilot;
  const copilot = state.cockpit.engines.copilot;
  const min = 4, max = 12;
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const bluePos   = ((state.markers.blueAerodynamics   - min) / (max - min)) * 100;
  const orangePos = ((state.markers.orangeAerodynamics - min) / (max - min)) * 100;
  const segLeft  = Math.max(0, Math.min(100, Math.min(bluePos, orangePos)));
  const segRight = Math.max(0, Math.min(100, Math.max(bluePos, orangePos)));

  return (
    <section className="sky-module sky-engine-module">
      <h3>Engines</h3>
      <div className="sky-throttle-box">
        <SlotButton id="engine-pilot" validTargets={validTargets} onPlace={onPlace} className="sky-engine-slot">
          <span className="sky-mini-die sky-mini-die-blue">{pilot?.value || "—"}</span>
        </SlotButton>
        <strong className="sky-speed-value">{state.cockpit.engines.speed || "—"}</strong>
        <SlotButton id="engine-copilot" validTargets={validTargets} onPlace={onPlace} className="sky-engine-slot">
          <span className="sky-mini-die sky-mini-die-orange">{copilot?.value || "—"}</span>
        </SlotButton>
      </div>
      <small className="sky-muted">
        {state.currentAltitude === 0 ? "Final round: compare to Brakes." : `Last advance: ${state.approach.lastAdvance || 0}`}
      </small>

      <div className="sky-sub-gauge">
        <h4>Gear / Flaps Range</h4>
        <div className="sky-gauge-bar">
          <span className="sky-range-fill" style={{ left: `${segLeft}%`, width: `${Math.max(0, segRight - segLeft)}%` }} />
          <span className="sky-gauge-marker sky-marker-blue"   style={{ left: `${bluePos}%` }} />
          <span className="sky-gauge-marker sky-marker-orange" style={{ left: `${orangePos}%` }} />
        </div>
        <div className="sky-gauge-scale">
          {numbers.map((v) => <span key={v}>{v}</span>)}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BrakesGauge({ state, validTargets, onPlace }) {
  // Marker sits on the deployed brake values (0, 2, 4, 6), not the threshold
  const brakePos = (state.markers.brakeIndex * 2) / 6 * 100;

  return (
    <section className="sky-module sky-brakes-module">
      <h3>Brakes</h3>
      <div className="sky-gauge-bar sky-brake-bar">
        <span className="sky-brake-fill" style={{ width: `${Math.max(0, Math.min(100, brakePos))}%` }} />
        <span className="sky-gauge-marker sky-marker-brake" style={{ left: `${Math.max(0, Math.min(100, brakePos))}%` }} />
      </div>
      <div className="sky-gauge-scale sky-gauge-scale-4">
        <span>0</span><span>2</span><span>4</span><span>6</span>
      </div>
      <div className="sky-marker-row">
        <span>Brake threshold</span>
        <strong>{state.markers.brakeThreshold}</strong>
      </div>
      <SwitchPanel title="Brake Track" icon="▰" switches={state.switches.brakes} compact validTargets={validTargets} onPlace={onPlace} />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SwitchPanel({ title, icon, switches, compact, validTargets, onPlace }) {
  return (
    <section className={`sky-module sky-switch-module ${compact ? "sky-switch-compact" : ""}`}>
      <h3>{icon} {title}</h3>
      <div className="sky-switch-stack">
        {switches.map((item) => (
          <SlotButton
            key={item.id}
            id={item.id}
            validTargets={validTargets}
            onPlace={onPlace}
            className={`sky-switch ${item.deployed ? "on" : "off"}`}
          >
            <span className="sky-switch-light" />
            {item.label}
          </SlotButton>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// Small plane icon used in the approach track for the current position marker
function AxisPlaneSvg() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={{ width: "100%", height: "100%", fill: "white" }}>
      <path d="M50 4 L57 16 L57 42 L94 58 L94 70 L57 62 L57 78 L70 89 L70 97 L50 88 L30 97 L30 89 L43 78 L43 62 L6 70 L6 58 L43 42 L43 16 Z" />
    </svg>
  );
}

// 3x3 grid positions 0-8 (row-major). Which cells show a pip per die value.
const PIP_MAP = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ value, role }) {
  const pips = PIP_MAP[value] || [];
  return (
    <span className={`sky-pip-face sky-pip-face-${role || "neutral"}`} aria-label={value ? `${value}` : "empty"}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={pips.includes(i) ? "pip on" : "pip"} />
      ))}
    </span>
  );
}
