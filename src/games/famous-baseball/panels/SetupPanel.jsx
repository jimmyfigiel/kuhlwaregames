// /src/games/famous-baseball/panels/SetupPanel.jsx

import React, { useState } from "react";

function getJoinUrl(joinCode) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("join", joinCode);
  return url.toString();
}

function getPlayerName(room, playerId) {
  const playerEntry = room?.players?.find(
    (roomPlayer) => roomPlayer.playerId === playerId
  );

  return playerEntry?.name || playerId || "Open";
}

function Card({ children }) {
  return <section className="fbb-card">{children}</section>;
}

function SetupTeamCard({
  title,
  color,
  teamName,
  assignedPlayerName,
  canClaim,
  canClear,
  onClaim,
  onClear,
  onNameChange,
  onColorChange,
}) {
  return (
    <div className="fbb-setup-team-card" style={{ borderColor: color }}>
      <h3>{title}</h3>

      <label className="fbb-label">
        Team Name
        <input
          className="fbb-input"
          type="text"
          value={teamName}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>

      <label className="fbb-label">
        Team Color
        <input
          className="fbb-color-input"
          type="color"
          value={color}
          onChange={(event) => onColorChange(event.target.value)}
        />
      </label>

      <p>
        <strong>Player:</strong> {assignedPlayerName}
      </p>

      <div className="fbb-button-row">
        {canClaim && (
          <button type="button" onClick={onClaim}>
            Claim {title}
          </button>
        )}

        {canClear && (
          <button type="button" className="secondary-button" onClick={onClear}>
            Clear Seat
          </button>
        )}
      </div>
    </div>
  );
}

export default function SetupPanel({ room, player, setup, updateRoomData }) {
  const [visitorsTeamName, setVisitorsTeamName] = useState(
    setup.visitorsTeamName
  );
  const [homeTeamName, setHomeTeamName] = useState(setup.homeTeamName);
  const [visitorsTeamColor, setVisitorsTeamColor] = useState(
    setup.visitorsTeamColor
  );
  const [homeTeamColor, setHomeTeamColor] = useState(setup.homeTeamColor);
  const [message, setMessage] = useState("");

  const isCreator = room.createdBy === player.id;
  const isSuperuser = player.isSuperuser || player.isSuperUser;
  const canManage = isCreator || isSuperuser;

  const playerIsVisitors = setup.visitorsPlayerId === player.id;
  const playerIsHome = setup.homePlayerId === player.id;
  const playerAlreadySeated = playerIsVisitors || playerIsHome;

  const inviteUrl = room.joinCode ? getJoinUrl(room.joinCode) : "";

  async function copyInviteLink() {
    if (!inviteUrl) {
      setMessage("This room does not have a join code.");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Opponent invite link copied.");
    } catch (error) {
      console.error(error);
      setMessage("Could not copy invite link.");
    }
  }

  async function saveSetup(extraSetup = {}) {
    const nextSetup = {
      ...setup,
      visitorsTeamName,
      homeTeamName,
      visitorsTeamColor,
      homeTeamColor,
      ...extraSetup,
    };

    await updateRoomData({
      gameSetup: nextSetup,
      status: nextSetup.started ? "active" : "setup",
    });
  }

  async function claimVisitors() {
    setMessage("");

    if (setup.homePlayerId === player.id) {
      setMessage("You are already assigned to Home. Clear that seat first.");
      return;
    }

    await saveSetup({
      visitorsPlayerId: player.id,
    });
  }

  async function claimHome() {
    setMessage("");

    if (setup.visitorsPlayerId === player.id) {
      setMessage("You are already assigned to Visitors. Clear that seat first.");
      return;
    }

    await saveSetup({
      homePlayerId: player.id,
    });
  }

  async function clearVisitors() {
    await saveSetup({
      visitorsPlayerId: null,
    });
  }

  async function clearHome() {
    await saveSetup({
      homePlayerId: null,
    });
  }

  async function startGame() {
    setMessage("");

    if (!setup.visitorsPlayerId || !setup.homePlayerId) {
      setMessage("Both Visitors and Home need a player before starting.");
      return;
    }

    await saveSetup({
      started: true,
    });
  }

  return (
    <Card>
      <h2>Game Setup</h2>

      <p className="fbb-muted">
        Choose who is Visitors and Home, then set team names and colors.
      </p>

      {inviteUrl && (
        <div className="fbb-invite-box">
          <h3>Opponent Invite</h3>

          <p className="fbb-muted">
            Send this link to your opponent. When they join, they can be added
            to the server and claim the open side.
          </p>

          <input className="fbb-input" type="text" readOnly value={inviteUrl} />

          <button type="button" onClick={copyInviteLink}>
            Copy Opponent Invite Link
          </button>
        </div>
      )}

      <div className="fbb-setup-grid">
        <SetupTeamCard
          title="Visitors"
          color={visitorsTeamColor}
          teamName={visitorsTeamName}
          assignedPlayerName={getPlayerName(room, setup.visitorsPlayerId)}
          canClaim={!setup.visitorsPlayerId && !playerAlreadySeated}
          canClear={canManage || playerIsVisitors}
          onClaim={claimVisitors}
          onClear={clearVisitors}
          onNameChange={setVisitorsTeamName}
          onColorChange={setVisitorsTeamColor}
        />

        <SetupTeamCard
          title="Home"
          color={homeTeamColor}
          teamName={homeTeamName}
          assignedPlayerName={getPlayerName(room, setup.homePlayerId)}
          canClaim={!setup.homePlayerId && !playerAlreadySeated}
          canClear={canManage || playerIsHome}
          onClaim={claimHome}
          onClear={clearHome}
          onNameChange={setHomeTeamName}
          onColorChange={setHomeTeamColor}
        />
      </div>

      <div className="button-list">
        <button type="button" onClick={() => saveSetup()}>
          Save Setup
        </button>

        {canManage && (
          <button type="button" onClick={startGame}>
            Start Game
          </button>
        )}
      </div>

      {!canManage && (
        <p className="fbb-muted">The room creator starts the game.</p>
      )}

      {message && <p className="message">{message}</p>}
    </Card>
  );
}