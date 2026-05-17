// /src/games/famous-baseball/view.jsx

import React from "react";
import "./FamousBaseball.css";

import SetupPanel from "./panels/SetupPanel.jsx";
import ScoreboardPanel from "./panels/ScoreboardPanel.jsx";
import ActionPanel from "./panels/ActionPanel.jsx";
import ChatPanel from "./panels/ChatPanel.jsx";
import GameLogPanel from "./panels/GameLogPanel.jsx";

function getSetup(room) {
  return {
    started: false,
    visitorsPlayerId: null,
    homePlayerId: null,
    visitorsTeamName: "Visitors",
    homeTeamName: "Home",
    visitorsTeamColor: "#991b1b",
    homeTeamColor: "#1d4ed8",
    ...(room?.gameSetup || {}),
  };
}

function Card({ children }) {
  return <section className="fbb-card">{children}</section>;
}

function teamLabel(team) {
  if (team === "visitors") return "Visitors";
  if (team === "home") return "Home";
  return team || "Unknown";
}

export default function FamousBaseballView({
  room,
  gameState,
  player,
  playerSlot,
  submitAction,
  updateRoomData,
  initializeMissingGameState,
}) {
  const setup = getSetup(room);
  const state = gameState || room?.gameState;

  if (!state) {
    return (
      <Card>
        <h2>Famous Baseball</h2>
        <p className="message">Game state has not been initialized.</p>

        {initializeMissingGameState && (
          <button type="button" onClick={initializeMissingGameState}>
            Initialize Game State
          </button>
        )}
      </Card>
    );
  }

  if (!setup.started) {
    return (
      <>
        <SetupPanel
          room={room}
          player={player}
          setup={setup}
          updateRoomData={updateRoomData}
        />

        <ChatPanel
          room={room}
          player={player}
          updateRoomData={updateRoomData}
        />
      </>
    );
  }

  const role =
    playerSlot === state.battingTeam
      ? "batter"
      : playerSlot === state.fieldingTeam
        ? "pitcher"
        : "spectator";

  function choosePitch(choice) {
    submitAction({ type: "choosePitch", choice });
  }

  function chooseBatterAction(choice) {
    submitAction({ type: "chooseBatterAction", choice });
  }

  function chooseHitPlacement(number) {
    submitAction({ type: "chooseHitPlacement", number });
  }

  return (
    <div className="fbb-game">
      <ScoreboardPanel
        state={state}
        setup={setup}
        playerSlot={playerSlot}
        role={role}
        teamLabel={teamLabel}
      />

      {state.lastResult && (
        <Card>
          <div className="fbb-result-title">{state.lastResult.title}</div>
          <div className="fbb-result-detail">{state.lastResult.detail}</div>
        </Card>
      )}

      <ActionPanel
        state={state}
        role={role}
        onChoosePitch={choosePitch}
        onChooseBatterAction={chooseBatterAction}
        onChooseHitPlacement={chooseHitPlacement}
      />

      <ChatPanel
        room={room}
        player={player}
        updateRoomData={updateRoomData}
      />

      <GameLogPanel log={state.log} />
    </div>
  );
}