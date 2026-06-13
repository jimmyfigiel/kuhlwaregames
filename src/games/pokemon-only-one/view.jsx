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
import { canViewerInspectZone, shouldViewerSeePopup } from "./view/viewRules.js";
import "./styles.css";

export default function PokemonOnlyOneView(props) {
  const [localPopup, setLocalPopup] = useState(null);
  const [localPlacement, setLocalPlacement] = useState(null);
  const model = resolveModel(props);
  const baseActionBridge = createActionBridge(props);
  const actionBridge = createLocalPopupActionBridge(model, baseActionBridge, localPopup, setLocalPopup, setLocalPlacement);

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
      <BattleScreen model={model} actionBridge={actionBridge} localPlacement={localPlacement} />
      <SetupPanel model={model} actionBridge={actionBridge} />
      <TestModeNotice model={model} actionBridge={actionBridge} />
      <SelectionNotice model={model} actionBridge={actionBridge} localPlacement={localPlacement} />
      {visiblePopup && <Popup model={model} popup={visiblePopup} actionBridge={actionBridge} playerSlot={actionBridge.playerSlot} />}
      <LogPanel model={model} actionBridge={actionBridge} />
    </div>
  );
}

function createLocalPopupActionBridge(model, baseActionBridge, localPopup, setLocalPopup, setLocalPlacement) {
  return {
    ...baseActionBridge,
    send(action) {
      const actionType = action?.type || "UNKNOWN";

      if (actionType === "OPEN_ZONE_POPUP") {
        const zone = model?.zones?.[action.zoneId] || null;

        if (!canViewerInspectZone(model, zone, baseActionBridge.viewerSideId)) {
          console.warn("[pokemon-only-one view] blocked private zone popup", {
            zoneId: action.zoneId,
            viewerSideId: baseActionBridge.viewerSideId,
            ownerId: zone?.ownerId || null,
            zoneKind: zone?.zoneKind || null,
          });
          return;
        }

        setLocalPopup({
          type: "ZONE_POPUP",
          zoneId: action.zoneId,
          openedBySideId: baseActionBridge.viewerSideId,
          localOnly: true,
        });
        return;
      }


      if (actionType === "SELECT_POKEMON_FOR_PLACEMENT") {
        const sourceZone = model?.zones?.[action.sourceZoneId] || null;
        const card = model?.cards?.[action.cardId] || null;

        if (!sourceZone || !card) {
          console.warn("[pokemon-only-one view] blocked local placement selection for missing card or source zone", {
            cardId: action.cardId,
            sourceZoneId: action.sourceZoneId,
          });
          return;
        }

        if (!canViewerInspectZone(model, sourceZone, baseActionBridge.viewerSideId)) {
          console.warn("[pokemon-only-one view] blocked local placement selection from private zone", {
            cardId: action.cardId,
            sourceZoneId: action.sourceZoneId,
            viewerSideId: baseActionBridge.viewerSideId,
            ownerId: sourceZone.ownerId,
          });
          return;
        }

        setLocalPlacement({
          type: "PLACE_POKEMON",
          cardId: action.cardId,
          sourceZoneId: action.sourceZoneId,
          selectedBySideId: baseActionBridge.viewerSideId,
        });
        setLocalPopup(null);
        return;
      }

      if (actionType === "CLEAR_SELECTION") {
        setLocalPlacement(null);
        setLocalPopup(null);
        baseActionBridge.send(action);
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

      if (actionType === "DRAW_CARD" || actionType === "PLACE_SELECTED_POKEMON" || actionType === "PLACE_POKEMON_FROM_HAND") {
        setLocalPopup(null);
        setLocalPlacement(null);
      }

      baseActionBridge.send(action);
    },
  };
}
