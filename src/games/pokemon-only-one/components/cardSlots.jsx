// src/games/pokemon-only-one/components/cardSlots.jsx

import React from "react";
import { CardButton } from "./CardButton.jsx";
import { canPlaceLocalPokemonInZone, getFirstCardInZone } from "../view/viewRules.js";
import { getZoneDisplayName } from "../view/viewModel.js";

export function ActivePokemon({ model, zoneId, actionBridge, localPlacement, side }) {
  const zone = model.zones?.[zoneId];
  const card = getFirstCardInZone(model, zoneId);
  const label = zone ? getZoneDisplayName(model, zone) : `${side} active`;
  const canReceiveSelectedCard = canPlaceLocalPokemonInZone(model, zone, localPlacement, actionBridge.viewerSideId);

  return (
    <section className={`poo-active-slot poo-${side}-active`} aria-label={label} title={label}>
      {card ? (
        <CardButton model={model} card={card} actionBridge={actionBridge} size="active" />
      ) : canReceiveSelectedCard ? (
        <button
          type="button"
          className="poo-empty-active poo-empty-active-target"
          disabled={!actionBridge.ready}
          onClick={() =>
            localPlacement
              ? actionBridge.send({
                  type: "PLACE_POKEMON_FROM_HAND",
                  cardId: localPlacement.cardId,
                  sourceZoneId: localPlacement.sourceZoneId,
                  targetZoneId: zone.id,
                })
              : actionBridge.send({ type: "PLACE_SELECTED_POKEMON", targetZoneId: zone.id })
          }
          aria-label={`Place selected Pokémon in ${getZoneDisplayName(model, zone)}`}
        >
          Place Active
        </button>
      ) : (
        <div className="poo-empty-active">Active Pokémon</div>
      )}
    </section>
  );
}

export function SmallZone({ model, zoneId, actionBridge, localPlacement }) {
  const zone = model.zones?.[zoneId];
  const card = getFirstCardInZone(model, zoneId);
  const canReceiveSelectedCard = canPlaceLocalPokemonInZone(model, zone, localPlacement, actionBridge.viewerSideId);
  const label = zone ? getZoneDisplayName(model, zone) : zoneId;

  return (
    <section className="poo-small-zone" aria-label={label} title={label}>
      {card ? (
        <CardButton model={model} card={card} actionBridge={actionBridge} size="small" />
      ) : canReceiveSelectedCard ? (
        <button
          type="button"
          className="poo-empty-bench poo-empty-bench-target"
          disabled={!actionBridge.ready}
          onClick={() =>
            localPlacement
              ? actionBridge.send({
                  type: "PLACE_POKEMON_FROM_HAND",
                  cardId: localPlacement.cardId,
                  sourceZoneId: localPlacement.sourceZoneId,
                  targetZoneId: zone.id,
                })
              : actionBridge.send({ type: "PLACE_SELECTED_POKEMON", targetZoneId: zone.id })
          }
          aria-label={`Place selected Pokémon in ${getZoneDisplayName(model, zone)}`}
        >
          Place Here
        </button>
      ) : (
        <div className="poo-empty-bench" />
      )}
    </section>
  );
}
