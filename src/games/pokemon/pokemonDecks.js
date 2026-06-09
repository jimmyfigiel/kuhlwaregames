// src/games/pokemon/pokemonDecks.js
import { makeCardInstance, shuffleArray } from "../../core/card/cardEngine";
import { findCardDefinitionByName, getDeckDefinition } from "./pokemonData";

export function createDeckInstances({ deckId, playerId, seed = Date.now() }) {
  const deckDefinition = getDeckDefinition(deckId);
  const cardsById = {};
  const deck = [];
  const errors = [];

  for (const entry of deckDefinition.cards ?? []) {
    const definition = findCardDefinitionByName(entry.name);

    if (!definition) {
      errors.push(`Could not find card definition for "${entry.name}" in deck "${deckDefinition.name}".`);
      continue;
    }

    for (let copy = 1; copy <= Number(entry.count ?? 1); copy += 1) {
      const instanceId = `${playerId}_${definition.id}_${copy}_${Math.random().toString(36).slice(2, 7)}`;
      cardsById[instanceId] = makeCardInstance({
        instanceId,
        definitionId: definition.id,
        ownerId: playerId,
        zoneId: `${playerId}.deck`,
        faceUp: false,
      });
      deck.push(instanceId);
    }
  }

  return {
    deckDefinition,
    deck: shuffleArray(deck, `${seed}:${playerId}:${deckId}`),
    cardsById,
    errors,
  };
}
