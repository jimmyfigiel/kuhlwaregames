// src/games/pokemon-only-one/components/LogPanel.jsx

import React from "react";
import { formatLog } from "../view/viewModel.js";

export function LogPanel({ model, actionBridge }) {
  return (
    <section className="poo-log-panel">
      <div className="poo-log-header">
        <strong>Log</strong>
        <button type="button" disabled={!actionBridge.ready} onClick={() => actionBridge.send({ type: "CLEAR_LOG" })}>
          Clear Log
        </button>
      </div>
      <textarea readOnly className="poo-log" value={formatLog(model.log)} />
    </section>
  );
}
