// src/games/pokemon-only-one/components/BenchRow.jsx

import React from "react";
import { SmallZone } from "./cardSlots.jsx";

export function BenchRow({ title, model, zoneIds, actionBridge, localPlacement, side }) {
  return (
    <section className={`poo-bench-row poo-${side}-bench`} aria-label={title}>
      {zoneIds.map((zoneId) => (
        <SmallZone key={zoneId} model={model} zoneId={zoneId} actionBridge={actionBridge} localPlacement={localPlacement} />
      ))}
    </section>
  );
}
