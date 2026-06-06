import { useState } from "react";
import AreaPanel from "../../cardCore/AreaPanel";
import { createInitialState } from "./rules";
import "./view.css";

function CardCoreTestView({ state: engineState, submitAction }) {
  const [localState, setLocalState] = useState(engineState || createInitialState());
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [scale, setScale] = useState(0.5);

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

  return (
    <div className="card-core-test-view">
      <div className="test-header">
        <div>
          <h2>Card Core Test</h2>
          <p>
            Drag cards around the table. Tap/click a card, deck, or discard pile to select it. Tap/click the
            selected object again to unselect it. Drag from the deck to pull the top card onto the table. Drag a card onto the discard pile to discard it.
          </p>
        </div>

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
      </div>

      <AreaPanel
        area={tableArea}
        cards={localState.cards}
        decks={localState.decks}
        selectedObjectId={selectedObjectId}
        onSelectObject={setSelectedObjectId}
        onChangeState={updateState}
        scale={scale}
      />

      <div className="state-panel">
        <strong>Game State</strong>
        <pre>{JSON.stringify(localState, null, 2)}</pre>
      </div>
    </div>
  );
}

export default CardCoreTestView;
