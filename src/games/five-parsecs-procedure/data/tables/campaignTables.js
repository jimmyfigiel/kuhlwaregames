export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(count, sides) {
  const rolls = [];

  for (let index = 0; index < count; index += 1) {
    rolls.push(rollDie(sides));
  }

  return {
    rolls,
    total: rolls.reduce((sum, roll) => sum + roll, 0),
  };
}

export function rollD6() {
  return rollDie(6);
}

export function rollD10() {
  return rollDie(10);
}

export function rollD100() {
  return rollDie(100);
}

export function findTableRow(table, roll) {
  if (!table || !Array.isArray(table.rows)) return null;

  return (
    table.rows.find((row) => {
      return roll >= row.min && roll <= row.max;
    }) || null
  );
}

export function rollOnTable(tableId) {
  const table = CAMPAIGN_TABLES[tableId];

  if (!table) {
    return {
      tableId,
      roll: null,
      row: null,
      error: `Unknown campaign table: ${tableId}`,
    };
  }

  const roll =
    table.dice === "D10"
      ? rollD10()
      : table.dice === "D6"
        ? rollD6()
        : rollD100();

  return {
    tableId,
    roll,
    row: findTableRow(table, roll),
  };
}

export const PATRON_BHC_THRESHOLDS = {
  Corporation: {
    benefits: 8,
    hazards: 8,
    conditions: 5,
  },
  "Local Government": {
    benefits: 8,
    hazards: 8,
    conditions: 8,
  },
  "Sector Government": {
    benefits: 8,
    hazards: 8,
    conditions: 8,
  },
  "Wealthy Individual": {
    benefits: 5,
    hazards: 8,
    conditions: 8,
  },
  "Private Organization": {
    benefits: 8,
    hazards: 8,
    conditions: 8,
  },
  "Secretive Group": {
    benefits: 8,
    hazards: 5,
    conditions: 8,
  },
};

export const CAMPAIGN_TASKS = [
  {
    id: "findPatron",
    label: "Find a Patron",
    description:
      "Roll 1D6 and add the number of crew members looking, the number of existing Patrons among your contacts, and any credits spent after rolling. 5+ finds one Patron job. 6+ finds two Patron jobs.",
    maxCrew: 2,
  },
  {
    id: "train",
    label: "Train",
    description:
      "The character earns 1 XP. If this means they may make a Character Upgrade, resolve that immediately.",
    maxCrew: 2,
  },
  {
    id: "trade",
    label: "Trade",
    description:
      "For each crew member Trading, roll once on the Trade Table. Additional rolls may be purchased for 3 credits each, but at least one crew member must be Trading.",
    maxCrew: 2,
  },
  {
    id: "recruit",
    label: "Recruit",
    description:
      "If the crew has fewer than 6 members, each crew member sent Recruiting automatically finds a new recruit until the crew is back to 6. If the crew has 6 or more members, roll 1D6 plus the number of recruiters. 6+ adds one new recruit.",
    maxCrew: 2,
  },
  {
    id: "explore",
    label: "Explore",
    description:
      "Each crew member Exploring rolls once on the Exploration Table.",
    maxCrew: 2,
  },
  {
    id: "track",
    label: "Track",
    description:
      "If you have Rivals, roll 1D6 plus the number of crew Tracking and any credits spent beforehand. 6+ locates a Rival of your choice for a battle this campaign turn.",
    maxCrew: 2,
  },
  {
    id: "repairKit",
    label: "Repair Your Kit",
    description:
      "Roll 1D6 plus the character's Savvy, +1 if the character is an Engineer, and +1 per credit spent on spare parts. 6+ repairs the item. A natural 1 always fails and means the item is beyond fixing.",
    maxCrew: 2,
  },
  {
    id: "decoy",
    label: "Decoy",
    description:
      "When rolling to see if Rivals track you down, add +1 to the roll for every crew member sent to act as a Decoy.",
    maxCrew: 2,
  },
  {
    id: "doNothing",
    label: "Do Nothing",
    description: "The character sits around on the ship and does nothing.",
    maxCrew: null,
  },
];

export const CAMPAIGN_TABLES = {
  starshipTravelEvents: {
    id: "starshipTravelEvents",
    label: "Starship Travel Events Table",
    dice: "D100",
    rulesPage: 69,
    description:
      "Roll D100 and apply the event listed. In some rare cases, an event may not line up well with the ongoing story. If so, you can often change the narration while retaining the mechanical effects. Several events cause the loss of ship Hull Points, affecting your ability to take off from planets.",
    rows: [
      {
        min: 1,
        max: 7,
        title: "Asteroids",
        description:
          "Rocky debris everywhere, maybe from a recent collision? If you wish to avoid it, roll 1D6, requiring a 5+ to chart a safe path. If successful, roll again on this table. To go through the field, select a crew member and roll 1D6+Savvy three times, requiring a 4+ to succeed each time. Each failed roll inflicts 1D6 Hull Point damage to the ship.",
      },
      {
        min: 8,
        max: 12,
        title: "Navigation trouble",
        description:
          "Is this place even on the star maps? Lose 1 story point as you drift through empty space, then roll again on this table. If your ship is currently suffering from Hull Point damage, and you roll this event, a random crew member must roll on the Injury Table, as system failures cause life support malfunctions across the vessel.",
      },
      {
        min: 13,
        max: 17,
        title: "Raided",
        description:
          "Your vessel catches the eye of some pirates. Intimidation might work: Select a crew member and roll 1D6+Savvy. A 6+ is required to avoid conflict. Otherwise, set up a battle in cramped territory, using the Criminal Elements Encounter Table. Enemy numbers are determined by rolling 3D6, picking the highest die, with smaller campaign crews rolling fewer dice as appropriate. Add the numbers indicated in the enemy table, +1 extra figure. There is no objective. If you drive them off, they flee back to their ship. If you lose, you lose all credits and everything in your Stash, though you keep the ship. If you win, you get normal rewards for winning an Opportunity mission, plus a bonus roll on the Loot Table. This is an out-of-sequence encounter and does not count as the main Battle stage for the campaign turn.",
      },
      {
        min: 18,
        max: 25,
        title: "Deep space wreckage",
        description:
          "You find an old wreck drifting through empty space. Scanning it, you get 2 rolls on the Gear Subtable. Both items are damaged and need to be Repaired.",
      },
      {
        min: 26,
        max: 29,
        title: "Drive trouble",
        description:
          "It’s not supposed to make that sound. Select 3 crew members and have each roll 1D6+Savvy. A 6+ is required for success. For each failure, you are grounded on the next world for one campaign turn while the drive is reset. Taking off before the drive is reset inflicts 2D6 Hull Point damage to the ship.",
      },
      {
        min: 30,
        max: 38,
        title: "Down-time",
        description:
          "It’s a long time to just sit here. Select a crew member of choice and add +1 XP. The crew has time to do maintenance tasks, and can Repair 1 damaged item with no roll required.",
      },
      {
        min: 39,
        max: 44,
        title: "Distress call",
        description:
          "“This is Licensed Trader Cyberwolf”. If you come to their aid, roll 1D6. 1: The ship’s drive must have detonated moments after you received the signal. Your ship is struck by debris, suffering 1D6+1 Hull Point damage. 2: You only find drifting wreckage. 3-4: You can rescue a crew member. Treat this as the Escape Pod event. 5-6: You arrive in time to help save the ship from a drive malfunction. Select a crew member and roll 1D6+Savvy. A 7+ is required to succeed, but you may make three attempts. If you succeed, roll three times on the gear loot table. If you fail, the drive detonates and your ship is damaged as if you had rolled a 1 on this subtable.",
      },
      {
        min: 45,
        max: 50,
        title: "Patrol ship",
        description:
          "A Unity patrol vessel hails you. Roll 1D6-3 twice. Each die that scores above 0 results in that number of items being confiscated as contraband. You can give them any items carried or in your Stash. Due to the military presence, the next world you visit cannot be Invaded.",
      },
      {
        min: 51,
        max: 53,
        title: "Cosmic phenomenon",
        description:
          "A crew member sees a strange manifestation in space. Nobody else saw anything, and the ship’s computers confirm nothing was there. The crew member adds +1 Luck if able. This event can only happen once in a campaign; treat it as nothing happening if it happens again. If you have a Precursor in the crew, they predict it is a good omen. Add +1 story point as well.",
      },
      {
        min: 54,
        max: 60,
        title: "Escape pod",
        description:
          "You find an escape pod drifting through space. If you rescue them, roll 1D6. 1: They’re a wanted criminal. If you let them go on the next world, the next time you make a new Rival, roll 4+ on 1D6 to immediately remove the Rivals from the campaign. If you turn them in, claim 1D6 credits but get a Rival from their old gang. 2-3: They reward you with 1D3 credits and a roll on the Loot Table when you arrive. 4: They have interesting information. Add 1 Quest Rumor and 1 story point. 5: They join your crew as a new character with no equipment. 6: As 5, but the character begins with 10 unspent XP.",
      },
      {
        min: 61,
        max: 66,
        title: "Accident",
        description:
          "A crew member gets Injured while doing routine maintenance. They must rest up for one campaign turn to recover from the Injury, and one item they carry is damaged.",
      },
      {
        min: 67,
        max: 75,
        title: "Travel-time",
        description:
          "Local conditions force you to jump to the edge of the system and approach under standard drives. Any Injured crew may rest for one campaign turn.",
      },
      {
        min: 76,
        max: 85,
        title: "Uneventful trip",
        description:
          "A lot of time playing cards and cleaning guns. You can Repair one damaged item.",
      },
      {
        min: 86,
        max: 91,
        title: "Time to reflect",
        description: "How is the story unfolding? Add +1 story point.",
      },
      {
        min: 92,
        max: 95,
        title: "Time to read a book",
        description:
          "There’s time to sit, have a read, and maybe indulge in education. Roll 1D6. On 1-2, a random crew member earns +3 XP. On 3-4, a random crew member earns +2 XP and a second random crew member earns +1 XP. On 5-6, three random crew each earn +1 XP.",
      },
      {
        min: 96,
        max: 100,
        title: "Locked in the library data by night",
        description:
          "Pouring over old records and fragments of data, the captain has unearthed intriguing information about the sector. You can roll up the planetary info for three worlds and select which to visit. Due to fuel limitations, you must visit one of the three generated. All three worlds remain in the campaign and can be visited later.",
      },
    ],
  },

  worldTraits: {
    id: "worldTraits",
    label: "World Traits Table",
    dice: "D100",
    rulesPage: 73,
    description:
      "Roll D100 to determine what trait applies to the world. Visibility restrictions are rolled at the start of each campaign turn. If scenario conditions apply a second visibility restriction, apply the shortest.",
    rows: [
      { min: 1, max: 3, title: "Haze", description: "During battle, visibility is reduced to 1D6+8”." },
      { min: 4, max: 6, title: "Overgrown", description: "When setting up the table, you must add 1D6+2 individual plant features or 1D3 areas of vegetation roughly 3-5” across." },
      { min: 7, max: 8, title: "Warzone", description: "When setting up the table, you must add 1D3 ruined buildings or craters to the table." },
      { min: 9, max: 10, title: "Heavily enforced", description: "When fighting opponents from the Criminal Elements Encounter Table, the number encountered is reduced by 1. When rolling to see if they become Rivals, only roll a single die as normal." },
      { min: 11, max: 12, title: "Rampant crime", description: "When fighting opponents from the Criminal Elements encounter list, add 1 to the number encountered." },
      { min: 13, max: 14, title: "Invasion risk", description: "Add +1 to all Invasion rolls." },
      { min: 15, max: 16, title: "Imminent invasion", description: "Add +2 to all Invasion rolls and if the world is invaded, rolls for war progress are at -1." },
      { min: 17, max: 18, title: "Lacks starship facilities", description: "You cannot spend more than 3 credits per campaign turn on starship Repairs." },
      { min: 19, max: 20, title: "Easy recruiting", description: "Add +1 to the roll when Recruiting." },
      { min: 21, max: 22, title: "Medical science", description: "The cost for accelerated medical care is only 3 credits per character." },
      { min: 23, max: 24, title: "Technical knowledge", description: "Add +1 to all Repair attempts." },
      { min: 25, max: 26, title: "Opportunities", description: "Add +1 to the roll when searching for Patrons." },
      { min: 27, max: 29, title: "Booming economy", description: "When rolling for post-battle credit rewards, any 1 on the dice is rerolled until it shows a score other than 1." },
      { min: 30, max: 32, title: "Busy markets", description: "Each campaign turn, you may spend 2 credits once to roll on the Trade Table." },
      { min: 33, max: 34, title: "Bureaucratic mess", description: "When attempting to leave, roll 2D6. On a 2-4, you are delayed and cannot leave this campaign turn without a bribe equal to the roll in credits. You may try again next campaign turn." },
      { min: 35, max: 36, title: "Restricted education", description: "You must roll 6+ to be approved for Advanced Training on this world." },
      { min: 37, max: 38, title: "Expensive education", description: "The fee to enroll in Advanced Training is 3 credits." },
      { min: 39, max: 41, title: "Travel restricted", description: "No more than one crew member may take the Explore option each campaign turn." },
      { min: 42, max: 43, title: "Unity safe sector", description: "The world cannot be Invaded." },
      { min: 44, max: 46, title: "Gloom", description: "In battle, maximum visibility is restricted to 1D6+6”." },
      { min: 47, max: 48, title: "Bot manufacturing", description: "All Bot upgrades are 1 credit cheaper." },
      { min: 49, max: 51, title: "Fuel refinery", description: "Traveling from this world costs only 3 credits." },
      { min: 52, max: 53, title: "Alien species restricted", description: "Roll 1D10 to determine which species is restricted: 1 Engineer, 2-4 K’Erin, 5 Soulless, 6 Precursor, 7-9 Feral, 10 Swift. Characters of this type cannot be hired here and cannot undertake crew jobs. They may participate in combat normally." },
      { min: 54, max: 55, title: "Weapon licensing", description: "Any weapon obtained through the Trade Table or purchased outright costs +1 credit." },
      { min: 56, max: 57, title: "Import restrictions", description: "You cannot sell any items on this world." },
      { min: 58, max: 59, title: "Military outpost", description: "Add +2 to Invasion rolls. Add +2 when checking for war progress." },
      { min: 60, max: 62, title: "Dangerous", description: "When rolling on the Roving Threats Encounter Table, increase the number of opponents by +1." },
      { min: 63, max: 64, title: "Shipyards", description: "The cost of all Ship Components is reduced by 2 credits." },
      { min: 65, max: 67, title: "Barren", description: "No plant features can be used on the battlefield." },
      { min: 68, max: 69, title: "Vendetta system", description: "Opponents become your Rivals on a roll of 1 or 2." },
      { min: 70, max: 72, title: "Free trade zone", description: "One crew member per campaign turn can roll twice when using the Trade Table, and choose either result." },
      { min: 73, max: 74, title: "Corporate state", description: "+2 when rolling to find a Patron. Patrons are always Corporations. Failing a mission means being blacklisted and you cannot get Patrons here again." },
      { min: 75, max: 76, title: "Adventurous population", description: "When successfully Recruiting, you may roll up one additional character and then choose who to hire." },
      { min: 77, max: 79, title: "Frozen", description: "Any character making a Dash may opt to slide. They move 1D6” in a straight line and must move the full distance. If they collide with anything, they and any character they collide with are knocked 1” in a random direction and become Stunned." },
      { min: 80, max: 81, title: "Flat", description: "Do not place any hills or raised ground on the battlefield." },
      { min: 82, max: 84, title: "Fuel shortage", description: "The cost to travel from this world is raised by 1D3 credits. You may roll each campaign turn." },
      { min: 85, max: 86, title: "Reflective dust", description: "All Laser, Beam, or Blast weapons are -1 to Hit at ranges exceeding 9”." },
      { min: 87, max: 89, title: "High cost", description: "Your crew size counts as being 2 higher for the purpose of Upkeep costs." },
      { min: 90, max: 91, title: "Interdiction", description: "You are only approved to stay for 1D3 campaign turns. To extend your stay, you must obtain a license. Roll 2D6, requiring an 8+." },
      { min: 92, max: 93, title: "Null zone", description: "No teleportation device of any type works." },
      { min: 94, max: 96, title: "Crystals", description: "Place 2D6 crystals on the battlefield. If you don’t have any, use rocks." },
      { min: 97, max: 100, title: "Fog", description: "All shots beyond 8” are -1 to Hit." },
    ],
  },

  tradeTable: {
    id: "tradeTable",
    label: "Trade Table",
    dice: "D100",
    rulesPage: 79,
    description:
      "Rolls on the Trade Table represent your crew bartering unspecified items found along the way for new goods. You receive whatever the table indicates. Some entries allow a choice between multiple items; receive just one. If a roll would cost money, you may opt not to purchase it. Whatever you roll is available for use immediately.",
    rows: [
      { min: 1, max: 3, title: "A personal weapon", description: "Roll once on the Low Tech Weapon Table." },
      { min: 4, max: 6, title: "Sell some cargo", description: "Earn 2 credits." },
      { min: 7, max: 9, title: "Find something useful", description: "Roll once on the Gear Table." },
      { min: 10, max: 11, title: "Quality food and booze", description: "Recruit a new character to your crew. Single-use." },
      { min: 12, max: 14, title: "Instruction book", description: "A crew member of choice can read it and earn +1 XP. Single-use." },
      { min: 15, max: 18, title: "Bits of scrap", description: "You sell it on to an interested party, earning 1 credit of profit in the process." },
      { min: 19, max: 22, title: "Medical pack", description: "Receive your choice of a Stim-pack or Med-patch." },
      { min: 23, max: 24, title: "Worthless trinket", description: "Worthless? Roll 1D6. On a 6, earn +1 story point." },
      { min: 25, max: 26, title: "Local maps", description: "If you receive a Quest on this or the following world, you may immediately add 1 Rumor. Single-use." },
      { min: 27, max: 28, title: "Luxury trinket", description: "If Recruiting, you may use it as a gift to receive a +2 bonus to the roll. Alternatively, you can sell it: Roll twice on the Trade Table and select the result you prefer. If a Swift character finds this, they will keep it for themselves, earning +2 XP. Single-use." },
      { min: 29, max: 30, title: "Basic supplies", description: "Skip Upkeep costs for one campaign turn. Single-use." },
      { min: 31, max: 34, title: "Contraband", description: "You can turn this down, but if you accept it, you earn 1D6 credits from selling it on. If you roll a 4-6, you also receive a Rival." },
      { min: 35, max: 37, title: "Gun Upgrade Kit", description: "Receive your choice of a Laser Sight, Bipod or Beam Light." },
      { min: 38, max: 39, title: "Useless trinket", description: "Useless? Roll 1D6. On a 6, earn +1 story point." },
      { min: 40, max: 44, title: "Trade goods", description: "Every time you arrive on a new planet, you may roll 1D6 to see how many Credits the goods will sell for here. You can wait as long as you like, but if you roll a 1, they have perished or become damaged, and are now worthless." },
      { min: 45, max: 48, title: "Something interesting", description: "Roll once on the Loot Table." },
      { min: 49, max: 51, title: "Fuel", description: "Roll 1D6. You have secured that many credits worth of fuel, which can be used to offset travel costs." },
      { min: 52, max: 53, title: "Spare parts", description: "Add +1 when making a Repair attempt. If the roll is a natural 1, the Spare Parts are used up and must be erased from your roster." },
      { min: 54, max: 55, title: "Tourist garbage", description: "Not actually worth anything, but roll 1D6. On a 5-6, you can add 1 story point." },
      { min: 56, max: 56, title: "Don’t usually see these for sale", description: "You may pay 3 credits. If you do, you can roll on the Loot Table. The item must be used by the crew member who went trading." },
      { min: 57, max: 59, title: "Ordnance", description: "You receive 3 grenades, Frakk or Dazzle in any combination you like." },
      { min: 60, max: 62, title: "Basic firearms", description: "Your choice of a Handgun, Colony Rifle, or Shotgun." },
      { min: 63, max: 63, title: "Odd device", description: "If you want to buy this, pay 1 credit, then roll 1D6. On a 6, you can roll on the Loot Table. On any other score, it’s complete garbage." },
      { min: 64, max: 65, title: "Military fuel cell", description: "Zero travel costs when jumping to a new planet. Single-use." },
      { min: 66, max: 69, title: "Hot tip", description: "Gain 1 Quest Rumor." },
      { min: 70, max: 71, title: "Insider information", description: "Automatically obtain a Patron next campaign turn, if you look for one. Single-use." },
      { min: 72, max: 75, title: "Army surplus", description: "Your choice of an Auto Rifle, Blast Pistol or Glare Sword." },
      { min: 76, max: 78, title: "A chance to unload some stuff", description: "A revolutionary will buy any weapons for 2 credits each, provided they are not damaged." },
      { min: 79, max: 81, title: "A lot of blinking lights", description: "Roll once on the Gear subsection of the Loot Table." },
      { min: 82, max: 86, title: "Gently used", description: "Roll once on the Gear subsection of the Loot Table. The item is damaged and needs Repair." },
      { min: 87, max: 91, title: "Pre-owned", description: "Roll once on the Loot Table. The item is damaged and needs Repair." },
      { min: 92, max: 95, title: "Medical reserves", description: "Obtain 2 Stim-packs and 2 Med-patches." },
      { min: 96, max: 100, title: "Starship repair parts", description: "Count as 1D6 credits for the purpose of repairing Hull Point damage. Single-use." },
    ],
  },

  explorationTable: {
    id: "explorationTable",
    label: "Exploration Table",
    dice: "D100",
    rulesPage: 80,
    description: "Each crew member Exploring rolls once on the Exploration Table.",
    rows: [
      { min: 1, max: 3, title: "I know a good deal when I see one", description: "Roll on the Trade Table instead." },
      { min: 4, max: 6, title: "Meet a Patron", description: "You are offered a Patron job." },
      { min: 7, max: 8, title: "Must’ve been something I ate", description: "The character eats bad food, and must spend 1 campaign turn in Sick Bay. Soulless and K’Erin ignore this event." },
      { min: 9, max: 11, title: "Meet someone interesting", description: "Gain a Quest Rumor. A Precursor character may roll 1D6, and on a 5+ receives a second Rumor." },
      { min: 12, max: 15, title: "Had a nice chat", description: "Roll 1D6+Savvy. On a 5+ gain +1 story point." },
      { min: 16, max: 18, title: "See the sights, enjoy the view", description: "No effects." },
      { min: 19, max: 21, title: "Make a new friend", description: "Roll up a new character and add them to the crew. If your character is Feral, the new character is also Feral." },
      { min: 22, max: 24, title: "Time to relax", description: "No effects." },
      { min: 25, max: 28, title: "Possible bargain", description: "Give up a weapon of choice, then roll 1D6. On a 6, get a roll on the Loot Table. Otherwise get 1 credit." },
      { min: 29, max: 31, title: "Alien merchant", description: "Give him any item, then roll on the Loot Table." },
      { min: 32, max: 34, title: "Got yourself noticed", description: "If you have Rivals, select one at random. You will have to fight them this campaign turn." },
      { min: 35, max: 37, title: "You hear a tip", description: "You may opt to automatically track down a Rival to fight this campaign turn." },
      { min: 38, max: 40, title: "Completely lost", description: "Roll 1D6+Savvy. On a 4+ the character finds their way back in time, otherwise they will be unable to participate in a battle this campaign turn. Either way, roll again on this table to see what they find while wandering the streets." },
      { min: 41, max: 44, title: "Someone wants a package delivered", description: "When you travel to a new world, if this crew member is still in the crew, earn 3 credits and roll 1D6. On 1-2, you’ve acquired a Rival and receive +1 story point." },
      { min: 45, max: 47, title: "A tech fanatic offers to help out", description: "Pick a damaged item of equipment and roll 1D6. On 5-6 you have it fixed for free. An Engineer instead spends the afternoon talking shop, earning +2 XP." },
      { min: 48, max: 50, title: "Got a few drinks", description: "No effects." },
      { min: 51, max: 53, title: "I don’t have a gambling problem!", description: "Discard one item from the character’s equipment or crew Stash. Soulless ignore this event." },
      { min: 54, max: 57, title: "Overheard some talk", description: "Gain a Rumor." },
      { min: 58, max: 60, title: "Pick a fight", description: "Add a Rival to your list. If a K’Erin gets this event, add the Rival as normal, but the first time you meet them in battle, they have -1 enemy, as you already knocked one out in the initial brawl." },
      { min: 61, max: 64, title: "Found a trainer", description: "Character earns +2 XP." },
      { min: 65, max: 68, title: "Information broker", description: "Buy up to 3 Rumors for 2 credits each." },
      { min: 69, max: 71, title: "Arms dealer", description: "Purchase any number of rolls on the Military Weapons Table for 3 credits each." },
      { min: 72, max: 75, title: "Promising lead", description: "Earn +3 credits if you do an Opportunity mission this campaign turn." },
      { min: 76, max: 79, title: "Just needs a little love", description: "Roll on Gadget Table, but the item is damaged and needs to be repaired before it can be used. If the character is an Engineer, the item works right away." },
      { min: 80, max: 82, title: "Get in a bad fight", description: "Character must spend 1D3 campaign turns in Sick Bay, and loses one item of carried equipment, player choice." },
      { min: 83, max: 86, title: "Offered a small job", description: "When fighting this campaign turn, select a random enemy figure. If your crew kills them, earn 2 credits. No reward if they run away." },
      { min: 87, max: 90, title: "Offered a reward", description: "When fighting this campaign turn, select a random terrain feature. If a crew member moves into contact and spends a Combat Action, you can retrieve a package and earn 2 credits." },
      { min: 91, max: 94, title: "You make a useful contact", description: "Next campaign turn, add +1 to your choice of a roll to Recruit, Find a Patron, or Track a Rival." },
      { min: 95, max: 96, title: "Who left this lying around?", description: "Add your choice of a Handgun, Blade, Colony Rifle, or Shotgun." },
      { min: 97, max: 100, title: "This place is rather nice, really.", description: "When you are ready to leave this world, unless it is being Invaded, you must pay 1 story point or this crew member will decide to stay behind. If they do, you can keep their equipment." },
    ],
  },

  patronTable: {
    id: "patronTable",
    label: "Patron Table",
    dice: "D10",
    rulesPage: 83,
    description: "Roll D10 to determine who the Patron is.",
    rows: [
      { min: 1, max: 2, title: "Corporation", description: "+1 to the roll on the Danger Pay Table." },
      { min: 3, max: 4, title: "Local Government", description: "No special modifier." },
      { min: 5, max: 5, title: "Sector Government", description: "No special modifier." },
      { min: 6, max: 7, title: "Wealthy Individual", description: "No special modifier." },
      { min: 8, max: 9, title: "Private Organization", description: "No special modifier." },
      { min: 10, max: 10, title: "Secretive Group", description: "+1 to the roll on the Time Frame Table." },
    ],
  },

  dangerPayTable: {
    id: "dangerPayTable",
    label: "Danger Pay Table",
    dice: "D10",
    rulesPage: 83,
    description:
      "Danger Pay is on top of normal battle earnings. Unless stated otherwise, it is paid even if the mission fails, but only if the mission is attempted. Add +1 if working for a Corporation.",
    rows: [
      { min: 1, max: 4, title: "+1 credit", description: "Gain +1 credit Danger Pay." },
      { min: 5, max: 8, title: "+2 credits", description: "Gain +2 credits Danger Pay." },
      { min: 9, max: 9, title: "+3 credits", description: "Gain +3 credits Danger Pay." },
      { min: 10, max: 99, title: "+3 credits and better mission pay roll", description: "Gain +3 credits Danger Pay and roll twice, picking the higher die when rolling for mission pay after the battle." },
    ],
  },

  timeFrameTable: {
    id: "timeFrameTable",
    label: "Time Frame Table",
    dice: "D10",
    rulesPage: 83,
    description:
      "The Time Frame is the number of campaign turns within which you must finish the job. If the job isn’t done when the time runs out, it counts as a failure. Add +1 if working for a Secretive Group.",
    rows: [
      { min: 1, max: 5, title: "This campaign turn", description: "The job must be completed this campaign turn." },
      { min: 6, max: 7, title: "This or the next campaign turn", description: "The job must be completed this campaign turn or next campaign turn." },
      { min: 8, max: 9, title: "This or the following 2 campaign turns", description: "The job must be completed this campaign turn or within the following 2 campaign turns." },
      { min: 10, max: 99, title: "Any time", description: "The job may be completed any time." },
    ],
  },

  benefitsSubtable: {
    id: "benefitsSubtable",
    label: "Benefits Subtable",
    dice: "D10",
    rulesPage: 83,
    description: "Benefits are paid out only if the mission is a success.",
    rows: [
      { min: 1, max: 2, title: "Fringe Benefit", description: "Roll on the Loot Table." },
      { min: 3, max: 4, title: "Connections", description: "Gain a Rumor." },
      { min: 5, max: 5, title: "Company Store", description: "Roll on the Trade Table." },
      { min: 6, max: 6, title: "Health Insurance", description: "Mark down 2 campaign turns of injury recovery, assigned as you see fit." },
      { min: 7, max: 7, title: "Security Team", description: "Reduce enemy force numbers by 1." },
      { min: 8, max: 9, title: "Persistent", description: "Patron remains available if you travel." },
      { min: 10, max: 10, title: "Negotiable", description: "If you accept this job, you may reroll the Danger Pay roll and pick the better of the two rolls." },
    ],
  },

  hazardsSubtable: {
    id: "hazardsSubtable",
    label: "Hazards Subtable",
    dice: "D10",
    rulesPage: 83,
    description: "Roll here if the Patron job has a Hazard.",
    rows: [
      { min: 1, max: 2, title: "Dangerous Job", description: "Increase enemy force numbers by +1." },
      { min: 3, max: 4, title: "Hot Job", description: "After the job, you will earn an enemy on 1-2 instead of the normal roll of a 1." },
      { min: 5, max: 5, title: "VIP", description: "A random enemy will have +1 Toughness and a final Combat Skill of +2, regardless of current value." },
      { min: 6, max: 6, title: "Veteran Opposition", description: "Enemy is -1 to panic range." },
      { min: 7, max: 7, title: "Low Priority", description: "Reduce enemy force numbers by 1." },
      { min: 8, max: 10, title: "Private Transport", description: "If you have Rivals, they cannot track you this campaign turn." },
    ],
  },

  conditionsSubtable: {
    id: "conditionsSubtable",
    label: "Conditions Subtable",
    dice: "D10",
    rulesPage: 83,
    description: "Roll here if the Patron job has a Condition.",
    rows: [
      { min: 1, max: 1, title: "Vengeful", description: "If the mission fails, the Patron becomes a Rival." },
      { min: 2, max: 3, title: "Demanding", description: "Danger Pay is only upon success." },
      { min: 4, max: 4, title: "Small Squad", description: "You cannot deploy more than 4 crew." },
      { min: 5, max: 5, title: "Full Squad", description: "You must have 6 available crew." },
      { min: 6, max: 6, title: "Clean", description: "You cannot ever have made law enforcement Rivals." },
      { min: 7, max: 8, title: "Busy", description: "If the mission is a success, the Patron offers a new job next campaign turn." },
      { min: 9, max: 9, title: "One-time Contract", description: "This Patron cannot be retained as a contact." },
      { min: 10, max: 10, title: "Reputation Required", description: "You must have completed a prior Patron job on this world." },
    ],
  },
};