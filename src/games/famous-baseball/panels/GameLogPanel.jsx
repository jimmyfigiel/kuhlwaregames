// /src/games/famous-baseball/panels/GameLogPanel.jsx

import React from "react";

export default function GameLogPanel({ log }) {
  return (
    <section className="fbb-card">
      <div className="fbb-log-title">Game Log</div>

      {!log || log.length === 0 ? (
        <div>No log entries yet.</div>
      ) : (
        <div>
          {log.map((entry, index) => (
            <div key={index} className="fbb-log-entry">
              <div className="fbb-log-entry-title">{entry.title}</div>
              <div className="fbb-log-entry-detail">{entry.detail}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}