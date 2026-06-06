export const ACTION_MENU_WIDTH = 150;
export const ACTION_MENU_HEIGHT = 106;
export const ACTION_MENU_GAP = 12;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function getAreaGlobalPosition(area, areas = {}) {
  if (!area) return { x: 0, y: 0 };

  if (!area.parentAreaId) {
    return { x: area.x, y: area.y };
  }

  const parentArea = areas[area.parentAreaId];
  const parentPosition = getAreaGlobalPosition(parentArea, areas);

  return {
    x: parentPosition.x + area.x,
    y: parentPosition.y + area.y,
  };
}

export function getObjectGlobalPosition(object, areas = {}) {
  if (!object) return { x: 0, y: 0 };

  const area = areas[object.areaId];
  const areaPosition = getAreaGlobalPosition(area, areas);

  return {
    x: areaPosition.x + object.x,
    y: areaPosition.y + object.y,
  };
}

export function isPointInsideArea(area, globalX, globalY, areas = {}) {
  const areaPosition = getAreaGlobalPosition(area, areas);

  return (
    globalX >= areaPosition.x &&
    globalX <= areaPosition.x + area.width &&
    globalY >= areaPosition.y &&
    globalY <= areaPosition.y + area.height
  );
}

export function getActionMenuPosition(selectedCard, areaElement) {
  if (!selectedCard || !areaElement) {
    return { x: 0, y: 0 };
  }

  const areaWidth = areaElement.clientWidth;
  const areaHeight = areaElement.clientHeight;

  const rightX = selectedCard.x + selectedCard.width + ACTION_MENU_GAP;
  const leftX = selectedCard.x - ACTION_MENU_WIDTH - ACTION_MENU_GAP;
  const belowY = selectedCard.y + selectedCard.height + ACTION_MENU_GAP;
  const aboveY = selectedCard.y - ACTION_MENU_HEIGHT - ACTION_MENU_GAP;

  const alignedY = clamp(
    selectedCard.y,
    ACTION_MENU_GAP,
    areaHeight - ACTION_MENU_HEIGHT - ACTION_MENU_GAP
  );

  const alignedX = clamp(
    selectedCard.x,
    ACTION_MENU_GAP,
    areaWidth - ACTION_MENU_WIDTH - ACTION_MENU_GAP
  );

  const hasRoomRight = rightX + ACTION_MENU_WIDTH <= areaWidth - ACTION_MENU_GAP;
  const hasRoomLeft = leftX >= ACTION_MENU_GAP;
  const hasRoomBelow = belowY + ACTION_MENU_HEIGHT <= areaHeight - ACTION_MENU_GAP;
  const hasRoomAbove = aboveY >= ACTION_MENU_GAP;

  if (hasRoomRight) {
    return { x: rightX, y: alignedY };
  }

  if (hasRoomLeft) {
    return { x: leftX, y: alignedY };
  }

  if (hasRoomBelow) {
    return { x: alignedX, y: belowY };
  }

  if (hasRoomAbove) {
    return { x: alignedX, y: aboveY };
  }

  return {
    x: clamp(selectedCard.x, ACTION_MENU_GAP, areaWidth - ACTION_MENU_WIDTH - ACTION_MENU_GAP),
    y: clamp(selectedCard.y, ACTION_MENU_GAP, areaHeight - ACTION_MENU_HEIGHT - ACTION_MENU_GAP),
  };
}
