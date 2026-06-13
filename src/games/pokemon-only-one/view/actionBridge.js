// src/games/pokemon-only-one/view/actionBridge.js

export function createActionBridge(props) {
  const callback = props?.submitAction;
  const playerSlot = props?.playerSlot || props?.currentPlayerSlot || "p1";

  if (typeof callback !== "function") {
    return {
      ready: false,
      playerSlot,
      send(action) {
        console.error("[pokemon-only-one view] missing props.submitAction", { action, propKeys: Object.keys(props || {}) });
      },
    };
  }

  return {
    ready: true,
    playerSlot,
    send(action) {
      const cleanAction = {
        ...(action || {}),
        type: action?.type || "UNKNOWN",
        playerSlot,
      };

      console.log("[pokemon-only-one view] submitAction(action)", cleanAction);
      callback(cleanAction);
    },
  };
}
