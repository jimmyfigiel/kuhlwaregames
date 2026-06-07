export const SHIP_NAMES = [
  "The Rusted Halo", "The Black Meridian", "The Lucky Comet", "The Broken Horizon", "The Copper Ghost",
  "The Last Payday", "The Iron Promise", "The Scarlet Wren", "The Dust Runner", "The Old Pilgrim",
  "The Neon Jackal", "The Hollow Star", "The Wandering Crown", "The Starboard Saint", "The Ragged Fortune",
  "The Gilded Mule", "The Blue Revenant", "The Quiet Thunder", "The Silver Scoundrel", "The Crimson Lantern",
  "The Battered Queen", "The Far Horizon", "The Rustbelt Angel", "The Debt Collector", "The Wayward Nova",
  "The Tin Valkyrie", "The Starling Wake", "The Honest Liar", "The Pale Corsair", "The Burnt Offering",
  "The Slipstream Gambit", "The Cobalt Widow", "The Distant Mercy", "The Cheap Miracle", "The Golden Vulture",
  "The Slow Bullet", "The Vagabond Sun", "The Ashen Sparrow", "The Red Nebula", "The Midnight Courier",
  "The Reckless Orbit", "The Brass Prophet", "The Lunar Hound", "The Crooked Compass", "The Spent Cartridge",
  "The Solar Grift", "The Cold Lantern", "The Driftwood Saint", "The Ghost of Ceres", "The New Regret",
  "The Widow's Lantern", "The Starfall Kid", "The Borrowed Time", "The Rebel Psalm", "The Knucklebone",
  "The Bad Penny", "The Tired Dragon", "The Long Shot", "The Last Laugh", "The White Manticore",
  "The Ember Crown", "The Freefall Saint", "The Void Minnow", "The Brass Horizon", "The Missing Witness",
  "The Faraday Fox", "The Stone Orchid", "The Gunmetal Dove", "The Rattlesnake Moon", "The Glory Hole",
  "The Dead Reckoning", "The Honest Mistake", "The Broken Compass", "The Hardscrabble", "The Lucky Bastard",
  "The Payday Prophet", "The Ten-Credit Queen", "The Old Contraband", "The Second Sunrise", "The Plated Raven",
  "The Carbon Saint", "The Blue Mongoose", "The Last Outpost", "The Quiet Riot", "The Nomad's Mercy",
  "The Stolen Dawn", "The Blunt Instrument", "The Flickerjack", "The Meridian Mule", "The Redshift Rook",
  "The Mothership's Folly", "The Cold Venture", "The Oort Gambler", "The Dented Crown", "The Star Rat",
  "The Comet Harlot", "The Bent Halo", "The Frontier Psalm", "The Black Dog", "The Kestrel's Debt",
];

export function randomShipName(random = Math.random) {
  const index = Math.floor(random() * SHIP_NAMES.length);
  return SHIP_NAMES[index] || "The Wandering Star";
}
