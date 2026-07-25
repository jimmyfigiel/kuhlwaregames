// The Component List (5PFH Rulebook p.63-64) — permanent ship upgrades purchasable
// during the Purchase Items step, one per campaign turn.

export const SHIP_COMPONENTS = [
  {
    id: "medicalBay",
    name: "Medical Bay",
    cost: 25,
    description: "Fully stocked medical facility to aid long-term recovery. Each campaign turn when recovering from Injuries, select a crew member who can mark off 2 campaign turns of recovery time.",
  },
  {
    id: "cargoHold",
    name: "Cargo Hold",
    cost: 15,
    description: "The hold of the ship has been upgraded to be environmentally stable. When traveling to a new planet, you may take on cargo. Roll 2D6 and discard any 5-6. Select the highest remaining die and earn that many credits from delivering a shipment to the new world. If both dice are discarded, no shipments are available. If your ship is damaged in transit, the cargo is also lost.",
  },
  {
    id: "database",
    name: "Database",
    cost: 10,
    description: "Extensive data records have been added to aid in decision making. When traveling to a new planet, you may roll up the details for one additional planet, and then select which to visit.",
  },
  {
    id: "shuttle",
    name: "Shuttle",
    cost: 15,
    description: "Launch bay with a standard ‘Lemon Shark’ shuttle for quick deployments. If you receive the Distress Call Starship Travel event, you may roll twice and pick the higher roll. If a planet is Invaded, you may add +2 to the roll to get off-world.",
  },
  {
    id: "merchantLink",
    name: "Merchant Link",
    cost: 20,
    description: "Access point to the corporate extra-net framework. You may carry out one free Trade action each campaign turn, without requiring a crew member to be assigned to it.",
  },
  {
    id: "dropLauncher",
    name: "Drop Launcher",
    cost: 25,
    description: "Rapid deployment system, adapted from Unity military vessels. When setting up a battle, roll 2D6. On an 8+, Drop deployment is viable. Select up to two crew figures who will land using this method. They do not set up at the beginning of the battle. Instead, at the end of any round, select a point on the tabletop, move it 1D6” in a random direction, and then set up both characters within 1” of the final marker. They cannot act on arrival, but will act normally in the following round.",
  },
  {
    id: "probeLauncher",
    name: "Probe Launcher",
    cost: 10,
    description: "Launching device for scientific probes. If you receive the Asteroids Starship Travel event, you can roll twice to avoid the field.",
  },
  {
    id: "autoTurrets",
    name: "Auto-Turrets",
    cost: 15,
    description: "Auto-tracking Hyper-Laser turret. If you receive the Raided Starship Travel event, you may add +1 to the roll to avoid the battle. If you have to flee from a world that is being Invaded, you may add +1 to the roll.",
  },
  {
    id: "militaryNavSystem",
    name: "Military Nav System",
    cost: 15,
    description: "Improved navigation system. If you roll the Navigation Trouble Starship Travel event, you do not have to subtract 1 story point. If you roll the Travel-Time Starship Travel event, you may receive the benefits of both that event AND Uneventful Trip.",
  },
  {
    id: "improvedShielding",
    name: "Improved Shielding",
    cost: 20,
    description: "Additional armor plating, along with directional screen generators. If your ship would sustain damage from any source, reduce the damage by 1 Hull Point. Note that the Asteroids Starship Travel event potentially inflicts multiple Hits, with the Improved Shielding protecting against each.",
    hullDamageReduction: 1,
  },
  {
    id: "hiddenCompartment",
    name: "Hidden Compartment",
    cost: 15,
    description: "If you receive the Patrol Ship Starship Travel event, you only have to roll once for confiscated items. Each time you travel to a new Planet, you may roll 3D6, discard any dice that do not score a 1 or 2, then receive credits equal to the sum of the dice that did not get discarded.",
  },
  {
    id: "suspensionPod",
    name: "Suspension Pod",
    cost: 15,
    description: "When managing Upkeep, you may opt to Suspend any crew members. They do not participate in any events, cannot undertake tasks or go on missions, do not recover from Injuries, and do not require Upkeep. While Suspended, the character doesn't count as part of the crew. You can have up to 4 crew members Suspended at any one time. During any Upkeep step of a future campaign turn, you can revive any Suspended crew.",
  },
  {
    id: "livingQuarters",
    name: "Living Quarters",
    cost: 15,
    description: "Improved living quarters. When determining Upkeep for your crew, you may count your crew as having two crew members less than normal.",
    upkeepCrewReduction: 2,
  },
  {
    id: "converters",
    name: "Converters",
    cost: 15,
    description: "Military Fuel Converters allow a wide range of readily available matter to be converted into Jump fuel. Starship travel costs are reduced by 2 credits.",
    travelCostReduction: 2,
  },
];

export function getShipComponentById(id) {
  return SHIP_COMPONENTS.find((c) => c.id === id) || null;
}
