const SPREAD_CARD_TOP = 34;

function getContainers(state) {
  return state.containers || state.decks || {};
}

function withContainers(state, containers) {
  const { decks, ...stateWithoutOldDecks } = state;
  return {
    ...stateWithoutOldDecks,
    containers,
  };
}

function getHighestZIndex(state) {
  const cardZ = Object.values(state.cards || {}).map((card) => card.zIndex || 0);
  const containerZ = Object.values(getContainers(state)).map(
    (container) => container.zIndex || 0
  );
  return Math.max(0, ...cardZ, ...containerZ);
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

function rebuildCardLinksForContainer(cards, cardIds) {
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

function getSpreadCardSpacing(container, card) {
  const cardWidth = card?.width || container.width || 180;

  if (typeof container.overlapPercent === "number") {
    const safeOverlapPercent = Math.max(0, Math.min(container.overlapPercent, 95));
    return cardWidth * (1 - safeOverlapPercent / 100);
  }

  return container.cardSpacing || 70;
}

function getContainerCardPosition(container, index, card) {
  if (container.layout === "horizontal-spread") {
    return {
      x: container.x + index * getSpreadCardSpacing(container, card),
      y: container.y + SPREAD_CARD_TOP,
    };
  }

  return {
    x: container.x,
    y: container.y,
  };
}

function canContainerAcceptCard(container, cardId) {
  if (!container || !container.acceptsCards) return false;
  if (container.cardIds.includes(cardId)) return true;
  if (container.maxCards === null || container.maxCards === undefined) return true;
  return container.cardIds.length < container.maxCards;
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

export function drawTopCardFromContainer(state, containerId) {
  const containers = getContainers(state);
  const container = containers[containerId];
  if (!container || container.cardIds.length === 0) return { state, cardId: null };

  const topCardId = container.cardIds[container.cardIds.length - 1];
  return takeCardFromContainer(state, containerId, topCardId, {
    x: container.x,
    y: container.y,
    bringToTop: true,
  });
}

export function takeCardFromContainer(
  state,
  containerId,
  cardId,
  { x = null, y = null, faceUp = null, bringToTop = true } = {}
) {
  const containers = getContainers(state);
  const container = containers[containerId];
  const card = state.cards[cardId];
  const area = container ? state.areas[container.areaId] : null;

  if (!container || !card || !area || !container.cardIds.includes(cardId)) {
    return { state, cardId: null };
  }

  const nextContainerCardIds = container.cardIds.filter(
    (currentCardId) => currentCardId !== cardId
  );
  const highestZIndex = getHighestZIndex(state);

  let nextCards = {
    ...state.cards,
    [cardId]: {
      ...card,
      areaId: container.areaId,
      x: x ?? card.x,
      y: y ?? card.y,
      faceUp: faceUp ?? card.faceUp,
      zIndex: bringToTop ? highestZIndex + 1 : card.zIndex,
      cardAboveId: null,
      cardBelowId: null,
    },
  };

  nextCards = rebuildCardLinksForContainer(nextCards, nextContainerCardIds);

  const nextContainers = {
    ...containers,
    [containerId]: {
      ...container,
      cardIds: nextContainerCardIds,
    },
  };

  return {
    state: withContainers(
      {
        ...state,
        areas: {
          ...state.areas,
          [area.id]: {
            ...area,
            objectIds: addObjectId(area.objectIds, cardId),
          },
        },
        cards: nextCards,
      },
      nextContainers
    ),
    cardId,
  };
}

export function moveCardToContainer(
  state,
  cardId,
  containerId,
  { faceUp = true, index = null } = {}
) {
  const card = state.cards[cardId];
  const containers = getContainers(state);
  const container = containers[containerId];
  if (!card || !container || !canContainerAcceptCard(container, cardId)) return state;

  const sourceArea = state.areas[card.areaId];
  const sourceContainer = Object.values(containers).find((currentContainer) =>
    (currentContainer.cardIds || []).includes(cardId)
  );

  let nextContainers = { ...containers };

  if (sourceContainer && sourceContainer.id !== containerId) {
    nextContainers[sourceContainer.id] = {
      ...sourceContainer,
      cardIds: sourceContainer.cardIds.filter(
        (currentCardId) => currentCardId !== cardId
      ),
    };
  }

  const currentTarget = nextContainers[containerId];
  const targetIndex = index === null ? currentTarget.cardIds.length : index;
  const nextContainerCardIds = insertObjectId(
    currentTarget.cardIds,
    cardId,
    targetIndex
  );

  let nextCards = { ...state.cards };

  nextContainerCardIds.forEach((currentCardId, currentIndex) => {
    const currentCard = nextCards[currentCardId];
    if (!currentCard) return;

    const position = getContainerCardPosition(
      currentTarget,
      currentIndex,
      currentCard
    );

    nextCards[currentCardId] = {
      ...currentCard,
      areaId: currentTarget.areaId,
      x: position.x,
      y: position.y,
      faceUp,
      zIndex: currentTarget.zIndex + currentIndex + 1,
    };
  });

  nextCards = rebuildCardLinksForContainer(nextCards, nextContainerCardIds);

  nextContainers[containerId] = {
    ...currentTarget,
    cardIds: nextContainerCardIds,
  };

  const nextAreas = { ...state.areas };
  if (sourceArea) {
    nextAreas[sourceArea.id] = {
      ...sourceArea,
      objectIds: removeObjectId(sourceArea.objectIds, cardId),
    };
  }

  return withContainers(
    {
      ...state,
      areas: nextAreas,
      cards: nextCards,
    },
    nextContainers
  );
}

export function reorderCardInContainer(state, containerId, cardId, index) {
  const containers = getContainers(state);
  const container = containers[containerId];
  if (!container || !container.allowReorder || !container.cardIds.includes(cardId)) {
    return state;
  }

  return moveCardToContainer(state, cardId, containerId, {
    faceUp: state.cards[cardId]?.faceUp ?? true,
    index,
  });
}

export function shuffleContainer(state, containerId) {
  const containers = getContainers(state);
  const container = containers[containerId];
  if (!container || container.cardIds.length < 2) return state;

  const nextCardIds = shuffleArray(container.cardIds);
  const nextCards = rebuildCardLinksForContainer(state.cards, nextCardIds);

  return withContainers(
    {
      ...state,
      cards: nextCards,
    },
    {
      ...containers,
      [containerId]: {
        ...container,
        cardIds: nextCardIds,
      },
    }
  );
}

export function putContainerOnBottomOfDeck(state, sourceContainerId, drawDeckId) {
  const containers = getContainers(state);
  const sourceContainer = containers[sourceContainerId];
  const drawDeck = containers[drawDeckId];

  if (!sourceContainer || !drawDeck || sourceContainer.cardIds.length === 0) {
    return state;
  }

  const nextDrawCardIds = [...sourceContainer.cardIds, ...drawDeck.cardIds];
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

  nextCards = rebuildCardLinksForContainer(nextCards, nextDrawCardIds);

  return withContainers(
    {
      ...state,
      cards: nextCards,
    },
    {
      ...containers,
      [drawDeckId]: {
        ...drawDeck,
        cardIds: nextDrawCardIds,
        zIndex: highestZIndex + 1,
      },
      [sourceContainerId]: {
        ...sourceContainer,
        cardIds: [],
      },
    }
  );
}

// Backward-compatible names used by earlier prototypes.
export const drawTopCardFromDeck = drawTopCardFromContainer;
export const takeCardFromDeck = takeCardFromContainer;
export const moveCardToDeck = moveCardToContainer;
export const reorderCardInDeck = reorderCardInContainer;
export const shuffleDeck = shuffleContainer;
export const putDiscardOnBottomOfDeck = putContainerOnBottomOfDeck;
