// src/games/pokemon-only-one/components/cardSlots.jsx

import React from "react";
import { CardButton } from "./CardButton.jsx";
import { canPlaceSelectedPokemonInZone, getFirstCardInZone } from "../view/viewRules.js";

export function ActivePokemon({ model, zoneId, actionBridge, side }) {
  const zone = model.zones?.[zoneId];
  const card = getFirstCardInZone(model, zoneId);
  const label = zone?.name || `${side} active`;
  const canReceiveSelectedCard = canPlaceSelectedPokemonInZone(model, zone, actionBridge);

  return (
    <section className={`poo-active-slot poo-${side}-active`} aria-label={label} title={label}>
      {card ? (
        <CardButton card={card} actionBridge={actionBridge} size="active" />
      ) : canReceiveSelectedCard ? (
        <button
          type="button"
          className="poo-empty-active poo-empty-active-target"
          disabled={!actionBridge.ready}
          onClick={() => actionBridge.send({ type: "PLACE_SELECTED_POKEMON", targetZoneId: zone.id })}
          aria-label={`Place selected Pokémon in ${zone.name}`}
        >
          Place Active
        </button>
      ) : (
        <div className="poo-empty-active">Active Pokémon</div>
      )}
    </section>
  );
}

export function SmallZone({ model, zoneId, actionBridge }) {
  const zone = model.zones?.[zoneId];
  const card = getFirstCardInZone(model, zoneId);
  const canReceiveSelectedCard = canPlaceSelectedPokemonInZone(model, zone, actionBridge);

  return (
    <section className="poo-small-zone" aria-label={zone?.name || zoneId} title={zone?.name || zoneId}>
      {card ? (
        <CardButton card={card} actionBridge={actionBridge} size="small" />
      ) : canReceiveSelectedCard ? (
        <button
          type="button"
          className="poo-empty-bench poo-empty-bench-target"
          disabled={!actionBridge.ready}
          onClick={() => actionBridge.send({ type: "PLACE_SELECTED_POKEMON", targetZoneId: zone.id })}
          aria-label={`Place selected Pokémon in ${zone.name}`}
        >
          Place Here
        </button>
      ) : (
        <div className="poo-empty-bench" />
      )}
    </section>
  );
}
