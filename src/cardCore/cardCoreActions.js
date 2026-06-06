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

function getObjectById(state, objectId) {
  return state.cards?.[objectId] || getContainers(state)?.[objectId] || null;
}

function getObjectWidth(object) {
  return object?.width || 180;
}

function getObjectHeight(object) {
  return object?.height || 250;
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

function isVerticalSpreadContainer(container) {
  return container.layout === "vertical-spread";
}

function getSpreadCardSpacing(container, item) {
  const baseSize = isVerticalSpreadContainer(container)
    ? getObjectHeight(item) || container.height || 250
    : getObjectWidth(item) || container.width || 180;

  if (typeof container.overlapPercent === "number") {
    const safeOverlapPercent = Math.max(0, Math.min(container.overlapPercent, 95));
    return baseSize * (1 - safeOverlapPercent / 100);
  }

  return container.cardSpacing || 70;
}

function getContainerCardZIndex(container, index, totalCards) {
  if (container.zOrderDirection === "down") {
    return container.zIndex + totalCards - index;
  }

  return container.zIndex + index + 1;
}

function getContainerCardPosition(container, index, card, totalCards = 1) {
  if (container.layout === "horizontal-spread") {
    return {
      x: container.x + index * getSpreadCardSpacing(container, card),
      y: container.y + SPREAD_CARD_TOP,
    };
  }

  if (container.layout === "vertical-spread") {
    const spacing = getSpreadCardSpacing(container, card);
    const cardHeight = getObjectHeight(card);

    if (container.growthDirection === "up") {
      const bottomY = container.y + container.height;
      return {
        x: container.x,
        y: bottomY - cardHeight - index * spacing,
      };
    }

    return {
      x: container.x,
      y: container.y + SPREAD_CARD_TOP + index * spacing,
    };
  }

  return {
    x: container.x,
    y: container.y,
  };
}

function canContainerAcceptObject(state, container, objectId) {
  if (!container) return false;
  if (container.cardIds.includes(objectId)) return true;

  const object = getObjectById(state, objectId);
  if (!object) return false;

  if (object.objectType === "card" && !container.acceptsCards) return false;

  if (object.objectType === "container") {
    if (!container.acceptsContainers) return false;

    const acceptedKinds = container.acceptedContainerKinds || [];
    if (acceptedKinds.length > 0 && !acceptedKinds.includes(object.kind)) {
      return false;
    }
  }

  if (container.maxCards === null || container.maxCards === undefined) return true;
  return container.cardIds.length < container.maxCards;
}

function updatePlacedObject(nextCards, nextContainers, objectId, updates) {
  if (nextCards[objectId]) {
    nextCards[objectId] = {
      ...nextCards[objectId],
      ...updates,
    };
    return { nextCards, nextContainers };
  }

  if (nextContainers[objectId]) {
    nextContainers[objectId] = {
      ...nextContainers[objectId],
      ...updates,
    };
  }

  return { nextCards, nextContainers };
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

export function moveContainer(state, containerId, x, y) {
  const containers = getContainers(state);
  const container = containers[containerId];
  if (!container) return state;

  return withContainers(state, {
    ...containers,
    [containerId]: {
      ...container,
      x,
      y,
    },
  });
}

export function bringContainerToTop(state, containerId) {
  const containers = getContainers(state);
  const container = containers[containerId];
  if (!container) return state;

  const highestZIndex = getHighestZIndex(state);

  return withContainers(state, {
    ...containers,
    [containerId]: {
      ...container,
      zIndex: highestZIndex + 1,
    },
  });
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

export function takeObjectFromContainer(
  state,
  containerId,
  objectId,
  { x = null, y = null, faceUp = null, bringToTop = true } = {}
) {
  const containers = getContainers(state);
  const container = containers[containerId];
  const object = getObjectById(state, objectId);
  const area = container ? state.areas[container.areaId] : null;

  if (!container || !object || !area || !container.cardIds.includes(objectId)) {
    return { state, objectId: null, cardId: null };
  }

  const nextContainerCardIds = container.cardIds.filter(
    (currentObjectId) => currentObjectId !== objectId
  );
  const highestZIndex = getHighestZIndex(state);
  const nextZIndex = bringToTop ? highestZIndex + 1 : object.zIndex;

  let nextCards = { ...state.cards };
  let nextContainers = {
    ...containers,
    [containerId]: {
      ...container,
      cardIds: nextContainerCardIds,
    },
  };

  const objectUpdates = {
    areaId: container.areaId,
    x: x ?? object.x,
    y: y ?? object.y,
    zIndex: nextZIndex,
  };

  if (object.objectType === "card") {
    objectUpdates.faceUp = faceUp ?? object.faceUp;
    objectUpdates.cardAboveId = null;
    objectUpdates.cardBelowId = null;
  }

  ({ nextCards, nextContainers } = updatePlacedObject(
    nextCards,
    nextContainers,
    objectId,
    objectUpdates
  ));

  nextCards = rebuildCardLinksForContainer(nextCards, nextContainerCardIds);

  return {
    state: withContainers(
      {
        ...state,
        areas: {
          ...state.areas,
          [area.id]: {
            ...area,
            objectIds: addObjectId(area.objectIds, objectId),
          },
        },
        cards: nextCards,
      },
      nextContainers
    ),
    objectId,
    cardId: object.objectType === "card" ? objectId : null,
  };
}

export function takeCardFromContainer(
  state,
  containerId,
  cardId,
  { x = null, y = null, faceUp = null, bringToTop = true } = {}
) {
  return takeObjectFromContainer(state, containerId, cardId, {
    x,
    y,
    faceUp,
    bringToTop,
  });
}

export function moveObjectToContainer(
  state,
  objectId,
  containerId,
  { faceUp = true, index = null } = {}
) {
  const object = getObjectById(state, objectId);
  const containers = getContainers(state);
  const container = containers[containerId];
  if (!object || !container || !canContainerAcceptObject(state, container, objectId)) return state;

  const sourceArea = state.areas[object.areaId];
  const sourceContainer = Object.values(containers).find((currentContainer) =>
    (currentContainer.cardIds || []).includes(objectId)
  );

  let nextContainers = { ...containers };

  if (sourceContainer && sourceContainer.id !== containerId) {
    nextContainers[sourceContainer.id] = {
      ...sourceContainer,
      cardIds: sourceContainer.cardIds.filter(
        (currentObjectId) => currentObjectId !== objectId
      ),
    };
  }

  const currentTarget = nextContainers[containerId];
  const targetIndex = index === null ? currentTarget.cardIds.length : index;
  const nextContainerCardIds = insertObjectId(
    currentTarget.cardIds,
    objectId,
    targetIndex
  );

  let nextCards = { ...state.cards };

  nextContainerCardIds.forEach((currentObjectId, currentIndex) => {
    const currentObject = nextCards[currentObjectId] || nextContainers[currentObjectId];
    if (!currentObject) return;

    const position = getContainerCardPosition(
      currentTarget,
      currentIndex,
      currentObject,
      nextContainerCardIds.length
    );

    const updates = {
      areaId: currentTarget.areaId,
      x: position.x,
      y: position.y,
      zIndex: getContainerCardZIndex(
        currentTarget,
        currentIndex,
        nextContainerCardIds.length
      ),
    };

    if (currentObject.objectType === "card") {
      updates.faceUp = faceUp;
    }

    ({ nextCards, nextContainers } = updatePlacedObject(
      nextCards,
      nextContainers,
      currentObjectId,
      updates
    ));
  });

  nextCards = rebuildCardLinksForContainer(nextCards, nextContainerCardIds);

  nextContainers[containerId] = {
    ...nextContainers[containerId],
    cardIds: nextContainerCardIds,
  };

  const nextAreas = { ...state.areas };
  if (sourceArea) {
    nextAreas[sourceArea.id] = {
      ...sourceArea,
      objectIds: removeObjectId(sourceArea.objectIds, objectId),
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

export function moveCardToContainer(
  state,
  cardId,
  containerId,
  { faceUp = true, index = null } = {}
) {
  return moveObjectToContainer(state, cardId, containerId, { faceUp, index });
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
  let nextCards = { ...state.cards };

  nextCardIds.forEach((cardId, index) => {
    const card = nextCards[cardId];
    if (!card) return;

    const position = getContainerCardPosition(container, index, card, nextCardIds.length);

    nextCards[cardId] = {
      ...card,
      x: position.x,
      y: position.y,
      zIndex: getContainerCardZIndex(container, index, nextCardIds.length),
    };
  });

  nextCards = rebuildCardLinksForContainer(nextCards, nextCardIds);

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
export const movePlacedObjectToContainer = moveObjectToContainer;
export const takePlacedObjectFromContainer = takeObjectFromContainer;
