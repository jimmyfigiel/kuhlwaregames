// src/games/skyteam/view.jsx

import React, { useMemo, useState } from "react";
import "./view.css";

const ROLES = ["pilot", "copilot"];
const ROLE_LABELS = { pilot: "Pilot", copilot: "Co-Pilot" };

function playerName(player) {
  return player?.displayName || player?.name || player?.id || "Player";
}

function isMine(state, role, player) {
  if (!state || !player) return false;
  if (state.mode === "onePlayerTest") return true;
  return state.roles?.[role]?.playerId === player.id;
}

function roleForViewer(state, player) {
  if (!state || !player) return null;
  if (state.mode === "onePlayerTest") return "solo";
  return ROLES.find((role) => state.roles?.[role]?.playerId === player.id) || null;
}

function formatAltitude(value) {
  if (value === 0) return "Landing";
  return `${value.toLocaleString()} ft`;
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

  const viewerRole = roleForViewer(state, player);

  function act(action) {
    sendWithPlayer(submitAction, player, action);
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
          <TopInstruments state={state} viewerRole={viewerRole} />
          <section className="sky-layout">
            <PilotPanel state={state} role="pilot" player={player} act={act} coffeeByDie={coffeeByDie} setCoffeeByDie={setCoffeeByDie} rerollSelection={rerollSelection} setRerollSelection={setRerollSelection} />
            <CockpitPanel state={state} />
            <PilotPanel state={state} role="copilot" player={player} act={act} coffeeByDie={coffeeByDie} setCoffeeByDie={setCoffeeByDie} rerollSelection={rerollSelection} setRerollSelection={setRerollSelection} />
          </section>
          <ActionFooter state={state} act={act} />
        </>
      )}

      <LogPanel log={state.commandLog || []} />
    </main>
  );
}

function SetupView({ state, player, act }) {
  return (
    <section className="sky-setup-grid">
      <section className="sky-card">
        <h2>Mode</h2>
        <p className="sky-muted">One-player test mode lets one browser control both seats. Two-player mode enforces Pilot and Co-Pilot ownership.</p>
        <div className="sky-button-row">
          <button className={state.mode === "onePlayerTest" ? "sky-primary" : ""} onClick={() => act({ type: "SET_MODE", mode: "onePlayerTest" })}>One Player Test</button>
          <button className={state.mode === "twoPlayer" ? "sky-primary" : ""} onClick={() => act({ type: "SET_MODE", mode: "twoPlayer" })}>Two Player</button>
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
      <Instrument title="Current Position" value={state.approach.spaces[state.approach.currentIndex]?.label || "—"} detail={state.approach.spaces[state.approach.currentIndex]?.kind === "airport" ? "Airport" : "Approach track"} />
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

function CockpitPanel({ state }) {
  return (
    <section className="sky-cockpit sky-card">
      <h2>Shared Cockpit</h2>
      <ApproachTrack state={state} />
      <div className="sky-cockpit-grid">
        <AxisGauge state={state} />
        <EngineGauge state={state} />
        <SpeedGauge state={state} />
        <SwitchPanel title="Landing Gear" switches={state.switches.landingGear} />
        <SwitchPanel title="Flaps" switches={state.switches.flaps} />
        <SwitchPanel title="Brakes" switches={state.switches.brakes} />
      </div>
      {state.phase === "won" && <div className="sky-win">Congratulations! {state.winReason}</div>}
      {state.phase === "lost" && <div className="sky-loss">Crash / Failure: {state.lossReason}</div>}
    </section>
  );
}

function ApproachTrack({ state }) {
  return (
    <section className="sky-approach">
      {state.approach.spaces.map((space, index) => (
        <div className={`sky-approach-space ${index === state.approach.currentIndex ? "current" : ""} ${space.kind === "airport" ? "airport" : ""}`} key={space.id}>
          <span>{space.kind === "airport" ? "RUNWAY" : index}</span>
          <strong>{index === state.approach.currentIndex ? "✈" : space.traffic > 0 ? "🛩".repeat(space.traffic) : "·"}</strong>
          <small>{space.traffic > 0 ? `${space.traffic} traffic` : "clear"}</small>
        </div>
      ))}
    </section>
  );
}

function AxisGauge({ state }) {
  const pilot = state.cockpit.axis.pilot;
  const copilot = state.cockpit.axis.copilot;
  return (
    <section className="sky-module">
      <h3>Axis ⚠</h3>
      <div className="sky-axis-display">
        <span className="sky-die blue">{pilot?.value || "—"}</span>
        <strong>{axisLabel(state.cockpit.axis.position)}</strong>
        <span className="sky-die orange">{copilot?.value || "—"}</span>
      </div>
      <small>Safe range: 2 marks either side. Final landing requires Level.</small>
    </section>
  );
}

function EngineGauge({ state }) {
  const pilot = state.cockpit.engines.pilot;
  const copilot = state.cockpit.engines.copilot;
  return (
    <section className="sky-module">
      <h3>Engines ⚠</h3>
      <div className="sky-axis-display">
        <span className="sky-die blue">{pilot?.value || "—"}</span>
        <strong>{state.cockpit.engines.speed || "—"}</strong>
        <span className="sky-die orange">{copilot?.value || "—"}</span>
      </div>
      <small>{state.currentAltitude === 0 ? "Final round: compare speed to Brakes." : `Last advance: ${state.approach.lastAdvance || 0}`}</small>
    </section>
  );
}

function SpeedGauge({ state }) {
  return (
    <section className="sky-module">
      <h3>Speed / Brakes</h3>
      <div className="sky-marker-row"><span>Blue aero</span><strong>{state.markers.blueAerodynamics}</strong></div>
      <div className="sky-marker-row"><span>Orange aero</span><strong>{state.markers.orangeAerodynamics}</strong></div>
      <div className="sky-marker-row"><span>Brake marker</span><strong>{state.markers.brakeThreshold}</strong></div>
      <small>Below blue = 0 spaces; between = 1; above orange = 2.</small>
    </section>
  );
}

function SwitchPanel({ title, switches }) {
  return (
    <section className="sky-module">
      <h3>{title}</h3>
      <div className="sky-switches">
        {switches.map((item) => (
          <span key={item.id} className={`sky-switch ${item.deployed ? "on" : "off"}`}>{item.label}</span>
        ))}
      </div>
    </section>
  );
}

function PilotPanel({ state, role, player, act, coffeeByDie, setCoffeeByDie, rerollSelection, setRerollSelection }) {
  const canControl = isMine(state, role, player);
  const isActive = state.activeRole === role && state.phase === "placement";
  const dice = state.roles[role]?.dice || [];
  const visibleDice = canControl || state.phase !== "placement";

  function chooseTarget(dieId, targetId) {
    const delta = coffeeByDie[dieId] || 0;
    act({ type: "PLACE_DIE", role, dieId, targetId, coffeeDelta: delta });
    setCoffeeByDie((old) => ({ ...old, [dieId]: 0 }));
  }

  function setDelta(dieId, delta) {
    setCoffeeByDie((old) => ({ ...old, [dieId]: delta }));
  }

  function toggleReroll(dieId) {
    setRerollSelection((old) => ({
      ...old,
      [role]: { ...old[role], [dieId]: !old[role]?.[dieId] },
    }));
  }

  function doReroll() {
    const dieIds = Object.entries(rerollSelection[role] || {}).filter(([, selected]) => selected).map(([dieId]) => dieId);
    act({ type: "REROLL_DICE", role, dieIds });
    setRerollSelection((old) => ({ ...old, [role]: {} }));
  }

  return (
    <section className={`sky-card sky-seat sky-${role} ${isActive ? "active" : ""}`}>
      <h2>{ROLE_LABELS[role]}</h2>
      <p className="sky-muted">{state.roles[role]?.playerName || "Unclaimed"}</p>
      {state.phase === "briefing" && canControl && <button className="sky-primary" onClick={() => act({ type: "START_ROUND_ROLL" })}>Roll Dice</button>}
      {state.phase === "placement" && <p className={isActive ? "sky-turn-now" : "sky-muted"}>{isActive ? "Your turn" : `${ROLE_LABELS[state.activeRole]} to place`}</p>}

      <div className="sky-dice-list">
        {dice.length === 0 ? <p className="sky-muted">No dice rolled.</p> : dice.map((die) => (
          <section key={die.id} className={`sky-die-card ${die.placed ? "placed" : ""}`}>
            <div className="sky-die-line">
              <button className={`sky-die ${role === "pilot" ? "blue" : "orange"}`} disabled>{visibleDice ? die.value : "?"}</button>
              <span>{die.placed ? `Placed: ${die.targetId}` : "Available"}</span>
            </div>
            {!die.placed && canControl && state.phase === "placement" && (
              <>
                <CoffeeControl die={die} delta={coffeeByDie[die.id] || 0} setDelta={setDelta} coffee={state.tokens.coffee} />
                <TargetButtons state={state} role={role} die={die} delta={coffeeByDie[die.id] || 0} disabled={!isActive} onPlace={chooseTarget} />
                <label className="sky-reroll-check"><input type="checkbox" checked={Boolean(rerollSelection[role]?.[die.id])} onChange={() => toggleReroll(die.id)} /> select for reroll</label>
              </>
            )}
          </section>
        ))}
      </div>
      {canControl && state.phase === "placement" && state.tokens.rerolls > 0 && <button className="sky-secondary" onClick={doReroll}>Spend Reroll Token</button>}
    </section>
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
      <select value={delta} onChange={(event) => setDelta(die.id, Number(event.target.value))}>
        {values.map((value) => <option value={value} key={value}>{value > 0 ? `+${value}` : value}</option>)}
      </select>
    </label>
  );
}

function TargetButtons({ state, role, die, delta, disabled, onPlace }) {
  const value = die.value + delta;
  const targets = useMemo(() => getTargetsForRole(state, role, value), [state, role, value]);
  return (
    <div className="sky-target-grid">
      {targets.map((target) => (
        <button key={target.id} disabled={disabled || !target.ok} title={target.message || target.label} onClick={() => onPlace(die.id, target.id)}>
          {target.label}
        </button>
      ))}
    </div>
  );
}

function getTargetsForRole(state, role, value) {
  const targets = [];
  targets.push({ id: `axis-${role}`, label: "Axis", ok: !state.cockpit.axis[role] });
  targets.push({ id: `engine-${role}`, label: "Engines", ok: !state.cockpit.engines[role] });

  if (role === "pilot") {
    targets.push({ id: "radio-pilot", label: "Radio", ok: state.cockpit.radio.pilot.length === 0 });
    state.switches.landingGear.forEach((gear) => targets.push({ id: gear.id, label: `Gear ${gear.label}`, ok: !gear.deployed && gear.allowed.includes(value) }));
    const firstBrake = state.switches.brakes.findIndex((item) => !item.deployed);
    state.switches.brakes.forEach((brake, index) => targets.push({ id: brake.id, label: `Brake ${brake.label}`, ok: index === firstBrake && !brake.deployed && brake.allowed.includes(value) }));
  } else {
    targets.push({ id: "radio-copilot-a", label: "Radio A", ok: state.cockpit.radio.copilotA.length === 0 });
    targets.push({ id: "radio-copilot-b", label: "Radio B", ok: state.cockpit.radio.copilotB.length === 0 });
    const firstFlap = state.switches.flaps.findIndex((item) => !item.deployed);
    state.switches.flaps.forEach((flap, index) => targets.push({ id: flap.id, label: `Flap ${flap.label}`, ok: index === firstFlap && !flap.deployed && flap.allowed.includes(value) }));
  }

  state.cockpit.concentration.forEach((space, index) => targets.push({ id: `concentration-${index}`, label: `Coffee ${index + 1}`, ok: !space }));
  return targets;
}

function ActionFooter({ state, act }) {
  return (
    <section className="sky-card sky-footer-actions">
      {state.phase === "briefing" && <p>Briefing phase: talk strategy, not die values. Then either player can roll.</p>}
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
