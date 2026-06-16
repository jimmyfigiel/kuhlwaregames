// src/games/skyteam/view.jsx

import React, { useState } from "react";
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

export default function SkyTeamView({ room, gameState, player, submitAction, initializeMissingGameState }) {
  const state = gameState || room?.gameState || null;
  const [coffeeByDie, setCoffeeByDie] = useState({});
  const [rerollSelection, setRerollSelection] = useState({ pilot: {}, copilot: {} });
  const [selectedDie, setSelectedDie] = useState(null);

  if (!state || state.gameId !== "skyteam") {
    return (
      <main className="skyteam-shell">
        <section className="sky-card">
          <h2>Sky Team</h2>
          <p>The Sky Team game state has not been initialized.</p>
          {initializeMissingGameState && <button onClick={initializeMissingGameState}>Initialize Game State</button>}
        </section>
      </main>
    );
  }

  const myRoles = rolesForViewer(state, player);

  function act(action) {
    sendWithPlayer(submitAction, player, action);
  }

  function closeDieModal() {
    setSelectedDie(null);
  }

  return (
    <main className="skyteam-shell">
      <header className="sky-hero">
        <div>
          <p className="sky-kicker">Sky Team · {state.scenarioName}</p>
          <h1>Landing Procedure</h1>
          <p>{state.message}</p>
        </div>
        <div className={`sky-status sky-status-${state.phase}`}>
          <strong>{state.phase}</strong>
          <span>Round {state.round || "—"}</span>
        </div>
      </header>

      {state.phase === "setup" ? (
        <SetupView state={state} player={player} act={act} />
      ) : (
        <>
          <TopInstruments state={state} />
          <PlayerDiceDock
            state={state}
            player={player}
            myRoles={myRoles}
            act={act}
            rerollSelection={rerollSelection}
            setRerollSelection={setRerollSelection}
            onSelectDie={setSelectedDie}
          />
          {(state.phase === "briefing" || state.phase === "rolling") && <BriefingChat state={state} act={act} />}
          <section className="sky-layout sky-layout-cockpit-only">
            <CockpitPanel state={state} />
          </section>
          <ActionFooter state={state} act={act} />
        </>
      )}

      <LogPanel log={state.commandLog || []} />

      {selectedDie && (
        <PlacementModal
          state={state}
          selectedDie={selectedDie}
          coffeeByDie={coffeeByDie}
          setCoffeeByDie={setCoffeeByDie}
          act={act}
          onClose={closeDieModal}
        />
      )}
    </main>
  );
}

function SetupView({ state, player, act }) {
  return (
    <section className="sky-setup-grid">
      <section className="sky-card sky-control-card">
        <h2>Mode</h2>
        <p className="sky-muted">Solo mode uses the official solo dice flow. One-player test mode lets one browser control both seats with normal two-player rolling.</p>
        <div className="sky-button-row">
          <button className={state.mode === "twoPlayer" ? "sky-primary" : ""} onClick={() => act({ type: "SET_MODE", mode: "twoPlayer" })}>Two Player</button>
          <button className={state.mode === "solo" ? "sky-primary" : ""} onClick={() => act({ type: "SET_MODE", mode: "solo" })}>Solo Mode</button>
          <button className={state.mode === "onePlayerTest" ? "sky-primary" : ""} onClick={() => act({ type: "SET_MODE", mode: "onePlayerTest" })}>One Player Test</button>
        </div>
      </section>

      {ROLES.map((role) => (
        <section className={`sky-card sky-role-card sky-${role}`} key={role}>
          <h2>{ROLE_LABELS[role]}</h2>
          <p>{state.roles[role].playerName || "Unclaimed"}</p>
          <div className="sky-button-row">
            <button onClick={() => act({ type: "CLAIM_ROLE", role })}>Claim {ROLE_LABELS[role]}</button>
            <button className="sky-secondary" onClick={() => act({ type: "RELEASE_ROLE", role })}>Release</button>
          </div>
        </section>
      ))}

      <section className="sky-card sky-start-card">
        <h2>Start Approach</h2>
        <p>Player: {playerName(player)}</p>
        <button className="sky-primary sky-big-button" onClick={() => act({ type: "START_GAME" })}>Start Montréal Approach</button>
      </section>
    </section>
  );
}

function TopInstruments({ state }) {
  return (
    <section className="sky-instruments">
      <Instrument title="Current Position" value={state.approach.spaces[state.approach.currentIndex]?.label || "—"} detail={state.approach.spaces[state.approach.currentIndex]?.kind === "airport" ? "Runway threshold" : "Approach track"} />
      <Instrument title="Current Altitude" value={formatAltitude(state.currentAltitude)} detail={state.currentAltitude === 0 ? "Touchdown" : "Descending"} />
      <Instrument title="Active Seat" value={state.activeRole ? ROLE_LABELS[state.activeRole] : "—"} detail={state.phase === "placement" ? "Silent placement" : state.phase} />
      <Instrument title="Tokens" value={`☕ ${state.tokens.coffee} · ↻ ${state.tokens.rerolls}`} detail="Coffee / Rerolls" />
    </section>
  );
}

function Instrument({ title, value, detail }) {
  return (
    <section className="sky-instrument">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}

function PlayerDiceDock({ state, player, myRoles, act, rerollSelection, setRerollSelection, onSelectDie }) {
  if (myRoles.length === 0) {
    return (
      <section className="sky-card sky-dice-dock">
        <h2>Your Dice</h2>
        <p className="sky-muted">You are spectating. Claim a role before the game starts to see dice here.</p>
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
    const dieIds = Object.entries(rerollSelection[role] || {}).filter(([, selected]) => selected).map(([dieId]) => dieId);
    act({ type: "REROLL_DICE", role, dieIds });
    setRerollSelection((old) => ({ ...old, [role]: {} }));
  }

  return (
    <section className="sky-card sky-dice-dock">
      <div className="sky-dice-dock-title">
        <h2>Your Dice</h2>
        <p className="sky-muted">Click a die to choose a placement. In solo mode, only the starting color rolls four dice; the other color rolls one die at a time.</p>
      </div>
      {myRoles.map((role) => {
        const dice = state.roles[role]?.dice || [];
        const soloStarterRole = state.mode === "solo" ? state.activeRole : null;
        const canRoll = isMine(state, role, player)
          && (state.phase === "briefing" || state.phase === "rolling")
          && !state.roles[role]?.rolledThisRound
          && (state.mode !== "solo" || role === soloStarterRole);
        return (
          <div className={`sky-dice-rack sky-${role}`} key={role}>
            <div className="sky-rack-label">
              <strong>{ROLE_LABELS[role]}</strong>
              {state.phase === "placement" && state.activeRole === role && <span className="sky-turn-pill">Your turn</span>}
              {(state.phase === "briefing" || state.phase === "rolling") && state.roles[role]?.rolledThisRound && <span className="sky-wait-pill">Rolled</span>}
              {canRoll && <button className="sky-primary" onClick={() => act({ type: "ROLL_ROLE_DICE", role })}>Roll {state.mode === "solo" ? "Starting" : ROLE_LABELS[role]} Dice</button>}
            </div>
            <div className="sky-dice-row" aria-label={`${ROLE_LABELS[role]} dice`}>
              {dice.length === 0 ? (
                state.mode === "solo" && state.phase === "placement" ? <p className="sky-muted">Waiting for solo die roll.</p> : [0, 1, 2, 3].map((index) => <button key={index} className={`sky-die-button ${role}`} disabled>?</button>)
              ) : (
                dice.map((die) => (
                  <div key={die.id} className="sky-die-slot">
                    <button
                      className={`sky-die-button ${role} ${die.placed ? "placed" : ""}`}
                      disabled={state.phase !== "placement" || die.placed || state.activeRole !== role || !isMine(state, role, player)}
                      onClick={() => onSelectDie({ role, dieId: die.id })}
                      title={die.placed ? `Placed on ${die.targetId}` : "Click to place"}
                    >
                      <DieFace value={die.value} />
                    </button>
                    {state.phase === "placement" && !die.placed && state.tokens.rerolls > 0 && (
                      <label className="sky-reroll-mini">
                        <input type="checkbox" checked={Boolean(rerollSelection[role]?.[die.id])} onChange={() => toggleReroll(role, die.id)} />
                        reroll
                      </label>
                    )}
                  </div>
                ))
              )}
            </div>
            {state.phase === "placement" && state.tokens.rerolls > 0 && dice.some((die) => !die.placed) && (
              <button className="sky-secondary" onClick={() => doReroll(role)}>Spend Reroll Token</button>
            )}
          </div>
        );
      })}
    </section>
  );
}

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
        <h2>Briefing Chat</h2>
        <p>{chatOpen ? "Talk strategy here. Do not name exact die values." : "Dice have been rolled. Silent phase is active."}</p>
      </div>
      <div className="sky-chat-log">
        {(state.briefingChat || []).length === 0 ? (
          <p className="sky-muted">No briefing messages yet.</p>
        ) : (
          [...(state.briefingChat || [])].slice(-12).reverse().map((entry) => (
            <article className="sky-chat-message" key={entry.id}>
              <strong>{entry.playerName || "Player"}</strong>
              <span>{entry.text}</span>
            </article>
          ))
        )}
      </div>
      {chatOpen && (
        <form className="sky-chat-form" onSubmit={submit}>
          <input value={text} onChange={(event) => setText(event.target.value)} maxLength={400} placeholder="Example: clear the close traffic, keep speed low, get gear started..." />
          <button className="sky-primary" type="submit">Send</button>
        </form>
      )}
    </section>
  );
}

function CockpitPanel({ state }) {
  return (
    <section className="sky-cockpit sky-card">
      <h2>Shared Cockpit</h2>
      <ApproachTrack state={state} />
      <div className="sky-cockpit-board">
        <div className="sky-cockpit-top-row">
          <SwitchPanel title="Landing Gear" icon="🛬" switches={state.switches.landingGear} />
          <AxisGauge state={state} />
          <SwitchPanel title="Flaps" icon="◢" switches={state.switches.flaps} />
        </div>
        <div className="sky-cockpit-bottom-stack">
          <GearFlapsGauge state={state} />
          <EngineGauge state={state} />
          <BrakesGauge state={state} />
        </div>
      </div>
      {state.phase === "won" && <div className="sky-win">Congratulations! {state.winReason}</div>}
      {state.phase === "lost" && <div className="sky-loss">Crash / Failure: {state.lossReason}</div>}
    </section>
  );
}

function ApproachTrack({ state }) {
  const renderedSpaces = state.approach.spaces
    .map((space, index) => ({ space, index }))
    .filter(({ index }) => index >= state.approach.currentIndex)
    .reverse();
  return (
    <section className="sky-route-panel" aria-label="Approach route">
      <div className="sky-route-header">
        <span>Approach Route</span>
        <strong>{state.scenarioName}</strong>
      </div>
      <div className="sky-route-column">
        {renderedSpaces.map(({ space, index }, renderIndex) => {
          const isCurrent = index === state.approach.currentIndex;
          const aheadBy = index - state.approach.currentIndex + 1;
          const isLastRendered = renderIndex === renderedSpaces.length - 1;
          return (
            <div className={`sky-route-space ${isCurrent ? "current" : ""} ${space.kind === "airport" ? "airport" : ""}`} key={space.id}>
              <div className="sky-route-left">
                <span className="sky-route-number">{space.kind === "airport" ? "RWY" : Math.max(1, aheadBy)}</span>
                {!isLastRendered && <span className="sky-route-line" />}
              </div>
              <div className="sky-route-screen">
                {isCurrent && <span className="sky-own-plane">✈</span>}
                {!isCurrent && space.kind === "airport" && <span className="sky-runway-icon">▰▰▰</span>}
                {!isCurrent && space.kind !== "airport" && space.traffic > 0 && <span className="sky-traffic-icons">{"✈".repeat(space.traffic)}</span>}
                {!isCurrent && space.kind !== "airport" && space.traffic === 0 && <span className="sky-clear-dot">•</span>}
                <small>{space.kind === "airport" ? "Airport" : space.traffic > 0 ? `${space.traffic} traffic` : "Clear"}</small>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AxisGauge({ state }) {
  const pilot = state.cockpit.axis.pilot;
  const copilot = state.cockpit.axis.copilot;
  const degrees = state.cockpit.axis.position * 24;
  const axisMarkers = [
    { id: "far-left", kind: "x", label: "✕", angle: -72 },
    { id: "left-2", kind: "solid", label: "▲", angle: -48 },
    { id: "left-1", kind: "solid", label: "▲", angle: -24 },
    { id: "center", kind: "open", label: "△", angle: 0 },
    { id: "right-1", kind: "solid", label: "▲", angle: 24 },
    { id: "right-2", kind: "solid", label: "▲", angle: 48 },
    { id: "far-right", kind: "x", label: "✕", angle: 72 },
  ];
  return (
    <section className="sky-module sky-attitude-module">
      <div className="sky-axis-helper-top sky-axis-helper-top-left" aria-hidden="true">
        <span className="sky-axis-helper-plane left">✈</span>
      </div>
      <div className="sky-axis-helper-top sky-axis-helper-top-right" aria-hidden="true">
        <span className="sky-axis-helper-plane right">✈</span>
      </div>
      <h3>Axis ⚠</h3>
      <div className="sky-attitude-ball">
        <div className="sky-horizon" />
        <div className="sky-axis-marker-ring" aria-hidden="true">
          {axisMarkers.map((marker) => {
            const radians = (marker.angle * Math.PI) / 180;
            const radius = 55;
            const left = 50 + radius * Math.sin(radians);
            const top = 50 - radius * Math.cos(radians);
            const rotate = 180 + marker.angle;
            return (
              <span
                key={marker.id}
                className={`sky-axis-marker sky-axis-marker-${marker.kind}`}
                style={{ left: `${left}%`, top: `${top}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)` }}
              >
                {marker.label}
              </span>
            );
          })}
        </div>
        <span className="sky-plane-rotor" style={{ transform: `translate(-50%, -50%) rotate(${degrees}deg)` }}>
          <AxisPlaneSvg />
        </span>
      </div>
      <div className="sky-axis-display">
        <span className="sky-mini-die blue">{pilot?.value || "—"}</span>
        <strong>{axisLabel(state.cockpit.axis.position)}</strong>
        <span className="sky-mini-die orange">{copilot?.value || "—"}</span>
      </div>
    </section>
  );
}

function AxisPlaneSvg() {
  return (
    <svg className="sky-plane-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M50 4 L57 16 L57 42 L94 58 L94 70 L57 62 L57 78 L70 89 L70 97 L50 88 L30 97 L30 89 L43 78 L43 62 L6 70 L6 58 L43 42 L43 16 Z" />
    </svg>
  );
}

function EngineGauge({ state }) {
  const pilot = state.cockpit.engines.pilot;
  const copilot = state.cockpit.engines.copilot;
  return (
    <section className="sky-module sky-engine-module">
      <h3>Engines ⚠</h3>
      <div className="sky-throttle-box">
        <span className="sky-mini-die blue">{pilot?.value || "—"}</span>
        <strong>{state.cockpit.engines.speed || "—"}</strong>
        <span className="sky-mini-die orange">{copilot?.value || "—"}</span>
      </div>
      <small>{state.currentAltitude === 0 ? "Final round: compare speed to Brakes." : `Last advance: ${state.approach.lastAdvance || 0}`}</small>
    </section>
  );
}

function GearFlapsGauge({ state }) {
  const min = 4;
  const max = 12;
  const numbers = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  const bluePos = ((state.markers.blueAerodynamics - min) / (max - min)) * 100;
  const orangePos = ((state.markers.orangeAerodynamics - min) / (max - min)) * 100;
  const segmentLeft = Math.max(0, Math.min(100, Math.min(bluePos, orangePos)));
  const segmentRight = Math.max(0, Math.min(100, Math.max(bluePos, orangePos)));
  return (
    <section className="sky-module sky-speed-module">
      <h3>Gear / Flaps</h3>
      <div className="sky-number-gauge sky-gear-flaps-gauge" aria-label="Gear and flaps range gauge">
        <div className="sky-number-gauge-bar sky-gear-flaps-bar">
          <span className="sky-range-fill" style={{ left: `${segmentLeft}%`, width: `${Math.max(0, segmentRight - segmentLeft)}%` }} />
          <span className="sky-gauge-marker blue-marker" style={{ left: `${bluePos}%` }} />
          <span className="sky-gauge-marker orange-marker" style={{ left: `${orangePos}%` }} />
        </div>
        <div className="sky-gauge-scale">
          {numbers.map((value) => <span key={value}>{value}</span>)}
        </div>
      </div>
      <div className="sky-marker-row"><span>Gear marker</span><strong>{state.markers.blueAerodynamics}</strong></div>
      <div className="sky-marker-row"><span>Flaps marker</span><strong>{state.markers.orangeAerodynamics}</strong></div>
    </section>
  );
}

function BrakesGauge({ state }) {
  const min = 1.5;
  const max = 6.5;
  const numbers = [2, 3, 4, 5, 6];
  const brakePos = ((state.markers.brakeThreshold - min) / (max - min)) * 100;
  return (
    <section className="sky-module sky-brakes-module">
      <h3>Brakes</h3>
      <div className="sky-number-gauge sky-brakes-number-gauge" aria-label="Brakes gauge">
        <div className="sky-number-gauge-bar sky-brake-arc">
          <span className="sky-brake-fill" style={{ width: `${Math.max(0, Math.min(100, brakePos))}%` }} />
          <span className="sky-gauge-marker brake-marker" style={{ left: `${Math.max(0, Math.min(100, brakePos))}%` }} />
        </div>
        <div className="sky-gauge-scale sky-gauge-scale-brakes">
          {numbers.map((value) => <span key={value}>{value}</span>)}
        </div>
      </div>
      <div className="sky-marker-row"><span>Brake strength</span><strong>{state.markers.brakeThreshold}</strong></div>
      <SwitchPanel title="Brake Track" icon="▰" switches={state.switches.brakes} />
    </section>
  );
}

function SwitchPanel({ title, icon, switches }) {
  return (
    <section className="sky-module sky-switch-module">
      <h3>{icon} {title}</h3>
      <div className="sky-switch-stack">
        {switches.map((item) => (
          <span key={item.id} className={`sky-switch ${item.deployed ? "on" : "off"}`}>
            <span className="sky-switch-light" />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function SeatStatusPanel({ state, role, player, act }) {
  const canControl = isMine(state, role, player);
  const dice = state.roles[role]?.dice || [];
  const isActive = state.activeRole === role && state.phase === "placement";
  const rolled = Boolean(state.roles[role]?.rolledThisRound);
  const canRoll = canControl && (state.phase === "briefing" || state.phase === "rolling") && !rolled;

  return (
    <section className={`sky-card sky-seat sky-${role} ${isActive ? "active" : ""}`}>
      <h2>{ROLE_LABELS[role]}</h2>
      <p className="sky-muted">{state.roles[role]?.playerName || "Unclaimed"}</p>
      {canRoll && <button className="sky-primary" onClick={() => act({ type: "ROLL_ROLE_DICE", role })}>Roll My Dice</button>}
      {(state.phase === "briefing" || state.phase === "rolling") && <p className={rolled ? "sky-turn-now" : "sky-muted"}>{rolled ? "Dice rolled" : "Waiting to roll"}</p>}
      {state.phase === "placement" && <p className={isActive ? "sky-turn-now" : "sky-muted"}>{isActive ? "Active seat" : `${ROLE_LABELS[state.activeRole]} to place`}</p>}
      <div className="sky-private-dice-summary">
        {dice.length === 0 ? <span>□□□□</span> : dice.map((die) => <span key={die.id} className={`sky-hidden-dot ${die.placed ? "placed" : ""}`}>{canControl ? (die.placed ? "✓" : "●") : "◆"}</span>)}
      </div>
      {!canControl && state.phase !== "setup" && <small>Dice values hidden from this screen.</small>}
    </section>
  );
}

function PlacementModal({ state, selectedDie, coffeeByDie, setCoffeeByDie, act, onClose }) {
  const role = selectedDie.role;
  const die = state.roles[role]?.dice?.find((candidate) => candidate.id === selectedDie.dieId);
  if (!die || die.placed || state.phase !== "placement") return null;

  const delta = coffeeByDie[die.id] || 0;
  const value = die.value + delta;
  const targets = getTargetsForRole(state, role, value);
  const isActive = state.activeRole === role;

  function setDelta(newDelta) {
    setCoffeeByDie((old) => ({ ...old, [die.id]: newDelta }));
  }

  function place(targetId) {
    act({ type: "PLACE_DIE", role, dieId: die.id, targetId, coffeeDelta: delta });
    setCoffeeByDie((old) => ({ ...old, [die.id]: 0 }));
    onClose();
  }

  return (
    <div className="sky-modal-backdrop" role="presentation">
      <section className="sky-placement-modal" role="dialog" aria-modal="true" aria-label="Choose placement">
        <header className={`sky-modal-header sky-${role}`}>
          <div>
            <p className="sky-kicker">{ROLE_LABELS[role]} placement</p>
            <h2>Place this die</h2>
          </div>
          <button className="sky-close-button" onClick={onClose}>Cancel</button>
        </header>
        <div className="sky-modal-die-row">
          <button className={`sky-die-button ${role}`} disabled><DieFace value={die.value} /></button>
          <CoffeeControl die={die} delta={delta} setDelta={setDelta} coffee={state.tokens.coffee} />
          <div className="sky-modified-value">Final value: <strong>{value}</strong></div>
        </div>
        {!isActive && <p className="sky-loss">It is not {ROLE_LABELS[role]}'s turn.</p>}
        <div className="sky-placement-options">
          {targets.map((target) => (
            <button key={target.id} disabled={!isActive || !target.ok} title={target.message || target.label} onClick={() => place(target.id)}>
              <span>{target.icon}</span>
              <strong>{target.label}</strong>
              {!target.ok && <small>{target.message || "Not available"}</small>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function CoffeeControl({ die, delta, setDelta, coffee }) {
  const minDelta = Math.max(-coffee, 1 - die.value);
  const maxDelta = Math.min(coffee, 6 - die.value);
  const values = [];
  for (let value = minDelta; value <= maxDelta; value += 1) values.push(value);
  return (
    <label className="sky-coffee-control">
      Coffee
      <select value={delta} onChange={(event) => setDelta(Number(event.target.value))}>
        {values.map((value) => <option value={value} key={value}>{value > 0 ? `+${value}` : value}</option>)}
      </select>
    </label>
  );
}

function getTargetsForRole(state, role, value) {
  const targets = [];
  targets.push({ id: `axis-${role}`, icon: "↔", label: "Axis", ok: !state.cockpit.axis[role] });
  targets.push({ id: `engine-${role}`, icon: "◉", label: "Engines", ok: !state.cockpit.engines[role] });

  if (role === "pilot") {
    targets.push({ id: "radio-pilot", icon: "☊", label: "Radio", ok: state.cockpit.radio.pilot.length === 0 });
    state.switches.landingGear.forEach((gear) => targets.push({ id: gear.id, icon: "🛬", label: `Gear ${gear.label}`, ok: !gear.deployed && gear.allowed.includes(value), message: gear.deployed ? "Already deployed" : `Needs ${gear.label}` }));
    const firstBrake = state.switches.brakes.findIndex((item) => !item.deployed);
    state.switches.brakes.forEach((brake, index) => targets.push({ id: brake.id, icon: "▰", label: `Brake ${brake.label}`, ok: index === firstBrake && !brake.deployed && brake.allowed.includes(value), message: index !== firstBrake ? "Deploy in order" : `Needs ${brake.label}` }));
  } else {
    targets.push({ id: "radio-copilot-a", icon: "☊", label: "Radio A", ok: state.cockpit.radio.copilotA.length === 0 });
    targets.push({ id: "radio-copilot-b", icon: "☊", label: "Radio B", ok: state.cockpit.radio.copilotB.length === 0 });
    const firstFlap = state.switches.flaps.findIndex((item) => !item.deployed);
    state.switches.flaps.forEach((flap, index) => targets.push({ id: flap.id, icon: "◢", label: `Flap ${flap.label}`, ok: index === firstFlap && !flap.deployed && flap.allowed.includes(value), message: index !== firstFlap ? "Deploy in order" : `Needs ${flap.label}` }));
  }

  state.cockpit.concentration.forEach((space, index) => targets.push({ id: `concentration-${index}`, icon: "☕", label: `Coffee ${index + 1}`, ok: !space, message: space ? "Filled" : "Add Coffee" }));
  return targets;
}

function DieFace({ value }) {
  const pipMap = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const pips = pipMap[value] || [];
  return (
    <span className="sky-pip-face" aria-label={`${value}`}>
      {Array.from({ length: 9 }).map((_, index) => <span key={index} className={pips.includes(index) ? "pip on" : "pip"} />)}
    </span>
  );
}

function ActionFooter({ state, act }) {
  return (
    <section className="sky-card sky-footer-actions">
      {state.phase === "briefing" && <p>{state.mode === "solo" ? "Solo briefing: talk strategy, then roll only the starting color shown by the altitude arrow." : "Briefing phase: talk strategy in chat, not die values. Then each player rolls their own dice."}</p>}
      {state.phase === "rolling" && <p>Rolling phase: at least one crew member has rolled. Wait for the other seat. No more strategy chat.</p>}
      {state.phase === "placement" && <p>Silent phase: place one die at a time. Axis and Engines are mandatory every round.</p>}
      {state.phase === "endRound" && <button className="sky-primary sky-big-button" onClick={() => act({ type: "END_ROUND" })}>End Round / Descend</button>}
      {(state.phase === "won" || state.phase === "lost") && <button className="sky-primary" onClick={() => act({ type: "RESET_GAME" })}>Reset Game</button>}
    </section>
  );
}

function LogPanel({ log }) {
  return (
    <section className="sky-card sky-log">
      <h2>Command Log</h2>
      <div>
        {(log || []).slice(0, 25).map((entry) => (
          <p key={entry.id}><strong>{entry.type}</strong> · {entry.message}</p>
        ))}
      </div>
    </section>
  );
}
