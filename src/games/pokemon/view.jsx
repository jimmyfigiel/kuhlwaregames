// src/games/pokemon/view.jsx
import React, { useMemo, useState } from "react";
import "./pokemonStyles.css";
import { getCurrentCommand } from "../../core/command/commandEngine";
import {
  findCardDefinitionById,
  getCardBackImage,
  getCardImage,
  getCardTypeLabel,
  getDeckOptions,
  getEnergyTypeFromCard,
  getRealAttacks,
} from "./pokemonData";
import { hasEnoughEnergyForAttack, playerLabel } from "./pokemonCommands";

export default function PokemonView(props) {
  const state = props.gameState ?? props.state ?? props.room?.gameState;
  const playerSlot = props.playerSlot ?? props.currentPlayerSlot ?? "p1";
  const submit = props.submitAction ?? props.dispatchAction ?? props.onAction;
  const [screen, setScreen] = useState("battle");
  const [handPlayerId, setHandPlayerId] = useState("p1");
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);

  const currentCommand = getCurrentCommand(state?.commands);
  const currentPlayerId = state?.turn?.playerId ?? "p1";

  function send(action) {
    if (!submit) {
      console.warn("PokemonView needs a submitAction/dispatchAction/onAction prop.", action);
      return;
    }
    submit(action);
    setSelectedCardId(null);
    setSelectedTargetId(null);
  }

  if (!state) {
    return (
      <div className="pokemon-shell">
        <div className="pokemon-panel">
          <h2>Pokémon TCG</h2>
          <p>No game state was provided to PokemonView.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pokemon-shell">
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
        <button onClick={() => onOpenHand(currentPlayerId)}>Hand</button>
        <button onClick={onOpenCheck}>Check</button>
        <button disabled>Retreat</button>
        <button onClick={onOpenAttack}>Attack</button>
        <button disabled>Power</button>
        <button onClick={() => onAction({ type: "END_TURN" })}>Done</button>
      </nav>

      {state.turn?.phase === "DRAW" && (
        <button className="pokemon-full-button" onClick={() => onAction({ type: "DRAW_FOR_TURN" })}>
          Draw for {playerLabel(currentPlayerId)}
        </button>
      )}
    </>
  );
}

function PlayerBattleArea({ state, playerId, perspective, onOpenCard }) {
  const player = state.players[playerId];
  const activeCard = getCardViewModel(state, player.active);
  const benchCards = (player.bench ?? []).map((cardId) => getCardViewModel(state, cardId));

  return (
    <section className={`pokemon-battle-area ${perspective}`}>
      <div className="pokemon-area-header">
        <strong>{player.name ?? playerLabel(playerId)}</strong>
        <span>
          Deck {player.deck.length} · Hand {player.hand.length} · Prizes {player.prizes.length} · Discard{" "}
          {player.discard.length}
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
  const player = state.players[playerId];
  const selected = getCardViewModel(state, selectedCardId);
  const selectedDefinition = selected ? findCardDefinitionById(state.cardsById[selected.id].definitionId) : null;
  const currentCommand = getCurrentCommand(state.commands);

  const inPlayTargets = [player.active, ...(player.bench ?? [])].filter(Boolean).map((id) => getCardViewModel(state, id));
  const canChooseActive =
    currentCommand?.type === "CHOOSE_ACTIVE_BASIC" &&
    currentCommand.playerId === playerId &&
    selectedDefinition?.isBasicPokemon;

  const canPlayBench = selectedDefinition?.isBasicPokemon && player.bench.some((slot) => !slot);
  const canAttachEnergy =
    selectedDefinition?.isEnergy &&
    state.turn.playerId === playerId &&
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
          {player.hand.map((cardId, index) => {
            const card = getCardViewModel(state, cardId);
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
              <button onClick={() => onAction({ type: "CHOOSE_ACTIVE_BASIC", cardId: selected.id })}>
                Choose Active
              </button>
            )}
            {canPlayBench && (
              <button onClick={() => onAction({ type: "PLAY_BASIC_TO_BENCH", playerId, cardId: selected.id })}>
                Play to Bench
              </button>
            )}
            {canAttachEnergy && (
              <button
                onClick={() =>
                  onAction({
                    type: "ATTACH_ENERGY",
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
          const player = state.players[playerId];
          return (
            <div className="pokemon-check-player" key={playerId}>
              <h4>{player.name}</h4>
              <button onClick={() => onOpenHand(playerId)}>Open Hand ({player.hand.length})</button>
              <p>Deck: {player.deck.length}</p>
              <p>Prizes: {player.prizes.length}</p>
              <p>Discard: {player.discard.length}</p>

              <div className="pokemon-thumbnail-grid">
                {[player.active, ...(player.bench ?? []), ...(player.discard ?? []).slice(-6)].filter(Boolean).map((cardId) => {
                  const card = getCardViewModel(state, cardId);
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
  const playerId = state.turn.playerId;
  const player = state.players[playerId];
  const activeId = player.active;
  const activeDefinition = activeId ? findCardDefinitionById(state.cardsById[activeId].definitionId) : null;
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
                  disabled={!canPay || state.turn.attackUsedThisTurn}
                  onClick={() => onAction({ type: "DECLARE_ATTACK", attackIndex: index })}
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
  const definition = card ? findCardDefinitionById(state.cardsById[card.id].definitionId) : null;
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

function MiniAttachmentStack({ state, cardId, onOpenCard = null }) {
  const card = state.cardsById[cardId];
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
  if (!cardId) return null;
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
