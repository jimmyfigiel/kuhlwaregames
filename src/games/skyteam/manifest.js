// src/games/skyteam/manifest.js

export default {
  id: "skyteam",
  name: "Sky Team",
  title: "Sky Team",
  shortTitle: "Sky Team",
  description:
    "Cooperative cockpit landing game with solo mode, one-player test mode, and two-player Pilot / Co-Pilot mode.",
  minPlayers: 1,
  maxPlayers: 2,
  playerSlots: [
    { id: "pilot", name: "Pilot", label: "Pilot" },
    { id: "copilot", name: "Co-Pilot", label: "Co-Pilot" },
  ],
  options: [
    {
      id: "mode",
      name: "Mode",
      label: "Mode",
      type: "select",
      defaultValue: "twoPlayer",
      choices: [
        { value: "twoPlayer", label: "Two Player" },
        { value: "solo", label: "Solo Mode" },
        { value: "onePlayerTest", label: "One Player Test" },
      ],
    },
  ],
};
