// src/games/pokemon/manifest.js
import * as rules from "./rules";
import PokemonView from "./view.jsx";

const manifest = {
  id: "pokemon",
  title: "Pokémon TCG",
  description: "A Game Boy-inspired Pokémon TCG test module using Card Core and Command Core.",
  minPlayers: 1,
  maxPlayers: 2,
  defaultOptions: {
    controlMode: "solo-test",
    p1DeckId: "zap",
    p2DeckId: "blackout",
  },
  rules,
  view: PokemonView,
};

export default manifest;
