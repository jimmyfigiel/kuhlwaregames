function FullSizeCardModal({ card, onClose }) {
  if (!card) return null;

  return (
    <div className="card-modal-backdrop" onPointerDown={onClose}>
      <div
        className="card-modal"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="card-modal-close" onClick={onClose}>
          ×
        </button>

        <img
          src={card.faceUp ? card.frontImage : card.backImage}
          alt={card.faceUp ? "Full size card front" : "Full size card back"}
          draggable="false"
        />
      </div>
    </div>
  );
}

export default FullSizeCardModal;
