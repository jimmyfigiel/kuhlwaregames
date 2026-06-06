import { createArea, createCard, createDeck } from "../../cardCore/CardCoreTypes";

const cardBack = "https://images.pokemontcg.io/base1/back_hires.png";

function withDeckLinks(cards, deckCardIds) {
  const linkedCards = { ...cards };

  deckCardIds.forEach((cardId, index) => {
    linkedCards[cardId] = {
      ...linkedCards[cardId],
      cardBelowId: index > 0 ? deckCardIds[index - 1] : null,
      cardAboveId: index < deckCardIds.length - 1 ? deckCardIds[index + 1] : null,
    };
  });

  return linkedCards;
}

export function createInitialState() {
  const drawDeckCardIds = ["deck-card-1", "deck-card-2", "deck-card-3"];
  const handCardIds = ["hand-card-1", "hand-card-2", "hand-card-3"];

  const tableArea = createArea({
    id: "table",
    name: "Table",
    x: 0,
    y: 0,
    width: 900,
    height: 520,
    visibility: "public",
    ownerId: null,
    objectIds: ["draw-deck", "player-hand", "discard", "card-1", "card-2"],
  });

  const drawDeck = createDeck({
    id: "draw-deck",
    areaId: "table",
    name: "Deck",
    role: "deck",
    cardIds: drawDeckCardIds,
    x: 40,
    y: 240,
    width: 180,
    height: 250,
    zIndex: 1,
  });

  const playerHand = createDeck({
    id: "player-hand",
    areaId: "table",
    name: "Player 1 Hand",
    role: "hand",
    ownerId: "player-1",
    cardIds: handCardIds,
    x: 270,
    y: 220,
    width: 300,
    height: 284,
    zIndex: 1,
    cardSpacing: 70,
  });

  const discard = createDeck({
    id: "discard",
    areaId: "table",
    name: "Discard",
    role: "discard",
    cardIds: [],
    x: 680,
    y: 240,
    width: 180,
    height: 250,
    zIndex: 1,
  });

  const firstCard = createCard({
    id: "card-1",
    areaId: "table",
    frontImage: "https://images.pokemontcg.io/base1/58_hires.png",
    backImage: cardBack,
    x: 300,
    y: 60,
    width: 180,
    height: 250,
    faceUp: true,
    zIndex: 2,
  });

  const secondCard = createCard({
    id: "card-2",
    areaId: "table",
    frontImage: "https://images.pokemontcg.io/base1/4_hires.png",
    backImage: cardBack,
    x: 440,
    y: 90,
    width: 180,
    height: 250,
    faceUp: false,
    zIndex: 3,
  });

  const deckCards = {
    "deck-card-1": createCard({
      id: "deck-card-1",
      areaId: "table",
      frontImage: "https://images.pokemontcg.io/base1/7_hires.png",
      backImage: cardBack,
      x: drawDeck.x,
      y: drawDeck.y,
      width: 180,
      height: 250,
      faceUp: false,
      zIndex: 1,
    }),
    "deck-card-2": createCard({
      id: "deck-card-2",
      areaId: "table",
      frontImage: "https://images.pokemontcg.io/base1/15_hires.png",
      backImage: cardBack,
      x: drawDeck.x,
      y: drawDeck.y,
      width: 180,
      height: 250,
      faceUp: false,
      zIndex: 1,
    }),
    "deck-card-3": createCard({
      id: "deck-card-3",
      areaId: "table",
      frontImage: "https://images.pokemontcg.io/base1/20_hires.png",
      backImage: cardBack,
      x: drawDeck.x,
      y: drawDeck.y,
      width: 180,
      height: 250,
      faceUp: false,
      zIndex: 1,
    }),
  };

  const handCards = {
    "hand-card-1": createCard({
      id: "hand-card-1",
      areaId: "table",
      frontImage: "https://images.pokemontcg.io/base1/21_hires.png",
      backImage: cardBack,
      x: playerHand.x,
      y: playerHand.y,
      width: 180,
      height: 250,
      faceUp: false,
      zIndex: playerHand.zIndex + 1,
    }),
    "hand-card-2": createCard({
      id: "hand-card-2",
      areaId: "table",
      frontImage: "https://images.pokemontcg.io/base1/46_hires.png",
      backImage: cardBack,
      x: playerHand.x + playerHand.cardSpacing,
      y: playerHand.y,
      width: 180,
      height: 250,
      faceUp: false,
      zIndex: playerHand.zIndex + 2,
    }),
    "hand-card-3": createCard({
      id: "hand-card-3",
      areaId: "table",
      frontImage: "https://images.pokemontcg.io/base1/63_hires.png",
      backImage: cardBack,
      x: playerHand.x + playerHand.cardSpacing * 2,
      y: playerHand.y,
      width: 180,
      height: 250,
      faceUp: false,
      zIndex: playerHand.zIndex + 3,
    }),
  };

  let cards = {
    [firstCard.id]: firstCard,
    [secondCard.id]: secondCard,
    ...deckCards,
    ...handCards,
  };

  cards = withDeckLinks(cards, drawDeckCardIds);
  cards = withDeckLinks(cards, handCardIds);

  return {
    areas: {
      [tableArea.id]: tableArea,
    },
    cards,
    decks: {
      [drawDeck.id]: drawDeck,
      [playerHand.id]: playerHand,
      [discard.id]: discard,
    },
  };
}

export function submitAction({ state, action }) {
  if (!state) return createInitialState();

  switch (action.type) {
    case "SET_STATE":
      return action.state;
    default:
      return state;
  }
}

const rules = {
  createInitialState,
  submitAction,
};

export default rules;
