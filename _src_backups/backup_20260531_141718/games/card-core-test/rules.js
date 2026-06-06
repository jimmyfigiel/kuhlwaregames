import { createArea, createCard, createCardContainer } from "../../cardCore/CardCoreTypes";

const cardBack = "https://images.pokemontcg.io/base1/back_hires.png";

function withContainerLinks(cards, containerCardIds) {
  const linkedCards = { ...cards };

  containerCardIds.forEach((cardId, index) => {
    linkedCards[cardId] = {
      ...linkedCards[cardId],
      cardBelowId: index > 0 ? containerCardIds[index - 1] : null,
      cardAboveId:
        index < containerCardIds.length - 1 ? containerCardIds[index + 1] : null,
    };
  });

  return linkedCards;
}

export function createInitialState() {
  const drawDeckCardIds = ["deck-card-1", "deck-card-2", "deck-card-3"];
  const handCardIds = ["hand-card-1", "hand-card-2", "hand-card-3"];
  const rowCardIds = ["row-card-1", "row-card-2"];
  const slotCardIds = [];

  const tableArea = createArea({
    id: "table",
    name: "Table",
    x: 0,
    y: 0,
    width: 900,
    height: 520,
    visibility: "public",
    ownerId: null,
    objectIds: [
      "draw-deck",
      "discard",
      "player-hand",
      "active-slot",
      "public-row",
      "card-1",
      "card-2",
    ],
  });

  const drawDeck = createCardContainer({
    id: "draw-deck",
    areaId: "table",
    name: "Deck",
    kind: "deck",
    cardIds: drawDeckCardIds,
    x: 40,
    y: 248,
    width: 180,
    height: 250,
    zIndex: 1,
  });

  const discard = createCardContainer({
    id: "discard",
    areaId: "table",
    name: "Discard",
    kind: "discard",
    cardIds: [],
    x: 235,
    y: 248,
    width: 180,
    height: 250,
    zIndex: 1,
  });

  const playerHand = createCardContainer({
    id: "player-hand",
    areaId: "table",
    name: "Player 1 Hand",
    kind: "hand",
    ownerId: "player-1",
    cardIds: handCardIds,
    x: 430,
    y: 214,
    width: 380,
    height: 284,
    zIndex: 1,
    cardSpacing: 70,
  });

  const activeSlot = createCardContainer({
    id: "active-slot",
    areaId: "table",
    name: "Single Slot",
    kind: "slot",
    cardIds: slotCardIds,
    x: 40,
    y: 30,
    width: 180,
    height: 250,
    zIndex: 1,
  });

  const publicRow = createCardContainer({
    id: "public-row",
    areaId: "table",
    name: "Public Row",
    kind: "row",
    cardIds: rowCardIds,
    x: 245,
    y: 30,
    width: 330,
    height: 284,
    zIndex: 1,
    cardSpacing: 95,
  });

  const firstCard = createCard({
    id: "card-1",
    areaId: "table",
    frontImage: "https://images.pokemontcg.io/base1/58_hires.png",
    backImage: cardBack,
    x: 610,
    y: 40,
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
    x: 690,
    y: 80,
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
      y: playerHand.y + 34,
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
      y: playerHand.y + 34,
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
      y: playerHand.y + 34,
      width: 180,
      height: 250,
      faceUp: false,
      zIndex: playerHand.zIndex + 3,
    }),
  };

  const rowCards = {
    "row-card-1": createCard({
      id: "row-card-1",
      areaId: "table",
      frontImage: "https://images.pokemontcg.io/base1/10_hires.png",
      backImage: cardBack,
      x: publicRow.x,
      y: publicRow.y + 34,
      width: 180,
      height: 250,
      faceUp: true,
      zIndex: publicRow.zIndex + 1,
    }),
    "row-card-2": createCard({
      id: "row-card-2",
      areaId: "table",
      frontImage: "https://images.pokemontcg.io/base1/12_hires.png",
      backImage: cardBack,
      x: publicRow.x + publicRow.cardSpacing,
      y: publicRow.y + 34,
      width: 180,
      height: 250,
      faceUp: true,
      zIndex: publicRow.zIndex + 2,
    }),
  };

  let cards = {
    [firstCard.id]: firstCard,
    [secondCard.id]: secondCard,
    ...deckCards,
    ...handCards,
    ...rowCards,
  };

  cards = withContainerLinks(cards, drawDeckCardIds);
  cards = withContainerLinks(cards, handCardIds);
  cards = withContainerLinks(cards, rowCardIds);

  return {
    areas: {
      [tableArea.id]: tableArea,
    },
    cards,
    containers: {
      [drawDeck.id]: drawDeck,
      [discard.id]: discard,
      [playerHand.id]: playerHand,
      [activeSlot.id]: activeSlot,
      [publicRow.id]: publicRow,
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
