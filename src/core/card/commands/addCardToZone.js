// src/core/card/commands/addCardToZone.js

import { makeCommand } from "../../command/commandObjects";
import { appendLog } from "../../command/commandLog";
import { putCardInZone } from "../cardState";

export const type = "ADD_CARD_TO_ZONE";

export function create(params = {}) {
  return makeCommand(type, {
    mode: "auto",
    actor: params.actor || "System",
    params: {
      cardId: params.cardId,
      zoneId: params.zoneId,
    },
  });
}

export function run(state, command) {
  const { cardId, zoneId } = command.params;
  let next = putCardInZone(state, cardId, zoneId);
  const card = next.cards[cardId];
  const zone = next.zones[zoneId];
  next = appendLog(next, {
    eventType: "CARD_ADDED_TO_ZONE",
    commandType: type,
    actor: "System",
    status: "ok",
    message: `Added ${card.name} to ${zone.label}.`,
  });
  return next;
}
