// src/games/pokemon-only-one/components/CardBack.jsx

import React from "react";

const CARD_BACK_IMAGE_PATH = "/card-images/pokemon/card-back.svg";

export function CardBack({ label = "Face-down card" }) {
  return (
    <span className="poo-card-back" aria-label={label} role="img">
      <img src={CARD_BACK_IMAGE_PATH} alt="" aria-hidden="true" draggable="false" />
    </span>
  );
}
