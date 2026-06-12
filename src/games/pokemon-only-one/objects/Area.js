// src/games/pokemon-only-one/objects/Area.js

export class Area {
  constructor({ id, name, spaceIds = [] }) {
    this.id = id;
    this.name = name;
    this.spaceIds = [...spaceIds];
  }

  static fromModel(model) {
    return new Area(model);
  }

  addSpace(spaceId) {
    if (!this.spaceIds.includes(spaceId)) {
      this.spaceIds.push(spaceId);
    }
  }

  toModel() {
    return {
      id: this.id,
      name: this.name,
      spaceIds: [...this.spaceIds],
    };
  }
}
