// src/games/pokemon-only-one/components/SetupPanel.jsx

import React from "react";
import { canViewerControlSide, isOnePlayerTestMode } from "../view/viewRules.js";
import { getSideDisplayName, getViewerRelationshipLabel } from "../view/viewModel.js";

const PRIZE_COUNTS = [1, 2, 3, 4, 5, 6];

export function SetupPanel({ model, actionBridge }) {
  const setup = normalizeSetup(model.setup);
  const viewerSideId = actionBridge.viewerSideId === "opponent" ? "opponent" : "player";
  const ownSideId = viewerSideId;
  const opponentSideId = ownSideId === "player" ? "opponent" : "player";
  const sideOrder = isOnePlayerTestMode(model) ? ["player", "opponent"] : [opponentSideId, ownSideId];
  const canChangePrizeCount = setup.phase === "setup" && !setup.sides.player.ready && !setup.sides.opponent.ready;

  return (
    <section className="poo-setup-panel" aria-label="Setup phase">
      <div className="poo-setup-header">
        <div>
          <h2>{setup.phase === "turn" ? "Game Started" : "Pregame Setup"}</h2>
          <p>{getSetupStepText(model, setup, viewerSideId)}</p>
        </div>
        <div className="poo-prize-selector" aria-label="Prize count">
          <span>Prizes</span>
          <div className="poo-prize-buttons">
            {PRIZE_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                className={count === setup.prizeCount ? "poo-prize-count-button poo-prize-count-button-active" : "poo-prize-count-button"}
                disabled={!actionBridge.ready || !canChangePrizeCount || setup.step !== "coinFlip"}
                onClick={() => actionBridge.send({ type: "SET_PRIZE_COUNT", prizeCount: count })}
                aria-pressed={count === setup.prizeCount}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {setup.phase === "setup" && setup.step === "coinFlip" && (
        <div className="poo-setup-actions">
          <button
            type="button"
            className="poo-ready-button"
            disabled={!actionBridge.ready}
            onClick={() => actionBridge.send({ type: "FLIP_SETUP_COIN" })}
          >
            Flip coin
          </button>
        </div>
      )}

      {setup.phase === "setup" && setup.step === "chooseFirstPlayer" && (
        <ChooseFirstPlayerPanel model={model} setup={setup} actionBridge={actionBridge} viewerSideId={viewerSideId} />
      )}

      <div className="poo-setup-sides">
        {sideOrder.map((sideId) => (
          <SetupSideStatus key={sideId} model={model} setup={setup} sideId={sideId} actionBridge={actionBridge} viewerSideId={viewerSideId} />
        ))}
      </div>

      {setup.phase === "turn" && setup.currentTurnSideId && (
        <div className="poo-setup-result" aria-live="polite">
          {getSideDisplayName(model, setup.currentTurnSideId)} goes first.
        </div>
      )}
    </section>
  );
}

function ChooseFirstPlayerPanel({ model, setup, actionBridge, viewerSideId }) {
  const winnerSideId = setup.coinFlip?.winnerSideId || "player";
  const winnerName = getSideDisplayName(model, winnerSideId);
  const canChoose = canViewerControlSide(model, viewerSideId, winnerSideId);

  return (
    <div className="poo-setup-result" aria-live="polite">
      <strong>{winnerName} won the coin flip.</strong>
      <span> Choose who goes first.</span>
      {canChoose ? (
        <div className="poo-setup-actions">
          <button
            type="button"
            className="poo-ready-button"
            disabled={!actionBridge.ready}
            onClick={() => actionBridge.send({ type: "CHOOSE_FIRST_PLAYER", firstPlayerSideId: "player" })}
          >
            {getSideDisplayName(model, "player")} goes first
          </button>
          <button
            type="button"
            className="poo-ready-button"
            disabled={!actionBridge.ready}
            onClick={() => actionBridge.send({ type: "CHOOSE_FIRST_PLAYER", firstPlayerSideId: "opponent" })}
          >
            {getSideDisplayName(model, "opponent")} goes first
          </button>
        </div>
      ) : (
        <p>Waiting for {winnerName} to choose.</p>
      )}
    </div>
  );
}

function SetupSideStatus({ model, setup, sideId, actionBridge, viewerSideId }) {
  const side = model.playerSides?.[sideId] || { name: sideId };
  const sideSetup = setup.sides[sideId] || normalizeSide();
  const canControlSide = canViewerControlSide(model, viewerSideId, sideId);
  const handCount = model.zones?.[side.handZoneId]?.cardIds?.length || 0;
  const prizeCount = (side.prizeZoneIds || []).reduce((total, zoneId) => total + (model.zones?.[zoneId]?.cardIds?.length || 0), 0);
  const deckCount = model.zones?.[side.deckZoneId]?.cardIds?.length || 0;
  const activeCount = model.zones?.[side.activeZoneId]?.cardIds?.length || 0;
  const disabled = !actionBridge.ready || !canControlSide || sideSetup.ready || setup.phase !== "setup" || !["placePokemon", "readyToReveal"].includes(setup.step);
  const sideName = getSideDisplayName(model, sideId);
  const relationshipLabel = getViewerRelationshipLabel(model, sideId, viewerSideId);
  const mulliganDisabled = !actionBridge.ready || !canControlSide || setup.step !== "mulligan" || !sideSetup.needsMulligan;

  return (
    <article className={sideSetup.ready ? "poo-setup-side poo-setup-side-ready" : "poo-setup-side"}>
      <div>
        <h3>{sideName}</h3>
        <p>{relationshipLabel}</p>
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

      <div className="poo-setup-checks" aria-label={`${sideName} setup status`}>
        <span className={sideSetup.openingHandDrawn ? "poo-setup-check poo-setup-check-on" : "poo-setup-check"}>Draw 7</span>
        <span className={sideSetup.hasBasicInHand ? "poo-setup-check poo-setup-check-on" : "poo-setup-check"}>Basic in hand</span>
        <span className={activeCount > 0 ? "poo-setup-check poo-setup-check-on" : "poo-setup-check"}>Active placed</span>
        <span className={sideSetup.prizesSet ? "poo-setup-check poo-setup-check-on" : "poo-setup-check"}>Prizes set</span>
        <span className={sideSetup.ready ? "poo-setup-check poo-setup-check-on" : "poo-setup-check"}>Ready</span>
      </div>

      {sideSetup.needsMulligan && (
        <div className="poo-zone-message">
          <p>No Basic Pokémon. Reveal your hand, shuffle it back into your deck, and draw 7 again.</p>
          <button
            type="button"
            className="poo-popup-action-button"
            disabled={mulliganDisabled}
            onClick={() => actionBridge.send({ type: "MULLIGAN_SETUP_SIDE", sideId })}
          >
            Take mulligan
          </button>
        </div>
      )}

      <button
        type="button"
        className="poo-ready-button"
        disabled={disabled || activeCount === 0}
        onClick={() => actionBridge.send({ type: "READY_SETUP_SIDE", sideId })}
        title={canControlSide ? "Set prizes and mark this side ready to reveal" : `${sideName} must ready this side`}
      >
        {sideSetup.ready ? "Ready" : canControlSide ? "Ready: Set Prizes" : `Waiting for ${sideName}`}
      </button>
    </article>
  );
}

function getSetupStepText(model, setup, viewerSideId) {
  if (setup.phase === "turn") {
    return `${getSideDisplayName(model, setup.currentTurnSideId)} starts the game.`;
  }

  if (setup.step === "coinFlip") {
    return "Flip a coin. The winner chooses which player goes first.";
  }

  if (setup.step === "chooseFirstPlayer") {
    const winnerSideId = setup.coinFlip?.winnerSideId || "player";
    const winnerName = getSideDisplayName(model, winnerSideId);
    return canViewerControlSide(model, viewerSideId, winnerSideId)
      ? "You won the coin flip. Choose who goes first."
      : `Waiting for ${winnerName} to choose who goes first.`;
  }

  if (setup.step === "mulligan") {
    return "A player has no Basic Pokémon. Mulligan before setup can continue.";
  }

  if (setup.step === "placePokemon") {
    return "Choose one Basic Pokémon as your face-down Active Pokémon, then place up to 5 Basic Pokémon face down on your Bench.";
  }

  if (setup.step === "readyToReveal") {
    return "Ready when your face-down Active Pokémon is placed. Ready will set your Prize cards.";
  }

  return "Complete setup.";
}

function normalizeSetup(setup = {}) {
  return {
    phase: setup.phase || "setup",
    step: setup.step || (setup.phase === "turn" ? "turn" : "coinFlip"),
    prizeCount: clampPrizeCount(setup.prizeCount),
    firstPlayerSideId: setup.firstPlayerSideId || null,
    currentTurnSideId: setup.currentTurnSideId || setup.firstPlayerSideId || null,
    pokemonRevealed: Boolean(setup.pokemonRevealed),
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
    mulliganCount: Number.isFinite(Number(side.mulliganCount)) ? Number(side.mulliganCount) : 0,
    hasBasicInHand: Boolean(side.hasBasicInHand),
    needsMulligan: Boolean(side.needsMulligan),
    activePlaced: Boolean(side.activePlaced),
  };
}

function clampPrizeCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Math.max(1, Math.min(6, Number.isFinite(parsed) ? parsed : 6));
}
