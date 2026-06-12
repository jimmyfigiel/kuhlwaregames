// src/core/card/commands/createCard.js

import { makeCommand } from "../../command/commandObjects";
import { appendLog } from "../../command/commandLog";
import { addCard } from "../cardState";

export const type = "CREATE_CARD";

export function create(params = {}) {
  return makeCommand(type, {
    mode: "auto",
    actor: params.ownerId || "System",
    playerId: params.ownerId || null,
    params: {
      cardId: params.cardId,
      definitionId: params.definitionId,
      name: params.name,
      cardType: params.cardType,
      imagePath: params.imagePath,
      ownerId: params.ownerId,
    },
  });
}

export function run(state, command) {
  const params = command.params;
  if (!params.cardId) throw new Error("CREATE_CARD requires cardId.");
  let next = addCard(state, {
    id: params.cardId,
    definitionId: params.definitionId || params.cardId,
    name: params.name || params.cardId,
    cardType: params.cardType || "Card",
    imagePath: params.imagePath || "",
    ownerId: params.ownerId || null,
    zoneId: null,
  });
  next = appendLog(next, {
    eventType: "CARD_CREATED",
    commandType: type,
    actor: params.ownerId || "System",
    status: "ok",
    message: `Created card ${params.name || params.cardId}.`,
  });
  return next;
}
