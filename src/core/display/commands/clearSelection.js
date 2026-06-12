import { makeCommand } from '../../command/commandObjects';
import { logEvent } from '../../command/commandLog';
export const type = 'CLEAR_SELECTION';
export const mode = 'immediate';
export function create(params = {}) { return makeCommand(type, params, { playerId: params.playerId || params.playerSlot || null, source: 'display-core' }); }
export function run(state, command) {
  state.display.selectedCardId = null;
  state.display.selectedTargetId = null;
  return logEvent(state, { event: 'SELECTION_CLEARED', commandType: type, playerId: command.playerId, message: 'Selection cleared.' });
}
