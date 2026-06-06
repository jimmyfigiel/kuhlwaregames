function getCardImage(card, showFaces) {
  return showFaces ? card.frontImage : card.backImage;
}

function getContainerPreviewCards(container, itemsById) {
  return (container.cardIds || [])
    .map((itemId) => itemsById[itemId])
    .filter((item) => item?.objectType === "card");
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
    const previewCards = getContainerPreviewCards(column, itemsById);
    const previewCount = previewCards.length;
    const previewSpacing = previewCount > 1 ? itemRect.height * 0.16 : 0;
    const previewHeight = previewCount > 1
      ? Math.max(40, itemRect.height - previewSpacing * (previewCount - 1))
      : itemRect.height;

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
        {previewCards.map((card, cardIndex) => (
          <div
            key={card.id}
            className="spread-column-card-preview"
            style={{
              left: 0,
              top: `${cardIndex * previewSpacing}px`,
              width: "100%",
              height: `${previewHeight}px`,
              zIndex:
                column.zOrderDirection === "down"
                  ? previewCount - cardIndex
                  : cardIndex + 1,
            }}
          >
            <img
              src={getCardImage(card, showFaces)}
              alt={showFaces ? "Card front" : "Card back"}
              draggable="false"
            />
          </div>
        ))}
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
