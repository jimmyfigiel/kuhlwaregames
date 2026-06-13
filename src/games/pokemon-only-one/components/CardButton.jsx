// src/games/pokemon-only-one/components/CardButton.jsx

import React from "react";
import { CardBack } from "./CardBack.jsx";

export function CardButton({ card, actionBridge, size }) {
  return (
    <button
      type="button"
      className={`poo-card-button poo-card-button-${size}`}
      disabled={!actionBridge.ready}
      onClick={() => actionBridge.send({ type: "OPEN_CARD_ZOOM", cardId: card.id })}
      aria-label={`Open zoom for ${card.name}`}
    >
      {card.imagePath ? <img src={card.imagePath} alt={card.name} /> : <CardBack />}
    </button>
  );
}
