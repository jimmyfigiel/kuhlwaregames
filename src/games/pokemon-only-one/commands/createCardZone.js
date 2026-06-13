// src/games/pokemon-only-one/commands/createCardZone.js

import { CardZone } from "../objects/CardZone.js";

export class CreateCardZoneCommand {
  constructor({ zoneId, ownerId = null, zoneKind = "generic", name = "Card Zone", visibility = "public", capacity = null, faceDown = false }) {
    this.type = "CREATE_CARD_ZONE";
    this.zoneId = zoneId;
    this.ownerId = ownerId;
    this.zoneKind = zoneKind;
    this.name = name;
    this.visibility = visibility;
    this.capacity = capacity;
    this.faceDown = faceDown;
  }

  run(game) {
    game.addZone(
      new CardZone({
        id: this.zoneId,
        ownerId: this.ownerId,
        zoneKind: this.zoneKind,
        name: this.name,
        visibility: this.visibility,
        capacity: this.capacity,
        faceDown: this.faceDown,
      })
    );
    game.log.add("ZONE_CREATED", `Created ${this.name}.`, { zoneId: this.zoneId, zoneKind: this.zoneKind });
  }
}
