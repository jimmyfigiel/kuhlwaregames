// src/games/pokemon-only-one/objects/GameLog.js

export class GameLog {
  constructor({ entries = [], nextNumber = 1 } = {}) {
    this.entries = [...entries];
    this.nextNumber = nextNumber;
  }

  static fromModel({ log = [], nextLogNumber = 1 } = {}) {
    return new GameLog({ entries: log, nextNumber: nextLogNumber });
  }

  add(type, message, details = null) {
    this.entries.push({
      number: this.nextNumber,
      time: currentTimeText(),
      type,
      message,
      details,
    });
    this.nextNumber += 1;
  }

  clear() {
    this.entries = [];
    this.nextNumber = 1;
    this.add("LOG_CLEARED", "Log cleared.");
  }

  toModelPieces() {
    return {
      log: [...this.entries],
      nextLogNumber: this.nextNumber,
    };
  }
}

function currentTimeText() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
