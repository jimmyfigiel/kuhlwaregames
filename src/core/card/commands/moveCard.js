// src/core/card/commands/moveCard.js

import { makeCommand } from "../../command/commandObjects";
import { appendLog } from "../../command/commandLog";
import { moveCard } from "../cardState";

export const type = "MOVE_CARD";

export function create(params = {}) {
  return makeCommand(type, {
    mode: params.mode || "auto",
    actor: params.actor || params.playerId || "System",
    playerId: params.playerId || null,
    params: {
      cardId: params.cardId,
      toZoneId: params.toZoneId,
    },
  });
}

export function run(state, command) {
  const { cardId, toZoneId } = command.params;
  let next = moveCard(state, cardId, toZoneId);
  const card = next.cards[cardId];
  const zone = next.zones[toZoneId];
  next = appendLog(next, {
    eventType: "CARD_MOVED",
    commandType: type,
    actor: command.actor,
    status: "ok",
    message: `Moved ${card.name} to ${zone.label}.`,
  });
  return next;
}
