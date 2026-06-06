import { createArea, createCard } from "../../cardCore/CardCoreTypes";
import { flipCard, moveCard } from "../../cardCore/cardCoreActions";

const CARD_FRONT_IMAGE = "https://images.pokemontcg.io/base1/58_hires.png";
const CARD_BACK_IMAGE = "https://images.pokemontcg.io/base1/back_hires.png";

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
    objectIds: ["card-1"],
  });

  const testCard = createCard({
    id: "card-1",
    areaId: "table",
    frontImage: CARD_FRONT_IMAGE,
    backImage: CARD_BACK_IMAGE,
    x: 120,
    y: 80,
    width: 180,
    height: 250,
    faceUp: true,
  });

  return {
    areas: {
      [tableArea.id]: tableArea,
    },
    cards: {
      [testCard.id]: testCard,
    },
    decks: {},
    log: [],
  };
}

export function submitAction({ state, action }) {
  if (!state) return createInitialState();

  switch (action?.type) {
    case "MOVE_CARD": {
      return moveCard(state, action.cardId, action.x, action.y);
    }

    case "FLIP_CARD": {
      return flipCard(state, action.cardId);
    }

    default:
      return state;
  }
}

const rules = {
  createInitialState,
  submitAction,
};

export default rules;
