// src/games/pokemon-only-one/components/SelectionNotice.jsx

import React from "react";

export function SelectionNotice({ model, actionBridge }) {
  const selection = model.display?.selection || null;
  const card = selection?.cardId ? model.cards?.[selection.cardId] : null;
  const sourceZone = selection?.sourceZoneId ? model.zones?.[selection.sourceZoneId] : null;

  if (!selection || !card) {
    return null;
  }

  const sideName = sourceZone?.ownerId === "opponent" ? "opponent" : "player";

  return (
    <section className="poo-selection-notice" aria-live="polite">
      <strong>{card.name}</strong> selected from the {sideName} hand. Click the empty {sideName} Active slot or an empty {sideName} Bench slot to place it.
      <button type="button" disabled={!actionBridge.ready} onClick={() => actionBridge.send({ type: "CLEAR_SELECTION" })}>
        Cancel
      </button>
    </section>
  );
}
