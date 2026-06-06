import { useRef, useState } from "react";
import {
  bringCardToTop,
  drawTopCardFromDeck,
  flipCard,
  moveCard,
  moveCardToDeck,
} from "./cardCoreActions";
import CardActionMenu from "./CardActionMenu";
import CardObject from "./CardObject";
import DeckObject from "./DeckObject";
import FullSizeCardModal from "./FullSizeCardModal";
import { scaleRectFromCenter, screenPointToAreaPoint } from "./cardCoreLayout";
import "./cardCore.css";

function AreaPanel({
  area,
  cards,
  decks,
  selectedObjectId,
  onSelectObject,
  onChangeState,
  scale,
}) {
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

  function getDisplayRect(object) {
    return scaleRectFromCenter({
      rect: object,
      areaWidth: area.width,
      areaHeight: area.height,
      scale,
    });
  }

  function isPointInsideObject(point, object) {
    return (
      point.x >= object.x &&
      point.x <= object.x + object.width &&
      point.y >= object.y &&
      point.y <= object.y + object.height
    );
  }

  function getDiscardDeckAtPoint(point) {
    return Object.values(decks || {}).find(
      (deck) => deck.areaId === area.id && deck.role === "discard" && isPointInsideObject(point, deck)
    );
  }

  function handleAreaPointerDown(event) {
    if (event.target === areaRef.current) {
      onSelectObject(null);
    }
  }

  function startDraggingCard({ event, card, point }) {
    setDragState({
      pointerId: event.pointerId,
      cardId: card.id,
      startX: point.x,
      startY: point.y,
      offsetX: point.x - card.x,
      offsetY: point.y - card.y,
      moved: false,
    });
  }

  function handleCardPointerDown(event, card) {
    event.preventDefault();
    event.stopPropagation();

    const point = getAreaPoint(event);
    startDraggingCard({ event, card, point });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDeckPointerDown(event, deck) {
    event.preventDefault();
    event.stopPropagation();

    if (!deck.cardIds.length || deck.role === "discard") return;

    const point = getAreaPoint(event);
    const topCardId = deck.cardIds[deck.cardIds.length - 1];
    const topCard = cards[topCardId];
    if (!topCard) return;

    onSelectObject(null);

    onChangeState((currentState) => {
      const result = drawTopCardFromDeck(currentState, deck.id);
      return result.state;
    });

    startDraggingCard({
      event,
      card: {
        ...topCard,
        id: topCardId,
        x: deck.x,
        y: deck.y,
      },
      point,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragState) return;

    const point = getAreaPoint(event);
    const distanceMoved =
      Math.abs(point.x - dragState.startX) + Math.abs(point.y - dragState.startY);

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

  function handlePointerUp(event) {
    event.preventDefault();
    event.stopPropagation();

    const point = getAreaPoint(event);

    if (dragState) {
      event.currentTarget.releasePointerCapture(dragState.pointerId);

      if (!dragState.moved) {
        if (selectedObjectId === dragState.cardId) {
          onSelectObject(null);
        } else {
          onChangeState((currentState) => bringCardToTop(currentState, dragState.cardId));
          onSelectObject(dragState.cardId);
        }
      } else {
        const discardDeck = getDiscardDeckAtPoint(point);

        if (discardDeck) {
          onChangeState((currentState) =>
            moveCardToDeck(currentState, dragState.cardId, discardDeck.id, {
              faceUp: true,
            })
          );
          onSelectObject(null);
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

  const areaObjects = area.objectIds
    .map((objectId) => cards[objectId] || decks[objectId])
    .filter(Boolean)
    .sort((firstObject, secondObject) =>
      (firstObject.zIndex || 0) - (secondObject.zIndex || 0)
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

      {areaObjects.map((object) => {
        if (object.objectType === "deck") {
          const topCardId = object.cardIds[object.cardIds.length - 1];
          const topCard = topCardId ? cards[topCardId] : null;

          return (
            <DeckObject
              key={object.id}
              deck={object}
              topCard={topCard}
              displayRect={getDisplayRect(object)}
              cardCount={object.cardIds.length}
              onPointerDown={handleDeckPointerDown}
            />
          );
        }

        return (
          <CardObject
            key={object.id}
            card={object}
            displayRect={getDisplayRect(object)}
            selected={selectedObjectId === object.id}
            onPointerDown={handleCardPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        );
      })}

      {selectedCard && selectedCardRect && (
        <CardActionMenu
          cardRect={selectedCardRect}
          areaWidth={area.width}
          areaHeight={area.height}
          onFlip={handleFlipSelected}
          onViewFullSize={handleViewFullSize}
        />
      )}

      <FullSizeCardModal card={fullSizeCard} onClose={() => setFullSizeCardId(null)} />
    </div>
  );
}

export default AreaPanel;
