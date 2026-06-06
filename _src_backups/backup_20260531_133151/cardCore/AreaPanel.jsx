import { useRef, useState } from "react";
import { flipCard, moveCard } from "./cardCoreActions";
import CardActionMenu from "./CardActionMenu";
import CardObject from "./CardObject";
import "./cardCore.css";

function AreaPanel({ area, cards, selectedObjectId, onSelectObject, onChangeState, scale }) {
  const areaRef = useRef(null);
  const [dragState, setDragState] = useState(null);

  function getAreaPoint(event) {
    const rect = areaRef.current.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  }

  function handleAreaPointerDown(event) {
    if (event.target === areaRef.current) {
      onSelectObject(null);
    }
  }

  function handleCardPointerDown(event, card) {
    event.preventDefault();
    event.stopPropagation();

    const point = getAreaPoint(event);

    setDragState({
      pointerId: event.pointerId,
      cardId: card.id,
      startX: point.x,
      startY: point.y,
      offsetX: point.x - card.x,
      offsetY: point.y - card.y,
      moved: false,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCardPointerMove(event) {
    if (!dragState) return;

    const point = getAreaPoint(event);
    const distanceMoved =
      Math.abs(point.x - dragState.startX) +
      Math.abs(point.y - dragState.startY);

    const hasMoved = distanceMoved > 6;

    if (hasMoved && !dragState.moved) {
      setDragState((currentDragState) => ({
        ...currentDragState,
        moved: true,
      }));
    }

    onChangeState((currentState) =>
      moveCard(
        currentState,
        dragState.cardId,
        point.x - dragState.offsetX,
        point.y - dragState.offsetY
      )
    );
  }

  function handleCardPointerUp(event) {
    event.preventDefault();
    event.stopPropagation();

    if (dragState) {
      event.currentTarget.releasePointerCapture(dragState.pointerId);

      if (!dragState.moved) {
        if (selectedObjectId === dragState.cardId) {
          onSelectObject(null);
        } else {
          onSelectObject(dragState.cardId);
        }
      }
    }

    setDragState(null);
  }

  function handleFlipSelected() {
    if (!selectedObjectId) return;

    onChangeState((currentState) => flipCard(currentState, selectedObjectId));
  }

  const selectedCard = selectedObjectId ? cards[selectedObjectId] : null;

  return (
    <div
      className="area-scale-shell"
      style={{
        width: `${area.width * scale}px`,
        height: `${area.height * scale}px`,
      }}
    >
      <div
        className="area-panel"
        ref={areaRef}
        style={{
          width: `${area.width}px`,
          height: `${area.height}px`,
          transform: `scale(${scale})`,
        }}
        onPointerDown={handleAreaPointerDown}
      >
        <div className="area-label">Area: {area.name}</div>

        {area.objectIds.map((objectId) => {
          const card = cards[objectId];
          if (!card) return null;

          return (
            <CardObject
              key={card.id}
              card={card}
              selected={selectedObjectId === card.id}
              onPointerDown={handleCardPointerDown}
              onPointerMove={handleCardPointerMove}
              onPointerUp={handleCardPointerUp}
            />
          );
        })}

        {selectedCard && (
          <CardActionMenu
            card={selectedCard}
            areaWidth={area.width * scale}
            areaHeight={area.height * scale}
            scale={scale}
            onFlip={handleFlipSelected}
            onDeselect={() => onSelectObject(null)}
          />
        )}
      </div>
    </div>
  );
}

export default AreaPanel;
