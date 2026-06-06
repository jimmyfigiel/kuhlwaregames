function DeckObject({
  deck,
  topCard,
  displayRect,
  cardCount,
  onPointerDown,
}) {
  const imageSource = topCard
    ? topCard.faceUp
      ? topCard.frontImage
      : topCard.backImage
    : null;

  return (
    <div
      className={`deck-object ${deck.role === "discard" ? "discard-object" : ""}`}
      style={{
        left: `${displayRect.x}px`,
        top: `${displayRect.y}px`,
        width: `${displayRect.width}px`,
        height: `${displayRect.height}px`,
        zIndex: deck.zIndex || 1,
      }}
      onPointerDown={(event) => onPointerDown(event, deck)}
    >
      {imageSource ? (
        <img src={imageSource} alt={`${deck.name} top card`} draggable="false" />
      ) : (
        <div className="empty-deck-label">Empty</div>
      )}

      <div className="deck-label">
        <strong>{deck.name}</strong>
        <span>{cardCount} card{cardCount === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}

export default DeckObject;
