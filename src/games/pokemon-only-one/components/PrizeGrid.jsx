// src/games/pokemon-only-one/components/PrizeGrid.jsx

import React from "react";
import { getSideDisplayName, getZoneDisplayName } from "../view/viewModel.js";

export function PrizeGrid({ model, zoneIds, side }) {
  const sideName = getSideDisplayName(model, side);

  return (
    <section className={`poo-prize-grid poo-${side}-prizes`} aria-label={`${sideName} prizes`}>
      {zoneIds.map((zoneId) => {
        const zone = model.zones?.[zoneId];
        const zoneName = zone ? getZoneDisplayName(model, zone) : zoneId;
        const hasPrize = Boolean(zone?.cardIds?.length);
        return (
          <div
            key={zoneId}
            className={hasPrize ? "poo-prize-card" : "poo-prize-card poo-prize-card-empty"}
            title={`${zoneName}${hasPrize ? `: ${zone.cardIds.length} card` : ": empty"}`}
          />
        );
      })}
    </section>
  );
}
