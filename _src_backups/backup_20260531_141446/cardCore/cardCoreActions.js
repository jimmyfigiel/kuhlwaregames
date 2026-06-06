const HAND_CARD_TOP = 34;

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

function insertObjectId(objectIds, objectId, index) {
  const withoutObject = removeObjectId(objectIds, objectId);
  const safeIndex = Math.max(0, Math.min(index, withoutObject.length));
  return [
    ...withoutObject.slice(0, safeIndex),
    objectId,
    ...withoutObject.slice(safeIndex),
  ];
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

function shuffleArray(values) {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
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

  const topCardId = deck.cardIds[deck.cardIds.length - 1];
  return takeCardFromDeck(state, deckId, topCardId, {
    x: deck.x,
    y: deck.y,
    bringToTop: true,
  });
}

export function takeCardFromDeck(
  state,
  deckId,
  cardId,
  { x = null, y = null, faceUp = null, bringToTop = true } = {}
) {
  const deck = state.decks[deckId];
  const card = state.cards[cardId];
  const area = deck ? state.areas[deck.areaId] : null;

  if (!deck || !card || !area || !deck.cardIds.includes(cardId)) {
    return { state, cardId: null };
  }

  const nextDeckCardIds = deck.cardIds.filter((currentCardId) => currentCardId !== cardId);
  const highestZIndex = getHighestZIndex(state);

  let nextCards = {
    ...state.cards,
    [cardId]: {
      ...card,
      areaId: deck.areaId,
      x: x ?? card.x,
      y: y ?? card.y,
      faceUp: faceUp ?? card.faceUp,
      zIndex: bringToTop ? highestZIndex + 1 : card.zIndex,
      cardAboveId: null,
      cardBelowId: null,
    },
  };

  nextCards = rebuildCardLinksForDeck(nextCards, nextDeckCardIds);

  const nextState = {
    ...state,
    areas: {
      ...state.areas,
      [area.id]: {
        ...area,
        objectIds: addObjectId(area.objectIds, cardId),
      },
    },
    cards: nextCards,
    decks: {
      ...state.decks,
      [deckId]: {
        ...deck,
        cardIds: nextDeckCardIds,
      },
    },
  };

  return { state: nextState, cardId };
}

export function moveCardToDeck(
  state,
  cardId,
  deckId,
  { faceUp = true, index = null } = {}
) {
  const card = state.cards[cardId];
  const deck = state.decks[deckId];
  if (!card || !deck) return state;

  const sourceArea = state.areas[card.areaId];
  const targetIndex = index === null ? deck.cardIds.length : index;
  const nextDeckCardIds = insertObjectId(deck.cardIds, cardId, targetIndex);

  let nextCards = { ...state.cards };

  nextDeckCardIds.forEach((currentCardId, currentIndex) => {
    const currentCard = nextCards[currentCardId];
    if (!currentCard) return;

    nextCards[currentCardId] = {
      ...currentCard,
      areaId: deck.areaId,
      x: deck.x + (deck.role === "hand" ? currentIndex * (deck.cardSpacing || 46) : 0),
      y: deck.y + (deck.role === "hand" ? HAND_CARD_TOP : 0),
      faceUp,
      zIndex: deck.zIndex + currentIndex + 1,
    };
  });

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

export function reorderCardInDeck(state, deckId, cardId, index) {
  const deck = state.decks[deckId];
  if (!deck || !deck.cardIds.includes(cardId)) return state;

  return moveCardToDeck(state, cardId, deckId, {
    faceUp: state.cards[cardId]?.faceUp ?? true,
    index,
  });
}

export function shuffleDeck(state, deckId) {
  const deck = state.decks[deckId];
  if (!deck || deck.cardIds.length < 2) return state;

  const nextCardIds = shuffleArray(deck.cardIds);
  const nextCards = rebuildCardLinksForDeck(state.cards, nextCardIds);

  return {
    ...state,
    cards: nextCards,
    decks: {
      ...state.decks,
      [deckId]: {
        ...deck,
        cardIds: nextCardIds,
      },
    },
  };
}

export function putDiscardOnBottomOfDeck(state, discardDeckId, drawDeckId) {
  const discardDeck = state.decks[discardDeckId];
  const drawDeck = state.decks[drawDeckId];

  if (!discardDeck || !drawDeck || discardDeck.cardIds.length === 0) {
    return state;
  }

  const nextDrawCardIds = [...discardDeck.cardIds, ...drawDeck.cardIds];
  const highestZIndex = getHighestZIndex(state);

  let nextCards = { ...state.cards };

  nextDrawCardIds.forEach((cardId, index) => {
    const card = nextCards[cardId];
    if (!card) return;

    nextCards[cardId] = {
      ...card,
      areaId: drawDeck.areaId,
      x: drawDeck.x,
      y: drawDeck.y,
      faceUp: false,
      zIndex: drawDeck.zIndex + index + 1,
    };
  });

  nextCards = rebuildCardLinksForDeck(nextCards, nextDrawCardIds);

  return {
    ...state,
    cards: nextCards,
    decks: {
      ...state.decks,
      [drawDeckId]: {
        ...drawDeck,
        cardIds: nextDrawCardIds,
        zIndex: highestZIndex + 1,
      },
      [discardDeckId]: {
        ...discardDeck,
        cardIds: [],
      },
    },
  };
}
