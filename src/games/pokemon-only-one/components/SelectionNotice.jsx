// src/games/pokemon-only-one/components/SelectionNotice.jsx

import React from "react";
import { shouldViewerSeeSelection } from "../view/viewRules.js";
import { getSideDisplayName } from "../view/viewModel.js";

export function SelectionNotice({ model, actionBridge }) {
  const selection = model.display?.selection || null;
  const card = selection?.cardId ? model.cards?.[selection.cardId] : null;
  const sourceZone = selection?.sourceZoneId ? model.zones?.[selection.sourceZoneId] : null;

  if (!selection || !card || !shouldViewerSeeSelection(model, selection, actionBridge.viewerSideId)) {
    return null;
  }

  const sideId = sourceZone?.ownerId === "opponent" ? "opponent" : "player";
  const sideName = getSideDisplayName(model, sideId);

  return (
    <section className="poo-selection-notice" aria-live="polite">
      <strong>{card.name}</strong> selected from {sideName}'s hand. Click {sideName}'s empty Active slot or an empty Bench slot to place it.
      <button type="button" disabled={!actionBridge.ready} onClick={() => actionBridge.send({ type: "CLEAR_SELECTION" })}>
        Cancel
      </button>
    </section>
  );
}
