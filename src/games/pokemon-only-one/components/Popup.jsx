// src/games/pokemon-only-one/components/Popup.jsx

import React from "react";
import { CardBack } from "./CardBack.jsx";
import {
  canViewerControlZone,
  canViewerModifyZone,
  canViewerSeeZoneFaces,
  canViewerTakeTurnForZone,
  getCurrentTurnSideId,
  isTurnPhase,
  findFirstEmptyBenchZoneId,
  getActiveZoneIdForSide,
  isBasicPokemonCard,
  isPokemonCard,
} from "../view/viewRules.js";
import { getSideDisplayName, getZoneDisplayName } from "../view/viewModel.js";

export function Popup({ model, popup, actionBridge, playerSlot }) {
  if (popup.type === "CARD_ZOOM") {
    return <CardZoomPopup model={model} cardId={popup.cardId} actionBridge={actionBridge} />;
  }

  if (popup.type === "ZONE_POPUP") {
    return <ZonePopup model={model} zoneId={popup.zoneId} actionBridge={actionBridge} playerSlot={playerSlot} />;
  }

  if (popup.type === "COIN_FLIP") {
    return <CoinFlipPopup model={model} coinFlip={popup.coinFlip || model.setup?.coinFlip} actionBridge={actionBridge} />;
  }

  return null;
}

function CardZoomPopup({ model, cardId, actionBridge }) {
  const card = model.cards?.[cardId];
  if (!card) {
    return null;
  }

  return (
    <div className="poo-popup-backdrop" onClick={() => actionBridge.send({ type: "CLOSE_POPUP" })}>
      <button
        type="button"
        className="poo-zoom-card"
        onClick={(event) => {
          event.stopPropagation();
          actionBridge.send({ type: "CLOSE_POPUP" });
        }}
        aria-label={`Close zoom for ${card.name}`}
      >
        {card.imagePath ? <img src={card.imagePath} alt={card.name} /> : <CardBack />}
      </button>
    </div>
  );
}

function CoinFlipPopup({ model, coinFlip, actionBridge }) {
  const winnerSideId = coinFlip?.winnerSideId || coinFlip?.resultSideId || null;
  const firstPlayerSideId = model.setup?.firstPlayerSideId || model.setup?.currentTurnSideId || null;
  const viewerSideId = actionBridge.viewerSideId === "opponent" ? "opponent" : "player";
  const faceLabel = coinFlip?.coinFace === "tails" ? "Tails" : "Heads";
  const winnerName = getSideDisplayName(model, winnerSideId);
  const headsName = getSideDisplayName(model, "player");
  const tailsName = getSideDisplayName(model, "opponent");
  const canChoose = winnerSideId === viewerSideId || model.settings?.playMode === "onePlayerTest";

  return (
    <div className="poo-popup-backdrop" onClick={() => actionBridge.send({ type: "CLOSE_POPUP" })}>
      <section
        className="poo-coin-popup"
        onClick={(event) => {
          event.stopPropagation();
        }}
        aria-label="Coin flip result"
      >
        <div className="poo-zone-popup-header">
          <div>
            <h2>Coin Flip</h2>
            <p>Heads = {headsName} · Tails = {tailsName}</p>
          </div>
          <button type="button" onClick={() => actionBridge.send({ type: "CLOSE_POPUP" })}>
            Close
          </button>
        </div>

        <div className="poo-coin-stage" aria-hidden="true">
          <div className={coinFlip?.coinFace === "tails" ? "poo-coin poo-coin-tails" : "poo-coin poo-coin-heads"}>
            <span className="poo-coin-face poo-coin-face-front">H</span>
            <span className="poo-coin-face poo-coin-face-back">T</span>
          </div>
        </div>

        <div className="poo-coin-result" aria-live="polite">
          <strong>{faceLabel}</strong>
          <span>{winnerName} wins the flip.</span>
          {firstPlayerSideId ? (
            <b>{getSideDisplayName(model, firstPlayerSideId)} goes first.</b>
          ) : canChoose ? (
            <div className="poo-popup-card-actions">
              <button
                type="button"
                className="poo-popup-card-action-button"
                disabled={!actionBridge.ready}
                onClick={() => actionBridge.send({ type: "CHOOSE_FIRST_PLAYER", firstPlayerSideId: "player" })}
              >
                {getSideDisplayName(model, "player")} goes first
              </button>
              <button
                type="button"
                className="poo-popup-card-action-button"
                disabled={!actionBridge.ready}
                onClick={() => actionBridge.send({ type: "CHOOSE_FIRST_PLAYER", firstPlayerSideId: "opponent" })}
              >
                {getSideDisplayName(model, "opponent")} goes first
              </button>
            </div>
          ) : (
            <b>Waiting for {winnerName} to choose who goes first.</b>
          )}
        </div>
      </section>
    </div>
  );
}

function ZonePopup({ model, zoneId, actionBridge, playerSlot }) {
  const zone = model.zones?.[zoneId];
  if (!zone) {
    return null;
  }

  return (
    <div className="poo-popup-backdrop" onClick={() => actionBridge.send({ type: "CLOSE_POPUP" })}>
      <section
        className="poo-zone-popup"
        onClick={(event) => {
          event.stopPropagation();
        }}
        aria-label={getZoneDisplayName(model, zone)}
      >
        <div className="poo-zone-popup-header">
          <div>
            <h2>{getZoneDisplayName(model, zone)}</h2>
            <p>
              {zone.zoneKind} · {zone.cardIds?.length || 0} card{zone.cardIds?.length === 1 ? "" : "s"}
            </p>
          </div>
          <button type="button" onClick={() => actionBridge.send({ type: "CLOSE_POPUP" })}>
            Close
          </button>
        </div>
        <ZonePopupContents model={model} zone={zone} actionBridge={actionBridge} playerSlot={playerSlot} />
      </section>
    </div>
  );
}

function ZonePopupContents({ model, zone, actionBridge, playerSlot }) {
  const viewerSideId = actionBridge.viewerSideId;
  const canControlZone = canViewerControlZone(model, zone, viewerSideId);
  const canSeeFaces = canViewerSeeZoneFaces(model, viewerSideId, zone);
  const cards = (zone.cardIds || []).map((cardId) => model.cards?.[cardId]).filter(Boolean);

  if (zone.zoneKind === "deck") {
    return <DeckContents model={model} zone={zone} actionBridge={actionBridge} canControlZone={canControlZone} />;
  }

  if (!canSeeFaces) {
    return <HiddenCardGrid cards={cards} />;
  }

  if (cards.length === 0) {
    return <div className="poo-zone-message">This zone is empty.</div>;
  }

  return (
    <div className="poo-popup-card-grid">
      {cards.map((card) => (
        <HandCardTile key={card.id} model={model} zone={zone} card={card} actionBridge={actionBridge} playerSlot={playerSlot} />
      ))}
    </div>
  );
}

function DeckContents({ model, zone, actionBridge, canControlZone }) {
  const canTakeTurn = canViewerTakeTurnForZone(model, actionBridge.viewerSideId, zone);
  const currentTurnSideId = getCurrentTurnSideId(model);
  const currentTurnName = currentTurnSideId ? getSideDisplayName(model, currentTurnSideId) : "the starting player";
  const buttonLabel = !canControlZone
    ? `${getSideDisplayName(model, zone.ownerId)} controls this deck`
    : !isTurnPhase(model)
      ? "Draw after setup"
      : !canTakeTurn
        ? `Waiting for ${currentTurnName}`
        : "Draw one card";

  return (
    <div className="poo-zone-message">
      <CardBack />
      <p>The deck is hidden. Only the card count is shown.</p>
      <button
        type="button"
        className="poo-popup-action-button"
        disabled={!actionBridge.ready || !canTakeTurn || (zone.cardIds || []).length === 0}
        onClick={() => actionBridge.send({ type: "DRAW_CARD", deckZoneId: zone.id })}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function HiddenCardGrid({ cards }) {
  return (
    <div className="poo-popup-card-grid">
      {cards.map((card) => (
        <div key={card.id} className="poo-popup-card-back" title="Hidden card">
          <CardBack />
        </div>
      ))}
    </div>
  );
}

function HandCardTile({ model, zone, card, actionBridge, playerSlot }) {
  const viewerSideId = actionBridge.viewerSideId;
  const canControlZone = canViewerControlZone(model, zone, viewerSideId);
  const canModifyZone = canViewerModifyZone(model, viewerSideId, zone);
  const setupPhase = model.setup?.phase === "setup";
  const canPlacePokemon = zone.zoneKind === "hand" && (setupPhase ? isBasicPokemonCard(card) : isPokemonCard(card)) && canControlZone && canModifyZone;
  const activeZoneId = canPlacePokemon ? getActiveZoneIdForSide(model, zone.ownerId) : null;
  const activeZone = activeZoneId ? model.zones?.[activeZoneId] || null : null;
  const canPlaceActive = Boolean(activeZone && (activeZone.cardIds || []).length === 0);
  const hasEmptyBench = Boolean(canPlacePokemon && findFirstEmptyBenchZoneId(model, zone.ownerId));

  return (
    <article className={canPlacePokemon ? "poo-popup-card-tile poo-popup-card-tile-placeable" : "poo-popup-card-tile"}>
      <button
        type="button"
        className="poo-popup-card-figure"
        onClick={() => actionBridge.send({ type: "OPEN_CARD_ZOOM", cardId: card.id })}
        aria-label={`Zoom ${card.name}`}
        title={`Zoom ${card.name}`}
      >
        {card.imagePath ? <img src={card.imagePath} alt={card.name} /> : <CardBack />}
      </button>

      <div className="poo-popup-card-name">{card.name}</div>

      {canPlacePokemon && (
        <div className="poo-popup-card-actions">
          <button
            type="button"
            className="poo-popup-card-action-button"
            disabled={!actionBridge.ready || !canPlaceActive}
            onClick={() =>
              actionBridge.send({
                type: "PLACE_POKEMON_FROM_HAND",
                cardId: card.id,
                sourceZoneId: zone.id,
                targetZoneId: activeZoneId,
              })
            }
            title={canPlaceActive ? `Make ${card.name} active` : `${activeZone?.name || "Active"} is full`}
          >
            Make Active
          </button>
          <button
            type="button"
            className="poo-popup-card-action-button"
            disabled={!actionBridge.ready || !hasEmptyBench}
            onClick={() => actionBridge.send({ type: "SELECT_POKEMON_FOR_PLACEMENT", cardId: card.id, sourceZoneId: zone.id })}
            title={hasEmptyBench ? `Choose an empty bench slot for ${card.name}` : "Bench is full"}
          >
            To Bench…
          </button>
        </div>
      )}
    </article>
  );
}
