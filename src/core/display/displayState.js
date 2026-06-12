// src/core/display/displayState.js

import { cloneState } from "../command/commandObjects";

export function createEmptyDisplayState() {
  return {
    screen: null,
    zoom: null,
    selectedCardId: null,
    selectedTargetId: null,
  };
}

export function setScreen(state, screen) {
  const next = cloneState(state);
  next.display = next.display || createEmptyDisplayState();
  next.display.screen = screen;
  return next;
}

export function openCardZoom(state, cardId) {
  const next = cloneState(state);
  next.display = next.display || createEmptyDisplayState();
  next.display.zoom = {
    type: "CARD_ZOOM_POPUP",
    cardId,
  };
  return next;
}

export function closeCardZoom(state) {
  const next = cloneState(state);
  next.display = next.display || createEmptyDisplayState();
  next.display.zoom = null;
  return next;
}
