import { createArea, createCard } from "../../cardCore/CardCoreTypes";

const cardBack = "https://images.pokemontcg.io/base1/back_hires.png";

export function createInitialState() {
  const tableArea = createArea({
    id: "table",
    name: "Table",
    x: 0,
    y: 0,
    width: 900,
    height: 520,
    visibility: "public",
    ownerId: null,
    objectIds: ["card-1", "card-2"],
  });

  const firstCard = createCard({
    id: "card-1",
    areaId: "table",
    frontImage: "https://images.pokemontcg.io/base1/58_hires.png",
    backImage: cardBack,
    x: 120,
    y: 80,
    width: 180,
    height: 250,
    faceUp: true,
  });

  const secondCard = createCard({
    id: "card-2",
    areaId: "table",
    frontImage: "https://images.pokemontcg.io/base1/4_hires.png",
    backImage: cardBack,
    x: 360,
    y: 140,
    width: 180,
    height: 250,
    faceUp: false,
  });

  return {
    areas: {
      [tableArea.id]: tableArea,
    },
    cards: {
      [firstCard.id]: firstCard,
      [secondCard.id]: secondCard,
    },
    decks: {},
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
