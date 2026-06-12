import { makeCommand } from '../../command/commandObjects';
import { removeCardFromAllZones } from '../cardState';
import { logEvent } from '../../command/commandLog';
export const type = 'ATTACH_CARD';
export const mode = 'immediate';
export function create(params = {}) { return makeCommand(type, params, { playerId: params.playerId || null, source: 'card-core' }); }
export function run(state, command) {
  const { cardId, targetCardId } = command.params;
  const card = state.card.cardsById[cardId];
  const target = state.card.cardsById[targetCardId];
  if (!card || !target) throw new Error('Missing card for ATTACH_CARD.');
  state.card = removeCardFromAllZones(state.card, cardId);
  target.attachedIds = [...(target.attachedIds || []), cardId];
  card.zoneId = `attached:${targetCardId}`;
  return logEvent(state, { event: 'CARD_ATTACHED', commandType: type, playerId: target.ownerId, message: `Attached ${card.name} to ${target.name}.` });
}
