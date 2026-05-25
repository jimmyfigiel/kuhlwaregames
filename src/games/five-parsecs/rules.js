const rules = {
  id: "five-parsecs",
  gameType: "five-parsecs",

  // V1 rule:
  // anyone allowed into the room may view and update all records.

  canViewRoom: ({ isRoomMember }) => Boolean(isRoomMember),

  canJoinRoom: ({ isAuthorizedPlayer }) =>
    Boolean(isAuthorizedPlayer),

  canCreateRoom: ({ isAuthorizedPlayer }) =>
    Boolean(isAuthorizedPlayer),

  canUpdateRoom: ({ isRoomMember }) =>
    Boolean(isRoomMember),

  canDeleteRoom: ({ isRoomCreator, isSuperUser }) =>
    Boolean(isRoomCreator || isSuperUser),

  canViewGameState: ({ isRoomMember }) =>
    Boolean(isRoomMember),

  canUpdateGameState: ({ isRoomMember }) =>
    Boolean(isRoomMember),

  canCreateRecord: ({ isRoomMember }) =>
    Boolean(isRoomMember),

  canReadRecord: ({ isRoomMember }) =>
    Boolean(isRoomMember),

  canUpdateRecord: ({ isRoomMember }) =>
    Boolean(isRoomMember),

  canDeleteRecord: ({ isRoomMember }) =>
    Boolean(isRoomMember),

  getInitialState: () => ({
    gameType: "five-parsecs",
    activeTab: "crew",
    createdAt: null,
    updatedAt: null,
  }),

  validateMove: () => true,

  applyMove: ({ state }) => state,
};

export default rules;

export const gameRules = rules;
export const id = rules.id;
export const gameType = rules.gameType;

export function getInitialState() {
  return rules.getInitialState();
}

export function canViewRoom(context = {}) {
  return rules.canViewRoom(context);
}

export function canJoinRoom(context = {}) {
  return rules.canJoinRoom(context);
}

export function canCreateRoom(context = {}) {
  return rules.canCreateRoom(context);
}

export function canUpdateRoom(context = {}) {
  return rules.canUpdateRoom(context);
}

export function canDeleteRoom(context = {}) {
  return rules.canDeleteRoom(context);
}

export function canViewGameState(context = {}) {
  return rules.canViewGameState(context);
}

export function canUpdateGameState(context = {}) {
  return rules.canUpdateGameState(context);
}

export function canCreateRecord(context = {}) {
  return rules.canCreateRecord(context);
}

export function canReadRecord(context = {}) {
  return rules.canReadRecord(context);
}

export function canUpdateRecord(context = {}) {
  return rules.canUpdateRecord(context);
}

export function canDeleteRecord(context = {}) {
  return rules.canDeleteRecord(context);
}

export function validateMove(context = {}) {
  return rules.validateMove(context);
}

export function applyMove(context = {}) {
  return rules.applyMove(context);
}