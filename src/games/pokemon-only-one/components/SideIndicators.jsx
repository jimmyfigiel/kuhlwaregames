// src/games/pokemon-only-one/components/SideIndicators.jsx

import React from "react";
import {
  canViewerControlZone,
  canViewerInspectZone,
  canViewerTakeTurnForZone,
  getCurrentTurnSideId,
  isTurnPhase,
} from "../view/viewRules.js";
import { getSideDisplayName, getZoneDisplayName } from "../view/viewModel.js";

export function SideIndicators({ model, side, order, align, actionBridge }) {
  if (!side) {
    return <section className={`poo-indicators poo-indicators-${align}`} />;
  }

  const viewerSideId = actionBridge.viewerSideId;
  const sideName = getSideDisplayName(model, side.id);
  const values = {
    hand: { label: "HAND", zoneId: side.handZoneId, icon: "hand" },
    discard: { label: "DISCARD", zoneId: side.discardZoneId, icon: "discard" },
    deck: { label: "DECK", zoneId: side.deckZoneId, icon: "deck" },
  };

  return (
    <section className={`poo-indicators poo-indicators-${align}`} aria-label={`${sideName} card zones`}>
      {order.map((key) => {
        const item = values[key];
        const zone = model.zones?.[item.zoneId];
        const count = zone?.cardIds?.length || 0;
        const canControl = canViewerControlZone(model, zone, viewerSideId);
        const canInspect = canViewerInspectZone(model, zone, viewerSideId);
        const canTakeTurn = canViewerTakeTurnForZone(model, viewerSideId, zone);
        const action =
          key === "deck"
            ? { type: "DRAW_CARD", deckZoneId: item.zoneId }
            : { type: "OPEN_ZONE_POPUP", zoneId: item.zoneId };
        const zoneName = zone ? getZoneDisplayName(model, zone) : item.label;
        const actionLabel = key === "deck" ? `Draw from ${zoneName}` : `Open ${zoneName}`;
        const currentTurnSideId = getCurrentTurnSideId(model);
        const turnLabel = currentTurnSideId ? `${getSideDisplayName(model, currentTurnSideId)}'s turn` : "Waiting for turn order";
        const disabled = !actionBridge.ready || !zone || !canInspect || (key === "deck" && !canTakeTurn);
        const title =
          !canInspect
            ? `${zoneName} can only be opened by ${getSideDisplayName(model, zone?.ownerId)}.`
            : key !== "deck"
              ? actionLabel
              : !canControl
                ? `${zoneName} is controlled by ${getSideDisplayName(model, zone?.ownerId)}.`
                : !isTurnPhase(model)
                  ? "Cards can be drawn after setup is complete."
                  : !canTakeTurn
                    ? `Only ${turnLabel} can draw.`
                    : actionLabel;

        return (
          <button
            key={key}
            type="button"
            className="poo-indicator-row"
            disabled={disabled}
            onClick={() => actionBridge.send(action)}
            aria-label={actionLabel}
            title={title}
          >
            <IndicatorIcon type={item.icon} />
            <span className="poo-indicator-label">{item.label}</span>
            <span className="poo-indicator-count">× {count}</span>
          </button>
        );
      })}
    </section>
  );
}

function IndicatorIcon({ type }) {
  if (type === "hand") {
    return <span className="poo-hand-icon" aria-hidden="true" />;
  }

  return <span className={`poo-stack-icon poo-stack-icon-${type}`} aria-hidden="true" />;
}
