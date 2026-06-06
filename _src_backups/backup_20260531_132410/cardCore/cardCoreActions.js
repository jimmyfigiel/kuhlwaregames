export function moveCard(state, cardId, x, y) {
  const card = state.cards?.[cardId];
  if (!card) return state;

  return {
    ...state,
    cards: {
      ...state.cards,
      [cardId]: {
        ...card,
        x,
        y,
      },
    },
  };
}

export function flipCard(state, cardId) {
  const card = state.cards?.[cardId];
  if (!card) return state;

  return {
    ...state,
    cards: {
      ...state.cards,
      [cardId]: {
        ...card,
        faceUp: !card.faceUp,
      },
    },
  };
}

export function moveCardToArea(state, cardId, areaId, x = 0, y = 0) {
  const card = state.cards?.[cardId];
  const targetArea = state.areas?.[areaId];
  if (!card || !targetArea) return state;

  const oldArea = state.areas?.[card.areaId];

  const updatedAreas = { ...state.areas };

  if (oldArea) {
    updatedAreas[oldArea.id] = {
      ...oldArea,
      objectIds: oldArea.objectIds.filter((objectId) => objectId !== cardId),
    };
  }

  updatedAreas[targetArea.id] = {
    ...updatedAreas[targetArea.id],
    objectIds: [...updatedAreas[targetArea.id].objectIds, cardId],
  };

  return {
    ...state,
    areas: updatedAreas,
    cards: {
      ...state.cards,
      [cardId]: {
        ...card,
        areaId,
        x,
        y,
      },
    },
  };
}
