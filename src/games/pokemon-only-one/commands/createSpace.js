// src/games/pokemon-only-one/commands/createSpace.js

import { Space } from "../objects/Space.js";

export class CreateSpaceCommand {
  constructor({ spaceId, name }) {
    this.type = "CREATE_SPACE";
    this.spaceId = spaceId;
    this.name = name;
  }

  run(game) {
    game.addSpace(new Space({ id: this.spaceId, name: this.name, cardId: null }));
    game.log.add("SPACE_CREATED", `Created ${this.name}.`, { spaceId: this.spaceId });
  }
}
