export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function scaleRectFromCenter({
  rect,
  areaWidth,
  areaHeight,
  viewportWidth,
  viewportHeight,
  scale,
  panX = 0,
  panY = 0,
}) {
  const internalCenterX = areaWidth / 2;
  const internalCenterY = areaHeight / 2;
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;

  return {
    x: viewportCenterX + (rect.x - internalCenterX + panX) * scale,
    y: viewportCenterY + (rect.y - internalCenterY + panY) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function screenPointToAreaPoint({
  screenX,
  screenY,
  areaWidth,
  areaHeight,
  viewportWidth,
  viewportHeight,
  scale,
  panX = 0,
  panY = 0,
}) {
  const internalCenterX = areaWidth / 2;
  const internalCenterY = areaHeight / 2;
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;

  return {
    x: internalCenterX + (screenX - viewportCenterX) / scale - panX,
    y: internalCenterY + (screenY - viewportCenterY) / scale - panY,
  };
}

export function getActionMenuPosition({
  selectedObject,
  areaWidth,
  areaHeight,
  menuWidth = 150,
  menuHeight = 106,
  gap = 12,
}) {
  const rightX = selectedObject.x + selectedObject.width + gap;
  const leftX = selectedObject.x - menuWidth - gap;
  const belowY = selectedObject.y + selectedObject.height + gap;
  const aboveY = selectedObject.y - menuHeight - gap;

  const alignedY = clamp(
    selectedObject.y,
    gap,
    areaHeight - menuHeight - gap
  );

  const alignedX = clamp(
    selectedObject.x,
    gap,
    areaWidth - menuWidth - gap
  );

  const hasRoomRight = rightX + menuWidth <= areaWidth - gap;
  const hasRoomLeft = leftX >= gap;
  const hasRoomBelow = belowY + menuHeight <= areaHeight - gap;
  const hasRoomAbove = aboveY >= gap;

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
    x: clamp(selectedObject.x, gap, areaWidth - menuWidth - gap),
    y: clamp(selectedObject.y, gap, areaHeight - menuHeight - gap),
  };
}
