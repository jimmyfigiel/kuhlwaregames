// src/games/pokemon-only-one/components/BridgeDiagnostics.jsx

import React from "react";

export function BridgeDiagnostics({ props, actionBridge }) {
  return (
    <pre className="poo-debug-pre">
      {JSON.stringify(
        {
          expectedContract: "props.submitAction(actionObject)",
          bridgeReady: actionBridge?.ready || false,
          receivedPropKeys: Object.keys(props || {}),
          receivedFunctionProps: Object.entries(props || {})
            .filter(([, value]) => typeof value === "function")
            .map(([key]) => key),
        },
        null,
        2
      )}
    </pre>
  );
}
