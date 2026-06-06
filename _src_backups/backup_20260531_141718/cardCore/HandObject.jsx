function HandObject({
  hand,
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
  const ownerCanSeeFaces = hand.ownerId && hand.ownerId === viewerId;

  return (
    <div
      className={`hand-object ${selected ? "selected" : ""}`}
      style={{
        left: `${displayRect.x}px`,
        top: `${displayRect.y}px`,
        width: `${displayRect.width}px`,
        height: `${displayRect.height}px`,
        zIndex: hand.zIndex || 1,
      }}
      onPointerDown={(event) => onPointerDown(event, hand)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="hand-title">
        <strong>{hand.name}</strong>
        <span>{cards.length} card{cards.length === 1 ? "" : "s"}</span>
      </div>

      {cards.map((card, index) => {
        const cardRect = cardDisplayRects[index];
        const displayFaceUp = ownerCanSeeFaces;

        return (
          <div
            key={card.id}
            className={`hand-card ${selectedCardId === card.id ? "selected" : ""}` }
            style={{
              left: `${cardRect.x}px`,
              top: `${cardRect.y}px`,
              width: `${cardRect.width}px`,
              height: `${cardRect.height}px`,
              zIndex: index + 1,
            }}
            onPointerDown={(event) => onCardPointerDown(event, hand, card, index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              src={displayFaceUp ? card.frontImage : card.backImage}
              alt={displayFaceUp ? "Hand card front" : "Hand card back"}
              draggable="false"
            />
          </div>
        );
      })}
    </div>
  );
}

export default HandObject;
