import { useRef, useState } from "react";
import {
  bringCardToTop,
  drawTopCardFromDeck,
  flipCard,
  moveCard,
  moveCardToDeck,
  putDiscardOnBottomOfDeck,
  shuffleDeck,
  takeCardFromDeck,
} from "./cardCoreActions";
import CardActionMenu from "./CardActionMenu";
import CardObject from "./CardObject";
import DeckObject from "./DeckObject";
import FullSizeCardModal from "./FullSizeCardModal";
import HandObject from "./HandObject";
import { clamp, scaleRectFromCenter, screenPointToAreaPoint } from "./cardCoreLayout";
import "./cardCore.css";

const HAND_CARD_TOP = 34;

function AreaPanel({
  area,
  cards,
  decks,
  selectedObjectId,
  onSelectObject,
  onChangeState,
  scale,
  pan,
  onPanChange,
  viewerId = "player-1",
}) {
  const areaRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [fullSizeCardId, setFullSizeCardId] = useState(null);

  function getAreaScreenPoint(event) {
    const rect = areaRef.current.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      viewportWidth: rect.width,
      viewportHeight: rect.height,
    };
  }

  function getAreaPoint(event) {
    const screenPoint = getAreaScreenPoint(event);

    return screenPointToAreaPoint({
      screenX: screenPoint.x,
      screenY: screenPoint.y,
      areaWidth: area.width,
      areaHeight: area.height,
      viewportWidth: screenPoint.viewportWidth,
      viewportHeight: screenPoint.viewportHeight,
      scale,
      panX: pan.x,
      panY: pan.y,
    });
  }

  function getEffectiveObjectRect(object) {
    if (object.objectType === "deck" && object.role === "hand") {
      const cardCount = object.cardIds.length;
      const firstCard = cards[object.cardIds[0]];
      const cardWidth = firstCard?.width || object.width;
      const cardHeight = firstCard?.height || object.height;
      const spacing = object.cardSpacing || 70;

      return {
        ...object,
        width: Math.max(object.width, cardWidth + Math.max(0, cardCount - 1) * spacing),
        height: Math.max(object.height, cardHeight + HAND_CARD_TOP),
      };
    }

    return object;
  }

  function getDisplayRect(object) {
    const effectiveObject = getEffectiveObjectRect(object);

    if (!areaRef.current) {
      return {
        x: effectiveObject.x,
        y: effectiveObject.y,
        width: effectiveObject.width,
        height: effectiveObject.height,
      };
    }

    const rect = areaRef.current.getBoundingClientRect();

    return scaleRectFromCenter({
      rect: effectiveObject,
      areaWidth: area.width,
      areaHeight: area.height,
      viewportWidth: rect.width,
      viewportHeight: rect.height,
      scale,
      panX: pan.x,
      panY: pan.y,
    });
  }

  function isPointInsideObject(point, object) {
    const effectiveObject = getEffectiveObjectRect(object);

    return (
      point.x >= effectiveObject.x &&
      point.x <= effectiveObject.x + effectiveObject.width &&
      point.y >= effectiveObject.y &&
      point.y <= effectiveObject.y + effectiveObject.height
    );
  }

  function getDeckByRole(role) {
    return Object.values(decks || {}).find(
      (deck) => deck.areaId === area.id && deck.role === role
    );
  }

  function getDiscardDeckAtPoint(point) {
    return Object.values(decks || {}).find(
      (deck) => deck.areaId === area.id && deck.role === "discard" && isPointInsideObject(point, deck)
    );
  }

  function getHandAtPoint(point) {
    return Object.values(decks || {}).find(
      (deck) => deck.areaId === area.id && deck.role === "hand" && isPointInsideObject(point, deck)
    );
  }

  function getHandInsertIndex(point, hand) {
    const cardCount = hand.cardIds.length;
    const spacing = hand.cardSpacing || 70;
    const relativeX = point.x - hand.x;
    return clamp(Math.round(relativeX / spacing), 0, cardCount);
  }

  function getHandCardLocalRects(hand) {
    const cardIds = hand.cardIds || [];
    const spacing = hand.cardSpacing || 70;
    const fallbackWidth = 180;
    const fallbackHeight = 250;

    return cardIds.map((cardId, index) => {
      const card = cards[cardId];
      return {
        x: index * spacing,
        y: HAND_CARD_TOP,
        width: card?.width || fallbackWidth,
        height: card?.height || fallbackHeight,
      };
    });
  }

  function getHandCardInternalPosition(hand, cardIndex) {
    const localRects = getHandCardLocalRects(hand);
    const localRect = localRects[cardIndex] || { x: 0, y: HAND_CARD_TOP };
    return {
      x: hand.x + localRect.x,
      y: hand.y + localRect.y,
    };
  }

  function getHandCardDisplayRects(hand) {
    return getHandCardLocalRects(hand).map((localRect) => ({
      x: localRect.x * scale,
      y: localRect.y * scale,
      width: localRect.width * scale,
      height: localRect.height * scale,
    }));
  }

  function safelyReleasePointerCapture(event, pointerId) {
    if (!event.currentTarget.hasPointerCapture?.(pointerId)) return;
    event.currentTarget.releasePointerCapture(pointerId);
  }

  function handleAreaPointerDown(event) {
    if (event.target !== areaRef.current) return;

    event.preventDefault();

    const screenPoint = getAreaScreenPoint(event);

    setDragState({
      type: "table",
      pointerId: event.pointerId,
      startScreenX: screenPoint.x,
      startScreenY: screenPoint.y,
      startPanX: pan.x,
      startPanY: pan.y,
      moved: false,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function startDraggingCard({ event, card, point }) {
    setDragState({
      type: "card",
      pointerId: event.pointerId,
      cardId: card.id,
      startX: point.x,
      startY: point.y,
      offsetX: point.x - card.x,
      offsetY: point.y - card.y,
      moved: false,
    });
  }

  function startPotentialDeckDrag({ event, deck, point }) {
    setDragState({
      type: "deck",
      pointerId: event.pointerId,
      deckId: deck.id,
      startX: point.x,
      startY: point.y,
      moved: false,
    });
  }

  function startPotentialHandCardDrag({ event, hand, card, cardIndex, point }) {
    const cardPosition = getHandCardInternalPosition(hand, cardIndex);

    setDragState({
      type: "hand-card",
      pointerId: event.pointerId,
      handId: hand.id,
      cardId: card.id,
      cardIndex,
      startX: point.x,
      startY: point.y,
      offsetX: point.x - cardPosition.x,
      offsetY: point.y - cardPosition.y,
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

    const point = getAreaPoint(event);
    startPotentialDeckDrag({ event, deck, point });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHandCardPointerDown(event, hand, card, cardIndex) {
    event.preventDefault();
    event.stopPropagation();

    const point = getAreaPoint(event);
    startPotentialHandCardDrag({ event, hand, card, cardIndex, point });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function convertDeckDragToCardDrag(currentDragState, point) {
    const deck = decks[currentDragState.deckId];

    if (!deck || deck.role !== "deck" || deck.cardIds.length === 0) {
      return currentDragState;
    }

    const topCardId = deck.cardIds[deck.cardIds.length - 1];
    const topCard = cards[topCardId];
    if (!topCard) return currentDragState;

    onSelectObject(null);

    onChangeState((currentState) => {
      const result = drawTopCardFromDeck(currentState, deck.id);
      return result.state;
    });

    return {
      type: "card",
      pointerId: currentDragState.pointerId,
      cardId: topCardId,
      startX: currentDragState.startX,
      startY: currentDragState.startY,
      offsetX: point.x - deck.x,
      offsetY: point.y - deck.y,
      moved: true,
    };
  }

  function convertHandCardDragToLooseCardDrag(currentDragState, point) {
    const hand = decks[currentDragState.handId];
    const card = cards[currentDragState.cardId];

    if (!hand || !card || !hand.cardIds.includes(card.id)) {
      return currentDragState;
    }

    const x = point.x - currentDragState.offsetX;
    const y = point.y - currentDragState.offsetY;
    const viewerOwnsHand = hand.ownerId === viewerId;

    onSelectObject(null);

    onChangeState((currentState) => {
      const result = takeCardFromDeck(currentState, hand.id, card.id, {
        x,
        y,
        faceUp: viewerOwnsHand ? true : card.faceUp,
        bringToTop: true,
      });
      return result.state;
    });

    return {
      type: "card",
      pointerId: currentDragState.pointerId,
      cardId: card.id,
      startX: currentDragState.startX,
      startY: currentDragState.startY,
      offsetX: currentDragState.offsetX,
      offsetY: currentDragState.offsetY,
      moved: true,
    };
  }

  function handlePointerMove(event) {
    if (!dragState) return;

    if (dragState.type === "table") {
      const screenPoint = getAreaScreenPoint(event);
      const dx = screenPoint.x - dragState.startScreenX;
      const dy = screenPoint.y - dragState.startScreenY;
      const hasMoved = Math.abs(dx) + Math.abs(dy) > 6;

      if (hasMoved && !dragState.moved) {
        setDragState((currentDragState) => ({
          ...currentDragState,
          moved: true,
        }));
      }

      onPanChange({
        x: dragState.startPanX + dx / scale,
        y: dragState.startPanY + dy / scale,
      });

      return;
    }

    const point = getAreaPoint(event);
    const distanceMoved =
      Math.abs(point.x - dragState.startX) + Math.abs(point.y - dragState.startY);
    const hasMoved = distanceMoved > 6;

    if (dragState.type === "deck") {
      if (!hasMoved) return;

      const nextDragState = convertDeckDragToCardDrag(dragState, point);
      setDragState(nextDragState);

      if (nextDragState.type === "card") {
        onChangeState((currentState) =>
          moveCard(
            currentState,
            nextDragState.cardId,
            point.x - nextDragState.offsetX,
            point.y - nextDragState.offsetY
          )
        );
      } else {
        setDragState((currentDragState) => ({
          ...currentDragState,
          moved: true,
        }));
      }

      return;
    }

    if (dragState.type === "hand-card") {
      if (!hasMoved) return;

      const nextDragState = convertHandCardDragToLooseCardDrag(dragState, point);
      setDragState(nextDragState);

      if (nextDragState.type === "card") {
        onChangeState((currentState) =>
          moveCard(
            currentState,
            nextDragState.cardId,
            point.x - nextDragState.offsetX,
            point.y - nextDragState.offsetY
          )
        );
      }

      return;
    }

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
      safelyReleasePointerCapture(event, dragState.pointerId);

      if (dragState.type === "table") {
        if (!dragState.moved) {
          onSelectObject(null);
        }
      }

      if (dragState.type === "deck") {
        if (!dragState.moved) {
          if (selectedObjectId === dragState.deckId) {
            onSelectObject(null);
          } else {
            onSelectObject(dragState.deckId);
          }
        }
      }

      if (dragState.type === "hand-card" && !dragState.moved) {
        const hand = decks[dragState.handId];
        if (selectedObjectId === hand?.id) {
          onSelectObject(null);
        } else if (hand) {
          onSelectObject(hand.id);
        }
      }

      if (dragState.type === "card") {
        if (!dragState.moved) {
          if (selectedObjectId === dragState.cardId) {
            onSelectObject(null);
          } else {
            onChangeState((currentState) => bringCardToTop(currentState, dragState.cardId));
            onSelectObject(dragState.cardId);
          }
        } else {
          const hand = getHandAtPoint(point);
          const discardDeck = getDiscardDeckAtPoint(point);

          if (hand) {
            const index = getHandInsertIndex(point, hand);
            onChangeState((currentState) =>
              moveCardToDeck(currentState, dragState.cardId, hand.id, {
                faceUp: false,
                index,
              })
            );
            onSelectObject(null);
          } else if (discardDeck) {
            onChangeState((currentState) =>
              moveCardToDeck(currentState, dragState.cardId, discardDeck.id, {
                faceUp: true,
              })
            );
            onSelectObject(null);
          }
        }
      }
    }

    setDragState(null);
  }

  function handleFlipSelected() {
    if (!selectedObjectId) return;
    onChangeState((currentState) => flipCard(currentState, selectedObjectId));
    onSelectObject(null);
  }

  function handleViewFullSize() {
    if (!selectedObjectId) return;
    setFullSizeCardId(selectedObjectId);
    onSelectObject(null);
  }

  function handleShuffleDeck(deckId) {
    onChangeState((currentState) => shuffleDeck(currentState, deckId));
    onSelectObject(null);
  }

  function handlePutDiscardOnBottom(discardDeckId) {
    const drawDeck = getDeckByRole("deck");
    if (!drawDeck) return;

    onChangeState((currentState) =>
      putDiscardOnBottomOfDeck(currentState, discardDeckId, drawDeck.id)
    );
    onSelectObject(null);
  }

  function getSelectedObject() {
    if (!selectedObjectId) return null;
    return cards[selectedObjectId] || decks[selectedObjectId] || null;
  }

  function getMenuActions(selectedObject) {
    if (!selectedObject) return [];

    if (selectedObject.objectType === "card") {
      return [
        { label: "Flip", onClick: handleFlipSelected },
        { label: "Full Size", onClick: handleViewFullSize },
      ];
    }

    if (selectedObject.objectType === "deck" && selectedObject.role === "deck") {
      return [
        { label: "Shuffle", onClick: () => handleShuffleDeck(selectedObject.id) },
      ];
    }

    if (selectedObject.objectType === "deck" && selectedObject.role === "discard") {
      return [
        { label: "Shuffle", onClick: () => handleShuffleDeck(selectedObject.id) },
        {
          label: "Put Under Deck",
          onClick: () => handlePutDiscardOnBottom(selectedObject.id),
        },
      ];
    }

    if (selectedObject.objectType === "deck" && selectedObject.role === "hand") {
      return [
        { label: "Shuffle", onClick: () => handleShuffleDeck(selectedObject.id) },
      ];
    }

    return [];
  }

  const selectedObject = getSelectedObject();
  const selectedObjectRect = selectedObject ? getDisplayRect(selectedObject) : null;
  const selectedMenuActions = getMenuActions(selectedObject);
  const fullSizeCard = fullSizeCardId ? cards[fullSizeCardId] : null;
  const viewportRect = areaRef.current?.getBoundingClientRect();
  const viewportWidth = viewportRect?.width || area.width;
  const viewportHeight = viewportRect?.height || area.height;

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
        aspectRatio: `${area.width} / ${area.height}`,
      }}
      onPointerDown={handleAreaPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="area-label">Area: {area.name}</div>

      {areaObjects.map((object) => {
        if (object.objectType === "deck" && object.role === "hand") {
          const handCards = object.cardIds.map((cardId) => cards[cardId]).filter(Boolean);

          return (
            <HandObject
              key={object.id}
              hand={object}
              cards={handCards}
              displayRect={getDisplayRect(object)}
              cardDisplayRects={getHandCardDisplayRects(object)}
              selected={selectedObjectId === object.id}
              viewerId={viewerId}
              onPointerDown={handleDeckPointerDown}
              onCardPointerDown={handleHandCardPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          );
        }

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
              selected={selectedObjectId === object.id}
              onPointerDown={handleDeckPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
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

      {selectedObject && selectedObjectRect && selectedMenuActions.length > 0 && (
        <CardActionMenu
          objectRect={selectedObjectRect}
          areaWidth={viewportWidth}
          areaHeight={viewportHeight}
          actions={selectedMenuActions}
        />
      )}

      <FullSizeCardModal card={fullSizeCard} onClose={() => setFullSizeCardId(null)} />
    </div>
  );
}

export default AreaPanel;
