import { useMemo, useRef, useState } from "react";
import CardActionMenu from "./CardActionMenu";
import CardObject from "./CardObject";
import { flipCard, moveCard } from "./cardCoreActions";
import { getActionMenuPosition } from "./cardCoreLayout";
import "./cardCore.css";

export default function AreaPanel({ area, state, setState }) {
  const areaRef = useRef(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);

  const selectedCard = selectedObjectId ? state.cards[selectedObjectId] : null;

  const menuPosition = useMemo(() => {
    return getActionMenuPosition(selectedCard, areaRef.current);
  }, [selectedCard]);

  function handleAreaPointerDown(event) {
    if (event.target === areaRef.current) {
      setSelectedObjectId(null);
    }
  }

  function handleMoveCard(cardId, x, y) {
    setState((currentState) => moveCard(currentState, cardId, x, y));
  }

  function handleFlipSelectedCard() {
    if (!selectedObjectId) return;
    setState((currentState) => flipCard(currentState, selectedObjectId));
  }

  return (
    <div
      ref={areaRef}
      className="card-core-area"
      style={{
        width: `${area.width}px`,
        height: `${area.height}px`,
      }}
      onPointerDown={handleAreaPointerDown}
    >
      <div className="card-core-area-label">Area: {area.name}</div>

      {area.objectIds.map((objectId) => {
        const card = state.cards[objectId];
        if (!card) return null;

        return (
          <CardObject
            key={card.id}
            card={card}
            areaRef={areaRef}
            isSelected={selectedObjectId === card.id}
            onSelect={setSelectedObjectId}
            onMove={handleMoveCard}
          />
        );
      })}

      {selectedCard && (
        <CardActionMenu
          position={menuPosition}
          onFlip={handleFlipSelectedCard}
          onDeselect={() => setSelectedObjectId(null)}
        />
      )}
    </div>
  );
}
