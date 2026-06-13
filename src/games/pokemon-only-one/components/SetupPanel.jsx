// src/games/pokemon-only-one/components/SetupPanel.jsx

import React from "react";
import { canViewerControlSide, isOnePlayerTestMode } from "../view/viewRules.js";

const PRIZE_COUNTS = [1, 2, 3, 4, 5, 6];

export function SetupPanel({ model, actionBridge }) {
  const setup = normalizeSetup(model.setup);
  const viewerSideId = actionBridge.viewerSideId === "opponent" ? "opponent" : "player";
  const ownSideId = viewerSideId;
  const opponentSideId = ownSideId === "player" ? "opponent" : "player";
  const sideOrder = isOnePlayerTestMode(model) ? ["player", "opponent"] : [opponentSideId, ownSideId];
  const canChangePrizeCount = !setup.sides.player.ready && !setup.sides.opponent.ready;

  return (
    <section className="poo-setup-panel" aria-label="Setup phase">
      <div className="poo-setup-header">
        <div>
          <h2>{setup.phase === "turn" ? "Game Started" : "Setup Phase"}</h2>
          <p>
            Ready automatically draws 7 cards and sets {setup.prizeCount} prize card{setup.prizeCount === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="poo-prize-selector" aria-label="Prize count">
          <span>Prizes</span>
          <div className="poo-prize-buttons">
            {PRIZE_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                className={count === setup.prizeCount ? "poo-prize-count-button poo-prize-count-button-active" : "poo-prize-count-button"}
                disabled={!actionBridge.ready || !canChangePrizeCount || setup.phase !== "setup"}
                onClick={() => actionBridge.send({ type: "SET_PRIZE_COUNT", prizeCount: count })}
                aria-pressed={count === setup.prizeCount}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="poo-setup-sides">
        {sideOrder.map((sideId) => (
          <SetupSideStatus key={sideId} model={model} setup={setup} sideId={sideId} actionBridge={actionBridge} viewerSideId={viewerSideId} />
        ))}
      </div>

      {setup.coinFlip?.resultSideId && (
        <div className="poo-setup-result" aria-live="polite">
          Coin flip complete: {labelSideForViewer(setup.coinFlip.resultSideId, viewerSideId)} goes first.
        </div>
      )}
    </section>
  );
}

function SetupSideStatus({ model, setup, sideId, actionBridge, viewerSideId }) {
  const side = model.playerSides?.[sideId] || { name: sideId };
  const sideSetup = setup.sides[sideId] || { ready: false, openingHandDrawn: false, prizesSet: false };
  const canControlSide = canViewerControlSide(model, viewerSideId, sideId);
  const handCount = model.zones?.[side.handZoneId]?.cardIds?.length || 0;
  const prizeCount = (side.prizeZoneIds || []).reduce((total, zoneId) => total + (model.zones?.[zoneId]?.cardIds?.length || 0), 0);
  const deckCount = model.zones?.[side.deckZoneId]?.cardIds?.length || 0;
  const disabled = !actionBridge.ready || !canControlSide || sideSetup.ready || setup.phase !== "setup";

  return (
    <article className={sideSetup.ready ? "poo-setup-side poo-setup-side-ready" : "poo-setup-side"}>
      <div>
        <h3>{labelSideForViewer(sideId, viewerSideId)}</h3>
        <p>{side.name}</p>
      </div>

      <dl className="poo-setup-stats">
        <div>
          <dt>Hand</dt>
          <dd>{handCount}</dd>
        </div>
        <div>
          <dt>Prizes</dt>
          <dd>{prizeCount}</dd>
        </div>
        <div>
          <dt>Deck</dt>
          <dd>{deckCount}</dd>
        </div>
      </dl>

      <div className="poo-setup-checks" aria-label={`${side.name} setup status`}>
        <span className={sideSetup.openingHandDrawn ? "poo-setup-check poo-setup-check-on" : "poo-setup-check"}>Draw 7</span>
        <span className={sideSetup.prizesSet ? "poo-setup-check poo-setup-check-on" : "poo-setup-check"}>Set prizes</span>
        <span className={sideSetup.ready ? "poo-setup-check poo-setup-check-on" : "poo-setup-check"}>Ready</span>
      </div>

      <button
        type="button"
        className="poo-ready-button"
        disabled={disabled}
        onClick={() => actionBridge.send({ type: "READY_SETUP_SIDE", sideId })}
        title={canControlSide ? "Draw 7, set prizes, and mark this side ready" : "Only this side's player can ready this side"}
      >
        {sideSetup.ready ? "Ready" : canControlSide ? "Ready: Draw 7 + Set Prizes" : "Waiting"}
      </button>
    </article>
  );
}

function labelSideForViewer(sideId, viewerSideId) {
  if (sideId === viewerSideId) {
    return "Your side";
  }
  return "Opponent side";
}

function normalizeSetup(setup = {}) {
  return {
    phase: setup.phase || "setup",
    prizeCount: clampPrizeCount(setup.prizeCount),
    currentTurnSideId: setup.currentTurnSideId || null,
    sides: {
      player: normalizeSide(setup.sides?.player),
      opponent: normalizeSide(setup.sides?.opponent),
    },
    coinFlip: setup.coinFlip || null,
  };
}

function normalizeSide(side = {}) {
  return {
    ready: Boolean(side.ready),
    openingHandDrawn: Boolean(side.openingHandDrawn),
    prizesSet: Boolean(side.prizesSet),
  };
}

function clampPrizeCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Math.max(1, Math.min(6, Number.isFinite(parsed) ? parsed : 6));
}
