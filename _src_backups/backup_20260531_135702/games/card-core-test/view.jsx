import { useState } from "react";
import AreaPanel from "../../cardCore/AreaPanel";
import { createInitialState } from "./rules";
import "./view.css";

function CardCoreTestView({ state: engineState, submitAction }) {
  const [localState, setLocalState] = useState(engineState || createInitialState());
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [scale, setScale] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const tableArea = localState.areas.table;

  function updateState(updater) {
    setLocalState((currentState) => {
      const nextState =
        typeof updater === "function" ? updater(currentState) : updater;

      if (submitAction) {
        submitAction({
          type: "SET_STATE",
          state: nextState,
        });
      }

      return nextState;
    });
  }

  function resetView() {
    setScale(0.5);
    setPan({ x: 0, y: 0 });
  }

  return (
    <div className="card-core-test-view">
      <div className="test-header">
        <div>
          <h2>Card Core Test</h2>
          <p>
            Drag cards around the table. Tap/click a card, deck, or discard pile to select it. Tap/click the
            selected object again to unselect it. Drag from the deck to pull the top card onto the table. Drag a card onto the discard pile to discard it. Drag empty table space to pan the table.
          </p>
        </div>

        <div className="view-controls">
          <label className="scale-control">
            <span>Internal scale</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
            />
            <strong>{Math.round(scale * 100)}%</strong>
          </label>

          <div className="pan-readout">
            <span>Table pan</span>
            <strong>
              x {Math.round(pan.x)}, y {Math.round(pan.y)}
            </strong>
            <button type="button" onClick={resetView}>Reset View</button>
          </div>
        </div>
      </div>

      <AreaPanel
        area={tableArea}
        cards={localState.cards}
        decks={localState.decks}
        selectedObjectId={selectedObjectId}
        onSelectObject={setSelectedObjectId}
        onChangeState={updateState}
        scale={scale}
        pan={pan}
        onPanChange={setPan}
      />

      <div className="state-panel">
        <strong>Game State</strong>
        <pre>{JSON.stringify({ ...localState, view: { scale, pan } }, null, 2)}</pre>
      </div>
    </div>
  );
}

export default CardCoreTestView;
