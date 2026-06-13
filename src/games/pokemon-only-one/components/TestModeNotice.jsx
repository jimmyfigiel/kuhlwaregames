// src/games/pokemon-only-one/components/TestModeNotice.jsx

import React from "react";
import { getPlayMode, isOnePlayerTestMode, playerSlotToSideId } from "../view/viewRules.js";

export function TestModeNotice({ model, actionBridge }) {
  const playMode = getPlayMode(model);
  const actingSide = playerSlotToSideId(actionBridge.playerSlot);
  const onePlayerTestMode = isOnePlayerTestMode(model);

  return (
    <section className={onePlayerTestMode ? "poo-test-mode-notice" : "poo-test-mode-notice poo-two-player-notice"} aria-live="polite">
      <span>
        {onePlayerTestMode
          ? "One-player test mode: this browser can inspect and move cards for both sides."
          : `Two-player mode: this browser is acting as ${actingSide}. Hidden zones stay hidden and only that side can act.`}
      </span>
      <button
        type="button"
        disabled={!actionBridge.ready}
        onClick={() =>
          actionBridge.send({
            type: "SET_PLAY_MODE",
            playMode: onePlayerTestMode ? "twoPlayer" : "onePlayerTest",
          })
        }
      >
        Switch to {onePlayerTestMode ? "Two-Player" : "One-Player Test"}
      </button>
    </section>
  );
}
