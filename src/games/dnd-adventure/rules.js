// This game's actual resolution happens server-side (aidm-server, calling a
// local Ollama model) over Firebase Realtime Database — see rtdb.js — not
// synchronously in the browser like this app's other games. An LLM call
// can't be a synchronous client-side function, so createInitialState/
// submitAction here only satisfy gameRegistry's contract; real gameplay
// flows through rtdb.js, not gameState/submitAction.
export function createInitialState() {
  return { bridgeSessionId: "session-aidm-1" };
}

export function submitAction({ state }) {
  return state;
}
