// src/core/card/commands/moveCardToPlace.js

export const type = "MOVE_CARD_TO_PLACE";

export function run(state, command) {
  const { cardId, placeId } = command.params ?? {};
  if (!cardId) throw new Error("MOVE_CARD_TO_PLACE requires cardId.");
  if (!placeId) throw new Error("MOVE_CARD_TO_PLACE requires placeId.");

  const card = state.cards?.[cardId];
  const targetPlace = state.cardPlaces?.[placeId];

  if (!card) throw new Error(`Card ${cardId} does not exist.`);
  if (!targetPlace) throw new Error(`Card place ${placeId} does not exist.`);

  const sourcePlaceId = card.placeId;
  const sourcePlace = sourcePlaceId ? state.cardPlaces?.[sourcePlaceId] : null;

  const targetCardIdsWithoutMovedCard = (targetPlace.cardIds ?? []).filter((id) => id !== cardId);
  if (targetPlace.maxCards && targetCardIdsWithoutMovedCard.length >= targetPlace.maxCards) {
    throw new Error(`Card place ${placeId} is full.`);
  }

  const nextCardPlaces = { ...(state.cardPlaces ?? {}) };

  if (sourcePlace) {
    nextCardPlaces[sourcePlaceId] = {
      ...sourcePlace,
      cardIds: (sourcePlace.cardIds ?? []).filter((id) => id !== cardId),
    };
  }

  nextCardPlaces[placeId] = {
    ...targetPlace,
    cardIds: [...targetCardIdsWithoutMovedCard, cardId],
  };

  return {
    ...state,
    cardPlaces: nextCardPlaces,
    cards: {
      ...(state.cards ?? {}),
      [cardId]: {
        ...card,
        placeId,
      },
    },
  };
}
