// src/games/pokemon-only-one/commands/createPlayerSide.js

import { PlayerSide } from "../objects/PlayerSide.js";

export class CreatePlayerSideCommand {
  constructor({
    sideId,
    name,
    activeZoneId,
    benchZoneIds = [],
    prizeZoneIds = [],
    deckZoneId,
    discardZoneId,
    handZoneId,
  }) {
    this.type = "CREATE_PLAYER_SIDE";
    this.sideId = sideId;
    this.name = name;
    this.activeZoneId = activeZoneId;
    this.benchZoneIds = [...benchZoneIds];
    this.prizeZoneIds = [...prizeZoneIds];
    this.deckZoneId = deckZoneId;
    this.discardZoneId = discardZoneId;
    this.handZoneId = handZoneId;
  }

  run(game) {
    game.addPlayerSide(
      new PlayerSide({
        id: this.sideId,
        name: this.name,
        activeZoneId: this.activeZoneId,
        benchZoneIds: this.benchZoneIds,
        prizeZoneIds: this.prizeZoneIds,
        deckZoneId: this.deckZoneId,
        discardZoneId: this.discardZoneId,
        handZoneId: this.handZoneId,
      })
    );

    game.log.add("PLAYER_SIDE_CREATED", `Created ${this.name} side.`, {
      sideId: this.sideId,
      activeZoneId: this.activeZoneId,
      deckZoneId: this.deckZoneId,
      discardZoneId: this.discardZoneId,
      handZoneId: this.handZoneId,
    });
  }
}
