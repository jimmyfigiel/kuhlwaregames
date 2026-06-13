// src/games/pokemon-only-one/commands/openZonePopup.js

export class OpenZonePopupCommand {
  constructor({ zoneId, playerSlot = null }) {
    this.type = "OPEN_ZONE_POPUP";
    this.zoneId = zoneId;
    this.playerSlot = playerSlot;
  }

  run(game) {
    const zone = game.getZone(this.zoneId);

    if (!zone) {
      game.log.add("COMMAND_ERROR", `Cannot open missing zone ${this.zoneId}.`, { zoneId: this.zoneId });
      return;
    }

    game.display.openZonePopup(this.zoneId);
    game.log.add("ZONE_POPUP_OPENED", `Opened ${zone.name}.`, { zoneId: this.zoneId, zoneKind: zone.zoneKind, count: zone.count, ownerId: zone.ownerId, playerSlot: this.playerSlot, canControl: game.canActorControlZone(this.playerSlot, zone) });
  }
}
