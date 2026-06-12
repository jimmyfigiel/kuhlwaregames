import { makeCommand } from '../../command/commandObjects';
import { logEvent } from '../../command/commandLog';
export const type = 'SHUFFLE_ZONE';
export const mode = 'script';
export function create(params = {}) { return makeCommand(type, params, { playerId: params.playerId || null, source: 'card-core' }); }
export function run(state, command) {
  const zone = state.card.zonesById[command.params.zoneId];
  if (!zone) throw new Error(`Zone ${command.params.zoneId} does not exist.`);
  zone.cardIds = [...zone.cardIds].reverse();
  return logEvent(state, { event: 'ZONE_SHUFFLED', commandType: type, playerId: zone.playerId, message: `Shuffled ${zone.label}.` });
}
