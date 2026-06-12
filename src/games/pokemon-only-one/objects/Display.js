// src/games/pokemon-only-one/objects/Display.js

export class Display {
  constructor({ screen = "ONE_AREA_SCREEN", zoomCardId = null } = {}) {
    this.screen = screen;
    this.zoomCardId = zoomCardId;
  }

  static fromModel(model = {}) {
    return new Display(model);
  }

  openCardZoom(cardId) {
    this.zoomCardId = cardId;
  }

  closeCardZoom() {
    this.zoomCardId = null;
  }

  toModel() {
    return {
      screen: this.screen,
      zoomCardId: this.zoomCardId,
    };
  }
}
