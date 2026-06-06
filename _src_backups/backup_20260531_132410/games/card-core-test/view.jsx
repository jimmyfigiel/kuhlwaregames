import { useState } from "react";
import AreaPanel from "../../cardCore/AreaPanel";
import { createInitialState } from "./rules";
import "./view.css";

export default function CardCoreTestView({ gameState, submitAction }) {
  const [localState, setLocalState] = useState(() => gameState || createInitialState());

  function updateState(updater) {
    setLocalState((currentState) => {
      const nextState = typeof updater === "function" ? updater(currentState) : updater;

      if (submitAction) {
        // This test view keeps movement local for responsiveness.
        // Full multiplayer synchronization can route MOVE_CARD and FLIP_CARD
        // through the engine submitAction function later.
      }

      return nextState;
    });
  }

  const tableArea = localState.areas.table;

  return (
    <div className="card-core-test-view">
      <h2>Card Core Test</h2>

      <p className="card-core-test-instructions">
        Drag the card to move it. Tap the card to select it. Use the nearby action
        buttons to flip it.
      </p>

      <AreaPanel area={tableArea} state={localState} setState={updateState} />

      <div className="card-core-test-state-panel">
        <strong>Card State</strong>
        <pre>{JSON.stringify(localState.cards["card-1"], null, 2)}</pre>
      </div>
    </div>
  );
}
