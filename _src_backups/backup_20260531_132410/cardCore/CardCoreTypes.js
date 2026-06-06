export function createArea({
  id,
  name,
  x = 0,
  y = 0,
  width = 900,
  height = 520,
  visibility = "public",
  ownerId = null,
  objectIds = [],
  childAreaIds = [],
  parentAreaId = null,
} = {}) {
  return {
    id,
    name,
    x,
    y,
    width,
    height,
    visibility,
    ownerId,
    objectIds,
    childAreaIds,
    parentAreaId,
  };
}

export function createCard({
  id,
  areaId,
  frontImage,
  backImage,
  x = 0,
  y = 0,
  width = 180,
  height = 250,
  faceUp = true,
  cardAboveId = null,
  cardBelowId = null,
} = {}) {
  return {
    id,
    kind: "card",
    areaId,
    frontImage,
    backImage,
    x,
    y,
    width,
    height,
    faceUp,
    cardAboveId,
    cardBelowId,
  };
}

export function createDeck({
  id,
  areaId,
  cardIds = [],
  x = 0,
  y = 0,
  width = 180,
  height = 250,
} = {}) {
  return {
    id,
    kind: "deck",
    areaId,
    cardIds,
    x,
    y,
    width,
    height,
  };
}
