export default function CardActionMenu({ position, onFlip, onDeselect }) {
  return (
    <div
      className="card-core-action-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button type="button" onClick={onFlip}>
        Flip
      </button>

      <button type="button" onClick={onDeselect}>
        Deselect
      </button>
    </div>
  );
}
