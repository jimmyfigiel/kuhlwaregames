export function moveCard(state, cardId, x, y) {
  const card = state.cards[cardId];
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
  const card = state.cards[cardId];
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

export function setCardFace(state, cardId, faceUp) {
  const card = state.cards[cardId];
  if (!card) return state;

  return {
    ...state,
    cards: {
      ...state.cards,
      [cardId]: {
        ...card,
        faceUp,
      },
    },
  };
}

export function bringCardToTop(state, cardId) {
  const card = state.cards[cardId];
  if (!card) return state;

  const highestZIndex = Object.values(state.cards).reduce(
    (highest, currentCard) => Math.max(highest, currentCard.zIndex || 0),
    0
  );

  return {
    ...state,
    cards: {
      ...state.cards,
      [cardId]: {
        ...card,
        zIndex: highestZIndex + 1,
      },
    },
  };
}
