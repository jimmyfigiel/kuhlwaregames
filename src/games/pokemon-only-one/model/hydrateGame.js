// src/games/pokemon-only-one/model/hydrateGame.js

import { Game } from "../objects/Game.js";

export function hydrateGame(model) {
  return Game.fromModel(model);
}
