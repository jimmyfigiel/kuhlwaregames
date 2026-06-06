function getContainerImage(container, topCard) {
  if (!topCard) return null;

  if (container.kind === "deck") {
    return topCard.backImage;
  }

  return topCard.faceUp ? topCard.frontImage : topCard.backImage;
}

function CardContainerObject({
  container,
  topCard,
  displayRect,
  cardCount,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const imageSource = getContainerImage(container, topCard);
  const className = [
    "container-object",
    `${container.kind}-container`,
    selected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
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
      {imageSource ? (
        <img src={imageSource} alt={`${container.name} top card`} draggable="false" />
      ) : (
        <div className="empty-container-label">Empty</div>
      )}

      <div className="container-label">
        <strong>{container.name}</strong>
        <span>{cardCount} card{cardCount === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}

export default CardContainerObject;
