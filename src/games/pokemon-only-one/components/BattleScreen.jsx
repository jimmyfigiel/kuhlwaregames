// src/games/pokemon-only-one/components/BattleScreen.jsx

import React from "react";
import { ActivePokemon } from "./cardSlots.jsx";
import { BenchRow } from "./BenchRow.jsx";
import { PrizeGrid } from "./PrizeGrid.jsx";
import { SideIndicators } from "./SideIndicators.jsx";
import { getSideDisplayName } from "../view/viewModel.js";

export function BattleScreen({ model, actionBridge, localPlacement }) {
  const viewerSideId = actionBridge?.viewerSideId === "opponent" ? "opponent" : "player";
  const ownSideId = viewerSideId;
  const opponentSideId = ownSideId === "player" ? "opponent" : "player";

  const topSideId = opponentSideId;
  const bottomSideId = ownSideId;
  const topSide = model.playerSides?.[topSideId];
  const bottomSide = model.playerSides?.[bottomSideId];

  return (
    <main className="poo-battle-screen" aria-label="Pokémon battle screen">
      <BattleSideBlock
        position="top"
        relationship="opponent"
        sideId={topSideId}
        side={topSide}
        model={model}
        actionBridge={actionBridge}
        localPlacement={localPlacement}
      />

      <BattleSideBlock
        position="bottom"
        relationship="self"
        sideId={bottomSideId}
        side={bottomSide}
        model={model}
        actionBridge={actionBridge}
        localPlacement={localPlacement}
      />
    </main>
  );
}

function BattleSideBlock({ position, relationship, sideId, side, model, actionBridge, localPlacement }) {
  const isTop = position === "top";
  const sideName = getSideDisplayName(model, sideId);
  const benchTitle = `${sideName} bench`;
  const playAreaLabel = `${sideName} play area`;
  const mainClassName = [
    "poo-main-row",
    `poo-${position}-main`,
    `poo-${relationship}-main`,
    `poo-${sideId}-main`,
  ].join(" ");

  const indicators = (
    <SideIndicators
      model={model}
      side={side}
      order={isTop ? ["hand", "discard", "deck"] : ["deck", "discard", "hand"]}
      align={isTop ? "left" : "right"}
      actionBridge={actionBridge}
    />
  );

  const activePokemon = (
    <ActivePokemon
      model={model}
      zoneId={side?.activeZoneId}
      actionBridge={actionBridge}
      localPlacement={localPlacement}
      side={sideId}
    />
  );

  const prizes = <PrizeGrid model={model} zoneIds={side?.prizeZoneIds || []} side={sideId} />;

  return (
    <>
      {isTop && (
        <BenchRow
          title={benchTitle}
          model={model}
          zoneIds={side?.benchZoneIds || []}
          actionBridge={actionBridge}
          localPlacement={localPlacement}
          side={sideId}
        />
      )}

      <section className={mainClassName} aria-label={playAreaLabel}>
        {isTop ? (
          <>
            {indicators}
            {activePokemon}
            {prizes}
          </>
        ) : (
          <>
            {prizes}
            {activePokemon}
            {indicators}
          </>
        )}
      </section>

      {!isTop && (
        <BenchRow
          title={benchTitle}
          model={model}
          zoneIds={side?.benchZoneIds || []}
          actionBridge={actionBridge}
          localPlacement={localPlacement}
          side={sideId}
        />
      )}
    </>
  );
}
