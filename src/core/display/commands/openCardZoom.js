// src/core/display/commands/openCardZoom.js

import { makeCommand } from "../../command/commandObjects";
import { appendLog } from "../../command/commandLog";
import { openCardZoom } from "../displayState";

export const type = "OPEN_CARD_ZOOM";

export function create(params = {}) {
  return makeCommand(type, {
    mode: "immediate",
    actor: params.playerId || params.playerSlot || "System",
    playerId: params.playerId || params.playerSlot || null,
    params: {
      cardId: params.cardId,
    },
  });
}

export function run(state, command) {
  const { cardId } = command.params;
  if (!cardId) throw new Error("OPEN_CARD_ZOOM requires cardId.");
  const card = state.cards?.[cardId];
  if (!card) throw new Error(`Card ${cardId} does not exist.`);
  let next = openCardZoom(state, cardId);
  next = appendLog(next, {
    eventType: "POPUP_OPENED",
    commandType: type,
    actor: command.actor,
    status: "ok",
    message: `Opened zoom for ${card.name}.`,
    details: { cardId },
  });
  return next;
}
