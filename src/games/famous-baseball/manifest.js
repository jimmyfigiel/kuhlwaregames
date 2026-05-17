// src/games/famous-baseball/manifest.js

const famousBaseballManifest = {
  id: "famous-baseball",

  // Use both name and title so either version of the game list can read it.
  name: "Famous Baseball",
  title: "Famous Baseball",
  shortTitle: "Baseball",

  description:
    "A two-player bluffing baseball game using hidden pitch, swing, and hit-placement choices.",

  minPlayers: 2,
  maxPlayers: 2,

  playerSlots: [
    {
      id: "visitors",
      name: "Visitors",
      label: "Visitors",
    },
    {
      id: "home",
      name: "Home",
      label: "Home",
    },
  ],

  options: [
    {
      id: "gameLength",
      name: "Game Length",
      label: "Game Length",
      type: "select",
      defaultValue: 5,
      choices: [
        {
          value: 5,
          label: "5 innings",
        },
        {
          value: 9,
          label: "9 innings",
        },
      ],
    },
  ],
};

export default famousBaseballManifest;