// src/games/pokemon-only-one/components/Popup.jsx

import React from "react";
import { CardBack } from "./CardBack.jsx";
import {
  canViewerControlZone,
  canViewerSeeZoneFaces,
  findFirstEmptyBenchZoneId,
  getActiveZoneIdForSide,
  isOnePlayerTestMode,
  isPokemonCard,
  playerSlotToSideId,
} from "../view/viewRules.js";

export function Popup({ model, popup, actionBridge, playerSlot }) {
  if (popup.type === "CARD_ZOOM") {
    return <CardZoomPopup model={model} cardId={popup.cardId} actionBridge={actionBridge} />;
  }

  if (popup.type === "ZONE_POPUP") {
    return <ZonePopup model={model} zoneId={popup.zoneId} actionBridge={actionBridge} playerSlot={playerSlot} />;
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
        aria-label={zone.name}
      >
        <div className="poo-zone-popup-header">
          <div>
            <h2>{zone.name}</h2>
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
  const viewerSideId = playerSlotToSideId(playerSlot);
  const onePlayerTestMode = isOnePlayerTestMode(model);
  const canControlZone = canViewerControlZone(model, zone, viewerSideId);
  const canSeeFaces = canViewerSeeZoneFaces(zone, viewerSideId, onePlayerTestMode);
  const cards = (zone.cardIds || []).map((cardId) => model.cards?.[cardId]).filter(Boolean);

  if (zone.zoneKind === "deck") {
    return <DeckContents zone={zone} actionBridge={actionBridge} canControlZone={canControlZone} />;
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

function DeckContents({ zone, actionBridge, canControlZone }) {
  return (
    <div className="poo-zone-message">
      <CardBack />
      <p>The deck is hidden. Only the card count is shown.</p>
      <button
        type="button"
        className="poo-popup-action-button"
        disabled={!actionBridge.ready || !canControlZone || (zone.cardIds || []).length === 0}
        onClick={() => actionBridge.send({ type: "DRAW_CARD", deckZoneId: zone.id })}
      >
        {canControlZone ? "Draw one card" : "Deck controlled by other side"}
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
  const viewerSideId = playerSlotToSideId(playerSlot);
  const canControlZone = canViewerControlZone(model, zone, viewerSideId);
  const canPlacePokemon = zone.zoneKind === "hand" && isPokemonCard(card) && canControlZone;
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
