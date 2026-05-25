import FiveParsecsGame from "./FiveParsecsGame";

const manifest = {
  id: "five-parsecs",
  slug: "five-parsecs",
  gameType: "five-parsecs",
  title: "Five Parsecs from Home",
  name: "Five Parsecs from Home",
  shortTitle: "Five Parsecs",
  description: "Shared no-minis campaign record keeper for crew, worlds, encounters, enemies, and logs.",
  component: FiveParsecsGame,
  Component: FiveParsecsGame,

  createRoomDefaults: () => ({
    gameType: "five-parsecs",
    status: "active",
  }),

  roomDefaults: {
    gameType: "five-parsecs",
    status: "active",
  },
};

export default manifest;
export { FiveParsecsGame };
export const gameManifest = manifest;
export const id = manifest.id;
export const title = manifest.title;
export const gameType = manifest.gameType;
export const component = FiveParsecsGame;
