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
}) {
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
  zIndex = 1,
  cardAboveId = null,
  cardBelowId = null,
}) {
  return {
    id,
    objectType: "card",
    areaId,
    frontImage,
    backImage,
    x,
    y,
    width,
    height,
    faceUp,
    zIndex,
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
  zIndex = 1,
}) {
  return {
    id,
    objectType: "deck",
    areaId,
    cardIds,
    x,
    y,
    width,
    height,
    zIndex,
  };
}
