import { useRef, useState } from "react";
import { bringCardToTop, flipCard, moveCard } from "./cardCoreActions";
import CardActionMenu from "./CardActionMenu";
import CardObject from "./CardObject";
import FullSizeCardModal from "./FullSizeCardModal";
import { scaleRectFromCenter, screenPointToAreaPoint } from "./cardCoreLayout";
import "./cardCore.css";

function AreaPanel({ area, cards, selectedObjectId, onSelectObject, onChangeState, scale }) {
  const areaRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [fullSizeCardId, setFullSizeCardId] = useState(null);

  function getAreaPoint(event) {
    const rect = areaRef.current.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    return screenPointToAreaPoint({
      screenX,
      screenY,
      areaWidth: area.width,
      areaHeight: area.height,
      scale,
    });
  }

  function getDisplayRect(card) {
    return scaleRectFromCenter({
      rect: card,
      areaWidth: area.width,
      areaHeight: area.height,
      scale,
    });
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
          onChangeState((currentState) =>
            bringCardToTop(currentState, dragState.cardId)
          );
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

  function handleViewFullSize() {
    if (!selectedObjectId) return;
    setFullSizeCardId(selectedObjectId);
  }

  const selectedCard = selectedObjectId ? cards[selectedObjectId] : null;
  const selectedCardRect = selectedCard ? getDisplayRect(selectedCard) : null;
  const fullSizeCard = fullSizeCardId ? cards[fullSizeCardId] : null;

  const areaCards = area.objectIds
    .map((objectId) => cards[objectId])
    .filter(Boolean)
    .sort((firstCard, secondCard) =>
      (firstCard.zIndex || 0) - (secondCard.zIndex || 0)
    );

  return (
    <div
      className="area-panel"
      ref={areaRef}
      style={{
        width: `${area.width}px`,
        height: `${area.height}px`,
      }}
      onPointerDown={handleAreaPointerDown}
    >
      <div className="area-label">Area: {area.name}</div>

      {areaCards.map((card) => (
        <CardObject
          key={card.id}
          card={card}
          displayRect={getDisplayRect(card)}
          selected={selectedObjectId === card.id}
          onPointerDown={handleCardPointerDown}
          onPointerMove={handleCardPointerMove}
          onPointerUp={handleCardPointerUp}
        />
      ))}

      {selectedCard && selectedCardRect && (
        <CardActionMenu
          cardRect={selectedCardRect}
          areaWidth={area.width}
          areaHeight={area.height}
          onFlip={handleFlipSelected}
          onViewFullSize={handleViewFullSize}
        />
      )}

      <FullSizeCardModal
        card={fullSizeCard}
        onClose={() => setFullSizeCardId(null)}
      />
    </div>
  );
}

export default AreaPanel;
