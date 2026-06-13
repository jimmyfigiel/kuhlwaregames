// src/games/pokemon-only-one/components/BattleScreen.jsx

import React from "react";
import { ActivePokemon } from "./cardSlots.jsx";
import { BenchRow } from "./BenchRow.jsx";
import { PrizeGrid } from "./PrizeGrid.jsx";
import { SideIndicators } from "./SideIndicators.jsx";

export function BattleScreen({ model, actionBridge }) {
  const opponent = model.playerSides?.opponent;
  const player = model.playerSides?.player;

  return (
    <main className="poo-battle-screen" aria-label="Pokémon battle screen">
      <BenchRow title="Opponent bench" model={model} zoneIds={opponent?.benchZoneIds || []} actionBridge={actionBridge} side="opponent" />

      <section className="poo-main-row poo-opponent-main" aria-label="Opponent play area">
        <SideIndicators model={model} side={opponent} order={["hand", "discard", "deck"]} align="left" actionBridge={actionBridge} />
        <ActivePokemon model={model} zoneId={opponent?.activeZoneId} actionBridge={actionBridge} side="opponent" />
        <PrizeGrid model={model} zoneIds={opponent?.prizeZoneIds || []} side="opponent" />
      </section>

      <section className="poo-main-row poo-player-main" aria-label="Player play area">
        <PrizeGrid model={model} zoneIds={player?.prizeZoneIds || []} side="player" />
        <ActivePokemon model={model} zoneId={player?.activeZoneId} actionBridge={actionBridge} side="player" />
        <SideIndicators model={model} side={player} order={["deck", "discard", "hand"]} align="right" actionBridge={actionBridge} />
      </section>

      <BenchRow title="Player bench" model={model} zoneIds={player?.benchZoneIds || []} actionBridge={actionBridge} side="player" />
    </main>
  );
}
