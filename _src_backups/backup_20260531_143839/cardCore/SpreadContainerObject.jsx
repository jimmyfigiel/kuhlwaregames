function SpreadContainerObject({
  container,
  cards,
  displayRect,
  cardDisplayRects,
  selected,
  selectedCardId,
  viewerId,
  onPointerDown,
  onCardPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const ownerCanSeeFaces = container.ownerId && container.ownerId === viewerId;
  const showFaces = container.visibility === "public" || ownerCanSeeFaces;

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
        <span>{cards.length} card{cards.length === 1 ? "" : "s"}</span>
      </div>

      {cards.map((card, index) => {
        const cardRect = cardDisplayRects[index];
        const displayFaceUp = showFaces;

        return (
          <div
            key={card.id}
            className={`spread-card ${selectedCardId === card.id ? "selected" : ""}`}
            style={{
              left: `${cardRect.x}px`,
              top: `${cardRect.y}px`,
              width: `${cardRect.width}px`,
              height: `${cardRect.height}px`,
              zIndex: index + 1,
            }}
            onPointerDown={(event) => onCardPointerDown(event, container, card, index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              src={displayFaceUp ? card.frontImage : card.backImage}
              alt={displayFaceUp ? "Card front" : "Card back"}
              draggable="false"
            />
          </div>
        );
      })}
    </div>
  );
}

export default SpreadContainerObject;
