// src/games/pokemon/pokemonCommands.js
import {
  addDamage,
  attachCard,
  cardIsInPlayerList,
  dealPrizes,
  detachToDiscard,
  drawCards,
  moveCardToActive,
  moveCardToBench,
  moveCardToPlayerList,
  removeCardFromEverywhere,
} from "../../core/card/cardEngine";
import {
  clearCommands,
  completeCurrentCommand,
  createCommand,
  createCommandState,
  getCurrentCommand,
  pushCommand,
} from "../../core/command/commandEngine";
import {
  attackDamageNumber,
  findCardDefinitionById,
  getEnergyTypeFromCard,
  getRealAttacks,
} from "./pokemonData";

export const PLAYER_IDS = ["p1", "p2"];

export function createInitialCommandState() {
  return createCommandState([
    createCommand({
      type: "CHOOSE_ACTIVE_BASIC",
      playerId: "p1",
      title: "Player 1: Choose Active Pokémon",
      description: "Choose a Basic Pokémon from Player 1's hand.",
      required: true,
    }),
  ]);
}

export function canCurrentUserControlPlayer(state, playerSlot, playerId) {
  if (state.options?.controlMode === "solo-test") return true;
  return playerSlot === playerId;
}

export function getOpponentId(playerId) {
  return playerId === "p1" ? "p2" : "p1";
}

export function getDefinition(state, cardId) {
  const card = state.cardsById[cardId];
  return card ? findCardDefinitionById(card.definitionId) : null;
}

export function isBasicPokemonCard(state, cardId) {
  return Boolean(getDefinition(state, cardId)?.isBasicPokemon);
}

export function isEnergyCard(state, cardId) {
  return Boolean(getDefinition(state, cardId)?.isEnergy);
}

export function getAvailableBenchIndex(player) {
  return (player.bench ?? []).findIndex((slot) => !slot);
}

export function submitPokemonAction(state, playerSlot, action) {
  try {
    switch (action.type) {
      case "CHOOSE_ACTIVE_BASIC":
        return chooseActiveBasic(state, playerSlot, action);
      case "PLAY_BASIC_TO_BENCH":
        return playBasicToBench(state, playerSlot, action);
      case "ATTACH_ENERGY":
        return attachEnergy(state, playerSlot, action);
      case "DRAW_FOR_TURN":
        return drawForTurn(state, playerSlot, action);
      case "DECLARE_ATTACK":
        return declareAttack(state, playerSlot, action);
      case "ADD_DAMAGE":
        return withMessage(addDamage(state, action.cardId, action.amount), `Damage adjusted by ${action.amount}.`);
      case "KNOCK_OUT":
        return knockOutPokemon(state, playerSlot, action);
      case "TAKE_PRIZE":
        return takePrize(state, playerSlot, action);
      case "PROMOTE_ACTIVE":
        return promoteActive(state, playerSlot, action);
      case "END_TURN":
        return endTurn(state, playerSlot);
      case "CLEAR_COMMANDS":
        return { ...state, commands: clearCommands(state.commands) };
      default:
        return withMessage(state, `Unknown action: ${action.type}`);
    }
  } catch (error) {
    return withMessage(state, error.message || "That action could not be completed.");
  }
}

function chooseActiveBasic(state, playerSlot, action) {
  const current = getCurrentCommand(state.commands);
  const playerId = current?.playerId;

  if (current?.type !== "CHOOSE_ACTIVE_BASIC") {
    throw new Error("The game is not currently choosing an Active Pokémon.");
  }

  if (!canCurrentUserControlPlayer(state, playerSlot, playerId)) {
    throw new Error("You cannot control that player.");
  }

  if (!cardIsInPlayerList(state, action.cardId, playerId, "hand")) {
    throw new Error("Choose a card from that player's hand.");
  }

  if (!isBasicPokemonCard(state, action.cardId)) {
    throw new Error("You must choose a Basic Pokémon.");
  }

  let next = moveCardToActive(state, action.cardId, playerId);
  next.commands = completeCurrentCommand(next.commands, { cardId: action.cardId });

  if (playerId === "p1") {
    next.commands = pushCommand(
      next.commands,
      createCommand({
        type: "CHOOSE_ACTIVE_BASIC",
        playerId: "p2",
        title: "Player 2: Choose Active Pokémon",
        description: "Choose a Basic Pokémon from Player 2's hand.",
        required: true,
      }),
    );
    next.turn.playerId = "p2";
    return withMessage(next, "Player 1 chose an Active Pokémon. Player 2 must choose an Active Pokémon.");
  }

  next = dealPrizes(next, "p1", 6);
  next = dealPrizes(next, "p2", 6);
  next.turn = {
    playerId: "p1",
    number: 1,
    phase: "MAIN",
    hasDrawnThisTurn: true,
    energyAttachedThisTurn: false,
    attackUsedThisTurn: false,
  };

  return withMessage(next, "Both Active Pokémon are ready. Prize cards were set. Player 1 begins.");
}

function playBasicToBench(state, playerSlot, action) {
  const playerId = action.playerId ?? state.turn.playerId;

  if (!canCurrentUserControlPlayer(state, playerSlot, playerId)) {
    throw new Error("You cannot control that player.");
  }

  if (!cardIsInPlayerList(state, action.cardId, playerId, "hand")) {
    throw new Error("Choose a card from your hand.");
  }

  if (!isBasicPokemonCard(state, action.cardId)) {
    throw new Error("Only Basic Pokémon can be played to the Bench in this first version.");
  }

  const benchIndex = getAvailableBenchIndex(state.players[playerId]);
  if (benchIndex < 0) {
    throw new Error("The Bench is full.");
  }

  const next = moveCardToBench(state, action.cardId, playerId, benchIndex);
  return withMessage(next, `${playerLabel(playerId)} played a Basic Pokémon to the Bench.`);
}

function attachEnergy(state, playerSlot, action) {
  const playerId = action.playerId ?? state.turn.playerId;

  if (!canCurrentUserControlPlayer(state, playerSlot, playerId)) {
    throw new Error("You cannot control that player.");
  }

  if (state.turn.playerId !== playerId) {
    throw new Error("You can only attach Energy during that player's turn.");
  }

  if (state.turn.energyAttachedThisTurn) {
    throw new Error("That player has already attached Energy this turn.");
  }

  if (!cardIsInPlayerList(state, action.energyCardId, playerId, "hand")) {
    throw new Error("Choose an Energy card from your hand.");
  }

  if (!isEnergyCard(state, action.energyCardId)) {
    throw new Error("That card is not an Energy card.");
  }

  if (!pokemonBelongsToPlayerInPlay(state, action.targetCardId, playerId)) {
    throw new Error("Energy must be attached to one of your Pokémon in play.");
  }

  const next = attachCard(state, action.energyCardId, action.targetCardId);
  next.turn.energyAttachedThisTurn = true;

  return withMessage(next, `${playerLabel(playerId)} attached Energy.`);
}

function drawForTurn(state, playerSlot, action) {
  const playerId = action.playerId ?? state.turn.playerId;

  if (!canCurrentUserControlPlayer(state, playerSlot, playerId)) {
    throw new Error("You cannot control that player.");
  }

  if (state.turn.playerId !== playerId) {
    throw new Error("It is not that player's turn.");
  }

  if (state.turn.hasDrawnThisTurn) {
    throw new Error("That player has already drawn for the turn.");
  }

  const next = drawCards(state, playerId, 1);
  next.turn.hasDrawnThisTurn = true;
  return withMessage(next, `${playerLabel(playerId)} drew a card.`);
}

function declareAttack(state, playerSlot, action) {
  const playerId = state.turn.playerId;
  const opponentId = getOpponentId(playerId);

  if (!canCurrentUserControlPlayer(state, playerSlot, playerId)) {
    throw new Error("You cannot control the current player.");
  }

  if (state.turn.attackUsedThisTurn) {
    throw new Error("That player has already attacked this turn.");
  }

  const attackerId = state.players[playerId].active;
  const defenderId = state.players[opponentId].active;

  if (!attackerId || !defenderId) {
    throw new Error("Both players need an Active Pokémon.");
  }

  const attackerDefinition = getDefinition(state, attackerId);
  const attacks = getRealAttacks(attackerDefinition);
  const attack = attacks[action.attackIndex];

  if (!attack) {
    throw new Error("Choose a valid attack.");
  }

  if (!hasEnoughEnergyForAttack(state, attackerId, attack)) {
    throw new Error("Not enough attached Energy for that attack.");
  }

  const damage = attackDamageNumber(attack);
  let next = damage > 0 ? addDamage(state, defenderId, damage) : { ...state };
  next.turn.attackUsedThisTurn = true;
  next = withMessage(next, `${attackerDefinition.name} used ${attack.name}${damage ? ` for ${damage} damage` : ""}.`);

  return endTurn(next, playerSlot, { skipControlCheck: true });
}

function knockOutPokemon(state, playerSlot, action) {
  const cardId = action.cardId;
  const knockedOut = state.cardsById[cardId];

  if (!knockedOut) {
    throw new Error("Unknown Pokémon.");
  }

  const ownerId = knockedOut.ownerId;
  const prizeTakerId = getOpponentId(ownerId);

  if (!canCurrentUserControlPlayer(state, playerSlot, ownerId) && !canCurrentUserControlPlayer(state, playerSlot, prizeTakerId)) {
    throw new Error("You cannot resolve that Knock Out.");
  }

  let next = state;

  for (const attachedId of [...(knockedOut.attached ?? [])]) {
    next = detachToDiscard(next, attachedId, ownerId);
  }

  next = moveCardToPlayerList(next, cardId, ownerId, "discard", { faceUp: true });
  next.cardsById[cardId].damage = 0;

  next.commands = pushCommand(
    next.commands,
    createCommand({
      type: "TAKE_PRIZE",
      playerId: prizeTakerId,
      title: `${playerLabel(prizeTakerId)}: Take a Prize`,
      description: "Choose one of your face-down Prize cards and put it into your hand.",
      required: true,
      data: { knockedOutOwnerId: ownerId },
    }),
  );

  if (!next.players[ownerId].active && next.players[ownerId].bench.some(Boolean)) {
    next.commands = pushCommand(
      next.commands,
      createCommand({
        type: "PROMOTE_ACTIVE",
        playerId: ownerId,
        title: `${playerLabel(ownerId)}: Promote Active Pokémon`,
        description: "Choose a Benched Pokémon to become your new Active Pokémon.",
        required: true,
      }),
    );
  }

  return withMessage(next, "A Pokémon was Knocked Out.");
}

function takePrize(state, playerSlot, action) {
  const current = getCurrentCommand(state.commands);
  const playerId = current?.playerId ?? action.playerId;

  if (!canCurrentUserControlPlayer(state, playerSlot, playerId)) {
    throw new Error("You cannot control that player.");
  }

  if (!state.players[playerId]?.prizes?.length) {
    throw new Error("No Prize cards remain.");
  }

  const prizeIndex = Number(action.prizeIndex ?? 0);
  const cardId = state.players[playerId].prizes[prizeIndex];

  if (!cardId) {
    throw new Error("Choose a valid Prize card.");
  }

  let next = removeCardFromEverywhere(state, cardId);
  next.players[playerId].hand.push(cardId);
  next.cardsById[cardId].zoneId = `${playerId}.hand`;
  next.cardsById[cardId].faceUp = true;

  if (current?.type === "TAKE_PRIZE") {
    next.commands = completeCurrentCommand(next.commands, { cardId });
  }

  return withMessage(next, `${playerLabel(playerId)} took a Prize card.`);
}

function promoteActive(state, playerSlot, action) {
  const current = getCurrentCommand(state.commands);
  const playerId = current?.playerId ?? action.playerId;

  if (!canCurrentUserControlPlayer(state, playerSlot, playerId)) {
    throw new Error("You cannot control that player.");
  }

  if (!state.players[playerId].bench.includes(action.cardId)) {
    throw new Error("Choose one of your Benched Pokémon.");
  }

  let next = moveCardToActive(state, action.cardId, playerId);

  if (current?.type === "PROMOTE_ACTIVE") {
    next.commands = completeCurrentCommand(next.commands, { cardId: action.cardId });
  }

  return withMessage(next, `${playerLabel(playerId)} promoted a new Active Pokémon.`);
}

function endTurn(state, playerSlot, options = {}) {
  const currentPlayerId = state.turn.playerId;

  if (!options.skipControlCheck && !canCurrentUserControlPlayer(state, playerSlot, currentPlayerId)) {
    throw new Error("You cannot control the current player.");
  }

  const nextPlayerId = getOpponentId(currentPlayerId);
  let next = {
    ...state,
    turn: {
      playerId: nextPlayerId,
      number: currentPlayerId === "p2" ? Number(state.turn.number ?? 1) + 1 : state.turn.number,
      phase: "DRAW",
      hasDrawnThisTurn: false,
      energyAttachedThisTurn: false,
      attackUsedThisTurn: false,
    },
  };

  next = withMessage(next, `${playerLabel(currentPlayerId)} ended the turn. ${playerLabel(nextPlayerId)} must draw.`);
  return next;
}

export function pokemonBelongsToPlayerInPlay(state, cardId, playerId) {
  const player = state.players[playerId];
  return player?.active === cardId || (player?.bench ?? []).includes(cardId);
}

export function hasEnoughEnergyForAttack(state, attackerId, attack) {
  const attacker = state.cardsById[attackerId];
  const attachedEnergyTypes = (attacker?.attached ?? [])
    .map((attachedId) => getEnergyTypeFromCard(getDefinition(state, attachedId)))
    .filter(Boolean);

  const required = [...(attack.cost ?? [])];

  for (const requiredType of required.filter((type) => type !== "Colorless")) {
    const index = attachedEnergyTypes.findIndex((type) => type === requiredType);
    if (index < 0) return false;
    attachedEnergyTypes.splice(index, 1);
  }

  const colorlessCount = required.filter((type) => type === "Colorless").length;
  return attachedEnergyTypes.length >= colorlessCount;
}

export function playerLabel(playerId) {
  return playerId === "p1" ? "Player 1" : "Player 2";
}

export function withMessage(state, message) {
  return {
    ...state,
    message,
    messageLog: [
      ...(state.messageLog ?? []),
      {
        message,
        at: new Date().toISOString(),
      },
    ].slice(-30),
  };
}
