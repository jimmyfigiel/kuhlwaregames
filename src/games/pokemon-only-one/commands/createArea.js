// src/games/pokemon-only-one/commands/createArea.js

import { Area } from "../objects/Area.js";

export class CreateAreaCommand {
  constructor({ areaId, name }) {
    this.type = "CREATE_AREA";
    this.areaId = areaId;
    this.name = name;
  }

  run(game) {
    game.setArea(new Area({ id: this.areaId, name: this.name, spaceIds: [] }));
    game.log.add("AREA_CREATED", `Created area ${this.name}.`, { areaId: this.areaId });
  }
}
