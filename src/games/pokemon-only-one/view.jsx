// src/games/pokemon-only-one/view.jsx

import React from "react";
import { BattleScreen } from "./components/BattleScreen.jsx";
import { BridgeDiagnostics } from "./components/BridgeDiagnostics.jsx";
import { LogPanel } from "./components/LogPanel.jsx";
import { Popup } from "./components/Popup.jsx";
import { SelectionNotice } from "./components/SelectionNotice.jsx";
import { SetupPanel } from "./components/SetupPanel.jsx";
import { TestModeNotice } from "./components/TestModeNotice.jsx";
import { createActionBridge } from "./view/actionBridge.js";
import { resolveModel } from "./view/viewModel.js";
import { shouldViewerSeePopup } from "./view/viewRules.js";
import "./styles.css";

export default function PokemonOnlyOneView(props) {
  const model = resolveModel(props);
  const actionBridge = createActionBridge(props);

  if (!model) {
    return (
      <div className="poo-shell">
        <section className="poo-panel">
          <h2>Pokémon Only One</h2>
          <p>The view did not receive a pokemon-only-one model.</p>
          <BridgeDiagnostics props={props} actionBridge={actionBridge} />
        </section>
      </div>
    );
  }

  const popup = model.display?.popup || null;
  const visiblePopup = popup && shouldViewerSeePopup(model, popup, actionBridge.viewerSideId) ? popup : null;

  return (
    <div className="poo-shell">
      <BattleScreen model={model} actionBridge={actionBridge} />
      <SetupPanel model={model} actionBridge={actionBridge} />
      <TestModeNotice model={model} actionBridge={actionBridge} />
      <SelectionNotice model={model} actionBridge={actionBridge} />
      {visiblePopup && <Popup model={model} popup={visiblePopup} actionBridge={actionBridge} playerSlot={actionBridge.playerSlot} />}
      <LogPanel model={model} actionBridge={actionBridge} />
    </div>
  );
}
