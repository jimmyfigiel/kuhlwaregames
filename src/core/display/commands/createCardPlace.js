// src/core/display/commands/createCardPlace.js

export const type = "CREATE_CARD_PLACE";

export function run(state, command) {
  const { placeId, areaId, name, maxCards = 1 } = command.params ?? {};
  if (!placeId) throw new Error("CREATE_CARD_PLACE requires placeId.");
  if (!areaId) throw new Error("CREATE_CARD_PLACE requires areaId.");
  if (!state.areas?.[areaId]) throw new Error(`Cannot create place. Area ${areaId} does not exist.`);

  const area = state.areas[areaId];
  const placeIds = area.placeIds?.includes(placeId) ? area.placeIds : [...(area.placeIds ?? []), placeId];

  return {
    ...state,
    areas: {
      ...(state.areas ?? {}),
      [areaId]: {
        ...area,
        placeIds,
      },
    },
    cardPlaces: {
      ...(state.cardPlaces ?? {}),
      [placeId]: {
        id: placeId,
        areaId,
        name: name ?? placeId,
        maxCards,
        cardIds: [],
      },
    },
  };
}
