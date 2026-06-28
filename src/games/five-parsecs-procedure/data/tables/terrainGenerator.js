// Terrain Generation tables verbatim from 5PFH Compendium pp.97-98
export const TERRAIN_TYPES = [
  {
    id: "industrial",
    label: "Industrial",
    description: "The typical semi-urban semi-factory look popular for Five Parsecs tables.",
    notableFeatures: [
      { roll: 1, text: "Large structure or facility." },
      { roll: 2, text: "Cluster of industrial items such as barrels, machinery, or similar." },
      { roll: 3, text: "Open space surrounded by fencing, barricades, or low walls." },
      { roll: 4, text: "Landing pad, loading bay, or similar open space with some scatter terrain." },
      { roll: 5, text: "Cargo area with containers, crates, civilian vehicles, or similar." },
      { roll: 6, text: "Single large structure or two medium structures." },
    ],
    regularFeatures: [
      { roll: 1, text: "Linear obstacles such as fences, railings, or barricades." },
      { roll: 2, text: "Building. If multiple buildings are present, they should be placed near each other or can be traded for a single larger structure." },
      { roll: 3, text: "Open ground with a few incidental items (sign post, boulder, or similar). If more than one area of open ground exists in a quarter, one of them should be a hill." },
      { roll: 4, text: "Several pieces of spread-out scatter terrain, such as boulders, barrels, vehicle parts, or similar." },
      { roll: 5, text: "Open ground with a single central piece such as a statue, tree, or similar." },
      { roll: 6, text: "Industrial or urban terrain such as shipping containers, a cluster of barrels, or a large civilian vehicle." },
    ],
  },
  {
    id: "wilderness",
    label: "Wilderness",
    description: "Natural features with lots of foliage. Can also be used for waste ground areas within otherwise urban settings.",
    notableFeatures: [
      { roll: 1, text: "Forested hill or high ground." },
      { roll: 2, text: "Large, difficult-to-cross feature such as a swamp." },
      { roll: 3, text: "Group of rock formations." },
      { roll: 4, text: "Forested area with paths to traverse." },
      { roll: 5, text: "Large but fairly bare hill." },
      { roll: 6, text: "Single building, ruin, or similar." },
    ],
    regularFeatures: [
      { roll: 1, text: "Difficult to pass feature such as swamp or dense forest." },
      { roll: 2, text: "Rock formation surrounded by plants." },
      { roll: 3, text: "Cluster of plants." },
      { roll: 4, text: "Rock formation." },
      { roll: 5, text: "Open space with scattered single plants." },
      { roll: 6, text: "Natural linear feature such as a hedgerow or line of trees." },
    ],
  },
  {
    id: "alien-ruin",
    label: "Alien Ruin",
    description: "Exploring old, strange sites. Can be adapted to undercity areas where one settlement has been built on the foundations of an earlier, alien civilization.",
    notableFeatures: [
      { roll: 1, text: "Scatter terrain with plants mixed in." },
      { roll: 2, text: "Large pile of rubble and debris." },
      { roll: 3, text: "Large, ruined building, possibly multi-story." },
      { roll: 4, text: "Remnants of a landing pad or town plaza, but overgrown with plants." },
      { roll: 5, text: "Ruined tower surrounded by rubble." },
      { roll: 6, text: "Large statue surrounded by plants or rubble." },
    ],
    regularFeatures: [
      { roll: 1, text: "Odd feature such as crystals, weird plants, or similar." },
      { roll: 2, text: "Ruined single building." },
      { roll: 3, text: "Partial ruin (such as half of a building surrounded by rubble)." },
      { roll: 4, text: "Open space with a few items of scatter." },
      { roll: 5, text: "Strange statue or vehicle wreck." },
      { roll: 6, text: "Scattered plants with some rubble." },
    ],
  },
  {
    id: "crash-site",
    label: "Crash Site",
    description: "A location where a shuttle or craft has wrecked.",
    notableFeatures: [
      { roll: 1, text: "Structure with damage (or reduced to a heap of rubble)." },
      { roll: 2, text: "Cluster of natural features (rocks, plants) with wreckage among them." },
      { roll: 3, text: "Forested area on fire." },
      { roll: 4, text: "Pile of wreckage." },
      { roll: 5, text: "Large chunk of wreckage in crater." },
      { roll: 6, text: "Large crater." },
    ],
    regularFeatures: [
      { roll: 1, text: "Open with scatter. Mixture of natural features and wreckage." },
      { roll: 2, text: "Scattered bits of wreckage." },
      { roll: 3, text: "Larger piece of wreckage." },
      { roll: 4, text: "Crater." },
      { roll: 5, text: "Natural feature (rocks, plants, hedgerow)." },
      { roll: 6, text: "Open ground, with smoke from fire." },
    ],
  },
];

export const TERRAIN_TYPES_BY_ID = Object.fromEntries(
  TERRAIN_TYPES.map((t) => [t.id, t])
);

export function makeTerrainTable(entries, tableId, title) {
  return {
    id: tableId,
    title,
    dice: "D6",
    sides: 6,
    entries: entries.map((e) => ({ min: e.roll, max: e.roll, label: e.text, value: e.text })),
  };
}
