// src/games/pokemon/pokemonData.js
import baseSetJson from "./data/base_set.json";
import starterDecksJson from "./data/starter_decks.json";

const NAME_ALIASES = {
  "Nidoran♂": "Nidoran ♂",
  "Nidoran Male": "Nidoran ♂",
};

export const POKEMON_BASE_SET = baseSetJson;
export const POKEMON_STARTER_DECKS = starterDecksJson.decks ?? [];

export function normalizeCardName(name) {
  return NAME_ALIASES[name] ?? name;
}

export function buildCardDefinitions() {
  const definitionsByName = {};
  const definitionsById = {};

  for (const raw of baseSetJson.cards ?? []) {
    const definition = {
      ...raw,
      id: makeDefinitionId(raw),
      displayName: raw.name,
      playableAttacks: (raw.attacks ?? []).filter((attack) => attack.name !== "Pokémon"),
      isBasicPokemon:
        raw.supertype === "Pokemon" &&
        Array.isArray(raw.subtypes) &&
        raw.subtypes.includes("Basic"),
      isPokemon: raw.supertype === "Pokemon",
      isEnergy: String(raw.supertype ?? "").includes("Energy"),
      isTrainer: raw.supertype === "Trainer",
      imagePath: raw.image_path,
    };

    definitionsByName[definition.name] = definition;
    definitionsById[definition.id] = definition;
  }

  return { definitionsByName, definitionsById };
}

export const CARD_DEFINITIONS = buildCardDefinitions();

export function makeDefinitionId(card) {
  const number = String(card.collector_number ?? card.card_number ?? card.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const name = String(card.name)
    .toLowerCase()
    .replace(/♂/g, "m")
    .replace(/♀/g, "f")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `base-${number}-${name}`;
}

export function findCardDefinitionByName(name) {
  const normalized = normalizeCardName(name);
  return CARD_DEFINITIONS.definitionsByName[normalized] ?? null;
}

export function findCardDefinitionById(definitionId) {
  return CARD_DEFINITIONS.definitionsById[definitionId] ?? null;
}

export function getDeckDefinition(deckId) {
  return POKEMON_STARTER_DECKS.find((deck) => deck.id === deckId) ?? POKEMON_STARTER_DECKS[0];
}

export function getCardImage(definition) {
  return definition?.imagePath || definition?.image_path || "/card-images/pokemon/card-back.jpg";
}

export function getCardBackImage() {
  return "/card-images/pokemon/card-back.jpg";
}

export function getCardTypeLabel(definition) {
  if (!definition) return "Unknown";
  if (definition.isEnergy) return "Energy";
  if (definition.isPokemon) {
    if (definition.isBasicPokemon) return "Basic Pokémon";
    const stageAttack = (definition.attacks ?? []).find((attack) => attack.name === "Pokémon");
    return stageAttack?.text || "Pokémon";
  }
  return definition.supertype || "Card";
}

export function getRealAttacks(definition) {
  return (definition?.attacks ?? []).filter((attack) => attack.name !== "Pokémon");
}

export function getEnergyTypeFromCard(definition) {
  if (!definition?.isEnergy) return null;
  return String(definition.name).replace(" Energy", "");
}

export function attackDamageNumber(attack) {
  const match = String(attack?.damage ?? "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function getDeckOptions() {
  return POKEMON_STARTER_DECKS.map((deck) => ({
    value: deck.id,
    label: deck.name,
    description: deck.description,
  }));
}
