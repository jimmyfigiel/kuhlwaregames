// src/games/pokemon-only-one/components/CardButton.jsx

import React from "react";
import { CardBack } from "./CardBack.jsx";
import { canViewerSeeCardFace } from "../view/viewRules.js";

export function CardButton({ model, card, actionBridge, size }) {
  const canSeeFace = canViewerSeeCardFace(model, actionBridge.viewerSideId, card.id);
  const label = canSeeFace ? `Open zoom for ${card.name}` : "Hidden Pokémon";

  return (
    <button
      type="button"
      className={`poo-card-button poo-card-button-${size}`}
      disabled={!actionBridge.ready || !canSeeFace}
      onClick={() => actionBridge.send({ type: "OPEN_CARD_ZOOM", cardId: card.id })}
      aria-label={label}
      title={label}
    >
      {canSeeFace && card.imagePath ? <img src={card.imagePath} alt={card.name} /> : <CardBack />}
    </button>
  );
}
