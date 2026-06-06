function CardObject({
  card,
  displayRect,
  selected,
  displayFaceUp = card.faceUp,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  return (
    <div
      className={`card-object ${selected ? "selected" : ""}`}
      style={{
        left: `${displayRect.x}px`,
        top: `${displayRect.y}px`,
        width: `${displayRect.width}px`,
        height: `${displayRect.height}px`,
        zIndex: card.zIndex || 1,
      }}
      onPointerDown={(event) => onPointerDown(event, card)}
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
}

export default CardObject;
