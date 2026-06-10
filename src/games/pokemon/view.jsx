// src/games/pokemon/view.jsx
import React, { useState } from "react";
import "./pokemonStyles.css";
import { getCurrentCommand } from "../../core/command/commandEngine";
import {
  findCardDefinitionById,
  getCardBackImage,
  getCardImage,
  getCardTypeLabel,
  getEnergyTypeFromCard,
  getRealAttacks,
} from "./pokemonData";
import { hasEnoughEnergyForAttack, playerLabel } from "./pokemonCommands";

const EMPTY_BENCH = [null, null, null, null, null];

function emptyPlayer(playerId) {
  return {
    id: playerId,
    name: playerLabel(playerId),
    deck: [],
    hand: [],
    discard: [],
    prizes: [],
    active: null,
    bench: [...EMPTY_BENCH],
  };
}

function getPokemonStateFromProps(props) {
  const candidates = [
    props.gameState,
    props.state,
    props.room?.gameState,
    props.room?.state,
    props.room?.game?.state,
    props.room,
    props.game?.state,
    props.game,
  ];

  for (const candidate of candidates) {
    const found = findPokemonState(candidate);
    if (found) return found;
  }

  return null;
}

function findPokemonState(candidate, depth = 0) {
  if (!candidate || typeof candidate !== "object" || depth > 4) return null;

  const looksLikePokemonState =
    candidate.gameId === "pokemon" ||
    Boolean(candidate.players) ||
    Boolean(candidate.cardsById) ||
    Boolean(candidate.commands);

  if (looksLikePokemonState) return candidate;

  return (
    findPokemonState(candidate.gameState, depth + 1) ??
    findPokemonState(candidate.state, depth + 1) ??
    findPokemonState(candidate.game?.state, depth + 1) ??
    findPokemonState(candidate.data?.gameState, depth + 1) ??
    findPokemonState(candidate.data?.state, depth + 1)
  );
}

function getSafeState(rawState) {
  if (!rawState) return null;

  const p1 = rawState.players?.p1 ?? emptyPlayer("p1");
  const p2 = rawState.players?.p2 ?? emptyPlayer("p2");

  return {
    ...rawState,
    players: {
      ...rawState.players,
      p1: normalizePlayer(p1, "p1"),
      p2: normalizePlayer(p2, "p2"),
    },
    cardsById: rawState.cardsById ?? {},
    commands: rawState.commands ?? { queue: [], history: [] },
    turn: {
      playerId: rawState.turn?.playerId === "p2" ? "p2" : "p1",
      number: rawState.turn?.number ?? 0,
      phase: rawState.turn?.phase ?? "SETUP",
      hasDrawnThisTurn: Boolean(rawState.turn?.hasDrawnThisTurn),
      energyAttachedThisTurn: Boolean(rawState.turn?.energyAttachedThisTurn),
      attackUsedThisTurn: Boolean(rawState.turn?.attackUsedThisTurn),
      ...rawState.turn,
    },
    options: rawState.options ?? {},
    setupErrors: rawState.setupErrors ?? [],
    messageLog: rawState.messageLog ?? [],
    queueTrace: rawState.queueTrace ?? [],
    commandContext: rawState.commandContext ?? {},
  };
}

function normalizePlayer(player, playerId) {
  return {
    ...emptyPlayer(playerId),
    ...player,
    id: player.id ?? playerId,
    name: player.name ?? playerLabel(playerId),
    deck: Array.isArray(player.deck) ? player.deck : [],
    hand: Array.isArray(player.hand) ? player.hand : [],
    discard: Array.isArray(player.discard) ? player.discard : [],
    prizes: Array.isArray(player.prizes) ? player.prizes : [],
    bench: Array.isArray(player.bench) ? padBench(player.bench) : [...EMPTY_BENCH],
  };
}

function padBench(bench) {
  const next = [...bench];
  while (next.length < 5) next.push(null);
  return next.slice(0, 5);
}

export default function PokemonView(props) {
  const rawState = getPokemonStateFromProps(props);
  const state = getSafeState(rawState);
  const playerSlot = props.playerSlot ?? props.currentPlayerSlot ?? props.playerId ?? "p1";
  const submit = props.submitAction ?? props.dispatchAction ?? props.onAction;
  const [screen, setScreen] = useState("battle");
  const [handPlayerId, setHandPlayerId] = useState("p1");
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);

  const currentCommand = getCurrentCommand(state?.commands);
  const currentPlayerId = state?.turn?.playerId === "p2" ? "p2" : "p1";

  function send(action) {
    if (!submit) {
      console.warn("PokemonView needs a submitAction/dispatchAction/onAction prop.", action);
      return;
    }

    const actionWithPlayerSlot = {
      ...action,
      playerSlot,
    };

    // Some game wrappers pass submitAction(action).
    // Others pass submitAction(playerSlot, action).
    // Use the function arity so the Pokémon view works with either wrapper.
    if (submit.length >= 2) {
      submit(playerSlot, actionWithPlayerSlot);
    } else {
      submit(actionWithPlayerSlot);
    }

    setSelectedCardId(null);
    setSelectedTargetId(null);
  }

  if (!state) {
    return (
      <div className="pokemon-shell">
        <div className="pokemon-panel pokemon-empty-state">
          <h2>Pokémon TCG</h2>
          <p>No Pokémon game state was provided to PokemonView.</p>
          <p>Initialize the Pokémon game state for this room.</p>
          <div className="pokemon-action-buttons">
            <button onClick={() => send({ type: "INIT_POKEMON_GAME" })}>Initialize Pokémon Game</button>
          </div>
        </div>
      </div>
    );
  }

  const isIncompleteState =
    rawState?.gameId !== "pokemon" ||
    !rawState?.players?.p1 ||
    !rawState?.players?.p2 ||
    !rawState?.cardsById ||
    !rawState?.turn ||
    !rawState?.commands;

  return (
    <div className="pokemon-shell" data-player-slot={playerSlot}>
      <header className="pokemon-topbar">
        <div>
          <h2>Pokémon TCG</h2>
          <p>
            Turn {state.turn?.number ?? 0} · {playerLabel(currentPlayerId)}
          </p>
        </div>
        {state.options?.controlMode === "solo-test" && (
          <div className="pokemon-test-badge">Solo Test: control both players</div>
        )}
      </header>

      {isIncompleteState && (
        <div className="pokemon-warning pokemon-repair-box">
          <strong>This room is missing part of the Pokémon state.</strong>
          <p>Use Initialize for a fresh Pokémon match, or Repair if you think this room already has usable Pokémon data.</p>
          <div className="pokemon-action-buttons">
            <button onClick={() => send({ type: "INIT_POKEMON_GAME" })}>Initialize Pokémon Game</button>
            <button onClick={() => send({ type: "REPAIR_POKEMON_STATE" })}>Repair Pokémon State</button>
            <button onClick={() => send({ type: "RESET_POKEMON_GAME" })}>Reset Pokémon Game</button>
          </div>
        </div>
      )}

      {state.setupErrors?.length > 0 && (
        <details className="pokemon-warning">
          <summary>Deck warnings: {state.setupErrors.length}</summary>
          <ul>
            {state.setupErrors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </details>
      )}

      {screen === "battle" && (
        <BattleScreen
          state={state}
          currentCommand={currentCommand}
          currentPlayerId={currentPlayerId}
          onOpenHand={(playerId) => {
            setHandPlayerId(playerId);
            setSelectedCardId(null);
            setScreen("hand");
          }}
          onOpenCheck={() => setScreen("check")}
          onOpenAttack={() => setScreen("attack")}
          onOpenCard={(cardId) => {
            setSelectedCardId(cardId);
            setScreen("card");
          }}
          onAction={send}
        />
      )}

      {screen === "hand" && (
        <HandScreen
          state={state}
          playerId={handPlayerId}
          selectedCardId={selectedCardId}
          selectedTargetId={selectedTargetId}
          setSelectedCardId={setSelectedCardId}
          setSelectedTargetId={setSelectedTargetId}
          onBack={() => setScreen("battle")}
          onOpenCard={() => setScreen("card")}
          onAction={send}
        />
      )}

      {screen === "check" && (
        <CheckScreen
          state={state}
          onBack={() => setScreen("battle")}
          onOpenCard={(cardId) => {
            setSelectedCardId(cardId);
            setScreen("card");
          }}
          onOpenHand={(playerId) => {
            setHandPlayerId(playerId);
            setSelectedCardId(null);
            setScreen("hand");
          }}
        />
      )}

      {screen === "attack" && (
        <AttackScreen state={state} onBack={() => setScreen("battle")} onAction={send} />
      )}

      {screen === "card" && (
        <CardInspector
          state={state}
          cardId={selectedCardId}
          onBack={() => setScreen("battle")}
          onDamage={(amount) => send({ type: "ADD_DAMAGE", cardId: selectedCardId, amount })}
          onKnockOut={() => send({ type: "KNOCK_OUT", cardId: selectedCardId })}
        />
      )}

      {state.options?.controlMode === "solo-test" && <SoloTestMonitor state={state} />}
    </div>
  );
}

function BattleScreen({
  state,
  currentCommand,
  currentPlayerId,
  onOpenHand,
  onOpenCheck,
  onOpenAttack,
  onOpenCard,
  onAction,
}) {
  const commandType = currentCommand?.type;
  const commandPlayerId = currentCommand?.playerId ?? currentPlayerId;
  const isDrawCommand = commandType === "DRAW_FOR_TURN";
  const isMainPhase = commandType === "MAIN_PHASE";
  const isSetupCommand = commandType === "CHOOSE_ACTIVE_BASIC";
  const isPrizeCommand = commandType === "TAKE_PRIZE";
  const isPromoteCommand = commandType === "PROMOTE_ACTIVE";

  return (
    <>
      <PlayerBattleArea
        state={state}
        playerId="p2"
        perspective="opponent"
        onOpenCard={onOpenCard}
      />

      <MessageBox state={state} currentCommand={currentCommand} />

      <PlayerBattleArea state={state} playerId="p1" perspective="player" onOpenCard={onOpenCard} />

      <nav className="pokemon-command-menu">
        <button onClick={() => onOpenHand(commandPlayerId)} disabled={isPrizeCommand || isPromoteCommand}>
          Hand
        </button>
        <button onClick={onOpenCheck}>Check</button>
        <button disabled>Retreat</button>
        <button onClick={onOpenAttack} disabled={!isMainPhase}>
          Attack
        </button>
        <button disabled>Power</button>
        <button onClick={() => onAction({ type: "START_END_TURN" })} disabled={!isMainPhase}>
          Done
        </button>
      </nav>

      {isDrawCommand && (
        <button className="pokemon-full-button" onClick={() => onAction({ type: "COMPLETE_COMMAND" })}>
          Draw for {playerLabel(commandPlayerId)}
        </button>
      )}

      {isSetupCommand && (
        <button className="pokemon-full-button" onClick={() => onOpenHand(commandPlayerId)}>
          Open {playerLabel(commandPlayerId)} Hand to Choose Active
        </button>
      )}

      {isPrizeCommand && <PrizeCommandPanel state={state} command={currentCommand} onAction={onAction} />}
      {isPromoteCommand && <PromoteCommandPanel state={state} command={currentCommand} onAction={onAction} />}
    </>
  );
}

function PlayerBattleArea({ state, playerId, perspective, onOpenCard }) {
  const player = state.players?.[playerId] ?? emptyPlayer(playerId);
  const activeCard = getCardViewModel(state, player.active);
  const benchCards = (player.bench ?? EMPTY_BENCH).map((cardId) => getCardViewModel(state, cardId));

  return (
    <section className={`pokemon-battle-area ${perspective}`}>
      <div className="pokemon-area-header">
        <strong>{player.name ?? playerLabel(playerId)}</strong>
        <span>
          Deck {player.deck?.length ?? 0} · Hand {player.hand?.length ?? 0} · Prizes {player.prizes?.length ?? 0} · Discard{" "}
          {player.discard?.length ?? 0}
        </span>
      </div>

      <div className="pokemon-bench-row">
        {benchCards.map((card, index) => (
          <button
            key={`bench-${playerId}-${index}`}
            className="pokemon-bench-card"
            disabled={!card}
            onClick={() => card && onOpenCard(card.id)}
          >
            {card ? (
              <>
                <img src={card.image} alt={card.name} />
                <span>{card.name}</span>
                <small>DMG {card.damage}</small>
              </>
            ) : (
              <span>Empty</span>
            )}
          </button>
        ))}
      </div>

      <div className="pokemon-active-layout">
        <button
          className="pokemon-active-card"
          disabled={!activeCard}
          onClick={() => activeCard && onOpenCard(activeCard.id)}
        >
          {activeCard ? (
            <img src={activeCard.image} alt={activeCard.name} />
          ) : (
            <span>No Active Pokémon</span>
          )}
        </button>

        <div className="pokemon-active-summary">
          <h3>{activeCard?.name ?? "No Active"}</h3>
          <p>{activeCard?.typeLabel ?? "Choose a Basic Pokémon"}</p>
          <p className="pokemon-stat-line">Damage: {activeCard?.damage ?? 0}</p>
          <p className="pokemon-stat-line">Status: {activeCard?.markers?.join(", ") || "OK"}</p>

          <div className="pokemon-attached-row">
            <span>Attached</span>
            <MiniAttachmentStack state={state} cardId={player.active} onOpenCard={onOpenCard} />
          </div>
        </div>
      </div>
    </section>
  );
}

function MessageBox({ state, currentCommand }) {
  return (
    <section className="pokemon-message-box">
      {currentCommand ? (
        <>
          <strong>{currentCommand.title}</strong>
          <p>{currentCommand.description}</p>
        </>
      ) : (
        <>
          <strong>{state.message ?? "Choose a command."}</strong>
          <p>{state.turn?.phase === "DRAW" ? "Draw for turn before taking other actions." : "Choose a command."}</p>
        </>
      )}
    </section>
  );
}

function HandScreen({
  state,
  playerId,
  selectedCardId,
  selectedTargetId,
  setSelectedCardId,
  setSelectedTargetId,
  onBack,
  onOpenCard,
  onAction,
}) {
  const player = state.players?.[playerId] ?? emptyPlayer(playerId);
  const selected = getCardViewModel(state, selectedCardId);
  const selectedDefinition = selected ? findCardDefinitionById(state.cardsById?.[selected.id]?.definitionId) : null;
  const currentCommand = getCurrentCommand(state.commands);

  const inPlayTargets = [player.active, ...(player.bench ?? [])]
    .filter(Boolean)
    .map((id) => getCardViewModel(state, id))
    .filter(Boolean);

  const canChooseActive =
    currentCommand?.type === "CHOOSE_ACTIVE_BASIC" &&
    currentCommand.playerId === playerId &&
    selectedDefinition?.isBasicPokemon;

  const isMainPhaseForThisPlayer = currentCommand?.type === "MAIN_PHASE" && currentCommand.playerId === playerId;
  const canPlayBench =
    isMainPhaseForThisPlayer && selectedDefinition?.isBasicPokemon && (player.bench ?? []).some((slot) => !slot);
  const canAttachEnergy =
    isMainPhaseForThisPlayer &&
    selectedDefinition?.isEnergy &&
    !state.turn.energyAttachedThisTurn &&
    selectedTargetId;

  return (
    <section className="pokemon-screen pokemon-panel">
      <div className="pokemon-screen-header">
        <h3>{player.name}'s Hand</h3>
        <button onClick={onBack}>Back</button>
      </div>

      <div className="pokemon-hand-layout">
        <div className="pokemon-card-preview">
          {selected ? <img src={selected.image} alt={selected.name} /> : <p>Select a card.</p>}
        </div>

        <div className="pokemon-hand-list">
          {(player.hand ?? []).map((cardId, index) => {
            const card = getCardViewModel(state, cardId);
            if (!card) return null;

            return (
              <button
                key={cardId}
                className={selectedCardId === cardId ? "selected" : ""}
                onClick={() => {
                  setSelectedCardId(cardId);
                  setSelectedTargetId(null);
                }}
              >
                <span className="pokemon-cursor">{selectedCardId === cardId ? "▶" : ""}</span>
                <span>{card.name}</span>
                <small>{index + 1}/{player.hand.length}</small>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="pokemon-action-panel">
          <h4>{selected.name}</h4>
          <p>{selected.typeLabel}</p>

          {selectedDefinition?.isEnergy && (
            <div className="pokemon-target-list">
              <strong>Attach target</strong>
              {inPlayTargets.map((target) => (
                <button
                  key={target.id}
                  className={selectedTargetId === target.id ? "selected" : ""}
                  onClick={() => setSelectedTargetId(target.id)}
                >
                  {target.name}
                </button>
              ))}
            </div>
          )}

          <div className="pokemon-action-buttons">
            {canChooseActive && (
              <button onClick={() => onAction({ type: "COMPLETE_COMMAND", cardId: selected.id })}>
                Choose Active
              </button>
            )}
            {canPlayBench && (
              <button onClick={() => onAction({ type: "START_PLAY_BASIC_TO_BENCH", playerId, cardId: selected.id })}>
                Play to Bench
              </button>
            )}
            {canAttachEnergy && (
              <button
                onClick={() =>
                  onAction({
                    type: "START_ATTACH_ENERGY",
                    playerId,
                    energyCardId: selected.id,
                    targetCardId: selectedTargetId,
                  })
                }
              >
                Attach Energy
              </button>
            )}
            <button onClick={onOpenCard}>View Card</button>
          </div>
        </div>
      )}
    </section>
  );
}

function CheckScreen({ state, onBack, onOpenCard, onOpenHand }) {
  return (
    <section className="pokemon-screen pokemon-panel">
      <div className="pokemon-screen-header">
        <h3>Check</h3>
        <button onClick={onBack}>Back</button>
      </div>

      <div className="pokemon-check-grid">
        {["p1", "p2"].map((playerId) => {
          const player = state.players?.[playerId] ?? emptyPlayer(playerId);
          return (
            <div className="pokemon-check-player" key={playerId}>
              <h4>{player.name}</h4>
              <button onClick={() => onOpenHand(playerId)}>Open Hand ({player.hand.length})</button>
              <p>Deck: {player.deck.length}</p>
              <p>Prizes: {player.prizes.length}</p>
              <p>Discard: {player.discard.length}</p>

              <div className="pokemon-thumbnail-grid">
                {[player.active, ...(player.bench ?? []), ...(player.discard ?? []).slice(-6)]
                  .filter(Boolean)
                  .map((cardId) => {
                    const card = getCardViewModel(state, cardId);
                    if (!card) return null;

                    return (
                      <button key={cardId} onClick={() => onOpenCard(cardId)}>
                        <img src={card.image} alt={card.name} />
                        <span>{card.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AttackScreen({ state, onBack, onAction }) {
  const currentCommand = getCurrentCommand(state.commands);
  const canAttackNow = currentCommand?.type === "MAIN_PHASE";
  const playerId = currentCommand?.playerId ?? (state.turn?.playerId === "p2" ? "p2" : "p1");
  const player = state.players?.[playerId] ?? emptyPlayer(playerId);
  const activeId = player.active;
  const activeDefinition = activeId ? findCardDefinitionById(state.cardsById?.[activeId]?.definitionId) : null;
  const attacks = getRealAttacks(activeDefinition);

  return (
    <section className="pokemon-screen pokemon-panel">
      <div className="pokemon-screen-header">
        <h3>Attack</h3>
        <button onClick={onBack}>Back</button>
      </div>

      {!activeDefinition && <p>No Active Pokémon.</p>}

      {activeDefinition && (
        <>
          <div className="pokemon-attack-heading">
            <img src={getCardImage(activeDefinition)} alt={activeDefinition.name} />
            <div>
              <h4>{activeDefinition.name}</h4>
              <p>Choose an attack. Attacking ends the turn.</p>
            </div>
          </div>

          <div className="pokemon-attack-list">
            {attacks.map((attack, index) => {
              const canPay = hasEnoughEnergyForAttack(state, activeId, attack);
              return (
                <button
                  key={`${attack.name}-${index}`}
                  disabled={!canAttackNow || !canPay || state.turn.attackUsedThisTurn}
                  onClick={() => onAction({ type: "START_ATTACK", attackIndex: index })}
                >
                  <strong>{attack.name}</strong>
                  <span>Cost: {(attack.cost ?? []).join(" ") || "None"}</span>
                  <span>Damage: {attack.damage || "—"}</span>
                  {attack.text && <small>{attack.text}</small>}
                  {!canPay && <em>Not enough Energy</em>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function CardInspector({ state, cardId, onBack, onDamage, onKnockOut }) {
  const card = getCardViewModel(state, cardId);
  const definition = card ? findCardDefinitionById(state.cardsById?.[card.id]?.definitionId) : null;
  const attacks = getRealAttacks(definition);

  return (
    <section className="pokemon-screen pokemon-panel">
      <div className="pokemon-screen-header">
        <h3>Card</h3>
        <button onClick={onBack}>Back</button>
      </div>

      {!card && <p>No card selected.</p>}

      {card && (
        <div className="pokemon-inspector-layout">
          <img className="pokemon-inspector-card" src={card.image} alt={card.name} />

          <div className="pokemon-inspector-details">
            <h3>{card.name}</h3>
            <p>{card.typeLabel}</p>
            <p>Damage: {card.damage}</p>

            {attacks.length > 0 && (
              <>
                <h4>Attacks</h4>
                {attacks.map((attack, index) => (
                  <div className="pokemon-attack-detail" key={`${attack.name}-${index}`}>
                    <strong>{attack.name}</strong>
                    <p>Cost: {(attack.cost ?? []).join(" ") || "None"} · Damage: {attack.damage || "—"}</p>
                    {attack.text && <p>{attack.text}</p>}
                  </div>
                ))}
              </>
            )}

            <h4>Attached Cards</h4>
            <MiniAttachmentStack state={state} cardId={card.id} />

            {definition?.isPokemon && (
              <div className="pokemon-action-buttons">
                <button onClick={() => onDamage(10)}>+10 Damage</button>
                <button onClick={() => onDamage(-10)}>-10 Damage</button>
                <button onClick={onKnockOut}>Knock Out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function PrizeCommandPanel({ state, command, onAction }) {
  const playerId = command?.playerId;
  const player = state.players?.[playerId] ?? emptyPlayer(playerId ?? "p1");

  return (
    <section className="pokemon-inline-command-panel">
      <strong>Choose a Prize card for {playerLabel(playerId)}</strong>
      <div className="pokemon-prize-row">
        {(player.prizes ?? []).map((cardId, index) => (
          <button key={cardId} onClick={() => onAction({ type: "COMPLETE_COMMAND", prizeIndex: index })}>
            <img src={getCardBackImage()} alt={`Prize ${index + 1}`} />
            <span>Prize {index + 1}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PromoteCommandPanel({ state, command, onAction }) {
  const playerId = command?.playerId;
  const player = state.players?.[playerId] ?? emptyPlayer(playerId ?? "p1");

  return (
    <section className="pokemon-inline-command-panel">
      <strong>Promote a Benched Pokémon for {playerLabel(playerId)}</strong>
      <div className="pokemon-thumbnail-grid">
        {(player.bench ?? [])
          .filter(Boolean)
          .map((cardId) => {
            const card = getCardViewModel(state, cardId);
            if (!card) return null;
            return (
              <button key={cardId} onClick={() => onAction({ type: "COMPLETE_COMMAND", cardId })}>
                <img src={card.image} alt={card.name} />
                <span>{card.name}</span>
              </button>
            );
          })}
      </div>
    </section>
  );
}

function SoloTestMonitor({ state }) {
  const currentCommand = getCurrentCommand(state.commands);
  const p1 = state.players?.p1 ?? emptyPlayer("p1");
  const p2 = state.players?.p2 ?? emptyPlayer("p2");

  return (
    <details className="pokemon-solo-monitor">
      <summary>Solo Test Monitor — queue/state</summary>
      <div className="pokemon-monitor-grid">
        <MonitorCommand state={state} command={currentCommand} />
        <MonitorPlayer state={state} player={p1} />
        <MonitorPlayer state={state} player={p2} />
      </div>
      <div className="pokemon-monitor-log">
        <strong>Recent messages</strong>
        <ol>
          {(state.messageLog ?? []).slice(-5).map((entry, index) => (
            <li key={`${entry.at}-${index}`}>{entry.message}</li>
          ))}
        </ol>
      </div>
      <div className="pokemon-monitor-log">
        <strong>Queue trace</strong>
        <ol className="pokemon-trace-list">
          {(state.queueTrace ?? []).slice(-8).reverse().map((entry) => (
            <li key={entry.id}>
              <code>{entry.actionType}</code> <span>{entry.status}</span>
              {entry.error && <em> — {entry.error}</em>}
              <small>
                {entry.before?.currentCommand} → {entry.after?.currentCommand}
              </small>
              <small>
                P1 hand {entry.before?.fingerprint?.p1?.hand ?? "?"}→{entry.after?.fingerprint?.p1?.hand ?? "?"}; 
                P2 hand {entry.before?.fingerprint?.p2?.hand ?? "?"}→{entry.after?.fingerprint?.p2?.hand ?? "?"}
              </small>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}

function MonitorCommand({ state, command }) {
  return (
    <div className="pokemon-monitor-card">
      <h4>Command Queue</h4>
      <p>Turn: {playerLabel(state.turn?.playerId)} · Phase: {state.turn?.phase}</p>
      <p>Energy attached: {state.turn?.energyAttachedThisTurn ? "yes" : "no"}</p>
      <p>Current: {command ? `${command.type} (${command.playerId ?? "game"})` : "none"}</p>
      <ol>
        {(state.commands?.queue ?? []).slice(0, 6).map((queued) => (
          <li key={queued.id}>{queued.type} {queued.playerId ? `→ ${queued.playerId}` : ""}</li>
        ))}
      </ol>
    </div>
  );
}

function MonitorPlayer({ state, player }) {
  const active = getCardViewModel(state, player.active);
  const handNames = (player.hand ?? [])
    .slice(0, 7)
    .map((cardId) => getCardViewModel(state, cardId)?.name)
    .filter(Boolean);
  const benchNames = (player.bench ?? [])
    .map((cardId) => (cardId ? getCardViewModel(state, cardId)?.name ?? "Unknown" : "Empty"));

  return (
    <div className="pokemon-monitor-card">
      <h4>{player.name}</h4>
      <p>Deck {player.deck?.length ?? 0} · Hand {player.hand?.length ?? 0} · Prizes {player.prizes?.length ?? 0} · Discard {player.discard?.length ?? 0}</p>
      <p>Active: {active?.name ?? "Empty"}</p>
      <p>Bench: {benchNames.join(" | ")}</p>
      <p>Hand top: {handNames.join(", ") || "Empty"}</p>
    </div>
  );
}

function MiniAttachmentStack({ state, cardId, onOpenCard = null }) {
  const card = state.cardsById?.[cardId];
  const attached = (card?.attached ?? []).map((id) => getCardViewModel(state, id)).filter(Boolean);

  if (!attached.length) {
    return <small className="pokemon-no-attachments">None</small>;
  }

  return (
    <div className="pokemon-mini-stack">
      {attached.map((attachedCard, index) => (
        <button
          key={attachedCard.id}
          style={{ marginLeft: index === 0 ? 0 : -12 }}
          onClick={() => onOpenCard?.(attachedCard.id)}
          title={`${attachedCard.name}${attachedCard.energyType ? ` (${attachedCard.energyType})` : ""}`}
        >
          <img src={attachedCard.image} alt={attachedCard.name} />
        </button>
      ))}
    </div>
  );
}

function getCardViewModel(state, cardId) {
  if (!cardId || !state?.cardsById) return null;
  const card = state.cardsById[cardId];
  if (!card) return null;

  const definition = findCardDefinitionById(card.definitionId);
  if (!definition) return null;

  return {
    id: card.id,
    name: definition.name,
    image: card.faceUp ? getCardImage(definition) : getCardBackImage(),
    typeLabel: getCardTypeLabel(definition),
    damage: card.damage ?? 0,
    markers: card.markers ?? [],
    energyType: getEnergyTypeFromCard(definition),
    attached: card.attached ?? [],
  };
}
