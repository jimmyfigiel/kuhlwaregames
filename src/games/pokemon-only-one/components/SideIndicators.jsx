// src/games/pokemon-only-one/components/SideIndicators.jsx

import React from "react";
import { canViewerControlZone } from "../view/viewRules.js";

export function SideIndicators({ model, side, order, align, actionBridge }) {
  if (!side) {
    return <section className={`poo-indicators poo-indicators-${align}`} />;
  }

  const viewerSideId = actionBridge.viewerSideId;
  const values = {
    hand: { label: "HAND", zoneId: side.handZoneId, icon: "hand" },
    discard: { label: "DISCARD", zoneId: side.discardZoneId, icon: "discard" },
    deck: { label: "DECK", zoneId: side.deckZoneId, icon: "deck" },
  };

  return (
    <section className={`poo-indicators poo-indicators-${align}`} aria-label={`${side.name} card zones`}>
      {order.map((key) => {
        const item = values[key];
        const zone = model.zones?.[item.zoneId];
        const count = zone?.cardIds?.length || 0;
        const canControl = canViewerControlZone(model, zone, viewerSideId);
        const action =
          key === "deck"
            ? { type: "DRAW_CARD", deckZoneId: item.zoneId }
            : { type: "OPEN_ZONE_POPUP", zoneId: item.zoneId };
        const actionLabel = key === "deck" ? `Draw from ${zone?.name || item.label}` : `Open ${zone?.name || item.label}`;
        const disabled = !actionBridge.ready || !zone || (key === "deck" && !canControl);
        const title = key === "deck" && !canControl ? `${zone?.name || item.label} is controlled by ${zone?.ownerId}.` : actionLabel;

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
