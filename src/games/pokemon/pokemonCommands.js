// src/games/pokemon/pokemonCommands.js
// Pokémon-specific command chains built on top of Card Core + Command Core.
// Buttons should enqueue/start commands; resolver commands perform the mutations.

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
  completeCurrentCommand,
  createCommand,
  createCommandState,
  getCurrentCommand,
} from "../../core/command/commandEngine";
import {
  attackDamageNumber,
  findCardDefinitionById,
  getEnergyTypeFromCard,
  getRealAttacks,
} from "./pokemonData";

export const PLAYER_IDS = ["p1", "p2"];

const MAIN_PHASE_MENU = ["HAND", "CHECK", "RETREAT", "ATTACK", "POWER", "DONE"];
const AUTO_COMMAND_TYPES = new Set([
  "RESOLVE_PLAY_BASIC_TO_BENCH",
  "RESOLVE_ATTACH_ENERGY",
  "RESOLVE_ATTACK",
  "CHECK_KNOCKOUTS",
  "RESOLVE_END_TURN",
]);

export function createInitialCommandState() {
  return createCommandState([makeChooseActiveCommand("p1")]);
}

export function makeChooseActiveCommand(playerId) {
  return createCommand({
    type: "CHOOSE_ACTIVE_BASIC",
    playerId,
    title: `${playerLabel(playerId)}: Choose Active Pokémon`,
    description: `Choose a Basic Pokémon from ${playerLabel(playerId)}'s hand.`,
    required: true,
    data: {
      source: `${playerId}.hand`,
      validCardType: "BASIC_POKEMON",
      resultAction: "MOVE_TO_ACTIVE",
    },
  });
}

export function makeDrawForTurnCommand(playerId) {
  return createCommand({
    type: "DRAW_FOR_TURN",
    playerId,
    title: `${playerLabel(playerId)}: Draw for turn`,
    description: "Draw 1 card before taking main phase actions.",
    required: true,
    data: {
      count: 1,
      resultAction: "DRAW_CARDS",
    },
  });
}

export function makeMainPhaseCommand(playerId) {
  return createCommand({
    type: "MAIN_PHASE",
    playerId,
    title: `${playerLabel(playerId)}: Main Phase`,
    description: "Choose an action. Action buttons add command chains to the queue.",
    required: true,
    data: {
      menu: MAIN_PHASE_MENU,
      commandStarters: [
        "START_PLAY_BASIC_TO_BENCH",
        "START_ATTACH_ENERGY",
        "START_ATTACK",
        "START_END_TURN",
      ],
    },
  });
}

export function makeTakePrizeCommand(playerId, data = {}) {
  return createCommand({
    type: "TAKE_PRIZE",
    playerId,
    title: `${playerLabel(playerId)}: Take a Prize`,
    description: "Choose one of your face-down Prize cards and put it into your hand.",
    required: true,
    data,
  });
}

export function makePromoteActiveCommand(playerId) {
  return createCommand({
    type: "PROMOTE_ACTIVE",
    playerId,
    title: `${playerLabel(playerId)}: Promote Active Pokémon`,
    description: "Choose a Benched Pokémon to become your new Active Pokémon.",
    required: true,
  });
}

function makeChooseBasicFromHandCommand(playerId, data = {}) {
  return createCommand({
    type: "CHOOSE_BASIC_FROM_HAND",
    playerId,
    title: `${playerLabel(playerId)}: Choose a Basic Pokémon`,
    description: "Choose a Basic Pokémon from your hand.",
    required: true,
    data,
  });
}

function makeResolvePlayBasicToBenchCommand(playerId, data = {}) {
  return createCommand({
    type: "RESOLVE_PLAY_BASIC_TO_BENCH",
    playerId,
    title: `${playerLabel(playerId)}: Put Basic Pokémon on Bench`,
    description: "Resolve the selected Basic Pokémon moving from hand to Bench.",
    required: true,
    data,
  });
}

function makeChooseEnergyFromHandCommand(playerId, data = {}) {
  return createCommand({
    type: "CHOOSE_ENERGY_FROM_HAND",
    playerId,
    title: `${playerLabel(playerId)}: Choose Energy`,
    description: "Choose an Energy card from your hand.",
    required: true,
    data,
  });
}

function makeChooseEnergyTargetCommand(playerId, data = {}) {
  return createCommand({
    type: "CHOOSE_ENERGY_TARGET",
    playerId,
    title: `${playerLabel(playerId)}: Choose Energy Target`,
    description: "Choose one of your Pokémon in play to receive the selected Energy.",
    required: true,
    data,
  });
}

function makeResolveAttachEnergyCommand(playerId, data = {}) {
  return createCommand({
    type: "RESOLVE_ATTACH_ENERGY",
    playerId,
    title: `${playerLabel(playerId)}: Attach Energy`,
    description: "Resolve the selected Energy attachment.",
    required: true,
    data,
  });
}

function makeChooseAttackCommand(playerId, data = {}) {
  return createCommand({
    type: "CHOOSE_ATTACK",
    playerId,
    title: `${playerLabel(playerId)}: Choose Attack`,
    description: "Choose an attack from your Active Pokémon.",
    required: true,
    data,
  });
}

function makeResolveAttackCommand(playerId, data = {}) {
  return createCommand({
    type: "RESOLVE_ATTACK",
    playerId,
    title: `${playerLabel(playerId)}: Resolve Attack`,
    description: "Apply the selected attack's basic damage, then continue to knockout checks.",
    required: true,
    data,
  });
}

function makeCheckKnockoutsCommand(playerId, data = {}) {
  return createCommand({
    type: "CHECK_KNOCKOUTS",
    playerId,
    title: "Check Knock Outs",
    description: "Check whether any Pokémon were Knocked Out. HP is manual in this version.",
    required: true,
    data,
  });
}

function makeResolveEndTurnCommand(playerId, data = {}) {
  return createCommand({
    type: "RESOLVE_END_TURN",
    playerId,
    title: `${playerLabel(playerId)}: End Turn`,
    description: "Resolve ending this player's turn and queue the next player's draw command.",
    required: true,
    data,
  });
}

export function canCurrentUserControlPlayer(state, playerSlot, playerId) {
  if (state.options?.controlMode === "solo-test") return true;
  return playerSlot === playerId;
}

export function getOpponentId(playerId) {
  return playerId === "p1" ? "p2" : "p1";
}

export function getDefinition(state, cardId) {
  const card = state.cardsById?.[cardId];
  return card ? findCardDefinitionById(card.definitionId) : null;
}

export function isBasicPokemonCard(state, cardId) {
  return Boolean(getDefinition(state, cardId)?.isBasicPokemon);
}

export function isEnergyCard(state, cardId) {
  return Boolean(getDefinition(state, cardId)?.isEnergy);
}

export function getAvailableBenchIndex(player) {
  return (player?.bench ?? []).findIndex((slot) => !slot);
}

export function submitPokemonAction(state, playerSlot, action) {
  try {
    const next = submitPokemonActionInternal(state, playerSlot, action);
    return addTraceEntry(state, next, action, { status: "ok" });
  } catch (error) {
    const next = withMessage(state, error.message || "That action could not be completed.");
    return addTraceEntry(state, next, action, {
      status: "error",
      error: error.message || "Unknown error",
    });
  }
}

function submitPokemonActionInternal(state, playerSlot, action) {
  switch (action.type) {
    case "COMPLETE_COMMAND":
      return completeCommandFromAction(state, playerSlot, action);
    case "START_PLAY_BASIC_TO_BENCH":
      return startPlayBasicToBench(state, playerSlot, action);
    case "START_ATTACH_ENERGY":
      return startAttachEnergy(state, playerSlot, action);
    case "START_ATTACK":
      return startAttack(state, playerSlot, action);
    case "START_END_TURN":
      return startEndTurn(state, playerSlot, action);

    // Backward-compatible action names from older Pokémon patches.
    case "CHOOSE_ACTIVE_BASIC":
      return completeCommandFromAction(state, playerSlot, { type: "COMPLETE_COMMAND", cardId: action.cardId });
    case "DRAW_FOR_TURN":
      return completeCommandFromAction(state, playerSlot, { type: "COMPLETE_COMMAND" });
    case "PLAY_BASIC_TO_BENCH":
      return startPlayBasicToBench(state, playerSlot, { ...action, type: "START_PLAY_BASIC_TO_BENCH" });
    case "ATTACH_ENERGY":
      return startAttachEnergy(state, playerSlot, { ...action, type: "START_ATTACH_ENERGY" });
    case "DECLARE_ATTACK":
      return startAttack(state, playerSlot, { ...action, type: "START_ATTACK" });
    case "END_TURN":
      return startEndTurn(state, playerSlot, { ...action, type: "START_END_TURN" });
    case "TAKE_PRIZE":
      return completeCommandFromAction(state, playerSlot, { type: "COMPLETE_COMMAND", prizeIndex: action.prizeIndex });
    case "PROMOTE_ACTIVE":
      return completeCommandFromAction(state, playerSlot, { type: "COMPLETE_COMMAND", cardId: action.cardId });

    // Manual test/debug actions. These still trace, but they are not normal game-flow starters.
    case "ADD_DAMAGE":
      return withMessage(addDamage(state, action.cardId, action.amount), `Damage adjusted by ${action.amount}.`);
    case "KNOCK_OUT":
      return knockOutPokemon(state, playerSlot, action);
    default:
      return withMessage(state, `Unknown action: ${action.type}`);
  }
}

function completeCommandFromAction(state, playerSlot, action) {
  const current = getCurrentCommand(state.commands);
  if (!current) {
    throw new Error("There is no current command to complete.");
  }

  switch (current.type) {
    case "CHOOSE_ACTIVE_BASIC":
      return completeChooseActiveBasic(state, playerSlot, current, action);
    case "DRAW_FOR_TURN":
      return completeDrawForTurn(state, playerSlot, current, action);
    case "MAIN_PHASE":
      throw new Error("Choose a main phase action button. MAIN_PHASE should start a command chain, not mutate state directly.");
    case "CHOOSE_BASIC_FROM_HAND":
      return completeChooseBasicFromHand(state, playerSlot, current, action);
    case "CHOOSE_ENERGY_FROM_HAND":
      return completeChooseEnergyFromHand(state, playerSlot, current, action);
    case "CHOOSE_ENERGY_TARGET":
      return completeChooseEnergyTarget(state, playerSlot, current, action);
    case "CHOOSE_ATTACK":
      return completeChooseAttack(state, playerSlot, current, action);
    case "TAKE_PRIZE":
      return completeTakePrize(state, playerSlot, current, action);
    case "PROMOTE_ACTIVE":
      return completePromoteActive(state, playerSlot, current, action);
    default:
      if (AUTO_COMMAND_TYPES.has(current.type)) {
        return drainAutoCommands(state, playerSlot);
      }
      throw new Error(`No completion handler for ${current.type}.`);
  }
}

function completeChooseActiveBasic(state, playerSlot, current, action) {
  const playerId = current.playerId;
  const cardId = action.cardId ?? action.selection?.cardId;

  requireControl(state, playerSlot, playerId);
  requireCardFromHand(state, playerId, cardId);
  requireBasicPokemon(state, cardId);

  let next = moveCardToActive(state, cardId, playerId);
  next.commands = completeCurrentCommand(next.commands, { cardId });

  if (playerId === "p1") {
    next.commands = appendCommands(next.commands, [makeChooseActiveCommand("p2")]);
    next.turn = {
      ...next.turn,
      playerId: "p2",
      phase: "SETUP",
    };
    return withMessage(next, "Player 1 chose an Active Pokémon. Player 2 must choose an Active Pokémon.");
  }

  next = dealPrizes(next, "p1", 6);
  next = dealPrizes(next, "p2", 6);
  next.turn = {
    playerId: "p1",
    number: 1,
    phase: "DRAW",
    hasDrawnThisTurn: false,
    energyAttachedThisTurn: false,
    attackUsedThisTurn: false,
  };
  next.commands = setQueue(next.commands, [makeDrawForTurnCommand("p1")]);
  next.commandContext = {};

  return withMessage(next, "Both Active Pokémon are ready. Prize cards were set. Player 1 must draw for turn.");
}

function completeDrawForTurn(state, playerSlot, current, action) {
  const playerId = current.playerId;
  requireControl(state, playerSlot, playerId);

  if (state.turn.playerId !== playerId) {
    throw new Error("It is not that player's turn.");
  }

  let next = drawCards(state, playerId, Number(action.count ?? current.data?.count ?? 1));
  next.turn = {
    ...next.turn,
    phase: "MAIN",
    hasDrawnThisTurn: true,
    energyAttachedThisTurn: false,
    attackUsedThisTurn: false,
  };
  next.commands = completeCurrentCommand(next.commands, { count: 1 });
  next.commands = appendCommands(next.commands, [makeMainPhaseCommand(playerId)]);
  return withMessage(next, `${playerLabel(playerId)} drew a card. Main Phase begins.`);
}

function completeChooseBasicFromHand(state, playerSlot, current, action) {
  const playerId = current.playerId;
  const cardId = action.cardId ?? action.selection?.cardId;
  requireControl(state, playerSlot, playerId);
  requireCardFromHand(state, playerId, cardId);
  requireBasicPokemon(state, cardId);

  let next = setCommandContext(state, "playBasic", { cardId });
  next.commands = completeCurrentCommand(next.commands, { cardId });
  return drainAutoCommands(withMessage(next, `${playerLabel(playerId)} selected a Basic Pokémon for the Bench.`), playerSlot);
}

function completeChooseEnergyFromHand(state, playerSlot, current, action) {
  const playerId = current.playerId;
  const energyCardId = action.energyCardId ?? action.cardId ?? action.selection?.cardId;
  requireControl(state, playerSlot, playerId);
  requireCardFromHand(state, playerId, energyCardId);
  requireEnergyCard(state, energyCardId);

  let next = setCommandContext(state, "attachEnergy", { energyCardId });
  next.commands = completeCurrentCommand(next.commands, { energyCardId });
  return drainAutoCommands(withMessage(next, `${playerLabel(playerId)} selected an Energy card.`), playerSlot);
}

function completeChooseEnergyTarget(state, playerSlot, current, action) {
  const playerId = current.playerId;
  const targetCardId = action.targetCardId ?? action.cardId ?? action.selection?.targetCardId;
  requireControl(state, playerSlot, playerId);

  if (!pokemonBelongsToPlayerInPlay(state, targetCardId, playerId)) {
    throw new Error("Choose one of your Pokémon in play.");
  }

  let next = setCommandContext(state, "attachEnergy", { targetCardId });
  next.commands = completeCurrentCommand(next.commands, { targetCardId });
  return drainAutoCommands(withMessage(next, `${playerLabel(playerId)} selected an Energy target.`), playerSlot);
}

function completeChooseAttack(state, playerSlot, current, action) {
  const playerId = current.playerId;
  const attackIndex = Number(action.attackIndex ?? action.selection?.attackIndex ?? -1);
  requireControl(state, playerSlot, playerId);
  validateAttackChoice(state, playerId, attackIndex);

  let next = setCommandContext(state, "attack", { attackIndex });
  next.commands = completeCurrentCommand(next.commands, { attackIndex });
  return drainAutoCommands(withMessage(next, `${playerLabel(playerId)} selected an attack.`), playerSlot);
}

function completeTakePrize(state, playerSlot, current, action) {
  const playerId = current.playerId;
  const prizeIndex = Number(action.prizeIndex ?? action.selection?.prizeIndex ?? 0);

  requireControl(state, playerSlot, playerId);

  if (!state.players[playerId]?.prizes?.length) {
    throw new Error("No Prize cards remain.");
  }

  const cardId = state.players[playerId].prizes[prizeIndex];
  if (!cardId) {
    throw new Error("Choose a valid Prize card.");
  }

  let next = removeCardFromEverywhere(state, cardId);
  next.players[playerId].hand.push(cardId);
  next.cardsById[cardId].zoneId = `${playerId}.hand`;
  next.cardsById[cardId].faceUp = true;
  next.commands = completeCurrentCommand(next.commands, { cardId, prizeIndex });

  return withMessage(next, `${playerLabel(playerId)} took a Prize card.`);
}

function completePromoteActive(state, playerSlot, current, action) {
  const playerId = current.playerId;
  const cardId = action.cardId ?? action.selection?.cardId;

  requireControl(state, playerSlot, playerId);

  if (!state.players[playerId].bench.includes(cardId)) {
    throw new Error("Choose one of your Benched Pokémon.");
  }

  let next = moveCardToActive(state, cardId, playerId);
  next.commands = completeCurrentCommand(next.commands, { cardId });

  return withMessage(next, `${playerLabel(playerId)} promoted a new Active Pokémon.`);
}

function startPlayBasicToBench(state, playerSlot, action) {
  const current = requireCurrentCommand(state, "MAIN_PHASE");
  const playerId = current.playerId;
  requireControl(state, playerSlot, playerId);

  const context = action.cardId ? { cardId: action.cardId } : {};
  let next = setCommandContext(state, "playBasic", context);
  const chain = [];

  if (!context.cardId) {
    chain.push(makeChooseBasicFromHandCommand(playerId));
  }

  chain.push(makeResolvePlayBasicToBenchCommand(playerId));
  chain.push(makeMainPhaseCommand(playerId));

  next = replaceCurrentCommandWithChain(next, chain, { started: "PLAY_BASIC_TO_BENCH" });
  return drainAutoCommands(withMessage(next, `${playerLabel(playerId)} started Play Basic to Bench.`), playerSlot);
}

function startAttachEnergy(state, playerSlot, action) {
  const current = requireCurrentCommand(state, "MAIN_PHASE");
  const playerId = current.playerId;
  requireControl(state, playerSlot, playerId);

  if (state.turn.energyAttachedThisTurn) {
    throw new Error("That player has already attached Energy this turn.");
  }

  const context = {
    ...(action.energyCardId ? { energyCardId: action.energyCardId } : {}),
    ...(action.targetCardId ? { targetCardId: action.targetCardId } : {}),
  };

  let next = setCommandContext(state, "attachEnergy", context);
  const chain = [];

  if (!context.energyCardId) {
    chain.push(makeChooseEnergyFromHandCommand(playerId));
  }

  if (!context.targetCardId) {
    chain.push(makeChooseEnergyTargetCommand(playerId));
  }

  chain.push(makeResolveAttachEnergyCommand(playerId));
  chain.push(makeMainPhaseCommand(playerId));

  next = replaceCurrentCommandWithChain(next, chain, { started: "ATTACH_ENERGY" });
  return drainAutoCommands(withMessage(next, `${playerLabel(playerId)} started Attach Energy.`), playerSlot);
}

function startAttack(state, playerSlot, action) {
  const current = requireCurrentCommand(state, "MAIN_PHASE");
  const playerId = current.playerId;
  requireControl(state, playerSlot, playerId);

  if (state.turn.attackUsedThisTurn) {
    throw new Error("That player has already attacked this turn.");
  }

  const context = Number.isInteger(action.attackIndex) ? { attackIndex: action.attackIndex } : {};
  let next = setCommandContext(state, "attack", context);
  const chain = [];

  if (!Number.isInteger(context.attackIndex)) {
    chain.push(makeChooseAttackCommand(playerId));
  }

  chain.push(makeResolveAttackCommand(playerId));
  chain.push(makeCheckKnockoutsCommand(playerId));
  chain.push(makeResolveEndTurnCommand(playerId, { reason: "attack" }));

  next = replaceCurrentCommandWithChain(next, chain, { started: "ATTACK" });
  return drainAutoCommands(withMessage(next, `${playerLabel(playerId)} started Attack.`), playerSlot);
}

function startEndTurn(state, playerSlot, action) {
  const current = requireCurrentCommand(state, "MAIN_PHASE");
  const playerId = current.playerId;
  requireControl(state, playerSlot, playerId);

  let next = replaceCurrentCommandWithChain(state, [makeResolveEndTurnCommand(playerId, { reason: "done" })], {
    started: "END_TURN",
  });
  return drainAutoCommands(withMessage(next, `${playerLabel(playerId)} chose Done.`), playerSlot);
}

function drainAutoCommands(state, playerSlot) {
  let next = state;
  let guard = 0;

  while (AUTO_COMMAND_TYPES.has(getCurrentCommand(next.commands)?.type)) {
    guard += 1;
    if (guard > 20) {
      throw new Error("Auto command loop exceeded safety limit.");
    }
    next = executeAutoCommand(next, playerSlot, getCurrentCommand(next.commands));
  }

  return next;
}

function executeAutoCommand(state, playerSlot, command) {
  switch (command.type) {
    case "RESOLVE_PLAY_BASIC_TO_BENCH":
      return resolvePlayBasicToBench(state, playerSlot, command);
    case "RESOLVE_ATTACH_ENERGY":
      return resolveAttachEnergy(state, playerSlot, command);
    case "RESOLVE_ATTACK":
      return resolveAttack(state, playerSlot, command);
    case "CHECK_KNOCKOUTS":
      return resolveCheckKnockouts(state, playerSlot, command);
    case "RESOLVE_END_TURN":
      return resolveEndTurn(state, playerSlot, command);
    default:
      return state;
  }
}

function resolvePlayBasicToBench(state, playerSlot, command) {
  const playerId = command.playerId;
  const cardId = command.data?.cardId ?? state.commandContext?.playBasic?.cardId;

  requireControl(state, playerSlot, playerId);
  requireCardFromHand(state, playerId, cardId);
  requireBasicPokemon(state, cardId);

  const benchIndex = getAvailableBenchIndex(state.players[playerId]);
  if (benchIndex < 0) {
    throw new Error("The Bench is full.");
  }

  let next = moveCardToBench(state, cardId, playerId, benchIndex);
  next.commands = completeCurrentCommand(next.commands, { cardId, benchIndex });
  next = clearCommandContext(next, "playBasic");
  return withMessage(next, `${playerLabel(playerId)} played a Basic Pokémon to the Bench.`);
}

function resolveAttachEnergy(state, playerSlot, command) {
  const playerId = command.playerId;
  const energyCardId = command.data?.energyCardId ?? state.commandContext?.attachEnergy?.energyCardId;
  const targetCardId = command.data?.targetCardId ?? state.commandContext?.attachEnergy?.targetCardId;

  requireControl(state, playerSlot, playerId);

  if (state.turn.energyAttachedThisTurn) {
    throw new Error("That player has already attached Energy this turn.");
  }

  requireCardFromHand(state, playerId, energyCardId);
  requireEnergyCard(state, energyCardId);

  if (!pokemonBelongsToPlayerInPlay(state, targetCardId, playerId)) {
    throw new Error("Energy must be attached to one of your Pokémon in play.");
  }

  let next = attachCard(state, energyCardId, targetCardId);
  next.turn.energyAttachedThisTurn = true;
  next.commands = completeCurrentCommand(next.commands, { energyCardId, targetCardId });
  next = clearCommandContext(next, "attachEnergy");

  return withMessage(next, `${playerLabel(playerId)} attached Energy.`);
}

function resolveAttack(state, playerSlot, command) {
  const playerId = command.playerId;
  const attackIndex = command.data?.attackIndex ?? state.commandContext?.attack?.attackIndex;
  const opponentId = getOpponentId(playerId);

  requireControl(state, playerSlot, playerId);
  validateAttackChoice(state, playerId, Number(attackIndex));

  const attackerId = state.players[playerId].active;
  const defenderId = state.players[opponentId].active;
  const attackerDefinition = getDefinition(state, attackerId);
  const attack = getRealAttacks(attackerDefinition)[Number(attackIndex)];
  const damage = attackDamageNumber(attack);

  let next = damage > 0 ? addDamage(state, defenderId, damage) : { ...state };
  next.turn.attackUsedThisTurn = true;
  next.commands = completeCurrentCommand(next.commands, { attackIndex, damage });
  next = clearCommandContext(next, "attack");
  return withMessage(next, `${attackerDefinition.name} used ${attack.name}${damage ? ` for ${damage} damage` : ""}.`);
}

function resolveCheckKnockouts(state, playerSlot, command) {
  const playerId = command.playerId;
  requireControl(state, playerSlot, playerId);

  const next = {
    ...state,
    commands: completeCurrentCommand(state.commands, { hpMode: "manual" }),
  };

  return withMessage(next, "Knock Out check complete. Use manual Knock Out if a Pokémon should be discarded.");
}

function resolveEndTurn(state, playerSlot, command) {
  const currentPlayerId = command.playerId ?? state.turn.playerId;
  requireControl(state, playerSlot, currentPlayerId);

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

  next.commands = completeCurrentCommand(next.commands, { reason: command.data?.reason ?? "unknown" });
  next.commands = setQueue(next.commands, [makeDrawForTurnCommand(nextPlayerId)]);
  next.commandContext = {};

  return withMessage(next, `${playerLabel(currentPlayerId)} ended the turn. ${playerLabel(nextPlayerId)} must draw.`);
}

function knockOutPokemon(state, playerSlot, action) {
  const cardId = action.cardId;
  const knockedOut = state.cardsById?.[cardId];

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

  const interruptions = [makeTakePrizeCommand(prizeTakerId, { knockedOutOwnerId: ownerId })];

  if (!next.players[ownerId].active && next.players[ownerId].bench.some(Boolean)) {
    interruptions.push(makePromoteActiveCommand(ownerId));
  }

  next.commands = prependCommands(next.commands, interruptions);
  return withMessage(next, "A Pokémon was Knocked Out. Required command(s) were added to the front of the queue.");
}

function validateAttackChoice(state, playerId, attackIndex) {
  const opponentId = getOpponentId(playerId);
  const attackerId = state.players[playerId]?.active;
  const defenderId = state.players[opponentId]?.active;

  if (!attackerId || !defenderId) {
    throw new Error("Both players need an Active Pokémon.");
  }

  if (state.turn.attackUsedThisTurn) {
    throw new Error("That player has already attacked this turn.");
  }

  const attackerDefinition = getDefinition(state, attackerId);
  const attacks = getRealAttacks(attackerDefinition);
  const attack = attacks[attackIndex];

  if (!attack) {
    throw new Error("Choose a valid attack.");
  }

  if (!hasEnoughEnergyForAttack(state, attackerId, attack)) {
    throw new Error("Not enough attached Energy for that attack.");
  }

  return attack;
}

function requireCurrentCommand(state, type) {
  const current = getCurrentCommand(state.commands);
  if (current?.type !== type) {
    const label = current ? `${current.type} for ${current.playerId ?? "game"}` : "no command";
    throw new Error(`Cannot do that now. Current command is ${label}.`);
  }
  return current;
}

function requireControl(state, playerSlot, playerId) {
  if (!canCurrentUserControlPlayer(state, playerSlot, playerId)) {
    throw new Error("You cannot control that player.");
  }
}

function requireCardFromHand(state, playerId, cardId) {
  if (!cardId || !cardIsInPlayerList(state, cardId, playerId, "hand")) {
    throw new Error("Choose a card from that player's hand.");
  }
}

function requireBasicPokemon(state, cardId) {
  if (!isBasicPokemonCard(state, cardId)) {
    throw new Error("You must choose a Basic Pokémon.");
  }
}

function requireEnergyCard(state, cardId) {
  if (!isEnergyCard(state, cardId)) {
    throw new Error("That card is not an Energy card.");
  }
}

function setCommandContext(state, key, patch) {
  return {
    ...state,
    commandContext: {
      ...(state.commandContext ?? {}),
      [key]: {
        ...(state.commandContext?.[key] ?? {}),
        ...patch,
      },
    },
  };
}

function clearCommandContext(state, key) {
  const nextContext = { ...(state.commandContext ?? {}) };
  delete nextContext[key];
  return {
    ...state,
    commandContext: nextContext,
  };
}

function replaceCurrentCommandWithChain(state, chain, result = {}) {
  const completed = completeCurrentCommand(state.commands, result);
  return {
    ...state,
    commands: {
      ...completed,
      queue: [...chain, ...(completed.queue ?? [])],
    },
  };
}

function setQueue(commandState, queue) {
  return {
    ...(commandState ?? { history: [] }),
    queue,
    history: commandState?.history ?? [],
  };
}

function appendCommands(commandState, commands) {
  return {
    ...(commandState ?? { history: [] }),
    queue: [...(commandState?.queue ?? []), ...commands],
    history: commandState?.history ?? [],
  };
}

function prependCommands(commandState, commands) {
  return {
    ...(commandState ?? { history: [] }),
    queue: [...commands, ...(commandState?.queue ?? [])],
    history: commandState?.history ?? [],
  };
}

export function pokemonBelongsToPlayerInPlay(state, cardId, playerId) {
  const player = state.players?.[playerId];
  return player?.active === cardId || (player?.bench ?? []).includes(cardId);
}

export function hasEnoughEnergyForAttack(state, attackerId, attack) {
  const attacker = state.cardsById?.[attackerId];
  const attachedEnergyTypes = (attacker?.attached ?? [])
    .map((attachedId) => getEnergyTypeFromCard(getDefinition(state, attachedId)))
    .filter(Boolean);

  const required = [...(attack?.cost ?? [])];

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

function addTraceEntry(before, after, action, details = {}) {
  const entry = {
    id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    actionType: action?.type ?? "UNKNOWN",
    status: details.status ?? "ok",
    error: details.error ?? "",
    before: makeTraceSnapshot(before),
    after: makeTraceSnapshot(after),
  };

  return {
    ...after,
    queueTrace: [...(after.queueTrace ?? before.queueTrace ?? []), entry].slice(-80),
  };
}

function makeTraceSnapshot(state) {
  const current = getCurrentCommand(state?.commands);
  return {
    currentCommand: current ? `${current.type}:${current.playerId ?? "game"}` : "none",
    queue: (state?.commands?.queue ?? []).slice(0, 8).map((command) => `${command.type}:${command.playerId ?? "game"}`),
    turn: `${state?.turn?.playerId ?? "?"}/${state?.turn?.phase ?? "?"}`,
    fingerprint: makeStateFingerprint(state),
  };
}

function makeStateFingerprint(state) {
  const p1 = state?.players?.p1;
  const p2 = state?.players?.p2;
  return {
    cards: Object.keys(state?.cardsById ?? {}).length,
    p1: makePlayerFingerprint(p1),
    p2: makePlayerFingerprint(p2),
  };
}

function makePlayerFingerprint(player) {
  if (!player) {
    return "missing";
  }

  return {
    deck: player.deck?.length ?? 0,
    hand: player.hand?.length ?? 0,
    prizes: player.prizes?.length ?? 0,
    discard: player.discard?.length ?? 0,
    active: player.active ?? "empty",
    bench: (player.bench ?? []).map((id) => id ?? "empty").join("|"),
  };
}
