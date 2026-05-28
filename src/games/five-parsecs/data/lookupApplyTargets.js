function getId(record, preferredIdField) {
  return record?.[preferredIdField] || record?.id || "";
}

function getRecordLabel(record, fallback) {
  return (
    record?.name ||
    record?.title ||
    record?.crewName ||
    record?.worldName ||
    record?.patronName ||
    record?.shipName ||
    fallback
  );
}

export function createLookupApplyTargets({
  tableId,
  crew = null,
  crewMembers = [],
  worlds = [],
  patrons = [],
  campaignTurns = [],
  includeCampaignTurns = true,
  includeAdventureNotes = true,
}) {
  const targets = [];

  if (tableId === "worldTraits") {
    worlds.forEach((world) => {
      const recordId = getId(world, "worldId");

      if (!recordId) return;

      targets.push({
        id: `world:${recordId}`,
        label: `World: ${getRecordLabel(world, "Unnamed World")}`,
        targetType: "world",
        collectionName: "worlds",
        recordId,
        raw: world,
      });
    });
  }

  if (tableId === "starshipTravelEvents") {
    targets.push({
      id: "starship:crew",
      label: `Starship: ${
        crew?.starship?.name || crew?.shipName || "Crew Starship"
      }`,
      targetType: "starship",
      recordId: crew?.crewId || crew?.id || "crew",
      raw: crew,
    });
  }

  if (tableId === "tradeTable" || tableId === "explorationTable") {
    crewMembers.forEach((member) => {
      const recordId = getId(member, "crewMemberId");

      if (!recordId) return;

      targets.push({
        id: `crewMember:${recordId}`,
        label: `Crew Member: ${getRecordLabel(member, "Unnamed Crew")}`,
        targetType: "crewMember",
        collectionName: "crewMembers",
        recordId,
        raw: member,
      });
    });
  }

  if (
    [
      "patronTable",
      "dangerPayTable",
      "timeFrameTable",
      "benefitsSubtable",
      "hazardsSubtable",
      "conditionsSubtable",
    ].includes(tableId)
  ) {
    patrons.forEach((patron) => {
      const recordId = getId(patron, "patronId");

      if (!recordId) return;

      targets.push({
        id: `patron:${recordId}`,
        label: `Patron: ${getRecordLabel(patron, "Unnamed Patron")}`,
        targetType: "patron",
        collectionName: "patrons",
        recordId,
        raw: patron,
      });
    });
  }

  if (includeCampaignTurns) {
    campaignTurns.forEach((turn) => {
      const recordId = getId(turn, "campaignTurnId");

      if (!recordId) return;

      targets.push({
        id: `campaignTurn:${recordId}`,
        label: `Campaign Turn ${turn.turnNumber || ""}`.trim(),
        targetType: "campaignTurn",
        collectionName: "campaignTurns",
        recordId,
        raw: turn,
      });
    });
  }

  if (includeAdventureNotes) {
    targets.push({
      id: "notes",
      label: "Adventure Notes",
      targetType: "crewNotes",
      recordId: crew?.crewId || crew?.id || "crew",
      raw: crew,
    });
  }

  return targets;
}