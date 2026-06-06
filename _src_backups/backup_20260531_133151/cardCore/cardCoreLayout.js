export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
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
