function getCardImage(card, showFaces) {
  return showFaces ? card.frontImage : card.backImage;
}

function getContainerPreviewItems(container, itemsById) {
  return (container.cardIds || [])
    .map((itemId) => itemsById[itemId])
    .filter(Boolean);
}

function isVerticalContainer(container) {
  return container.layout === "vertical-spread";
}

function getNestedItemSpacing(container, item) {
  const baseSize = isVerticalContainer(container)
    ? item?.height || container.height || 250
    : item?.width || container.width || 180;

  if (typeof container.overlapPercent === "number") {
    const safeOverlapPercent = Math.max(0, Math.min(container.overlapPercent, 95));
    return baseSize * (1 - safeOverlapPercent / 100);
  }

  return container.cardSpacing || 70;
}

function getNestedItemZIndex(container, index, totalItems) {
  if (container.zOrderDirection === "down") {
    return totalItems - index;
  }

  return index + 1;
}


function getNestedContainerEffectiveSize(container, items) {
  const firstItem = items[0];
  const spacing = getNestedItemSpacing(container, firstItem);
  const widths = items.map((item) => item?.width || container.width || 180);
  const heights = items.map((item) => item?.height || container.height || 250);
  const maxWidth = Math.max(container.width || 0, ...widths, 180);
  const maxHeight = Math.max(container.height || 0, ...heights, 250);

  if (isVerticalContainer(container)) {
    return {
      width: maxWidth,
      height: Math.max(
        container.height || 0,
        maxHeight + Math.max(0, items.length - 1) * spacing
      ),
    };
  }

  return {
    width: Math.max(
      container.width || 0,
      maxWidth + Math.max(0, items.length - 1) * spacing
    ),
    height: maxHeight,
  };
}

function getNestedItemLocalRect(container, item, index) {
  const spacing = getNestedItemSpacing(container, item);
  const width = item?.width || container.width || 180;
  const height = item?.height || container.height || 250;

  if (isVerticalContainer(container)) {
    return {
      left: 0,
      top: index * spacing,
      width,
      height,
    };
  }

  return {
    left: index * spacing,
    top: 0,
    width,
    height,
  };
}

function SpreadContainerObject({
  container,
  items,
  cardsById = {},
  containersById = {},
  displayRect,
  cardDisplayRects,
  selected,
  selectedCardId,
  getCardZIndex,
  viewerId,
  onPointerDown,
  onCardPointerDown,
  onNestedCardPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const ownerCanSeeFaces = container.ownerId && container.ownerId === viewerId;
  const showFaces = container.visibility === "public" || ownerCanSeeFaces;
  const itemsById = { ...cardsById, ...containersById };

  function renderCardItem(card, index, itemRect) {
    const displayFaceUp = showFaces;

    return (
      <div
        key={card.id}
        className={`spread-card ${selectedCardId === card.id ? "selected" : ""}`}
        style={{
          left: `${itemRect.x}px`,
          top: `${itemRect.y}px`,
          width: `${itemRect.width}px`,
          height: `${itemRect.height}px`,
          zIndex: getCardZIndex
            ? getCardZIndex(container, index, items.length)
            : index + 1,
        }}
        onPointerDown={(event) => onCardPointerDown(event, container, card, index)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={getCardImage(card, displayFaceUp)}
          alt={displayFaceUp ? "Card front" : "Card back"}
          draggable="false"
        />
      </div>
    );
  }

  function renderColumnItem(column, index, itemRect) {
    const previewItems = getContainerPreviewItems(column, itemsById);
    const previewCount = previewItems.length;
    const effectiveSize = getNestedContainerEffectiveSize(column, previewItems);
    const baseWidth = effectiveSize.width || column.width || itemRect.width;
    const baseHeight = effectiveSize.height || column.height || itemRect.height;
    const widthScale = baseWidth > 0 ? itemRect.width / baseWidth : 1;
    const heightScale = baseHeight > 0 ? itemRect.height / baseHeight : 1;

    return (
      <div
        key={column.id}
        className={`spread-column-item ${selectedCardId === column.id ? "selected" : ""}`}
        style={{
          left: `${itemRect.x}px`,
          top: `${itemRect.y}px`,
          width: `${itemRect.width}px`,
          height: `${itemRect.height}px`,
          zIndex: getCardZIndex
            ? getCardZIndex(container, index, items.length)
            : index + 1,
        }}
        onPointerDown={(event) => onCardPointerDown(event, container, column, index)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {previewItems.map((item, itemIndex) => {
          const localRect = getNestedItemLocalRect(column, item, itemIndex);
          const isCard = item.objectType === "card";

          return (
            <div
              key={item.id}
              className="spread-column-card-preview"
              style={{
                left: `${localRect.left * widthScale}px`,
                top: `${localRect.top * heightScale}px`,
                width: `${localRect.width * widthScale}px`,
                height: `${localRect.height * heightScale}px`,
                zIndex: getNestedItemZIndex(column, itemIndex, previewCount),
              }}
              onPointerDown={(event) => {
                if (!isCard || !onNestedCardPointerDown) return;
                onNestedCardPointerDown(event, column, item, itemIndex);
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {isCard ? (
                <img
                  src={getCardImage(item, showFaces)}
                  alt={showFaces ? "Card front" : "Card back"}
                  draggable="false"
                />
              ) : (
                <div className="spread-column-nested-container-label">
                  {item.name}
                </div>
              )}
            </div>
          );
        })}
        <div className="spread-column-label">{column.name}</div>
      </div>
    );
  }

  return (
    <div
      className={`spread-container ${container.kind}-container ${selected ? "selected" : ""}`}
      style={{
        left: `${displayRect.x}px`,
        top: `${displayRect.y}px`,
        width: `${displayRect.width}px`,
        height: `${displayRect.height}px`,
        zIndex: container.zIndex || 1,
      }}
      onPointerDown={(event) => onPointerDown(event, container)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="spread-title">
        <strong>{container.name}</strong>
        <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>

      {items.map((item, index) => {
        const itemRect = cardDisplayRects[index];

        if (item.objectType === "container") {
          return renderColumnItem(item, index, itemRect);
        }

        return renderCardItem(item, index, itemRect);
      })}
    </div>
  );
}

export default SpreadContainerObject;
