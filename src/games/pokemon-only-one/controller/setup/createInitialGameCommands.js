// src/games/pokemon-only-one/controller/setup/createInitialGameCommands.js

import { CreateAreaCommand } from "../../commands/createArea.js";
import { CreateCardCommand } from "../../commands/createCard.js";
import { CreateCardZoneCommand } from "../../commands/createCardZone.js";
import { CreatePlayerSideCommand } from "../../commands/createPlayerSide.js";
import { PutCardInZoneCommand } from "../../commands/putCardInZone.js";
import { SetScreenCommand } from "../../commands/setScreen.js";

const PLAYER_BENCH_IDS = ["playerBench1", "playerBench2", "playerBench3", "playerBench4", "playerBench5"];
const OPPONENT_BENCH_IDS = ["opponentBench1", "opponentBench2", "opponentBench3", "opponentBench4", "opponentBench5"];
const PLAYER_PRIZE_IDS = ["playerPrize1", "playerPrize2", "playerPrize3", "playerPrize4", "playerPrize5", "playerPrize6"];
const OPPONENT_PRIZE_IDS = ["opponentPrize1", "opponentPrize2", "opponentPrize3", "opponentPrize4", "opponentPrize5", "opponentPrize6"];

const SAMPLE_CARD_DEFINITIONS = {
  pikachu: {
    name: "Pikachu",
    cardType: "Basic Pokémon",
    imagePath: "/card-images/pokemon/base-set/058-pikachu.jpg",
  },
  poliwag: {
    name: "Poliwag",
    cardType: "Basic Pokémon",
    imagePath: "/card-images/pokemon/base-set/059-poliwag.jpg",
  },
  charmander: {
    name: "Charmander",
    cardType: "Basic Pokémon",
    imagePath: "/card-images/pokemon/base-set/046-charmander.jpg",
  },
  squirtle: {
    name: "Squirtle",
    cardType: "Basic Pokémon",
    imagePath: "/card-images/pokemon/base-set/063-squirtle.jpg",
  },
  bulbasaur: {
    name: "Bulbasaur",
    cardType: "Basic Pokémon",
    imagePath: "/card-images/pokemon/base-set/044-bulbasaur.jpg",
  },
  rattata: {
    name: "Rattata",
    cardType: "Basic Pokémon",
    imagePath: "/card-images/pokemon/base-set/061-rattata.jpg",
  },
  pidgey: {
    name: "Pidgey",
    cardType: "Basic Pokémon",
    imagePath: "/card-images/pokemon/base-set/057-pidgey.jpg",
  },
  machop: {
    name: "Machop",
    cardType: "Basic Pokémon",
    imagePath: "/card-images/pokemon/base-set/052-machop.jpg",
  },
  waterEnergy: {
    name: "Water Energy",
    cardType: "Energy",
    imagePath: "/card-images/pokemon/base-set/102-water-energy.jpg",
  },
  fireEnergy: {
    name: "Fire Energy",
    cardType: "Energy",
    imagePath: "/card-images/pokemon/base-set/098-fire-energy.jpg",
  },
  lightningEnergy: {
    name: "Lightning Energy",
    cardType: "Energy",
    imagePath: "/card-images/pokemon/base-set/100-lightning-energy.jpg",
  },
  fightingEnergy: {
    name: "Fighting Energy",
    cardType: "Energy",
    imagePath: "/card-images/pokemon/base-set/097-fighting-energy.jpg",
  },
};

const PLAYER_DECK_TEMPLATE = [
  ...repeat("pikachu", 4),
  ...repeat("charmander", 4),
  ...repeat("bulbasaur", 4),
  ...repeat("rattata", 4),
  ...repeat("pidgey", 4),
  ...repeat("waterEnergy", 10),
  ...repeat("fireEnergy", 10),
  ...repeat("lightningEnergy", 10),
  ...repeat("fightingEnergy", 10),
];

const OPPONENT_DECK_TEMPLATE = [
  ...repeat("poliwag", 4),
  ...repeat("squirtle", 4),
  ...repeat("machop", 4),
  ...repeat("rattata", 4),
  ...repeat("pidgey", 4),
  ...repeat("waterEnergy", 12),
  ...repeat("fireEnergy", 8),
  ...repeat("lightningEnergy", 10),
  ...repeat("fightingEnergy", 10),
];

export function createInitialGameCommands() {
  return [
    new CreateAreaCommand({ areaId: "battlefield", name: "Battlefield" }),
    ...createBattleZones(),
    new CreatePlayerSideCommand({
      sideId: "opponent",
      name: "Opponent",
      activeZoneId: "opponentActive",
      benchZoneIds: OPPONENT_BENCH_IDS,
      prizeZoneIds: OPPONENT_PRIZE_IDS,
      deckZoneId: "opponentDeck",
      discardZoneId: "opponentDiscard",
      handZoneId: "opponentHand",
    }),
    new CreatePlayerSideCommand({
      sideId: "player",
      name: "Player",
      activeZoneId: "playerActive",
      benchZoneIds: PLAYER_BENCH_IDS,
      prizeZoneIds: PLAYER_PRIZE_IDS,
      deckZoneId: "playerDeck",
      discardZoneId: "playerDiscard",
      handZoneId: "playerHand",
    }),
    ...createStartingDeckCommands("player", "playerDeck", PLAYER_DECK_TEMPLATE),
    ...createStartingDeckCommands("opponent", "opponentDeck", OPPONENT_DECK_TEMPLATE),
    new SetScreenCommand({ screen: "BATTLE_SCREEN" }),
  ];
}

function createBattleZones() {
  const zoneDefinitions = [
    { zoneId: "opponentDeck", ownerId: "opponent", zoneKind: "deck", name: "Opponent Deck", visibility: "hidden", capacity: null, faceDown: true },
    { zoneId: "opponentDiscard", ownerId: "opponent", zoneKind: "discard", name: "Opponent Discard", visibility: "public", capacity: null, faceDown: false },
    { zoneId: "opponentHand", ownerId: "opponent", zoneKind: "hand", name: "Opponent Hand", visibility: "owner", capacity: null, faceDown: false },
    { zoneId: "opponentActive", ownerId: "opponent", zoneKind: "active", name: "Opponent Active", visibility: "public", capacity: 1, faceDown: false },
    ...OPPONENT_BENCH_IDS.map((zoneId, index) => ({ zoneId, ownerId: "opponent", zoneKind: "bench", name: `Opponent Bench ${index + 1}`, visibility: "public", capacity: 1, faceDown: false })),
    ...OPPONENT_PRIZE_IDS.map((zoneId, index) => ({ zoneId, ownerId: "opponent", zoneKind: "prize", name: `Opponent Prize ${index + 1}`, visibility: "hidden", capacity: 1, faceDown: true })),

    { zoneId: "playerDeck", ownerId: "player", zoneKind: "deck", name: "Player Deck", visibility: "hidden", capacity: null, faceDown: true },
    { zoneId: "playerDiscard", ownerId: "player", zoneKind: "discard", name: "Player Discard", visibility: "public", capacity: null, faceDown: false },
    { zoneId: "playerHand", ownerId: "player", zoneKind: "hand", name: "Player Hand", visibility: "owner", capacity: null, faceDown: false },
    { zoneId: "playerActive", ownerId: "player", zoneKind: "active", name: "Player Active", visibility: "public", capacity: 1, faceDown: false },
    ...PLAYER_BENCH_IDS.map((zoneId, index) => ({ zoneId, ownerId: "player", zoneKind: "bench", name: `Player Bench ${index + 1}`, visibility: "public", capacity: 1, faceDown: false })),
    ...PLAYER_PRIZE_IDS.map((zoneId, index) => ({ zoneId, ownerId: "player", zoneKind: "prize", name: `Player Prize ${index + 1}`, visibility: "hidden", capacity: 1, faceDown: true })),
  ];

  return zoneDefinitions.map((definition) => new CreateCardZoneCommand(definition));
}

function createStartingDeckCommands(ownerId, deckZoneId, template) {
  const shuffledDefinitionKeys = shuffle([...template]);

  return shuffledDefinitionKeys.flatMap((definitionKey, index) => {
    const definition = SAMPLE_CARD_DEFINITIONS[definitionKey] || SAMPLE_CARD_DEFINITIONS.waterEnergy;
    const cardId = `${ownerId}_deck_${String(index + 1).padStart(2, "0")}_${definitionKey}`;

    return [
      new CreateCardCommand({
        cardId,
        name: definition.name,
        cardType: definition.cardType,
        imagePath: definition.imagePath,
        ownerId,
      }),
      new PutCardInZoneCommand({ cardId, zoneId: deckZoneId }),
    ];
  });
}

function repeat(value, count) {
  return Array.from({ length: count }, () => value);
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}
