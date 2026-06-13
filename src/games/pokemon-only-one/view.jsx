// src/games/pokemon-only-one/view.jsx

import React, { useState } from "react";
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
  const [localPopup, setLocalPopup] = useState(null);
  const model = resolveModel(props);
  const baseActionBridge = createActionBridge(props);
  const actionBridge = createLocalPopupActionBridge(baseActionBridge, localPopup, setLocalPopup);

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

  const sharedPopup = model.display?.popup || null;
  const visibleSharedPopup = sharedPopup && shouldViewerSeePopup(model, sharedPopup, actionBridge.viewerSideId) ? sharedPopup : null;
  const visibleLocalPopup = localPopup && shouldViewerSeePopup(model, localPopup, actionBridge.viewerSideId) ? localPopup : null;
  const visiblePopup = visibleSharedPopup?.type === "COIN_FLIP" ? visibleSharedPopup : visibleLocalPopup || visibleSharedPopup;

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

function createLocalPopupActionBridge(baseActionBridge, localPopup, setLocalPopup) {
  return {
    ...baseActionBridge,
    send(action) {
      const actionType = action?.type || "UNKNOWN";

      if (actionType === "OPEN_ZONE_POPUP") {
        setLocalPopup({
          type: "ZONE_POPUP",
          zoneId: action.zoneId,
          openedBySideId: baseActionBridge.viewerSideId,
          localOnly: true,
        });
        return;
      }

      if (actionType === "OPEN_CARD_ZOOM") {
        setLocalPopup({
          type: "CARD_ZOOM",
          cardId: action.cardId,
          openedBySideId: baseActionBridge.viewerSideId,
          localOnly: true,
        });
        return;
      }

      if (actionType === "CLOSE_POPUP" || actionType === "CLOSE_CARD_ZOOM") {
        if (localPopup) {
          setLocalPopup(null);
          return;
        }

        baseActionBridge.send(action);
        return;
      }

      if (actionType === "DRAW_CARD") {
        setLocalPopup(null);
      }

      baseActionBridge.send(action);
    },
  };
}
