// src/games/pokemon-only-one/objects/Display.js

export class Display {
  constructor({ screen = "BATTLE_SCREEN", popup = null, zoomCardId = null, selection = null } = {}) {
    this.screen = screen;
    this.popup = popup || (zoomCardId ? { type: "CARD_ZOOM", cardId: zoomCardId } : null);
    this.selection = selection || null;
  }

  static fromModel(model = {}) {
    return new Display(model || {});
  }

  setScreen(screen) {
    this.screen = screen;
  }

  openCardZoom(cardId) {
    this.popup = { type: "CARD_ZOOM", cardId };
  }

  selectCardForMove(cardId, sourceZoneId, details = {}) {
    this.selection = {
      type: "MOVE_CARD",
      cardId,
      sourceZoneId,
      ...details,
    };
    this.popup = null;
  }

  clearSelection() {
    this.selection = null;
  }

  openZonePopup(zoneId) {
    this.popup = { type: "ZONE_POPUP", zoneId };
  }

  closePopup() {
    this.popup = null;
  }

  closeCardZoom() {
    this.closePopup();
  }

  toModel() {
    return {
      screen: this.screen,
      popup: this.popup,
      selection: this.selection,
    };
  }
}
