// src/games/pokemon-only-one/view.jsx

import React from "react";
import { BattleScreen } from "./components/BattleScreen.jsx";
import { BridgeDiagnostics } from "./components/BridgeDiagnostics.jsx";
import { LogPanel } from "./components/LogPanel.jsx";
import { Popup } from "./components/Popup.jsx";
import { SelectionNotice } from "./components/SelectionNotice.jsx";
import { TestModeNotice } from "./components/TestModeNotice.jsx";
import { createActionBridge } from "./view/actionBridge.js";
import { resolveModel } from "./view/viewModel.js";
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

  return (
    <div className="poo-shell">
      <BattleScreen model={model} actionBridge={actionBridge} />
      <TestModeNotice model={model} actionBridge={actionBridge} />
      <SelectionNotice model={model} actionBridge={actionBridge} />
      {popup && <Popup model={model} popup={popup} actionBridge={actionBridge} playerSlot={actionBridge.playerSlot} />}
      <LogPanel model={model} actionBridge={actionBridge} />
    </div>
  );
}
