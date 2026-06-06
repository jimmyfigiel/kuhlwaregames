import { useState } from "react";

function getAreaPoint(event, areaElement) {
  const rect = areaElement.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export default function CardObject({
  card,
  areaRef,
  isSelected,
  onSelect,
  onMove,
}) {
  const [dragState, setDragState] = useState(null);

  function handlePointerDown(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!areaRef.current) return;

    const point = getAreaPoint(event, areaRef.current);

    setDragState({
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      offsetX: point.x - card.x,
      offsetY: point.y - card.y,
      moved: false,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragState || !areaRef.current) return;

    const point = getAreaPoint(event, areaRef.current);

    const distanceMoved =
      Math.abs(point.x - dragState.startX) + Math.abs(point.y - dragState.startY);

    const hasMoved = distanceMoved > 6;

    if (hasMoved && !dragState.moved) {
      setDragState((currentDragState) => ({
        ...currentDragState,
        moved: true,
      }));
    }

    onMove(card.id, point.x - dragState.offsetX, point.y - dragState.offsetY);
  }

  function handlePointerUp(event) {
    event.preventDefault();
    event.stopPropagation();

    if (dragState) {
      event.currentTarget.releasePointerCapture(dragState.pointerId);

      if (!dragState.moved) {
        onSelect(card.id);
      }
    }

    setDragState(null);
  }

  return (
    <div
      className={`card-core-card ${isSelected ? "selected" : ""}`}
      style={{
        left: `${card.x}px`,
        top: `${card.y}px`,
        width: `${card.width}px`,
        height: `${card.height}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        src={card.faceUp ? card.frontImage : card.backImage}
        alt={card.faceUp ? "Card front" : "Card back"}
        draggable="false"
      />
    </div>
  );
}
