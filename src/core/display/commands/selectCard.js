import { makeCommand } from "../../command/commandObjects";
import { addLog, structuredCloneSafe } from "../../command/commandLog";

export const type = "SELECT_CARD";

export function create(params = {}) {
  return makeCommand({ type, playerId: params.playerId ?? "System", params });
}

export function run(state, command) {
  const next = structuredCloneSafe(state);
  const { cardId } = command.params;
  next.display.selectedCardId = cardId;
  const card = next.card.cards[cardId];
  return addLog(next, {
    event: "CARD_SELECTED",
    commandType: type,
    playerId: command.playerId ?? "System",
    status: "ok",
    message: `Selected ${card?.name ?? cardId}.`,
    details: { cardId },
  });
}
