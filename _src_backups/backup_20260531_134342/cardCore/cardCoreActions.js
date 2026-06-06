function getHighestZIndex(state) {
  const cardZ = Object.values(state.cards || {}).map((card) => card.zIndex || 0);
  const deckZ = Object.values(state.decks || {}).map((deck) => deck.zIndex || 0);
  return Math.max(0, ...cardZ, ...deckZ);
}

function removeObjectId(objectIds, objectId) {
  return objectIds.filter((currentObjectId) => currentObjectId !== objectId);
}

function addObjectId(objectIds, objectId) {
  if (objectIds.includes(objectId)) return objectIds;
  return [...objectIds, objectId];
}

function rebuildCardLinksForDeck(cards, cardIds) {
  const updatedCards = { ...cards };

  cardIds.forEach((cardId, index) => {
    const card = updatedCards[cardId];
    if (!card) return;

    updatedCards[cardId] = {
      ...card,
      cardBelowId: index > 0 ? cardIds[index - 1] : null,
      cardAboveId: index < cardIds.length - 1 ? cardIds[index + 1] : null,
    };
  });

  return updatedCards;
}

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

  const highestZIndex = getHighestZIndex(state);

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

export function drawTopCardFromDeck(state, deckId) {
  const deck = state.decks[deckId];
  if (!deck || deck.cardIds.length === 0) return { state, cardId: null };

  const nextCardIds = deck.cardIds.slice(0, -1);
  const topCardId = deck.cardIds[deck.cardIds.length - 1];
  const topCard = state.cards[topCardId];
  const area = state.areas[deck.areaId];
  if (!topCard || !area) return { state, cardId: null };

  const highestZIndex = getHighestZIndex(state);

  let nextCards = {
    ...state.cards,
    [topCardId]: {
      ...topCard,
      areaId: deck.areaId,
      x: deck.x,
      y: deck.y,
      zIndex: highestZIndex + 1,
      cardAboveId: null,
      cardBelowId: null,
    },
  };

  nextCards = rebuildCardLinksForDeck(nextCards, nextCardIds);

  const nextState = {
    ...state,
    areas: {
      ...state.areas,
      [area.id]: {
        ...area,
        objectIds: addObjectId(area.objectIds, topCardId),
      },
    },
    cards: nextCards,
    decks: {
      ...state.decks,
      [deckId]: {
        ...deck,
        cardIds: nextCardIds,
      },
    },
  };

  return { state: nextState, cardId: topCardId };
}

export function moveCardToDeck(state, cardId, deckId, { faceUp = true } = {}) {
  const card = state.cards[cardId];
  const deck = state.decks[deckId];
  if (!card || !deck) return state;

  const sourceArea = state.areas[card.areaId];

  const nextDeckCardIds = addObjectId(deck.cardIds, cardId);

  let nextCards = {
    ...state.cards,
    [cardId]: {
      ...card,
      areaId: deck.areaId,
      x: deck.x,
      y: deck.y,
      faceUp,
      zIndex: deck.zIndex + nextDeckCardIds.length,
    },
  };

  nextCards = rebuildCardLinksForDeck(nextCards, nextDeckCardIds);

  const nextAreas = { ...state.areas };
  if (sourceArea) {
    nextAreas[sourceArea.id] = {
      ...sourceArea,
      objectIds: removeObjectId(sourceArea.objectIds, cardId),
    };
  }

  return {
    ...state,
    areas: nextAreas,
    cards: nextCards,
    decks: {
      ...state.decks,
      [deckId]: {
        ...deck,
        cardIds: nextDeckCardIds,
      },
    },
  };
}
