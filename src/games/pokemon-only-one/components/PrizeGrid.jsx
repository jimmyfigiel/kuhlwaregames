// src/games/pokemon-only-one/components/PrizeGrid.jsx

import React from "react";

export function PrizeGrid({ model, zoneIds, side }) {
  return (
    <section className={`poo-prize-grid poo-${side}-prizes`} aria-label={`${side} prizes`}>
      {zoneIds.map((zoneId) => {
        const zone = model.zones?.[zoneId];
        const hasPrize = Boolean(zone?.cardIds?.length);
        return (
          <div
            key={zoneId}
            className={hasPrize ? "poo-prize-card" : "poo-prize-card poo-prize-card-empty"}
            title={`${zone?.name || zoneId}${hasPrize ? `: ${zone.cardIds.length} card` : ": empty"}`}
          />
        );
      })}
    </section>
  );
}
