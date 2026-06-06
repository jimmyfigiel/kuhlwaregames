function CardObject({
  card,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  return (
    <div
      className={`card-object ${selected ? "selected" : ""}`}
      style={{
        left: `${card.x}px`,
        top: `${card.y}px`,
        width: `${card.width}px`,
        height: `${card.height}px`,
        zIndex: card.zIndex || 1,
      }}
      onPointerDown={(event) => onPointerDown(event, card)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={card.faceUp ? card.frontImage : card.backImage}
        alt={card.faceUp ? "Card front" : "Card back"}
        draggable="false"
      />
    </div>
  );
}

export default CardObject;
