import { makeCommand } from '../../command/commandObjects';
import { logEvent } from '../../command/commandLog';
export const type = 'CLOSE_SCREEN';
export const mode = 'immediate';
export function create(params = {}) { return makeCommand(type, params, { playerId: params.playerId || params.playerSlot || null, source: 'display-core' }); }
export function run(state, command) {
  state.display.screen = { type: 'BATTLE_SCREEN' };
  return logEvent(state, { event: 'SCREEN_CHANGED', commandType: type, playerId: command.playerId, message: 'Returned to BATTLE_SCREEN.' });
}
