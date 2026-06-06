import { useLayoutEffect, useRef, useState } from "react";
import {
  bringCardToTop,
  bringContainerToTop,
  drawTopCardFromContainer,
  flipCard,
  moveCard,
  moveContainer,
  moveObjectToContainer,
  putContainerOnBottomOfDeck,
  shuffleContainer,
  takeCardFromContainer,
  takeObjectFromContainer,
} from "./cardCoreActions";
import CardActionMenu from "./CardActionMenu";
import CardContainerObject from "./CardContainerObject";
import CardObject from "./CardObject";
import FullSizeCardModal from "./FullSizeCardModal";
import SpreadContainerObject from "./SpreadContainerObject";
import { clamp, scaleRectFromCenter, screenPointToAreaPoint } from "./cardCoreLayout";
import "./cardCore.css";

const SPREAD_CARD_TOP = 34;

function AreaPanel({
  area,
  cards,
  containers,
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
  const [fullSizeCardView, setFullSizeCardView] = useState(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!areaRef.current) return undefined;

    function updateViewportSize() {
      const rect = areaRef.current.getBoundingClientRect();
      setViewportSize({
        width: rect.width,
        height: rect.height,
      });
    }

    updateViewportSize();

    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(areaRef.current);

    window.addEventListener("resize", updateViewportSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, []);

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

  function isSpreadContainer(container) {
    return (
      container.layout === "horizontal-spread" ||
      container.layout === "vertical-spread" ||
      container.layout === "single"
    );
  }

  function isVerticalSpreadContainer(container) {
    return container.layout === "vertical-spread";
  }

  function isUpwardColumn(container) {
    return container.layout === "vertical-spread" && container.growthDirection === "up";
  }

  function getSpreadCardSpacing(container, card = null) {
    const baseSize = isVerticalSpreadContainer(container)
      ? card?.height || container.height || 250
      : card?.width || container.width || 180;

    if (typeof container.overlapPercent === "number") {
      const safeOverlapPercent = clamp(container.overlapPercent, 0, 95);
      return baseSize * (1 - safeOverlapPercent / 100);
    }

    return container.cardSpacing || 70;
  }

  function getSpreadCardZIndex(container, index, totalCards) {
    if (container.zOrderDirection === "down") {
      return totalCards - index;
    }

    return index + 1;
  }

  function getEffectiveObjectRect(object) {
    if (object.objectType === "container" && isSpreadContainer(object)) {
        const cardCount = object.cardIds.length;
      const firstItem = getObjectById(object.cardIds[0]);
      const effectiveFirstItem = firstItem?.objectType === "container"
        ? getEffectiveObjectRect(firstItem)
        : firstItem;
      const cardWidth = effectiveFirstItem?.width || object.width;
      const cardHeight = effectiveFirstItem?.height || object.height;
      const spacing = getSpreadCardSpacing(object, effectiveFirstItem);

      const isVertical = isVerticalSpreadContainer(object);

      const effectiveHeight = isVertical
        ? Math.max(object.height, SPREAD_CARD_TOP + cardHeight + Math.max(0, cardCount - 1) * spacing)
        : Math.max(object.height, cardHeight + SPREAD_CARD_TOP);

      return {
        ...object,
        y: isUpwardColumn(object) ? object.y + object.height - effectiveHeight : object.y,
        width: isVertical
          ? Math.max(object.width, cardWidth)
          : Math.max(object.width, cardWidth + Math.max(0, cardCount - 1) * spacing),
        height: effectiveHeight,
      };
    }

    return object;
  }

  function getDisplayRect(object) {
    const effectiveObject = getEffectiveObjectRect(object);

    const viewportWidth = viewportSize.width || area.width;
    const viewportHeight = viewportSize.height || area.height;

    return scaleRectFromCenter({
      rect: effectiveObject,
      areaWidth: area.width,
      areaHeight: area.height,
      viewportWidth,
      viewportHeight,
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

  function getContainerByKind(kind) {
    return Object.values(containers || {}).find(
      (container) => container.areaId === area.id && container.kind === kind
    );
  }

  function getContainerContainingCard(cardId) {
    return Object.values(containers || {}).find((container) =>
      (container.cardIds || []).includes(cardId)
    );
  }

  function getObjectById(objectId) {
    return cards[objectId] || containers[objectId] || null;
  }

  function getContainerContainingObject(objectId) {
    return Object.values(containers || {}).find((container) =>
      (container.cardIds || []).includes(objectId)
    );
  }

  function viewerCanSeeCardFace(card) {
    const containingContainer = getContainerContainingCard(card.id);

    if (containingContainer?.visibility === "owner") {
      return containingContainer.ownerId && containingContainer.ownerId === viewerId;
    }

    if (containingContainer?.visibility === "public") {
      return true;
    }

    if (containingContainer?.visibility === "hidden") {
      return false;
    }

    return card.faceUp;
  }

  function viewerCanModifyContainer(container) {
    if (!container) return false;

    const manipulation = container.manipulation || (container.kind === "hand" ? "owner" : "public");

    if (manipulation === "public") return true;
    if (manipulation === "owner") {
      return Boolean(container.ownerId) && container.ownerId === viewerId;
    }

    return false;
  }

  function getAcceptingContainerAtPoint(point, draggedObjectId) {
    const acceptingContainers = Object.values(containers || {})
      .filter((container) => {
        if (container.areaId !== area.id || !container.acceptsCards) return false;
        if (!viewerCanModifyContainer(container)) return false;
        if (!isPointInsideObject(point, container)) return false;
        if (container.cardIds.includes(draggedObjectId)) return true;

        const draggedObject = getObjectById(draggedObjectId);
        if (!draggedObject) return false;

        if (draggedObject.objectType === "card" && !container.acceptsCards) return false;

        if (draggedObject.objectType === "container") {
          if (!container.acceptsContainers) return false;

          const acceptedKinds = container.acceptedContainerKinds || [];
          if (acceptedKinds.length > 0 && !acceptedKinds.includes(draggedObject.kind)) {
            return false;
          }
        }

        if (container.maxCards === null || container.maxCards === undefined) return true;
        return container.cardIds.length < container.maxCards;
      })
      .sort((first, second) => {
        const draggedObject = getObjectById(draggedObjectId);

        if (draggedObject?.objectType === "card") {
          if (first.kind === "column" && second.kind !== "column") return -1;
          if (second.kind === "column" && first.kind !== "column") return 1;
        }

        return (second.zIndex || 0) - (first.zIndex || 0);
      });

    return acceptingContainers[0] || null;
  }

  function getSpreadInsertIndex(point, container) {
    const cardCount = container.cardIds.length;
    const firstItem = getObjectById(container.cardIds[0]);
    const effectiveFirstItem = firstItem?.objectType === "container"
      ? getEffectiveObjectRect(firstItem)
      : firstItem;
    const spacing = getSpreadCardSpacing(container, effectiveFirstItem);

    if (isVerticalSpreadContainer(container)) {
      if (isUpwardColumn(container)) {
        const relativeFromBottom = container.y + container.height - point.y;
        return clamp(Math.round(relativeFromBottom / spacing), 0, cardCount);
      }

      const relativeY = point.y - container.y - SPREAD_CARD_TOP;
      return clamp(Math.round(relativeY / spacing), 0, cardCount);
    }

    const relativeX = point.x - container.x;
    return clamp(Math.round(relativeX / spacing), 0, cardCount);
  }

  function getSpreadCardLocalRects(container) {
    const cardIds = container.cardIds || [];
    const firstItem = getObjectById(cardIds[0]);
    const effectiveFirstItem = firstItem?.objectType === "container"
      ? getEffectiveObjectRect(firstItem)
      : firstItem;
    const spacing = getSpreadCardSpacing(container, effectiveFirstItem);
    const fallbackWidth = 180;
    const fallbackHeight = 250;
    const effectiveContainer = getEffectiveObjectRect(container);

    return cardIds.map((objectId, index) => {
      const item = getObjectById(objectId);
      const effectiveItem = item?.objectType === "container"
        ? getEffectiveObjectRect(item)
        : item;
      const isVertical = isVerticalSpreadContainer(container);
      const itemWidth = effectiveItem?.width || fallbackWidth;
      const itemHeight = effectiveItem?.height || fallbackHeight;

      return {
        x: isVertical || container.layout === "single" ? 0 : index * spacing,
        y: isUpwardColumn(container)
          ? effectiveContainer.height - itemHeight - index * spacing
          : isVertical
            ? SPREAD_CARD_TOP + index * spacing
            : SPREAD_CARD_TOP,
        width: itemWidth,
        height: itemHeight,
      };
    });
  }

  function getSpreadCardInternalPosition(container, cardIndex) {
    const localRects = getSpreadCardLocalRects(container);
    const localRect = localRects[cardIndex] || { x: 0, y: SPREAD_CARD_TOP };
    const effectiveContainer = getEffectiveObjectRect(container);
    return {
      x: effectiveContainer.x + localRect.x,
      y: effectiveContainer.y + localRect.y,
    };
  }

  function getSpreadCardDisplayRects(container) {
    return getSpreadCardLocalRects(container).map((localRect) => ({
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
    onChangeState((currentState) => bringCardToTop(currentState, card.id));

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

  function startPotentialContainerDrag({ event, container, point }) {
    if (container.kind === "column") {
      onChangeState((currentState) => bringContainerToTop(currentState, container.id));

      setDragState({
        type: "placed-container",
        pointerId: event.pointerId,
        containerId: container.id,
        startX: point.x,
        startY: point.y,
        offsetX: point.x - container.x,
        offsetY: point.y - container.y,
        moved: false,
      });
      return;
    }

    setDragState({
      type: "container",
      pointerId: event.pointerId,
      containerId: container.id,
      startX: point.x,
      startY: point.y,
      moved: false,
    });
  }

  function startPotentialContainerCardDrag({ event, container, card, cardIndex, point }) {
    const cardPosition = getSpreadCardInternalPosition(container, cardIndex);

    setDragState({
      type: "container-card",
      pointerId: event.pointerId,
      containerId: container.id,
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

  function handleContainerPointerDown(event, container) {
    event.preventDefault();
    event.stopPropagation();

    const point = getAreaPoint(event);
    startPotentialContainerDrag({ event, container, point });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleContainerCardPointerDown(event, container, card, cardIndex) {
    event.preventDefault();
    event.stopPropagation();

    const point = getAreaPoint(event);
    startPotentialContainerCardDrag({ event, container, card, cardIndex, point });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function convertContainerDragToCardDrag(currentDragState, point) {
    const container = containers[currentDragState.containerId];

    if (!container || container.cardIds.length === 0 || !viewerCanModifyContainer(container)) {
      return currentDragState;
    }

    const canPullCard = container.kind === "deck" || container.kind === "slot";
    if (!canPullCard) return currentDragState;

    const topCardId = container.cardIds[container.cardIds.length - 1];
    const topCard = cards[topCardId];
    if (!topCard) return currentDragState;

    const displayFaceUp = viewerCanSeeCardFace(topCard);

    onSelectObject(null);

    onChangeState((currentState) => {
      const result =
        container.kind === "deck"
          ? drawTopCardFromContainer(currentState, container.id)
          : takeCardFromContainer(currentState, container.id, topCardId, {
              x: container.x,
              y: container.y,
              faceUp: displayFaceUp ? true : topCard.faceUp,
              bringToTop: true,
            });

      return result.state;
    });

    return {
      type: "card",
      pointerId: currentDragState.pointerId,
      cardId: topCardId,
      startX: currentDragState.startX,
      startY: currentDragState.startY,
      offsetX: point.x - container.x,
      offsetY: point.y - container.y,
      moved: true,
    };
  }

  function convertContainerCardDragToLooseCardDrag(currentDragState, point) {
    const container = containers[currentDragState.containerId];
    const card = getObjectById(currentDragState.cardId);

    if (!container || !card || !container.cardIds.includes(card.id)) {
      return currentDragState;
    }

    if (!viewerCanModifyContainer(container)) {
      return currentDragState;
    }

    const x = point.x - currentDragState.offsetX;
    const y = point.y - currentDragState.offsetY;
    const viewerOwnsContainer = container.ownerId === viewerId;
    const visibleToViewer =
      container.visibility === "public" ||
      (container.visibility === "owner" && viewerOwnsContainer);

    onSelectObject(null);

    onChangeState((currentState) => {
      const result = takeObjectFromContainer(currentState, container.id, card.id, {
        x,
        y,
        faceUp: card.objectType === "card" && visibleToViewer ? true : card.faceUp,
        bringToTop: true,
      });
      return result.state;
    });

    return {
      type: card.objectType === "container" ? "placed-container" : "card",
      pointerId: currentDragState.pointerId,
      cardId: card.objectType === "card" ? card.id : null,
      containerId: card.objectType === "container" ? card.id : null,
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

    if (dragState.type === "container") {
      if (!hasMoved) return;

      const nextDragState = convertContainerDragToCardDrag(dragState, point);
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

    if (dragState.type === "placed-container") {
      if (hasMoved && !dragState.moved) {
        setDragState((currentDragState) => ({
          ...currentDragState,
          moved: true,
        }));
      }

      onChangeState((currentState) =>
        moveContainer(
          currentState,
          dragState.containerId,
          point.x - dragState.offsetX,
          point.y - dragState.offsetY
        )
      );
      return;
    }

    if (dragState.type === "container-card") {
      if (!hasMoved) return;

      const nextDragState = convertContainerCardDragToLooseCardDrag(dragState, point);

      if (nextDragState.type === "placed-container") {
        setDragState(nextDragState);

        onChangeState((currentState) =>
          moveContainer(
            currentState,
            nextDragState.containerId,
            point.x - nextDragState.offsetX,
            point.y - nextDragState.offsetY
          )
        );
        return;
      }

      if (nextDragState.type !== "card") {
        setDragState((currentDragState) => ({
          ...currentDragState,
          moved: true,
        }));
        return;
      }

      setDragState(nextDragState);

      onChangeState((currentState) =>
        moveCard(
          currentState,
          nextDragState.cardId,
          point.x - nextDragState.offsetX,
          point.y - nextDragState.offsetY
        )
      );

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

      if (dragState.type === "container") {
        const container = containers[dragState.containerId];
        if (!dragState.moved && container) {
          if (selectedObjectId === dragState.containerId) {
            onSelectObject(null);
          } else {
            onSelectObject(dragState.containerId);
          }
        }
      }

      if (dragState.type === "container-card" && !dragState.moved) {
        const container = containers[dragState.containerId];
        const object = getObjectById(dragState.cardId);

        if (object?.objectType === "container") {
          if (selectedObjectId === object.id) {
            onSelectObject(null);
          } else {
            onSelectObject(object.id);
          }
        } else if (container?.kind === "hand" && object) {
          setFullSizeCardView({
            cardId: object.id,
            displayFaceUp: viewerCanSeeCardFace(object),
          });
          onSelectObject(null);
        } else if (object) {
          setFullSizeCardView({
            cardId: object.id,
            displayFaceUp: viewerCanSeeCardFace(object),
          });
          onSelectObject(null);
        }
      }

      if (dragState.type === "placed-container") {
        if (!dragState.moved) {
          if (selectedObjectId === dragState.containerId) {
            onSelectObject(null);
          } else {
            onChangeState((currentState) =>
              bringContainerToTop(currentState, dragState.containerId)
            );
            onSelectObject(dragState.containerId);
          }
        } else {
          const targetContainer = getAcceptingContainerAtPoint(point, dragState.containerId);

          if (targetContainer) {
            const index = isSpreadContainer(targetContainer)
              ? getSpreadInsertIndex(point, targetContainer)
              : null;

            onChangeState((currentState) =>
              moveObjectToContainer(currentState, dragState.containerId, targetContainer.id, {
                index,
              })
            );
            onSelectObject(null);
          }
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
          const targetContainer = getAcceptingContainerAtPoint(point, dragState.cardId);

          if (targetContainer) {
            const index = isSpreadContainer(targetContainer)
              ? getSpreadInsertIndex(point, targetContainer)
              : null;

            const faceUp = targetContainer.visibility === "public";

            onChangeState((currentState) =>
              moveObjectToContainer(currentState, dragState.cardId, targetContainer.id, {
                faceUp,
                index,
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

    const selectedCard = cards[selectedObjectId];
    if (!selectedCard) return;

    setFullSizeCardView({
      cardId: selectedCard.id,
      displayFaceUp: viewerCanSeeCardFace(selectedCard),
    });
    onSelectObject(null);
  }

  function handleShuffleContainer(containerId) {
    onChangeState((currentState) => shuffleContainer(currentState, containerId));
    onSelectObject(null);
  }

  function handlePutDiscardOnBottom(discardContainerId) {
    const drawDeck = getContainerByKind("deck");
    if (!drawDeck) return;

    onChangeState((currentState) =>
      putContainerOnBottomOfDeck(currentState, discardContainerId, drawDeck.id)
    );
    onSelectObject(null);
  }

  function getSelectedObject() {
    if (!selectedObjectId) return null;
    return cards[selectedObjectId] || containers[selectedObjectId] || null;
  }

  function getMenuActions(selectedObject) {
    if (!selectedObject) return [];

    if (selectedObject.objectType === "card") {
      return [
        { label: "Flip", onClick: handleFlipSelected },
        { label: "Full Size", onClick: handleViewFullSize },
      ];
    }

    if (selectedObject.objectType === "container" && selectedObject.kind === "deck") {
      return [
        { label: "Shuffle", onClick: () => handleShuffleContainer(selectedObject.id) },
      ];
    }

    if (selectedObject.objectType === "container" && selectedObject.kind === "discard") {
      return [
        { label: "Shuffle", onClick: () => handleShuffleContainer(selectedObject.id) },
        {
          label: "Put Under Deck",
          onClick: () => handlePutDiscardOnBottom(selectedObject.id),
        },
      ];
    }

    if (
      selectedObject.objectType === "container" &&
      (selectedObject.kind === "hand" ||
        selectedObject.kind === "row" ||
        selectedObject.kind === "column")
    ) {
      if (!viewerCanModifyContainer(selectedObject)) return [];

      return [
        { label: "Shuffle", onClick: () => handleShuffleContainer(selectedObject.id) },
      ];
    }

    return [];
  }

  const selectedObject = getSelectedObject();
  const selectedObjectRect = selectedObject ? getDisplayRect(selectedObject) : null;
  const selectedMenuActions = getMenuActions(selectedObject);
  const fullSizeCard = fullSizeCardView ? cards[fullSizeCardView.cardId] : null;
  const viewportWidth = viewportSize.width || area.width;
  const viewportHeight = viewportSize.height || area.height;

  const areaObjects = area.objectIds
    .map((objectId) => cards[objectId] || containers[objectId])
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
        if (object.objectType === "container" && isSpreadContainer(object)) {
          const spreadItems = object.cardIds.map((objectId) => getObjectById(objectId)).filter(Boolean);

          return (
            <SpreadContainerObject
              key={object.id}
              container={object}
              items={spreadItems}
              cardsById={cards}
              containersById={containers}
              displayRect={getDisplayRect(object)}
              cardDisplayRects={getSpreadCardDisplayRects(object)}
              selected={selectedObjectId === object.id}
              selectedCardId={selectedObjectId}
              getCardZIndex={getSpreadCardZIndex}
              viewerId={viewerId}
              onPointerDown={handleContainerPointerDown}
              onCardPointerDown={handleContainerCardPointerDown}
              onNestedCardPointerDown={handleContainerCardPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          );
        }

        if (object.objectType === "container") {
          const topObjectId = object.cardIds[object.cardIds.length - 1];
          const topObject = topObjectId ? getObjectById(topObjectId) : null;
          const topCard = topObject?.objectType === "card"
            ? topObject
            : cards[topObject?.cardIds?.[topObject.cardIds.length - 1]] || null;

          return (
            <CardContainerObject
              key={object.id}
              container={object}
              topCard={topCard}
              displayRect={getDisplayRect(object)}
              cardCount={object.cardIds.length}
              selected={selectedObjectId === object.id}
              onPointerDown={handleContainerPointerDown}
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

      <FullSizeCardModal
        card={fullSizeCard}
        displayFaceUp={fullSizeCardView?.displayFaceUp}
        onClose={() => setFullSizeCardView(null)}
      />
    </div>
  );
}

export default AreaPanel;
