// src/games/pokemon-only-one/commands/setSideCounts.js
// Kept only so older imports do not break if a stale file references it.
// Deck, discard, and hand counts now come from real card zones: zone.cardIds.length.

export class SetSideCountsCommand {
  constructor({ sideId }) {
    this.type = "SET_SIDE_COUNTS";
    this.sideId = sideId;
  }

  run(game) {
    game.log.add("COMMAND_IGNORED", "SET_SIDE_COUNTS is obsolete. Counts come from card zones.", {
      sideId: this.sideId,
    });
  }
}
