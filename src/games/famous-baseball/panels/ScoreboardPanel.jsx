// /src/games/famous-baseball/panels/ScoreboardPanel.jsx

import React from "react";

function getTeamName(team, setup) {
  if (team === "visitors") return setup.visitorsTeamName || "Visitors";
  if (team === "home") return setup.homeTeamName || "Home";
  return team || "Unknown";
}

function TeamRow({ team, active, score, setup }) {
  const isVisitors = team === "visitors";

  const teamName = getTeamName(team, setup);
  const teamColor = isVisitors ? setup.visitorsTeamColor : setup.homeTeamColor;

  return (
    <div
      className={`fbb-team-row ${active ? "" : "inactive"}`}
      style={{ background: teamColor }}
    >
      <div className="fbb-team-side">{isVisitors ? "V" : "H"}</div>
      <div className="fbb-team-name">{teamName}</div>
      <div className="fbb-team-score">{score}</div>
    </div>
  );
}

function InningPanel({ inning, half }) {
  return (
    <div className="fbb-inning-panel">
      <div className={`fbb-inning-arrow ${half === "top" ? "active" : ""}`}>
        ▲
      </div>

      <div className="fbb-inning-number">{inning || 1}</div>

      <div className={`fbb-inning-arrow ${half === "bottom" ? "active" : ""}`}>
        ▼
      </div>
    </div>
  );
}

function ScoreboardDiamond({ bases }) {
  return (
    <div className="fbb-diamond">
      <span className={`fbb-base second ${bases?.second ? "occupied" : ""}`} />
      <span className={`fbb-base third ${bases?.third ? "occupied" : ""}`} />
      <span className={`fbb-base first ${bases?.first ? "occupied" : ""}`} />
    </div>
  );
}

function OutsDots({ outs }) {
  return (
    <div className="fbb-outs">
      {[1, 2, 3].map((number) => (
        <span
          key={number}
          className={`fbb-out-dot ${outs >= number ? "occupied" : ""}`}
        />
      ))}
    </div>
  );
}

function BasesPanel({ bases, outs }) {
  return (
    <div className="fbb-bases-panel">
      <ScoreboardDiamond bases={bases} />
      <OutsDots outs={outs || 0} />
    </div>
  );
}

function getTeamTurnStatus({ state, team, setup }) {
  const role = team === state.battingTeam ? "Batting" : "Pitching";
  const submittedKey = team === state.battingTeam ? "batter" : "pitcher";
  const submitted = !!state.submitted?.[submittedKey];
  const teamName = getTeamName(team, setup);

  if (state.phase === "gameOver") {
    return `${teamName}: Game Over`;
  }

  return `${teamName}: ${submitted ? "Selection Made" : `Waiting (${role})`}`;
}

function phaseLabel(state) {
  if (state.phase === "pitch") return "PITCH";
  if (state.phase === "hitPlacement") return "HIT";
  if (state.phase === "gameOver") return "FINAL";
  return "PLAY";
}

function StatusStrip({ state, setup }) {
  const fieldingDone = !!state.submitted?.pitcher;
  const battingDone = !!state.submitted?.batter;

  return (
    <div className="fbb-status-strip">
      <div className="fbb-status-strip-phase">{phaseLabel(state)}</div>

      <div className={`fbb-status-strip-line ${fieldingDone ? "done" : ""}`}>
        {getTeamTurnStatus({
          state,
          team: state.fieldingTeam,
          setup,
        })}
      </div>

      <div className={`fbb-status-strip-line ${battingDone ? "done" : ""}`}>
        {getTeamTurnStatus({
          state,
          team: state.battingTeam,
          setup,
        })}
      </div>
    </div>
  );
}

export default function ScoreboardPanel({
  state,
  setup,
  playerSlot,
  role,
  teamLabel,
}) {
  const visitorsBatting = state.battingTeam === "visitors";
  const homeBatting = state.battingTeam === "home";

  return (
    <section className="fbb-scoreboard">
      <div className="fbb-scoreboard-grid">
        <div>
          <TeamRow
            team="visitors"
            active={visitorsBatting}
            score={state.score?.visitors || 0}
            setup={setup}
          />

          <TeamRow
            team="home"
            active={homeBatting}
            score={state.score?.home || 0}
            setup={setup}
          />
        </div>

        <InningPanel inning={state.inning || 1} half={state.half || "top"} />

        <BasesPanel bases={state.bases} outs={state.outs || 0} />
      </div>

      <StatusStrip state={state} setup={setup} />

      <div className="fbb-scoreboard-footer">
        Batting: <strong>{teamLabel(state.battingTeam)}</strong>
        {" · "}
        Pitching: <strong>{teamLabel(state.fieldingTeam)}</strong>
        {" · "}
        You: <strong>{teamLabel(playerSlot)}</strong>
        {" · "}
        Role: <strong>{role}</strong>
      </div>
    </section>
  );
}