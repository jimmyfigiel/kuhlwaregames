function FullSizeCardModal({ card, displayFaceUp = null, onClose }) {
  if (!card) return null;

  const showFront = displayFaceUp ?? card.faceUp;

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
          src={showFront ? card.frontImage : card.backImage}
          alt={showFront ? "Full size card front" : "Full size card back"}
          draggable="false"
        />
      </div>
    </div>
  );
}

export default FullSizeCardModal;
