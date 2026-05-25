export const WEAPON_TRAITS = {
  Area: {
    name: "Area",
    description: "",
  },
  Clumsy: {
    name: "Clumsy",
    description: "",
  },
  Critical: {
    name: "Critical",
    description: "",
  },
  Elegant: {
    name: "Elegant",
    description: "",
  },
  Focused: {
    name: "Focused",
    description: "",
  },
  Heavy: {
    name: "Heavy",
    description: "",
  },
  Impact: {
    name: "Impact",
    description: "",
  },
  Melee: {
    name: "Melee",
    description: "",
  },
  Piercing: {
    name: "Piercing",
    description: "",
  },
  Pistol: {
    name: "Pistol",
    description: "",
  },
  "Single use": {
    name: "Single use",
    description: "",
  },
  "Snap Shot": {
    name: "Snap Shot",
    description: "",
  },
  Stun: {
    name: "Stun",
    description: "",
  },
  Terrifying: {
    name: "Terrifying",
    description: "",
  },
};

export const WEAPONS_TABLE = [
  { name: "Auto rifle", range: "24”", shots: 2, damage: 0, traits: [] },
  { name: "Beam pistol", range: "10”", shots: 1, damage: 1, traits: ["Pistol", "Critical"] },
  { name: "Blade", range: "Brawl", shots: "", damage: 0, traits: ["Melee"] },
  { name: "Blast pistol", range: "8”", shots: 1, damage: 1, traits: ["Pistol"] },
  { name: "Blast rifle", range: "16”", shots: 1, damage: 1, traits: [] },
  { name: "Boarding saber", range: "Brawl", shots: "", damage: 1, traits: ["Melee", "Elegant"] },
  { name: "Brutal melee weapon", range: "Brawl", shots: "", damage: 1, traits: ["Melee", "Clumsy"] },
  { name: "Cling fire pistol", range: "12”", shots: 2, damage: 1, traits: ["Focused", "Terrifying"] },
  { name: "Colony rifle", range: "18”", shots: 1, damage: 0, traits: [] },
  { name: "Dazzle grenade", range: "6”", shots: 1, damage: "NA", traits: ["Area", "Stun", "Single use"] },
  { name: "Duelling pistol", range: "8”", shots: 1, damage: 0, traits: ["Pistol", "Critical"] },
  { name: "Flak gun", range: "8”", shots: 2, damage: 1, traits: ["Focused", "Critical"] },
  { name: "Frakk grenade", range: "6”", shots: 2, damage: 0, traits: ["Heavy", "Area", "Single use"] },
  { name: "Fury rifle", range: "24”", shots: 1, damage: 2, traits: ["Heavy", "Piercing"] },
  { name: "Glare sword", range: "Brawl", shots: "", damage: 0, traits: ["Melee", "Elegant", "Piercing"] },
  { name: "Hand cannon", range: "8”", shots: 1, damage: 2, traits: ["Pistol"] },
  { name: "Hand flamer", range: "12”", shots: 2, damage: 1, traits: ["Focused", "Area"] },
  { name: "Hand laser", range: "12”", shots: 1, damage: 0, traits: ["Snap Shot", "Pistol"] },
  { name: "Hand gun", range: "12”", shots: 1, damage: 0, traits: ["Pistol"] },
  { name: "Hold out pistol", range: "4”", shots: 1, damage: 0, traits: ["Pistol", "Melee"] },
  { name: "Hunting rifle", range: "30”", shots: 1, damage: 1, traits: ["Heavy"] },
  { name: "Hyper blaster", range: "24”", shots: 3, damage: 1, traits: [] },
  { name: "Infantry laser", range: "30”", shots: 1, damage: 0, traits: ["Snap Shot"] },
  { name: "Machine pistol", range: "8”", shots: 2, damage: 0, traits: ["Pistol", "Focused"] },
  { name: "Marksman’s rifle", range: "36”", shots: 1, damage: 0, traits: ["Heavy"] },
  { name: "Military rifle", range: "24”", shots: 1, damage: 0, traits: [] },
  { name: "Needle rifle", range: "18”", shots: 2, damage: 0, traits: ["Critical"] },
  { name: "Plasma rifle", range: "20”", shots: 2, damage: 1, traits: ["Focused", "Piercing"] },
  { name: "Power claw", range: "Brawl", shots: "", damage: 3, traits: ["Melee", "Clumsy"] },
  { name: "Rattle gun", range: "24”", shots: 3, damage: 0, traits: ["Heavy"] },
  { name: "Ripper sword", range: "Brawl", shots: "", damage: 1, traits: ["Melee"] },
  { name: "Scrap pistol", range: "9”", shots: 1, damage: 0, traits: ["Pistol"] },
  { name: "Shatter axe", range: "Brawl", shots: "", damage: 2, traits: ["Melee"] },
  { name: "Shell gun", range: "30”", shots: 2, damage: 0, traits: ["Heavy", "Area"] },
  { name: "Shotgun", range: "12”", shots: 2, damage: 1, traits: ["Focused"] },
  { name: "Suppression maul", range: "Brawl", shots: "", damage: 1, traits: ["Melee", "Impact"] },
];

export const GUN_MODS_TABLE = [
  {
    name: "Assault blade",
    effect: "The weapon gains the Melee trait. Damage +1, and wins combat on a Draw.",
    restrictions: "Non-Pistol only.",
  },
  {
    name: "Beam light",
    effect: "When using the weapon in conditions of reduced visibility, increase visibility by +3”.",
    restrictions: "",
  },
  {
    name: "Bipod",
    effect: "The weapon receives +1 to Hit at ranges over 8” when Aiming or when firing from Cover.",
    restrictions: "Non-Pistol only.",
  },
  {
    name: "Hot shot pack",
    effect:
      "If fitted to a Blast Pistol, Blast Rifle, Hand Laser, or Infantry Laser, +1 Damage. Any natural 6 on the shooting dice causes an overheat, rendering the weapon inoperable for the rest of the fight.",
    restrictions: "Blast Pistol, Blast Rifle, Hand Laser, or Infantry Laser only.",
  },
  {
    name: "Cyber-configurable Nano-sludge",
    effect: "The weapon receives a permanent +1 Hit bonus.",
    restrictions: "",
  },
  {
    name: "Stabilizer",
    effect: "Weapon may ignore Heavy trait.",
    restrictions: "",
  },
  {
    name: "Shock attachment",
    effect: "The weapon receives the Impact trait against targets within 8”.",
    restrictions: "",
  },
  {
    name: "Upgrade kit",
    effect: "+2” Range increase.",
    restrictions: "",
  },
];

export const GUN_SIGHTS_TABLE = [
  {
    name: "Laser sight",
    effect: "The weapon receives the Snap Shot trait.",
    restrictions: "Pistol only.",
  },
  {
    name: "Quality sight",
    effect: "+2” Range increase. Reroll 1s when firing only 1 shot.",
    restrictions: "",
  },
  {
    name: "Seeker sight",
    effect: "The weapon receives +1 to Hit if the shooter did not Move this round.",
    restrictions: "",
  },
  {
    name: "Tracker sight",
    effect: "+1 to Hit if you fired at the same target during your previous round.",
    restrictions: "",
  },
  {
    name: "Unity battle sight",
    effect: "+1 to all Hit rolls.",
    restrictions: "",
  },
];

export const CONSUMABLES_TABLE = [
  {
    name: "Booster pills",
    effect: "When taken, the character removes all Stun markers. They may move at double normal Speed this round.",
  },
  {
    name: "Combat serum",
    effect: "The character receives +2” Speed and +2 Reactions for the rest of the battle.",
  },
  {
    name: "Kiranin crystals",
    effect:
      "A bright, dazzling display of hypnotic lights will daze any character within 4” of the user, making them unable to act this round. The crystals have no effect on characters that already acted earlier in the round, and do not affect the user. A character that is attacked in Brawling combat will defend themselves normally.",
  },
  {
    name: "Rage out",
    effect:
      "The user gains +2” Speed and +1 to all Brawling rolls for the rest of this and the following round. A K’Erin user gets the benefits for the rest of the battle.",
  },
  {
    name: "Still",
    effect: "The user gains +1 to Hit, but cannot Move during this and the next round.",
  },
  {
    name: "Stim-pack",
    effect:
      "If a character would become a casualty, they remain on the table with a single Stun marker. This item can be used reflexively upon becoming a casualty. It does not require an action.",
  },
];

export const PROTECTION_TABLE = [
  {
    name: "Battle dress",
    type: "Armor",
    save: "5+",
    effect: "The character counts as +1 Reactions, maximum 4, and receives a Saving Throw of 5+.",
  },
  {
    name: "Camo cloak",
    type: "Screen",
    save: "",
    effect: "If character is within 2” of Cover, they are counted as being in Cover. Does not apply if the shooter is within 4”.",
  },
  {
    name: "Combat armor",
    type: "Armor",
    save: "5+",
    effect: "Saving Throw 5+.",
  },
  {
    name: "Deflector field",
    type: "Screen",
    save: "",
    effect:
      "Automatically deflects a single ranged weapon’s Hit per battle. After a Hit is scored, decide if you wish to use the field before any rolls for Toughness or armor are made.",
  },
  {
    name: "Flak screen",
    type: "Screen",
    save: "",
    effect:
      "All Area weapons striking the wearer, whether through the initial shots or additional attacks from the Area trait, have their Damage reduced by -1 to a cap of +0.",
  },
  {
    name: "Flex-armor",
    type: "Armor",
    save: "",
    effect: "If the character did not move on their last activation, they count as +1 Toughness to a maximum of 6.",
  },
  {
    name: "Frag vest",
    type: "Armor",
    save: "6+ / 5+ vs Area",
    effect: "The wearer receives a 6+ Saving Throw, improved to 5+ against any Area attack.",
  },
  {
    name: "Screen generator",
    type: "Screen",
    save: "5+ vs gunfire",
    effect: "Receives a 5+ Saving Throw against gunfire. No effect against Area or Melee attacks.",
  },
  {
    name: "Stealth gear",
    type: "Armor",
    save: "",
    effect: "Enemies firing from a range over 9” are -1 to Hit.",
  },
];

export const IMPLANTS_TABLE = [
  {
    name: "AI companion",
    effect: "When making Savvy rolls, the character may roll twice and pick the better score.",
  },
  {
    name: "Body wire",
    effect: "+1 Reactions.",
  },
  {
    name: "Boosted arm",
    effect:
      "Increase Grenade range by +2”. If the character ends their Move in contact with an obstacle that is no taller than the miniature, they may pull themselves up on top, but not cross, as a Free Action.",
  },
  {
    name: "Boosted leg",
    effect: "Increase base move and Dash speed by +1” each.",
  },
  {
    name: "Cyber hand",
    effect:
      "The character may take any one Pistol they own and build it into their hand. Range is reduced to half, but the weapon always shoots with +1 to Hit and an additional +1 bonus when Brawling.",
  },
  {
    name: "Genetic defenses",
    effect: "5+ Saving Throw, if subjected to any poison, virus, gas, or disease.",
  },
  {
    name: "Health boost",
    effect:
      "If a post-battle Injury would result in 2+ campaign turns of recovery time, reduce the time by 1. If the character has Toughness 3 when receiving this implant, raise it to 4.",
  },
  {
    name: "Nerve adjuster",
    effect: "Whenever the character is Stunned for any reason, they receive a 5+ Saving Throw to avoid the Stun.",
  },
  {
    name: "Neural optimization",
    effect: "The character cannot be Stunned.",
  },
  {
    name: "Night sight",
    effect: "The character does not suffer visibility reductions due to darkness, but is affected by smoke, gas, etc. normally.",
  },
  {
    name: "Pain suppressor",
    effect: "The character can perform crew tasks while in Sick Bay, though they cannot participate in battles.",
  },
];

export const UTILITY_DEVICES_TABLE = [
  {
    name: "Auto sensor",
    effect:
      "If an enemy begins or ends a move within 4” and Line of Sight of the character, you may immediately fire one shot from any Pistol carried. The shot is resolved even if the enemy is in contact with a character and Hits only on a natural 6.",
  },
  {
    name: "Battle visor",
    effect: "When shooting, the character may reroll any 1s on the firing dice.",
  },
  {
    name: "Communicator",
    effect: "When making the Reaction roll each round, you may roll one additional die, then choose a die to discard.",
  },
  {
    name: "Concealed blade",
    effect:
      "If the character begins their round within 2” of an opponent, they may throw the blade as a Free Action before doing anything else. Roll to Hit normally, resolving the Hit with Damage +0. The blade can be used once per battle, and is replaced afterwards for free.",
  },
  {
    name: "Displacer",
    effect:
      "Usable once per mission instead of Moving. Aim anywhere in sight. The character teleports to a point 1D6” away in a random direction. If the teleport would end up within a solid obstacle, the device fails and must be Repaired before it can used again. The character emerges on the same height as the aiming point, which may cause them to fall if they emerge in open air. The character may take a Combat Action after teleporting. If used by a Precursor character, you may establish two landing points, and select to use either.",
  },
  {
    name: "Distraction bot",
    effect:
      "Usable once per battle as a Combat Action. Select an enemy within 12”. Next time they would become active, they are unable to act, though they remove Stun markers as normal.",
  },
  {
    name: "Grapple launcher",
    effect:
      "As a Combat Action, the character may use the launcher to scale a terrain feature within 1”. The character can ascend up to 12” but must reach a surface they can stand on.",
  },
  {
    name: "Grav dampener",
    effect:
      "The character suffers no damage from falling and can descend from any height with no risk. If dropping more than 6”, it counts as the character’s Move for the round.",
  },
  {
    name: "Hazard suit",
    effect: "If the character takes a Hit from an environmental hazard, they receive a 5+ Saving Throw.",
  },
  {
    name: "Hover board",
    effect:
      "The character may use the board to move instead of walking. When used, the character can move up to 9” and can ignore any terrain that is man-height or lower. While hover-boarding, the character cannot engage in combat, but can perform a non-Combat Action as needed.",
  },
  {
    name: "Insta-wall",
    effect:
      "May be used once per mission as a Combat Action. Place a marker within 3”, then place a 2” long force wall oriented any way you like, as long as it touches the marker. The wall is man-height and impenetrable to attacks, but does not block sight or mental abilities. At the start of each subsequent round, a D6 is rolled. On a 6, the wall dissipates.",
  },
  {
    name: "Jump belt",
    effect:
      "Instead of Moving normally, the character may jump up to 9” directly forward and 3” upwards. The character may take a Combat Action normally after landing.",
  },
  {
    name: "Motion tracker",
    effect: "Add +1 to all rolls to Seize the Initiative.",
  },
  {
    name: "Multi-cutter",
    effect:
      "As a Combat Action, the character can cut a man-sized hole through any terrain feature up to 1” thick. The tool has no effect on force fields.",
  },
  {
    name: "Robo-rabbit’s foot",
    effect:
      "A character with Luck 0 counts as having Luck 1. If the character would die while carrying this, the foot is destroyed and cannot be Repaired; the character does not roll on the injury table.",
  },
  {
    name: "Scanner bot",
    effect: "The crew adds +1 to all Seize the Initiative rolls.",
  },
  {
    name: "Snooper bot",
    effect:
      "May be deployed before a battle, if the Seize the Initiative roll would be penalized or negated. The penalty can be ignored, but the Bot is Damaged on a D6 roll of a 1.",
  },
  {
    name: "Sonic emitter",
    effect: "Any enemy within 5” suffers -1 to all Hit rolls when shooting.",
  },
  {
    name: "Steel boots",
    effect:
      "If the character rolls a natural 5 or 6 in a Brawl and wins the Brawl, they may opt to kick instead of striking normally. This hits with Damage +0 and knocks them 1D3” directly backwards. If the opponent is kicked into another character, that character is knocked 1D3” in a random direction.",
  },
  {
    name: "Time distorter",
    effect:
      "Activated as a Free Action. Select up to 3 enemy figures on the battlefield. They are frozen in time until the end of the following round. While in this state, they cannot Move, take any Actions, or be affected by attacks or effects in any way. They are unaffected by Morale rolls as well. Single-use.",
  },
];

export const ONBOARD_ITEMS_TABLE = [
  {
    name: "Analyzer",
    effect: "Add +1 when rolling to see if Rumors result in a Quest and when rolling for Quest resolution.",
    singleUse: false,
    traits: ["Campaign"],
  },
  {
    name: "Colonist ration packs",
    effect: "Ignore Upkeep costs for one campaign turn. +1 story point.",
    singleUse: true,
    traits: ["Campaign", "Single-use"],
  },
  {
    name: "Duplicator",
    effect: "Create a perfect copy of any one item in your inventory. A Duplicator cannot copy a Duplicator.",
    singleUse: true,
    traits: ["Campaign", "Single-use"],
  },
  {
    name: "Fake ID",
    effect: "Add +1 to all attempts to obtain a license or other legal document.",
    singleUse: false,
    traits: ["Campaign", "License"],
  },
  {
    name: "Fixer",
    effect: "One piece of damaged or destroyed personal equipment can be repaired automatically, and at no cost.",
    singleUse: true,
    traits: ["Campaign", "Repair", "Single-use"],
  },
  {
    name: "Genetic reconfiguration kit",
    effect:
      "Reduce the cost of an ability score upgrade by 2 XP. Has no effect on Bots or Soulless. K’Erin may only use this to increase Toughness.",
    singleUse: true,
    traits: ["Campaign", "Upgrade", "Single-use"],
    cannotUseSpecies: ["Bot", "Soulless"],
  },
  {
    name: "Loaded dice",
    effect:
      "Each campaign turn, one crew member may gamble on the side. Roll 1D6. On a 1-4, earn that many credits. On a 5, earn nothing. On a 6, the dice are lost and the crew member must roll on the post-battle Injury Table.",
    singleUse: false,
    traits: ["Campaign", "Gambling"],
  },
  {
    name: "Lucky dice",
    effect:
      "Each campaign turn, one crew member may gamble on the side, earning +1 credit. If you have both Lucky and Loaded Dice, you can use both, but rolling a 6 for the Loaded dice means you lose both sets of dice.",
    singleUse: false,
    traits: ["Campaign", "Gambling"],
  },
  {
    name: "Mk II translator",
    effect: "When rolling to Recruit, you may roll an additional D6.",
    singleUse: false,
    traits: ["Campaign", "Recruiting"],
  },
  {
    name: "Med-patch",
    effect:
      "A character recovering from an Injury may subtract one campaign turn from the recovery duration required. If this reduces the time to zero turns, they may act normally this campaign turn.",
    singleUse: true,
    traits: ["Campaign", "Medical", "Single-use"],
  },
  {
    name: "Meditation orb",
    effect:
      "The crew all feel reassured of their karmic balance. Add +2 story points. All Swift or Precursor in the crew may also add +1 XP.",
    singleUse: true,
    traits: ["Campaign", "Story points", "Single-use"],
  },
  {
    name: "Nano-doc",
    effect:
      "Prevent one roll on the post-battle Injury Table, no matter the source of the injury. You must decide before rolling the dice.",
    singleUse: true,
    traits: ["Campaign", "Medical", "Single-use"],
  },
  {
    name: "Novelty stuffed animal",
    effect:
      "Give to any character that isn’t Soulless, K’Erin, or a Bot. The character receives +1 XP, and may roll 1D6. On a 6, you may add +1 story point as well.",
    singleUse: true,
    traits: ["Campaign", "XP", "Single-use"],
    cannotUseSpecies: ["Soulless", "K’Erin", "Bot"],
  },
  {
    name: "Purifier",
    effect:
      "Each campaign turn, the Purifier can be used to generate clean water which can be sold off for 1 credit. This does not require a crew member to operate, but only one Purifier may be used at a time.",
    singleUse: false,
    traits: ["Campaign", "Income"],
  },
  {
    name: "Repair Bot",
    effect: "+1 to all Repair attempts.",
    singleUse: false,
    traits: ["Campaign", "Repair"],
  },
  {
    name: "Sector permit",
    effect:
      "Whenever you arrive at a planet where a license is required, roll 1D6. On a 4+, the Sector Permit is accepted. You must roll for each license type, on each planet.",
    singleUse: false,
    traits: ["Campaign", "License"],
  },
  {
    name: "Spare parts",
    effect: "Add +1 when making a Repair attempt. If the roll is a natural 1, the Spare Parts are used up and must be erased from your roster.",
    singleUse: false,
    traits: ["Campaign", "Repair", "May be used up"],
  },
  {
    name: "Teach-bot",
    effect: "A character engaging in the Train crew task will earn 1D6 additional XP.",
    singleUse: true,
    traits: ["Campaign", "Training", "Single-use"],
  },
  {
    name: "Transcender",
    effect:
      "The character activating this mysterious device receives +1 XP. The entire crew makes realizations about their place in the cosmos. Add +2 story points.",
    singleUse: true,
    traits: ["Campaign", "XP", "Story points", "Single-use"],
  },
];

export const SHIP_COMPONENTS_TABLE = [
  {
    name: "Medical Bay",
    cost: 25,
    description: "Fully stocked medical facility to aid long-term recovery.",
    effect: "Each campaign turn when recovering from Injuries, select a crew member who can mark off 2 campaign turns of recovery time.",
  },
  {
    name: "Cargo Hold",
    cost: 15,
    description: "The hold of the ship has been upgraded to be environmentally stable.",
    effect:
      "When traveling to a new planet, you may take on cargo. Roll 2D6 and discard any 5-6. Select the highest remaining die and earn that many credits from delivering a shipment to the new world. If both dice are discarded, no shipments are available. If your ship is damaged in transit, the cargo is also lost.",
  },
  {
    name: "Database",
    cost: 10,
    description: "Extensive data records have been added to aid in decision making.",
    effect: "When traveling to a new planet, you may roll up the details for one additional planet, and then select which to visit.",
  },
  {
    name: "Shuttle",
    cost: 15,
    description: "Launch bay with a standard “Lemon Shark” shuttle for quick deployments.",
    effect:
      "If you receive the Distress Call Starship Travel event, you may roll twice and pick the higher roll. If a planet is Invaded, you may add +2 to the roll to get off-world.",
  },
  {
    name: "Merchant Link",
    cost: 20,
    description:
      "Access point to the corporate extra-net framework in order to help in diversifying risk-managed portfolios during times of economic volatility.",
    effect: "You may carry out one free Trade action each campaign turn, without requiring a crew member to be assigned to it.",
  },
  {
    name: "Drop Launcher",
    cost: 25,
    description: "Rapid deployment system, adapted from Unity military vessels. Pretty safe.",
    effect:
      "When setting up a battle, roll 2D6. On an 8+, Drop deployment is viable. Select up to two crew figures who will land using this method. They do not set up at the beginning of the battle. Instead, at the end of any round, select a point on the tabletop, move it 1D6” in a random direction, and then set up both characters within 1” of the final marker. They cannot act on arrival, but will act normally in the following round.",
  },
  {
    name: "Probe Launcher",
    cost: 10,
    description: "Launching device for scientific probes. Useful for all manner of tasks in deep space.",
    effect: "If you receive the Asteroids Starship Travel event, you can roll twice to avoid the field.",
  },
  {
    name: "Auto-Turrets",
    cost: 15,
    description: "Auto-tracking Hyper-Laser turret, calibrated for Semi-Autonomous Pulse Fire. That’s what the manual says, in any event.",
    effect:
      "If you receive the Raided Starship Travel event, you may add +1 to the roll to avoid the battle. If you have to flee from a world that is being Invaded, you may add +1 to the roll.",
  },
  {
    name: "Military Nav System",
    cost: 15,
    description: "Improved navigation system, adapted from the old Sirius modules commonly available on the secondhand markets.",
    effect:
      "If you roll the Navigation Trouble Starship Travel event, you do not have to subtract 1 story point. If you roll the Travel-Time Starship Travel event, you may receive the benefits of both that event and Uneventful Trip.",
  },
  {
    name: "Improved Shielding",
    cost: 20,
    description: "Additional armor plating, along with directional screen generators. They can only hold up for a few moments, but everything helps.",
    effect:
      "If your ship would sustain damage from any source, reduce the damage by 1 Hull Point. The Asteroids Starship Travel event can inflict multiple Hits, with Improved Shielding protecting against each.",
  },
  {
    name: "Hidden Compartment",
    cost: 15,
    description: "Just shift that deck plate to the side and reach under it, while turning that bolt a bit.",
    effect:
      "If you receive the Patrol Ship Starship Travel event, you only have to roll once for confiscated items. Each time you travel to a new Planet, you may roll 3D6. Discard any dice that do not score a 1 or 2, then receive credits equal to the sum of the dice that did not get discarded.",
  },
  {
    name: "Suspension Pod",
    cost: 15,
    description: "Standard for non-jump travel.",
    effect:
      "When managing Upkeep, you may opt to Suspend any crew members. They do not participate in events, cannot undertake tasks or go on missions, do not recover from Injuries, and do not require Upkeep. While Suspended, the character does not count as part of the crew. You can have up to 4 crew members Suspended at any one time. During any Upkeep step of a future campaign turn, you can revive any Suspended crew. They must be counted as part of your crew during the Upkeep step of that campaign turn, and will act normally thereafter. Any Injuries must still be recovered from normally after revival.",
  },
  {
    name: "Living Quarters",
    cost: 15,
    description: "Improved living quarters for improved comforts, as well as more efficient life support systems.",
    effect: "When determining Upkeep for your crew, you may count your crew as having two crew members less than normal.",
  },
  {
    name: "Military Fuel Converters",
    cost: 15,
    description: "Once fitted, these devices allow a wide range of readily available matter to be converted into Jump fuel.",
    effect: "Starship travel costs are reduced by 2 credits.",
  },
];

export const EQUIPMENT_CATEGORIES = [
  { value: "weapon", label: "Weapon" },
  { value: "gear", label: "Gear" },
  { value: "consumable", label: "Consumable" },
  { value: "protection", label: "Protection" },
  { value: "implant", label: "Implant" },
  { value: "utility", label: "Utility" },
  { value: "onboard", label: "On-board" },
];

export const EQUIPMENT_CATALOGS = [
  {
    id: "weapons",
    title: "Weapons",
    actionLabel: "Add Weapon to Stash",
    columns: ["name", "range", "shots", "damage", "traits"],
    rows: WEAPONS_TABLE,
  },
  {
    id: "consumables",
    title: "Consumables",
    actionLabel: "Add Consumable to Stash",
    columns: ["name", "effect"],
    rows: CONSUMABLES_TABLE,
  },
  {
    id: "protection",
    title: "Protective Devices",
    actionLabel: "Add Protection to Stash",
    columns: ["name", "type", "save", "effect"],
    rows: PROTECTION_TABLE,
  },
  {
    id: "implants",
    title: "Implants",
    actionLabel: "Add Implant to Stash",
    columns: ["name", "effect"],
    rows: IMPLANTS_TABLE,
  },
  {
    id: "utility",
    title: "Utility Devices",
    actionLabel: "Add Utility Device to Stash",
    columns: ["name", "effect"],
    rows: UTILITY_DEVICES_TABLE,
  },
  {
    id: "onboard",
    title: "On-board Items",
    actionLabel: "Add On-board Item to Stash",
    columns: ["name", "effect", "singleUse"],
    rows: ONBOARD_ITEMS_TABLE,
  },
];

export function getCatalogById(catalogId) {
  return EQUIPMENT_CATALOGS.find((catalog) => catalog.id === catalogId) || null;
}

export function getGunModByName(name) {
  return GUN_MODS_TABLE.find((item) => item.name === name) || null;
}

export function getGunSightByName(name) {
  return GUN_SIGHTS_TABLE.find((item) => item.name === name) || null;
}

export function getShipComponentByName(name) {
  return SHIP_COMPONENTS_TABLE.find((item) => item.name === name) || null;
}

export function getInstalledComponentCount(components = []) {
  return components.filter((component) => component.installed && !component.removed).length;
}

export function getInstalledComponentFuelSurcharge(components = []) {
  return Math.floor(getInstalledComponentCount(components) / 3);
}

function blankWeapon() {
  return {
    range: "",
    shots: 0,
    damage: 0,
    traits: [],
    mods: [],
    sight: "",
  };
}

function blankArmor() {
  return {
    armorValue: "",
    save: "",
    traits: [],
  };
}

function blankGear() {
  return {
    effect: "",
    uses: "",
    traits: [],
  };
}

function blankConsumable() {
  return {
    singleUse: false,
    freeAction: false,
    carriedByCrew: true,
    usableFromStash: false,
    cannotUseSpecies: [],
    duplicateUseBenefit: true,
  };
}

function blankImplant() {
  return {
    permanent: false,
    removable: true,
    maxPerCharacter: 0,
    cannotUseSpecies: [],
  };
}

function blankUtility() {
  return {
    maxPerCharacter: 0,
  };
}

function blankOnboard() {
  return {
    carriedByCrew: true,
    usedFromShip: false,
    campaignTurnItem: false,
    singleUse: false,
    cannotUseSpecies: [],
  };
}

export function createBlankEquipmentBase({
  roomId,
  crewId,
  playerId,
  makeId,
  nowIso,
}) {
  const timestamp = nowIso();

  return {
    equipmentId: makeId("equipment"),

    roomId,
    crewId,
    equipmentTemplateId: "",

    name: "New Equipment",
    category: "gear",
    subtype: "",

    quantity: 1,

    locationType: "stash",
    crewMemberId: "",

    damaged: false,
    destroyed: false,

    weapon: blankWeapon(),
    armor: blankArmor(),
    gear: blankGear(),
    consumable: blankConsumable(),
    implant: blankImplant(),
    utility: blankUtility(),
    onboard: blankOnboard(),

    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}

export function catalogItemToEquipment({
  catalogId,
  item,
  roomId,
  crewId,
  playerId,
  makeId,
  nowIso,
}) {
  const base = createBlankEquipmentBase({
    roomId,
    crewId,
    playerId,
    makeId,
    nowIso,
  });

  if (catalogId === "weapons") {
    return {
      ...base,
      name: item.name,
      category: "weapon",
      subtype: "",
      weapon: {
        range: item.range,
        shots: item.shots,
        damage: item.damage,
        traits: [...(item.traits || [])],
        mods: [],
        sight: "",
      },
    };
  }

  if (catalogId === "consumables") {
    return {
      ...base,
      name: item.name,
      category: "consumable",
      subtype: "",
      locationType: "stash",
      crewMemberId: "",
      gear: {
        effect: item.effect,
        uses: 1,
        traits: ["Single-use", "Free Action"],
      },
      consumable: {
        singleUse: true,
        freeAction: true,
        carriedByCrew: false,
        usableFromStash: true,
        cannotUseSpecies: ["Bot", "Soulless"],
        duplicateUseBenefit: false,
      },
    };
  }

  if (catalogId === "protection") {
    return {
      ...base,
      name: item.name,
      category: "protection",
      subtype: item.type,
      armor: {
        armorValue: item.save || "",
        save: item.save || "",
        traits: [item.type],
      },
      gear: {
        effect: item.effect,
        uses: "",
        traits: [item.type],
      },
    };
  }

  if (catalogId === "implants") {
    return {
      ...base,
      name: item.name,
      category: "implant",
      subtype: "",
      gear: {
        effect: item.effect,
        uses: "",
        traits: ["Implant", "Permanent"],
      },
      implant: {
        permanent: true,
        removable: false,
        maxPerCharacter: 2,
        cannotUseSpecies: ["Bot", "Soulless"],
      },
    };
  }

  if (catalogId === "utility") {
    return {
      ...base,
      name: item.name,
      category: "utility",
      subtype: "Utility Device",
      gear: {
        effect: item.effect,
        uses: "",
        traits: ["Utility Device"],
      },
      utility: {
        maxPerCharacter: 3,
      },
    };
  }

  if (catalogId === "onboard") {
    return {
      ...base,
      name: item.name,
      category: "onboard",
      subtype: "On-board Item",
      locationType: "stash",
      crewMemberId: "",
      gear: {
        effect: item.effect,
        uses: item.singleUse ? 1 : "",
        traits: [...(item.traits || [])],
      },
      consumable: {
        singleUse: Boolean(item.singleUse),
        freeAction: false,
        carriedByCrew: false,
        usableFromStash: true,
        cannotUseSpecies: [...(item.cannotUseSpecies || [])],
        duplicateUseBenefit: true,
      },
      onboard: {
        carriedByCrew: false,
        usedFromShip: true,
        campaignTurnItem: true,
        singleUse: Boolean(item.singleUse),
        cannotUseSpecies: [...(item.cannotUseSpecies || [])],
      },
    };
  }

  return base;
}

export function createShipComponentRecord({
  component,
  playerId,
  makeId,
  nowIso,
}) {
  const timestamp = nowIso();

  return {
    shipComponentId: makeId("shipComponent"),
    name: component.name,
    cost: component.cost,
    description: component.description,
    effect: component.effect,

    installed: true,
    damaged: false,
    removed: false,

    installedAtTurn: "",
    notes: "",

    createdAt: timestamp,
    createdBy: playerId,
    updatedAt: timestamp,
    updatedBy: playerId,
  };
}