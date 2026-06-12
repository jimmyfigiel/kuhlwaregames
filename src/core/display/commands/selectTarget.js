import { makeCommand } from '../../command/commandObjects';
import { logEvent } from '../../command/commandLog';
export const type = 'SELECT_TARGET';
export const mode = 'immediate';
export function create(params = {}) { return makeCommand(type, params, { playerId: params.playerId || params.playerSlot || null, source: 'display-core' }); }
export function run(state, command) {
  state.display.selectedTargetId = command.params.targetId || command.params.zoneId || null;
  return logEvent(state, { event: 'TARGET_SELECTED', commandType: type, playerId: command.playerId, message: `Selected target ${state.display.selectedTargetId}.`, details: { selectedTargetId: state.display.selectedTargetId } });
}
