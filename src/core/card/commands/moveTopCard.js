import { makeCommand } from '../../command/commandObjects';
import { logEvent } from '../../command/commandLog';
export const type = 'MOVE_TOP_CARD';
export const mode = 'script';
export function create(params = {}) { return makeCommand(type, params, { playerId: params.playerId || null, source: 'card-core' }); }
export function run(state, command) {
  const { fromZoneId, toZoneId } = command.params;
  const from = state.card.zonesById[fromZoneId];
  const to = state.card.zonesById[toZoneId];
  if (!from || !to) throw new Error(`Missing zone for MOVE_TOP_CARD.`);
  const cardId = from.cardIds.pop();
  if (!cardId) throw new Error(`${from.label} is empty.`);
  to.cardIds.push(cardId);
  state.card.cardsById[cardId].zoneId = toZoneId;
  return logEvent(state, { event: 'CARD_MOVED', commandType: type, playerId: to.playerId, message: `Moved top card from ${from.label} to ${to.label}.` });
}
