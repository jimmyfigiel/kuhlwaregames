// src/games/pokemon-only-one/view.jsx

import React from "react";
import "./styles.css";

const REQUIRED_ACTION_CALLBACK = "submitAction";

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

  const area = model.area;
  const zoomCard = model.display?.zoomCardId ? model.cards?.[model.display.zoomCardId] : null;

  return (
    <div className="poo-shell">
      {!actionBridge.ready && <BridgeWarning props={props} actionBridge={actionBridge} />}

      <main className="poo-area" aria-label={area?.name || "Main Area"}>
        {(area?.spaceIds || []).map((spaceId) => (
          <CardSpace key={spaceId} model={model} spaceId={spaceId} actionBridge={actionBridge} />
        ))}
      </main>

      {zoomCard && (
        <div className="poo-zoom-backdrop" onClick={() => actionBridge.send({ type: "CLOSE_CARD_ZOOM" })}>
          <button
            type="button"
            className="poo-zoom-card"
            onClick={(event) => {
              event.stopPropagation();
              actionBridge.send({ type: "CLOSE_CARD_ZOOM" });
            }}
            aria-label={`Close zoom for ${zoomCard.name}`}
          >
            <img src={zoomCard.imagePath} alt={zoomCard.name} />
          </button>
        </div>
      )}

      <section className="poo-log-panel">
        <div className="poo-log-header">
          <strong>Log</strong>
          <button type="button" disabled={!actionBridge.ready} onClick={() => actionBridge.send({ type: "CLEAR_LOG" })}>
            Clear Log
          </button>
        </div>
        <textarea readOnly className="poo-log" value={formatLog(model.log)} />
      </section>

      <details className="poo-debug-details">
        <summary>Action bridge diagnostics</summary>
        <BridgeDiagnostics props={props} actionBridge={actionBridge} />
      </details>
    </div>
  );
}

function CardSpace({ model, spaceId, actionBridge }) {
  const space = model.spaces?.[spaceId];
  const card = space?.cardId ? model.cards?.[space.cardId] : null;

  return (
    <section className="poo-card-space" aria-label={space?.name || spaceId}>
      <div className="poo-card-space-title">{space?.name || spaceId}</div>
      {card ? (
        <button
          type="button"
          className="poo-card-button"
          disabled={!actionBridge.ready}
          onClick={() => actionBridge.send({ type: "OPEN_CARD_ZOOM", cardId: card.id })}
          aria-label={`Open zoom for ${card.name}`}
        >
          <img src={card.imagePath} alt={card.name} />
        </button>
      ) : (
        <div className="poo-empty-space">Empty</div>
      )}
    </section>
  );
}

function createActionBridge(props) {
  const callback = props?.[REQUIRED_ACTION_CALLBACK];
  const playerSlot = props?.playerSlot || props?.currentPlayerSlot || "p1";
  const propSummary = summarizeProps(props);

  if (typeof callback !== "function") {
    return {
      ready: false,
      requiredCallback: REQUIRED_ACTION_CALLBACK,
      playerSlot,
      propSummary,
      send(action) {
        const cleanAction = buildCleanAction(action, playerSlot);
        console.error("[pokemon-only-one MVC view] action bridge missing required callback", {
          requiredCallback: REQUIRED_ACTION_CALLBACK,
          attemptedAction: cleanAction,
          propSummary,
        });
      },
    };
  }

  return {
    ready: true,
    requiredCallback: REQUIRED_ACTION_CALLBACK,
    playerSlot,
    propSummary,
    send(action) {
      const cleanAction = buildCleanAction(action, playerSlot);

      console.log("[pokemon-only-one MVC view] sending action through explicit bridge", {
        callback: REQUIRED_ACTION_CALLBACK,
        action: cleanAction,
        propSummary,
      });

      // Explicit game-view contract:
      // The parent room shell provides props.submitAction(actionObject).
      // No callback name guessing and no signature guessing happen here.
      callback(cleanAction);
    },
  };
}

function buildCleanAction(action, playerSlot) {
  return {
    ...(action || {}),
    type: action?.type || "UNKNOWN",
    playerSlot,
  };
}

function BridgeWarning({ props, actionBridge }) {
  return (
    <section className="poo-bridge-warning">
      <strong>Action bridge is not wired.</strong>
      <p>
        This view now requires <code>props.{REQUIRED_ACTION_CALLBACK}(action)</code>. The diagnostic output showed this is the actual action callback provided by the room shell.
      </p>
      <BridgeDiagnostics props={props} actionBridge={actionBridge} />
    </section>
  );
}

function BridgeDiagnostics({ props, actionBridge }) {
  return (
    <pre className="poo-debug-pre">
      {JSON.stringify(
        {
          expectedContract: `props.${REQUIRED_ACTION_CALLBACK}(actionObject)`,
          bridgeReady: actionBridge?.ready || false,
          requiredCallback: REQUIRED_ACTION_CALLBACK,
          receivedPropKeys: Object.keys(props || {}),
          receivedFunctionProps: functionPropNames(props),
          propSummary: summarizeProps(props),
        },
        null,
        2
      )}
    </pre>
  );
}

function resolveModel(props) {
  const candidates = [
    props?.state,
    props?.gameState,
    props?.room?.gameState,
    props?.room?.state,
    props?.state?.gameState,
    props?.state?.state,
    props?.game?.state,
  ];

  return candidates.find(isPokemonModel) || null;
}

function isPokemonModel(value) {
  return Boolean(value && value.gameId === "pokemon-only-one" && value.area && value.spaces && value.cards && value.display && Array.isArray(value.log));
}

function formatLog(log) {
  return (log || [])
    .map((entry) => {
      const base = `#${String(entry.number).padStart(3, "0")} ${entry.time} | ${entry.type} | ${entry.message}`;
      return entry.details ? `${base} | ${JSON.stringify(entry.details)}` : base;
    })
    .join("\n");
}

function functionPropNames(props) {
  return Object.entries(props || {})
    .filter(([, value]) => typeof value === "function")
    .map(([key]) => key);
}

function summarizeProps(props) {
  const summary = {};
  for (const [key, value] of Object.entries(props || {})) {
    summary[key] = summarizeValue(value);
  }
  return summary;
}

function summarizeValue(value) {
  if (value === undefined) return "undefined";
  if (value === null) return null;
  if (typeof value === "function") return "function";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return `[array:${value.length}]`;
  if (typeof value === "object") {
    return {
      keys: Object.keys(value),
      gameId: value.gameId,
      type: value.type,
    };
  }
  return typeof value;
}
