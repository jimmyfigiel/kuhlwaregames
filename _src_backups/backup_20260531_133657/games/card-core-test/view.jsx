import { useState } from "react";
import AreaPanel from "../../cardCore/AreaPanel";
import { createInitialState } from "./rules";
import "./view.css";

function CardCoreTestView({ state: engineState, submitAction }) {
  const [localState, setLocalState] = useState(engineState || createInitialState());
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [scale, setScale] = useState(1);

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
            Drag either card. Tap/click a card to select it. Tap/click the
            selected card again to unselect it. Use the popup to flip it or view it full size. Selecting a card brings it to the top.
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
        selectedObjectId={selectedObjectId}
        onSelectObject={setSelectedObjectId}
        onChangeState={updateState}
        scale={scale}
      />

      <div className="state-panel">
        <strong>Card State</strong>
        <pre>{JSON.stringify(localState.cards, null, 2)}</pre>
      </div>
    </div>
  );
}

export default CardCoreTestView;
