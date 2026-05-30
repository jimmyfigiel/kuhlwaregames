import { CAMPAIGN_PROGRESS_STEPS } from "./campaignStepRules";

export function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getRecordId(record) {
  return (
    record?.id ||
    record?.recordId ||
    record?.campaignTurnId ||
    record?.turnId ||
    record?.docId ||
    ""
  );
}

export function getLatestCampaignTurn(campaignTurns) {
  if (!Array.isArray(campaignTurns) || campaignTurns.length === 0) return null;

  return [...campaignTurns].sort((a, b) => {
    return numberValue(b.turnNumber) - numberValue(a.turnNumber);
  })[0];
}

export function getProgressValue(progress, stepId) {
  return Boolean(progress?.[stepId]);
}

export function getNextIncompleteStepId(progress, afterStepId = "") {
  const startIndex = CAMPAIGN_PROGRESS_STEPS.findIndex((step) => {
    return step.id === afterStepId;
  });

  const orderedSteps =
    startIndex >= 0
      ? [
          ...CAMPAIGN_PROGRESS_STEPS.slice(startIndex + 1),
          ...CAMPAIGN_PROGRESS_STEPS.slice(0, startIndex + 1),
        ]
      : CAMPAIGN_PROGRESS_STEPS;

  const nextStep = orderedSteps.find((step) => {
    return !getProgressValue(progress, step.id);
  });

  return nextStep?.id || CAMPAIGN_PROGRESS_STEPS[0]?.id || "";
}

export function getStepPhase(stepId) {
  return CAMPAIGN_PROGRESS_STEPS.find((step) => step.id === stepId)?.phase || "";
}

export function getCrewCredits(crew) {
  return numberValue(crew?.credits);
}

export function getCrewDebt(crew) {
  return numberValue(crew?.debt);
}

export function getHullDamageField(crew) {
  if (!crew) return "shipHullDamage";
  if (Object.prototype.hasOwnProperty.call(crew, "shipHullDamage")) {
    return "shipHullDamage";
  }
  if (Object.prototype.hasOwnProperty.call(crew, "hullDamage")) {
    return "hullDamage";
  }
  if (Object.prototype.hasOwnProperty.call(crew, "shipDamage")) {
    return "shipDamage";
  }
  return "shipHullDamage";
}

export function getCrewHullDamage(crew) {
  if (!crew) return 0;
  const hullDamageField = getHullDamageField(crew);
  return numberValue(crew[hullDamageField]);
}

export function appendText(existingText, nextText) {
  const existing = String(existingText || "").trim();
  const next = String(nextText || "").trim();

  if (!next) return existing;
  if (!existing) return next;

  return `${existing}\n${next}`;
}

export function appendLookupResult(existingResults, result) {
  const list = Array.isArray(existingResults) ? existingResults : [];
  return [...list, result];
}

export function createLookupResultRecord({ table, row, roll }) {
  return {
    tableId: table?.id || "",
    tableLabel: table?.label || table?.title || "",
    roll: roll === null || roll === undefined ? "selected" : roll,
    title: row?.title || "",
    description: row?.description || "",
    createdAt: new Date().toISOString(),
  };
}

export function formatLookupResultNote({ table, row, roll }) {
  const rollText = roll === null || roll === undefined ? "selected" : roll;
  return `${table?.label || table?.title || "Lookup Table"}: ${rollText}. ${
    row?.title || ""
  }. ${row?.description || ""}`;
}

export function resolveFleeInvasion({ roll }) {
  const total = numberValue(roll);

  if (total >= 8) {
    return {
      success: true,
      title: "Escaped the Invasion",
      description:
        "You make it off-world and travel to a new planet, following the usual travel steps. No payment, purchases, or Campaign Events take place while you flee, but you may roll a Character Event.",
    };
  }

  return {
    success: false,
    title: "Failed to Escape",
    description:
      "There is no time during your World step to do anything except Assign Equipment before proceeding to battle. You must fight an Invasion Battle.",
  };
}

export function resolveLicensingRoll({ roll }) {
  const value = numberValue(roll);

  if (value >= 5) {
    return {
      required: true,
      title: "License Required",
      description:
        "This world requires a Freelancer License to perform Patron jobs. Roll 1D6 to determine the credit cost, or attempt to obtain a forged License.",
    };
  }

  return {
    required: false,
    title: "No License Required",
    description: "This world does not require a Freelancer License.",
  };
}

export function resolveForgedLicense({ roll, savvy }) {
  const naturalRoll = numberValue(roll);
  const total = naturalRoll + numberValue(savvy);

  if (naturalRoll === 1) {
    return {
      total,
      success: false,
      rival: true,
      title: "Forgery Backfires",
      description:
        "The forged License attempt fails. Because the natural roll was 1, add a Rival on this world.",
    };
  }

  if (total >= 6) {
    return {
      total,
      success: true,
      rival: false,
      title: "Forged License Obtained",
      description: "You obtain a License for free.",
    };
  }

  return {
    total,
    success: false,
    rival: false,
    title: "Forgery Failed",
    description: "You do not obtain a forged License. Only one attempt is permitted.",
  };
}

export function resolveFindPatron({ d6Roll, crewLooking, existingPatrons, creditsSpent }) {
  const total =
    numberValue(d6Roll) +
    numberValue(crewLooking) +
    numberValue(existingPatrons) +
    numberValue(creditsSpent);

  if (total >= 6) {
    return {
      total,
      jobsFound: 2,
      title: "Two Patron Jobs Found",
      description:
        "You have found two Patron jobs and may choose either job. If you have existing Patrons, one job is from a random existing Patron and the other is from a new Patron.",
    };
  }

  if (total >= 5) {
    return {
      total,
      jobsFound: 1,
      title: "One Patron Job Found",
      description:
        "You have found a Patron to hire the crew for a job. If you have an existing Patron, the first job offer is from them.",
    };
  }

  return {
    total,
    jobsFound: 0,
    title: "No Patron Found",
    description: "No Patron job is found this campaign turn from this task.",
  };
}

export function resolveRecruit({ currentCrewSize, recruiters, d6Roll }) {
  const crewSize = numberValue(currentCrewSize);
  const recruiterCount = numberValue(recruiters);

  if (crewSize < 6) {
    const openSlots = 6 - crewSize;
    const recruitsFound = Math.min(openSlots, recruiterCount);

    return {
      automatic: true,
      total: null,
      recruitsFound,
      title:
        recruitsFound > 0
          ? `${recruitsFound} Recruit${recruitsFound === 1 ? "" : "s"} Found`
          : "No Recruiters Assigned",
      description:
        "Because the crew has fewer than 6 members, each crew member sent Recruiting automatically finds a new recruit, until the crew is back to 6 members.",
    };
  }

  const total = numberValue(d6Roll) + recruiterCount;

  if (total >= 6) {
    return {
      automatic: false,
      total,
      recruitsFound: 1,
      title: "Recruit Found",
      description:
        "The recruiting roll succeeded. Add one new recruit using the random character creation method. The recruit has the basic profile for their type, starts with a Handgun, and does not roll on random background tables.",
    };
  }

  return {
    automatic: false,
    total,
    recruitsFound: 0,
    title: "No Recruit Found",
    description: "The recruiting roll did not reach 6+.",
  };
}

export function resolveTrack({ d6Roll, trackers, creditsSpent }) {
  const total = numberValue(d6Roll) + numberValue(trackers) + numberValue(creditsSpent);

  if (total >= 6) {
    return {
      total,
      success: true,
      title: "Rival Located",
      description:
        "You have located a Rival of your choice, allowing you to fight a battle against them this campaign turn.",
    };
  }

  return {
    total,
    success: false,
    title: "Rival Not Located",
    description: "You did not locate a Rival this campaign turn.",
  };
}

export function resolveRepair({ d6Roll, savvy, isEngineer, creditsSpent }) {
  const roll = numberValue(d6Roll);
  const total = roll + numberValue(savvy) + (isEngineer ? 1 : 0) + numberValue(creditsSpent);

  if (roll === 1) {
    return {
      total,
      success: false,
      destroyed: true,
      title: "Beyond Fixing",
      description: "A natural 1 always fails and means the item is beyond fixing.",
    };
  }

  if (total >= 6) {
    return {
      total,
      success: true,
      destroyed: false,
      title: "Item Repaired",
      description: "The item is repaired and usable again.",
    };
  }

  return {
    total,
    success: false,
    destroyed: false,
    title: "Repair Failed",
    description:
      "The repair attempt failed. The item is not repaired, but it is not beyond fixing unless the natural roll was 1.",
  };
}

export function resolveRumors({ d6Roll, rumorCount, hasActiveQuest }) {
  if (hasActiveQuest) {
    return {
      questReceived: false,
      title: "Already on a Quest",
      description:
        "Do not roll for a new Quest. Until the current Quest is resolved, new Rumors become Quest Rumors instead.",
    };
  }

  const roll = numberValue(d6Roll);
  const rumors = numberValue(rumorCount);

  if (rumors > 0 && roll <= rumors) {
    return {
      questReceived: true,
      title: "Quest Received",
      description:
        "Remove all Rumors from your roster. You have received a Quest and may pursue it immediately.",
    };
  }

  return {
    questReceived: false,
    title: "No Quest Received",
    description: "The Rumor roll did not produce a Quest this campaign turn.",
  };
}

export function resolveRivalAttack({ d6Roll, rivalCount, decoys = 0 }) {
  const roll = numberValue(d6Roll);
  const adjustedRivalCount = Math.max(0, numberValue(rivalCount) - numberValue(decoys));

  if (adjustedRivalCount > 0 && roll <= adjustedRivalCount) {
    return {
      attacked: true,
      title: "Rivals Attack",
      description:
        "A Rival has tracked you down. Select the exact Rival at random from your list. This prevents you from doing whatever you wanted to do this campaign turn.",
    };
  }

  return {
    attacked: false,
    title: "No Rival Attack",
    description:
      "Your Rivals do not interrupt you this campaign turn. You may select your job normally.",
  };
}
