import "./PlayerPortal.css";

export default function ConfirmModal({ message, confirmLabel = "Confirm", onConfirm, onCancel }) {
  return (
    <div className="player-portal confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button type="button" className="danger-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
