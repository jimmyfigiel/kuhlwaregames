import React, { useMemo, useState } from "react";

import AccordionSection from "./AccordionSection";
import LookupTableModal from "./LookupTableModal";
import {
  CAMPAIGN_TABLES,
  CAMPAIGN_TASKS,
  PATRON_BHC_THRESHOLDS,
  findTableRow,
  rollD6,
  rollD10,
  rollDice,
  rollOnTable,
} from "../data/campaignTables";
import { createLookupApplyTargets } from "../data/lookupApplyTargets";

const CAMPAIGN_PROGRESS_STEPS = [
  { id: "travel.fleeInvasion", phase: "Travel", label: "Flee Invasion" },
  {
    id: "travel.decideWhetherToTravel",
    phase: "Travel",
    label: "Decide Whether to Travel",
  },
  {
    id: "travel.starshipTravelEvent",
    phase: "Travel",
    label: "Starship Travel Event",
  },
  {
    id: "travel.newWorldArrival",
    phase: "Travel",
    label: "New World Arrival Steps",
  },
  {
    id: "world.upkeepAndShipRepairs",
    phase: "World",
    label: "Upkeep and Ship Repairs",
  },
  {
    id: "world.crewTasks",
    phase: "World",
    label: "Assign and Resolve Crew Tasks",
  },
  {
    id: "world.jobOffers",
    phase: "World",
    label: "Determine Job Offers",
  },
  {
    id: "world.assignEquipment",
    phase: "World",
    label: "Assign Equipment",
  },
  {
    id: "world.rumors",
    phase: "World",
    label: "Resolve any Rumors",
  },
  {
    id: "world.chooseBattle",
    phase: "World",
    label: "Choose Your Battle",
  },
  {
    id: "battle.readyForBattle",
    phase: "Battle",
    label: "Ready for Tabletop Battle",
  },
];

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getDisplayName(record, fallback = "Unnamed") {
  return (
    record?.name ||
    record?.crewName ||
    record?.patronName ||
    record?.rivalName ||
    record?.worldName ||
    record?.title ||
    fallback
  );
}

function getRecordId(record) {
  return (
    record?.id ||
    record?.recordId ||
    record?.campaignTurnId ||
    record?.turnId ||
    record?.docId ||
    ""
  );
}

function getLatestCampaignTurn(campaignTurns) {
  if (!Array.isArray(campaignTurns) || campaignTurns.length === 0) return null;

  return [...campaignTurns].sort((a, b) => {
    return numberValue(b.turnNumber) - numberValue(a.turnNumber);
  })[0];
}

function getProgressValue(progress, stepId) {
  return Boolean(progress?.[stepId]);
}

function getNextIncompleteStepId(progress, afterStepId = "") {
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

function getStepPhase(stepId) {
  return CAMPAIGN_PROGRESS_STEPS.find((step) => step.id === stepId)?.phase || "";
}

function getCrewCredits(crew) {
  return numberValue(crew?.credits);
}

function getCrewDebt(crew) {
  return numberValue(crew?.debt);
}

function getHullDamageField(crew) {
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

function getCrewHullDamage(crew) {
  if (!crew) return 0;

  const hullDamageField = getHullDamageField(crew);
  return numberValue(crew[hullDamageField]);
}

function ResultCard({ title, roll, row, description, children }) {
  if (!title && !row && !description && !children) return null;

  return (
    <div className="fp-inline-card" style={{ marginTop: "8px" }}>
      {roll !== undefined && roll !== null && (
        <div className="fp-muted-inline">Roll: {roll}</div>
      )}

      <strong>{title || row?.title || "Result"}</strong>

      {(description || row?.description) && (
        <div style={{ marginTop: "4px", whiteSpace: "pre-wrap" }}>
          {description || row.description}
        </div>
      )}

      {children}
    </div>
  );
}

function CampaignStep({
  stepId,
  label,
  currentTurn,
  progress,
  activeStepId,
  onSetActiveStep,
  onToggleProgress,
  children,
}) {
  const checked = getProgressValue(progress, stepId);
  const isActive = activeStepId === stepId;
  const disabled = !currentTurn;

  return (
    <div className="fp-campaign-step-table">
      <div className="fp-campaign-step-row">
        <div className="fp-campaign-step-complete-cell">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            title={checked ? "Complete" : "Mark complete"}
            onChange={(event) => onToggleProgress(stepId, event.target.checked)}
          />
        </div>

        <button
          type="button"
          className="fp-campaign-step-title-cell"
          onClick={() => onSetActiveStep(stepId)}
        >
          <span className="fp-campaign-step-phase">{getStepPhase(stepId)}</span>
          <span className="fp-campaign-step-title">{label}</span>
        </button>

        <div className="fp-campaign-step-status-cell">
          {checked ? "Complete" : isActive ? "Active" : "Pending"}
        </div>

        <div className="fp-campaign-step-action-cell">
          <button
            type="button"
            className="fp-btn fp-btn-compact"
            onClick={() => onSetActiveStep(stepId)}
          >
            {isActive ? "Open" : "Go"}
          </button>
        </div>
      </div>

      {isActive && <div className="fp-campaign-step-body">{children}</div>}
    </div>
  );
}

function SimpleField({ label, value, onChange, type = "text", min }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <input
        className="fp-input"
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SimpleSelect({ label, value, onChange, options }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <select
        className="fp-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getWorldId(world) {
  return world?.worldId || world?.id || world?.recordId || "";
}

function getPatronId(patron) {
  return patron?.patronId || patron?.id || patron?.recordId || "";
}

function getCrewMemberId(member) {
  return member?.crewMemberId || member?.id || member?.recordId || "";
}

function getStarshipApplyTarget(crew) {
  const starship = crew?.starship || {};
  const shipName =
    starship.name ||
    crew?.shipName ||
    crew?.starshipName ||
    crew?.shipType ||
    starship.shipType ||
    "Crew Starship";

  return {
    id: "starship:crew",
    label: shipName,
    targetType: "starship",
    collectionName: "crew",
    recordId: crew?.crewId || crew?.id || "crew",
  };
}

function appendText(existingText, nextText) {
  const existing = String(existingText || "").trim();
  const next = String(nextText || "").trim();

  if (!next) return existing;
  if (!existing) return next;

  return `${existing}\n${next}`;
}

function appendLookupResult(existingResults, result) {
  const list = Array.isArray(existingResults) ? existingResults : [];
  return [...list, result];
}

function createLookupResultRecord({ table, row, roll }) {
  return {
    tableId: table?.id || "",
    tableLabel: table?.label || "",
    roll: roll === null || roll === undefined ? "selected" : roll,
    title: row?.title || "",
    description: row?.description || "",
    createdAt: new Date().toISOString(),
  };
}

function formatLookupResultNote({ table, row, roll }) {
  const rollText = roll === null || roll === undefined ? "selected" : roll;
  return `${table?.label || "Lookup Table"}: ${rollText}. ${row?.title || ""}. ${
    row?.description || ""
  }`;
}

function resolveFindPatron({
  d6Roll,
  crewLooking,
  existingPatrons,
  creditsSpent,
}) {
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

function resolveRecruit({ currentCrewSize, recruiters, d6Roll }) {
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

function resolveTrack({ d6Roll, trackers, creditsSpent }) {
  const total =
    numberValue(d6Roll) + numberValue(trackers) + numberValue(creditsSpent);

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

function resolveRepair({ d6Roll, savvy, isEngineer, creditsSpent }) {
  const roll = numberValue(d6Roll);
  const total =
    roll + numberValue(savvy) + (isEngineer ? 1 : 0) + numberValue(creditsSpent);

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

function resolveRumors({ d6Roll, rumorCount, hasActiveQuest }) {
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
function resolveRivalAttack({ d6Roll, rivalCount, decoys = 0 }) {
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

function resolveFleeInvasion({ roll }) {
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

function resolveLicensingRoll({ roll }) {
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

function resolveForgedLicense({ roll, savvy }) {
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
    description:
      "You do not obtain a forged License. Only one attempt is permitted.",
  };
}

function makeTurnPatch(currentTurn, patch) {
  return {
    ...(currentTurn || {}),
    ...patch,
  };
}

function StepRulesText({ children }) {
  return <div className="fp-rules-text">{children}</div>;
}

function FleeInvasionStep({ currentTurn, onPatchTurn }) {
  const [roll, setRoll] = useState(currentTurn?.fleeInvasionRoll || "");

  const result =
    roll === "" || roll === null || roll === undefined
      ? null
      : resolveFleeInvasion({ roll });

  async function rollNow() {
    const nextRoll = rollDice(2, 6);
    setRoll(nextRoll);

    if (onPatchTurn) {
      await onPatchTurn({
        fleeInvasionRoll: nextRoll,
        fleeInvasionResult: resolveFleeInvasion({ roll: nextRoll }),
      });
    }
  }

  async function saveResult() {
    if (!onPatchTurn) return;

    await onPatchTurn({
      fleeInvasionRoll: numberValue(roll),
      fleeInvasionResult: result,
    });
  }

  return (
    <div>
      <StepRulesText>
        <p>
          If the current world is being Invaded, you must attempt to flee. Roll
          2D6. A score of 8+ is required to get safely off-world.
        </p>

        <ul>
          <li>
            If the roll fails, there’s no time during your World step to do
            anything except Assign Equipment before proceeding to the Battle
            section, where you MUST fight an Invasion Battle.
          </li>
          <li>
            If you make the roll, or if you survive the Invasion Battle, you
            make it off the world and travel to a new planet, following the usual
            steps. No payment, purchases, or Campaign Events take place while
            you flee, but you may roll up a Character Event.
          </li>
          <li>
            If you don’t have the 5 credits needed for fuel, you can sell off
            gear at a loss, receiving 1 credit per two items sold, or abandon the
            ship and take evacuation passage.
          </li>
          <li>
            If you lack a ship, you flee on an evacuation ship. You lose all
            credits you do have, plus 1D6 items from your Stash and equipment,
            chosen by you.
          </li>
        </ul>

        <p>
          Regardless of how you leave, all Rivals, Patrons, and other people
          known to your crew on this world are lost.
        </p>
      </StepRulesText>

      <div className="fp-actions">
        <SimpleField label="2D6 Roll" value={roll} onChange={setRoll} type="number" min="2" />

        <button className="fp-btn fp-primary" onClick={rollNow}>
          Roll 2D6
        </button>

        <button className="fp-btn" onClick={saveResult} disabled={!result}>
          Save Result
        </button>
      </div>

      {result && (
        <ResultCard title={result.title} description={result.description}>
          <div className="fp-muted-inline">Target: 8+</div>
        </ResultCard>
      )}
    </div>
  );
}

function DecideTravelStep({ crew, currentTurn, onSaveCrew, onPatchTurn }) {
  const [travelChoice, setTravelChoice] = useState(
    currentTurn?.travelChoice || "stay"
  );
  const [fuelCost, setFuelCost] = useState(currentTurn?.travelFuelCost ?? 5);

  const credits = getCrewCredits(crew);
  const canPayFuel = credits >= numberValue(fuelCost);

  async function saveChoice() {
    if (onPatchTurn) {
      await onPatchTurn({
        travelChoice,
        travelFuelCost: numberValue(fuelCost),
      });
    }
  }

  async function payFuelAndTravel() {
    if (!crew || !onSaveCrew) return;

    await onSaveCrew({
      ...crew,
      credits: Math.max(0, credits - numberValue(fuelCost)),
    });

    if (onPatchTurn) {
      await onPatchTurn({
        travelChoice: "travel",
        travelFuelCost: numberValue(fuelCost),
        travelFuelPaid: true,
      });
    }
  }

  return (
    <div>
      <StepRulesText>
        <p>
          At the beginning of a campaign turn, you may leave the current planet.
          If you have a ship, travel normally costs 5 credits. Crews without a
          ship may pay commercial passage at 1 credit per crew member and do not
          roll for Starship Travel Events.
        </p>
      </StepRulesText>

      <div className="fp-actions">
        <SimpleSelect
          label="Travel Choice"
          value={travelChoice}
          onChange={setTravelChoice}
          options={[
            { value: "stay", label: "Stay on current world" },
            { value: "travel", label: "Travel to a new world" },
            { value: "commercial", label: "Commercial passage" },
          ]}
        />

        <SimpleField
          label="Fuel / Passage Cost"
          value={fuelCost}
          onChange={setFuelCost}
          type="number"
          min="0"
        />

        <button className="fp-btn" onClick={saveChoice}>
          Save Choice
        </button>

        <button
          className="fp-btn fp-primary"
          onClick={payFuelAndTravel}
          disabled={!crew || !canPayFuel}
        >
          Pay and Mark Travel
        </button>
      </div>

      <ResultCard
        title={canPayFuel ? "Travel Cost Available" : "Not Enough Credits"}
        description={`Crew credits: ${credits}. Travel cost: ${numberValue(
          fuelCost
        )}.`}
      />
    </div>
  );
}

function StarshipTravelStep({ onOpenLookupTable }) {
  return (
    <div>
      <StepRulesText>
        <p>
          If you travel using your own ship, roll once on the Starship Travel
          Events table. Crews traveling commercially do not roll on this table.
        </p>
      </StepRulesText>

      <div className="fp-actions">
        <button
          className="fp-btn fp-primary"
          onClick={() => onOpenLookupTable("starshipTravelEvents")}
        >
          Open Starship Travel Events Table
        </button>
      </div>
    </div>
  );
}

function NewWorldArrivalStep({
  crewMembers,
  worlds,
  currentTurn,
  onPatchTurn,
  onOpenLookupTable,
}) {
  const [licenseRoll, setLicenseRoll] = useState(
    currentTurn?.licenseRoll || ""
  );
  const [licenseCostRoll, setLicenseCostRoll] = useState(
    currentTurn?.licenseCostRoll || ""
  );
  const [forgeryRoll, setForgeryRoll] = useState(
    currentTurn?.forgeryRoll || ""
  );
  const [forgerySavvy, setForgerySavvy] = useState(
    currentTurn?.forgerySavvy || 0
  );

  const licensingResult =
    licenseRoll === "" ? null : resolveLicensingRoll({ roll: licenseRoll });

  const forgeryResult =
    forgeryRoll === ""
      ? null
      : resolveForgedLicense({ roll: forgeryRoll, savvy: forgerySavvy });

  async function rollLicenseRequirement() {
    const nextRoll = rollD6();
    setLicenseRoll(nextRoll);

    if (onPatchTurn) {
      await onPatchTurn({
        licenseRoll: nextRoll,
        licenseResult: resolveLicensingRoll({ roll: nextRoll }),
      });
    }
  }

  async function rollLicenseCost() {
    const nextRoll = rollD6();
    setLicenseCostRoll(nextRoll);

    if (onPatchTurn) {
      await onPatchTurn({
        licenseCostRoll: nextRoll,
      });
    }
  }

  async function rollForgery() {
    const nextRoll = rollD6();
    setForgeryRoll(nextRoll);

    if (onPatchTurn) {
      await onPatchTurn({
        forgeryRoll: nextRoll,
        forgerySavvy: numberValue(forgerySavvy),
        forgeryResult: resolveForgedLicense({
          roll: nextRoll,
          savvy: forgerySavvy,
        }),
      });
    }
  }

  async function saveArrivalDetails() {
    if (!onPatchTurn) return;

    await onPatchTurn({
      licenseRoll: licenseRoll === "" ? "" : numberValue(licenseRoll),
      licenseCostRoll:
        licenseCostRoll === "" ? "" : numberValue(licenseCostRoll),
      forgeryRoll: forgeryRoll === "" ? "" : numberValue(forgeryRoll),
      forgerySavvy: numberValue(forgerySavvy),
      licenseResult: licensingResult,
      forgeryResult,
    });
  }

  return (
    <div>
      <StepRulesText>
        <p>
          On a new world, check whether Rivals follow, dismiss non-Persistent
          Patrons, check licensing requirements, then roll for World Traits.
        </p>
      </StepRulesText>

      <div className="fp-actions">
        <button
          className="fp-btn fp-primary"
          onClick={() => onOpenLookupTable("worldTraits")}
        >
          Open World Traits Table
        </button>
      </div>

      <div className="fp-inline-card">
        <strong>Licensing Requirements</strong>

        <div className="fp-actions">
          <SimpleField
            label="License Roll"
            value={licenseRoll}
            onChange={setLicenseRoll}
            type="number"
            min="1"
          />

          <button className="fp-btn" onClick={rollLicenseRequirement}>
            Roll License Requirement
          </button>

          <SimpleField
            label="License Cost Roll"
            value={licenseCostRoll}
            onChange={setLicenseCostRoll}
            type="number"
            min="1"
          />

          <button className="fp-btn" onClick={rollLicenseCost}>
            Roll Cost
          </button>
        </div>

        {licensingResult && (
          <ResultCard
            title={licensingResult.title}
            description={licensingResult.description}
          />
        )}
      </div>

      <div className="fp-inline-card">
        <strong>Forged License Attempt</strong>

        <div className="fp-actions">
          <SimpleField
            label="Forgery Roll"
            value={forgeryRoll}
            onChange={setForgeryRoll}
            type="number"
            min="1"
          />

          <SimpleField
            label="Savvy"
            value={forgerySavvy}
            onChange={setForgerySavvy}
            type="number"
          />

          <button className="fp-btn" onClick={rollForgery}>
            Roll Forgery
          </button>

          <button className="fp-btn" onClick={saveArrivalDetails}>
            Save Arrival Details
          </button>
        </div>

        {forgeryResult && (
          <ResultCard
            title={forgeryResult.title}
            description={forgeryResult.description}
          >
            <div className="fp-muted-inline">Total: {forgeryResult.total}</div>
          </ResultCard>
        )}
      </div>

      <div className="fp-muted" style={{ marginTop: "8px" }}>
        Worlds available: {worlds.length}. Crew available for forged license
        attempts: {crewMembers.length}.
      </div>
    </div>
  );
}

function UpkeepShipRepairsStep({ crew, crewMembers, onSaveCrew }) {
  const [upkeepPaid, setUpkeepPaid] = useState(1);
  const [shipPayment, setShipPayment] = useState(0);
  const [repairSpend, setRepairSpend] = useState(0);

  const activeCrewCount = crewMembers.filter((member) => {
    return !member.inSickBay;
  }).length;

  const baseUpkeep =
    activeCrewCount <= 0
      ? 0
      : activeCrewCount <= 6
        ? 1
        : 1 + (activeCrewCount - 6);

  const credits = getCrewCredits(crew);
  const debt = getCrewDebt(crew);
  const hullDamage = getCrewHullDamage(crew);
  const hullDamageField = getHullDamageField(crew);

  async function saveCrewPatch(patch) {
    if (!crew || !onSaveCrew) return;
    await onSaveCrew({
      ...crew,
      ...patch,
    });
  }

  async function upkeepCrew() {
    const amount = numberValue(upkeepPaid);
    await saveCrewPatch({
      credits: Math.max(0, credits - amount),
      lastUpkeepPaid: amount,
    });
  }

  async function makeShipPayment() {
    const amount = numberValue(shipPayment);
    await saveCrewPatch({
      credits: Math.max(0, credits - amount),
      debt: Math.max(0, debt - amount),
      lastShipPayment: amount,
    });
  }

  async function increaseDebt() {
    const increase = debt >= 31 ? 2 : 1;
    await saveCrewPatch({
      debt: debt + increase,
      lastDebtIncrease: increase,
    });
  }

  async function repairShip() {
    const spend = numberValue(repairSpend);
    const repairAmount = 1 + spend;

    await saveCrewPatch({
      credits: Math.max(0, credits - spend),
      [hullDamageField]: Math.max(0, hullDamage - repairAmount),
      lastShipRepairSpend: spend,
      lastShipRepairAmount: repairAmount,
    });
  }

  return (
    <div>
      <StepRulesText>
        <p>
          Pay upkeep, handle ship debt, repair Hull damage, and pay for medical
          care. Characters in Sick Bay mark off one campaign turn from their
          recovery duration.
        </p>
      </StepRulesText>

      <div className="fp-inline-card">
        <strong>Current Values</strong>
        <div>Active crew for upkeep: {activeCrewCount}</div>
        <div>Suggested upkeep: {baseUpkeep} credits</div>
        <div>Credits: {credits}</div>
        <div>Debt: {debt}</div>
        <div>Hull damage: {hullDamage}</div>
      </div>

      <div className="fp-actions">
        <SimpleField
          label="Upkeep Credits"
          value={upkeepPaid}
          onChange={setUpkeepPaid}
          type="number"
          min="0"
        />

        <button className="fp-btn fp-primary" onClick={upkeepCrew}>
          Upkeep Crew
        </button>

        <SimpleField
          label="Ship Payment"
          value={shipPayment}
          onChange={setShipPayment}
          type="number"
          min="0"
        />

        <button className="fp-btn" onClick={makeShipPayment}>
          Ship Payment
        </button>

        <button className="fp-btn" onClick={increaseDebt}>
          Increase Debt
        </button>

        <SimpleField
          label="Repair Spend"
          value={repairSpend}
          onChange={setRepairSpend}
          type="number"
          min="0"
        />

        <button className="fp-btn" onClick={repairShip}>
          Repair Ship
        </button>
      </div>
    </div>
  );
}
function CrewTasksStep({
  crew,
  crewMembers,
  patrons,
  rivals,
  currentTurn,
  onPatchTurn,
  onOpenLookupTable,
}) {
  const [taskCounts, setTaskCounts] = useState(
    currentTurn?.crewTaskCounts || {
      findPatron: 0,
      train: 0,
      trade: 0,
      recruit: 0,
      explore: 0,
      track: 0,
      repair: 0,
      decoy: 0,
    }
  );

  const [findPatronRoll, setFindPatronRoll] = useState(
    currentTurn?.findPatronRoll || ""
  );
  const [findPatronCredits, setFindPatronCredits] = useState(
    currentTurn?.findPatronCredits || 0
  );

  const [recruitRoll, setRecruitRoll] = useState(
    currentTurn?.recruitRoll || ""
  );

  const [trackRoll, setTrackRoll] = useState(currentTurn?.trackRoll || "");
  const [trackCredits, setTrackCredits] = useState(
    currentTurn?.trackCredits || 0
  );

  const [repairRoll, setRepairRoll] = useState(currentTurn?.repairRoll || "");
  const [repairSavvy, setRepairSavvy] = useState(
    currentTurn?.repairSavvy || 0
  );
  const [repairCredits, setRepairCredits] = useState(
    currentTurn?.repairCredits || 0
  );
  const [repairEngineer, setRepairEngineer] = useState(
    Boolean(currentTurn?.repairEngineer)
  );

  function setTaskCount(taskId, value) {
    setTaskCounts((prev) => ({
      ...prev,
      [taskId]: Math.max(0, numberValue(value)),
    }));
  }

  const findPatronResult =
    findPatronRoll === ""
      ? null
      : resolveFindPatron({
          d6Roll: findPatronRoll,
          crewLooking: taskCounts.findPatron,
          existingPatrons: patrons.length,
          creditsSpent: findPatronCredits,
        });

  const recruitResult =
    recruitRoll === ""
      ? null
      : resolveRecruit({
          currentCrewSize: crewMembers.length,
          recruiters: taskCounts.recruit,
          d6Roll: recruitRoll,
        });

  const trackResult =
    trackRoll === ""
      ? null
      : resolveTrack({
          d6Roll: trackRoll,
          trackers: taskCounts.track,
          creditsSpent: trackCredits,
        });

  const repairResult =
    repairRoll === ""
      ? null
      : resolveRepair({
          d6Roll: repairRoll,
          savvy: repairSavvy,
          isEngineer: repairEngineer,
          creditsSpent: repairCredits,
        });

  async function saveTasks(extraPatch = {}) {
    if (!onPatchTurn) return;

    await onPatchTurn({
      crewTaskCounts: taskCounts,
      findPatronRoll: findPatronRoll === "" ? "" : numberValue(findPatronRoll),
      findPatronCredits: numberValue(findPatronCredits),
      findPatronResult,
      recruitRoll: recruitRoll === "" ? "" : numberValue(recruitRoll),
      recruitResult,
      trackRoll: trackRoll === "" ? "" : numberValue(trackRoll),
      trackCredits: numberValue(trackCredits),
      trackResult,
      repairRoll: repairRoll === "" ? "" : numberValue(repairRoll),
      repairSavvy: numberValue(repairSavvy),
      repairCredits: numberValue(repairCredits),
      repairEngineer,
      repairResult,
      ...extraPatch,
    });
  }

  async function rollFindPatron() {
    const nextRoll = rollD6();
    setFindPatronRoll(nextRoll);

    const nextResult = resolveFindPatron({
      d6Roll: nextRoll,
      crewLooking: taskCounts.findPatron,
      existingPatrons: patrons.length,
      creditsSpent: findPatronCredits,
    });

    await saveTasks({
      findPatronRoll: nextRoll,
      findPatronResult: nextResult,
    });
  }

  async function rollRecruit() {
    const nextRoll = rollD6();
    setRecruitRoll(nextRoll);

    const nextResult = resolveRecruit({
      currentCrewSize: crewMembers.length,
      recruiters: taskCounts.recruit,
      d6Roll: nextRoll,
    });

    await saveTasks({
      recruitRoll: nextRoll,
      recruitResult: nextResult,
    });
  }

  async function rollTrack() {
    const nextRoll = rollD6();
    setTrackRoll(nextRoll);

    const nextResult = resolveTrack({
      d6Roll: nextRoll,
      trackers: taskCounts.track,
      creditsSpent: trackCredits,
    });

    await saveTasks({
      trackRoll: nextRoll,
      trackResult: nextResult,
    });
  }

  async function rollRepair() {
    const nextRoll = rollD6();
    setRepairRoll(nextRoll);

    const nextResult = resolveRepair({
      d6Roll: nextRoll,
      savvy: repairSavvy,
      isEngineer: repairEngineer,
      creditsSpent: repairCredits,
    });

    await saveTasks({
      repairRoll: nextRoll,
      repairResult: nextResult,
    });
  }

  return (
    <div>
      <StepRulesText>
        <p>
          Each crew member that is not in Sick Bay can take one task. Up to two
          characters may be assigned to any one task.
        </p>
      </StepRulesText>

      <div className="fp-table-wrap">
        <table className="fp-compact-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Crew Assigned</th>
              <th>Lookup / Roll</th>
            </tr>
          </thead>

          <tbody>
            {CAMPAIGN_TASKS.map((task) => (
              <tr key={task.id}>
                <td>
                  <strong>{task.label}</strong>
                  <div className="fp-muted-inline">{task.description}</div>
                </td>

                <td>
                  <input
                    className="fp-input fp-input-small"
                    type="number"
                    min="0"
                    max="2"
                    value={taskCounts[task.id] || 0}
                    onChange={(event) =>
                      setTaskCount(task.id, event.target.value)
                    }
                  />
                </td>

                <td>
                  {task.id === "trade" && (
                    <button
                      className="fp-btn fp-btn-compact"
                      onClick={() => onOpenLookupTable("tradeTable")}
                    >
                      Trade Table
                    </button>
                  )}

                  {task.id === "explore" && (
                    <button
                      className="fp-btn fp-btn-compact"
                      onClick={() => onOpenLookupTable("explorationTable")}
                    >
                      Exploration Table
                    </button>
                  )}

                  {task.id !== "trade" && task.id !== "explore" && (
                    <span className="fp-muted-inline">Use task controls below</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fp-actions">
        <button className="fp-btn" onClick={() => saveTasks()}>
          Save Task Assignments
        </button>
      </div>

      <div className="fp-inline-card">
        <strong>Find a Patron</strong>

        <div className="fp-actions">
          <SimpleField
            label="D6 Roll"
            value={findPatronRoll}
            onChange={setFindPatronRoll}
            type="number"
            min="1"
          />

          <SimpleField
            label="Credits Spent"
            value={findPatronCredits}
            onChange={setFindPatronCredits}
            type="number"
            min="0"
          />

          <button className="fp-btn" onClick={rollFindPatron}>
            Roll Find Patron
          </button>
        </div>

        {findPatronResult && (
          <ResultCard
            title={findPatronResult.title}
            description={findPatronResult.description}
          >
            <div className="fp-muted-inline">
              Total: {findPatronResult.total}
            </div>
          </ResultCard>
        )}
      </div>

      <div className="fp-inline-card">
        <strong>Recruit</strong>

        <div className="fp-actions">
          <SimpleField
            label="D6 Roll"
            value={recruitRoll}
            onChange={setRecruitRoll}
            type="number"
            min="1"
          />

          <button className="fp-btn" onClick={rollRecruit}>
            Roll Recruit
          </button>
        </div>

        {recruitResult && (
          <ResultCard
            title={recruitResult.title}
            description={recruitResult.description}
          >
            {recruitResult.total !== null && (
              <div className="fp-muted-inline">
                Total: {recruitResult.total}
              </div>
            )}
          </ResultCard>
        )}
      </div>

      <div className="fp-inline-card">
        <strong>Track Rival</strong>

        <div className="fp-actions">
          <SimpleField
            label="D6 Roll"
            value={trackRoll}
            onChange={setTrackRoll}
            type="number"
            min="1"
          />

          <SimpleField
            label="Credits Spent"
            value={trackCredits}
            onChange={setTrackCredits}
            type="number"
            min="0"
          />

          <button className="fp-btn" onClick={rollTrack}>
            Roll Track
          </button>
        </div>

        {trackResult && (
          <ResultCard
            title={trackResult.title}
            description={trackResult.description}
          >
            <div className="fp-muted-inline">Total: {trackResult.total}</div>
          </ResultCard>
        )}
      </div>

      <div className="fp-inline-card">
        <strong>Repair Your Kit</strong>

        <div className="fp-actions">
          <SimpleField
            label="D6 Roll"
            value={repairRoll}
            onChange={setRepairRoll}
            type="number"
            min="1"
          />

          <SimpleField
            label="Savvy"
            value={repairSavvy}
            onChange={setRepairSavvy}
            type="number"
          />

          <SimpleField
            label="Credits Spent"
            value={repairCredits}
            onChange={setRepairCredits}
            type="number"
            min="0"
          />

          <label className="fp-check-field">
            <input
              type="checkbox"
              checked={repairEngineer}
              onChange={(event) => setRepairEngineer(event.target.checked)}
            />
            Engineer +1
          </label>

          <button className="fp-btn" onClick={rollRepair}>
            Roll Repair
          </button>
        </div>

        {repairResult && (
          <ResultCard
            title={repairResult.title}
            description={repairResult.description}
          >
            <div className="fp-muted-inline">Total: {repairResult.total}</div>
          </ResultCard>
        )}
      </div>

      <div className="fp-muted" style={{ marginTop: "8px" }}>
        Rivals available: {rivals.length}. Existing Patrons: {patrons.length}.
        Crew credits: {getCrewCredits(crew)}.
      </div>
    </div>
  );
}

function JobOffersStep({ onOpenLookupTable }) {
  return (
    <div>
      <StepRulesText>
        <p>
          If you received a job offer from a Patron, determine who the Patron is,
          the Danger Pay, the Time Frame, and any Benefits, Hazards, or
          Conditions.
        </p>
      </StepRulesText>

      <div className="fp-actions">
        <button
          className="fp-btn fp-primary"
          onClick={() => onOpenLookupTable("patronTable")}
        >
          Patron Table
        </button>

        <button
          className="fp-btn"
          onClick={() => onOpenLookupTable("dangerPayTable")}
        >
          Danger Pay Table
        </button>

        <button
          className="fp-btn"
          onClick={() => onOpenLookupTable("timeFrameTable")}
        >
          Time Frame Table
        </button>

        <button
          className="fp-btn"
          onClick={() => onOpenLookupTable("benefitsSubtable")}
        >
          Benefits Subtable
        </button>

        <button
          className="fp-btn"
          onClick={() => onOpenLookupTable("hazardsSubtable")}
        >
          Hazards Subtable
        </button>

        <button
          className="fp-btn"
          onClick={() => onOpenLookupTable("conditionsSubtable")}
        >
          Conditions Subtable
        </button>
      </div>
    </div>
  );
}

function AssignEquipmentStep() {
  return (
    <div>
      <StepRulesText>
        <p>
          Reassign any equipment for your crew. Characters can trade items,
          leave items in the Stash, or take items from the Stash. Stashed items
          are not available during battle.
        </p>
      </StepRulesText>

      <div className="fp-muted">
        Use the Gear tab to move equipment between crew members and the Stash.
      </div>
    </div>
  );
}

function RumorsStep({ rumors, quests, currentTurn, onPatchTurn }) {
  const [rumorRoll, setRumorRoll] = useState(currentTurn?.rumorRoll || "");

  const result =
    rumorRoll === ""
      ? null
      : resolveRumors({
          d6Roll: rumorRoll,
          rumorCount: rumors.length,
          hasActiveQuest: quests.length > 0,
        });

  async function rollRumors() {
    const nextRoll = rollD6();
    setRumorRoll(nextRoll);

    if (onPatchTurn) {
      await onPatchTurn({
        rumorRoll: nextRoll,
        rumorResult: resolveRumors({
          d6Roll: nextRoll,
          rumorCount: rumors.length,
          hasActiveQuest: quests.length > 0,
        }),
      });
    }
  }

  async function saveRumorResult() {
    if (!onPatchTurn) return;

    await onPatchTurn({
      rumorRoll: rumorRoll === "" ? "" : numberValue(rumorRoll),
      rumorResult: result,
    });
  }

  return (
    <div>
      <StepRulesText>
        <p>
          If you are not currently on a Quest, roll a D6. If the roll is equal
          to or below the number of Rumors, remove all Rumors and receive a
          Quest.
        </p>
      </StepRulesText>

      <div className="fp-actions">
        <SimpleField
          label="D6 Roll"
          value={rumorRoll}
          onChange={setRumorRoll}
          type="number"
          min="1"
        />

        <button className="fp-btn" onClick={rollRumors}>
          Roll Rumors
        </button>

        <button className="fp-btn" onClick={saveRumorResult} disabled={!result}>
          Save Result
        </button>
      </div>

      <div className="fp-muted" style={{ marginTop: "8px" }}>
        Rumors: {rumors.length}. Active Quests: {quests.length}.
      </div>

      {result && (
        <ResultCard title={result.title} description={result.description} />
      )}
    </div>
  );
}

function ChooseBattleStep({
  rivals,
  quests,
  patrons,
  currentTurn,
  onPatchTurn,
}) {
  const [rivalRoll, setRivalRoll] = useState(currentTurn?.rivalRoll || "");
  const [decoys, setDecoys] = useState(currentTurn?.decoys || 0);
  const [battleChoice, setBattleChoice] = useState(
    currentTurn?.battleChoice || "opportunity"
  );

  const rivalResult =
    rivalRoll === ""
      ? null
      : resolveRivalAttack({
          d6Roll: rivalRoll,
          rivalCount: rivals.length,
          decoys,
        });

  async function rollRivals() {
    const nextRoll = rollD6();
    setRivalRoll(nextRoll);

    if (onPatchTurn) {
      await onPatchTurn({
        rivalRoll: nextRoll,
        decoys: numberValue(decoys),
        rivalResult: resolveRivalAttack({
          d6Roll: nextRoll,
          rivalCount: rivals.length,
          decoys,
        }),
      });
    }
  }

  async function saveBattleChoice() {
    if (!onPatchTurn) return;

    await onPatchTurn({
      rivalRoll: rivalRoll === "" ? "" : numberValue(rivalRoll),
      decoys: numberValue(decoys),
      rivalResult,
      battleChoice,
    });
  }

  return (
    <div>
      <StepRulesText>
        <p>
          First check whether Rivals track you down. If not attacked, select one
          available battle option: Opportunity mission, Attack a Rival, Continue
          a Quest, or carry out a Patron job.
        </p>
      </StepRulesText>

      <div className="fp-actions">
        <SimpleField
          label="Rival Check D6"
          value={rivalRoll}
          onChange={setRivalRoll}
          type="number"
          min="1"
        />

        <SimpleField
          label="Decoys"
          value={decoys}
          onChange={setDecoys}
          type="number"
          min="0"
        />

        <button className="fp-btn" onClick={rollRivals}>
          Roll Rival Check
        </button>
      </div>

      {rivalResult && (
        <ResultCard
          title={rivalResult.title}
          description={rivalResult.description}
        />
      )}

      <div className="fp-actions">
        <SimpleSelect
          label="Selected Battle"
          value={battleChoice}
          onChange={setBattleChoice}
          options={[
            { value: "opportunity", label: "Opportunity Mission" },
            { value: "rival", label: "Attack a Tracked Rival" },
            { value: "quest", label: "Continue a Quest" },
            { value: "patron", label: "Carry out a Patron Job" },
          ]}
        />

        <button className="fp-btn fp-primary" onClick={saveBattleChoice}>
          Save Battle Choice
        </button>
      </div>

      <div className="fp-muted" style={{ marginTop: "8px" }}>
        Rivals: {rivals.length}. Quests: {quests.length}. Patrons:{" "}
        {patrons.length}.
      </div>
    </div>
  );
}

function ReadyForBattleStep({ currentTurn }) {
  return (
    <div>
      <StepRulesText>
        <p>
          You are ready to proceed to the Tabletop Battle section. Select no
          more than 6 crew members to bring into battle, or fewer if your
          campaign crew size limit is lower.
        </p>
      </StepRulesText>

      <ResultCard
        title="Campaign Turn Battle Choice"
        description={currentTurn?.battleChoice || "No battle choice saved yet."}
      />
    </div>
  );
}
export default function TurnPanel({
  campaignTurns = [],
  crew = null,
  crewMembers = [],
  equipment = [],
  worlds = [],
  patrons = [],
  rivals = [],
  quests = [],
  rumors = [],
  onSaveCrew,
  onAddTurn,
  onUpdate,
  onDelete,
  onAddLog,
  onOpenRulesPage,
}) {
  const currentTurn = getLatestCampaignTurn(campaignTurns);
  const currentTurnId = getRecordId(currentTurn);
  const progress = currentTurn?.progress || {};

  const [activeStepId, setActiveStepId] = useState(() => {
    return getNextIncompleteStepId(progress);
  });

  const [activeLookupTableId, setActiveLookupTableId] = useState("");
  const [message, setMessage] = useState("");

  const lookupApplyTargets = useMemo(() => {
    return createLookupApplyTargets({
      tableId: activeLookupTableId,
      crew,
      crewMembers,
      worlds,
      patrons,
      campaignTurns,
    });
  }, [
    activeLookupTableId,
    crew,
    crewMembers,
    worlds,
    patrons,
    campaignTurns,
  ]);

  async function patchCurrentTurn(patch) {
    if (!currentTurn || !currentTurnId || !onUpdate) return;

    await onUpdate("campaignTurns", currentTurnId, patch);
  }

  async function toggleProgress(stepId, checked) {
    if (!currentTurn || !currentTurnId || !onUpdate) return;

    const nextProgress = {
      ...(currentTurn.progress || {}),
      [stepId]: checked,
    };

    await onUpdate("campaignTurns", currentTurnId, {
      progress: nextProgress,
    });

    if (checked) {
      const nextStepId = getNextIncompleteStepId(nextProgress, stepId);
      setActiveStepId(nextStepId);
    } else {
      setActiveStepId(stepId);
    }
  }

  async function deleteCurrentCampaignTurn() {
    if (!currentTurn || !currentTurnId || !onDelete) return;

    const confirmed = window.confirm(
      `Delete Campaign Turn ${
        currentTurn.turnNumber || ""
      }? This cannot be undone.`
    );

    if (!confirmed) return;

    await onDelete("campaignTurns", currentTurnId);
    setMessage("Campaign turn deleted.");
  }

  function openLookupTable(tableId) {
    setActiveLookupTableId(tableId);
  }

  function closeLookupTable() {
    setActiveLookupTableId("");
  }

  async function applyLookupResult({ table, row, roll, applyTo }) {
    const targetType = applyTo?.targetType || "crewNotes";
    const recordId = applyTo?.recordId || "";
    const rawTarget = applyTo?.raw || null;

    const lookupResult = createLookupResultRecord({
      table,
      row,
      roll,
    });

    const note = formatLookupResultNote({
      table,
      row,
      roll,
    });

    if (targetType === "world" && onUpdate && recordId) {
      const existingTraits = Array.isArray(rawTarget?.traits)
        ? rawTarget.traits
        : [];

      await onUpdate("worlds", recordId, {
        traits: [
          ...existingTraits,
          {
            source: table.id,
            sourceLabel: table.label || table.title,
            roll,
            title: row.title,
            description: row.description,
          },
        ],
        worldTrait: row.title,
        worldTraitRoll: roll,
        worldTraitDescription: row.description,
        notes: appendText(rawTarget?.notes || "", note),
        lookupResults: appendLookupResult(rawTarget?.lookupResults, lookupResult),
      });

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (targetType === "campaignTurn" && onUpdate && recordId) {
      await onUpdate("campaignTurns", recordId, {
        notes: appendText(rawTarget?.notes || "", note),
        lookupResults: appendLookupResult(rawTarget?.lookupResults, lookupResult),
      });

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (targetType === "crewMember" && onUpdate && recordId) {
      await onUpdate("crewMembers", recordId, {
        notes: appendText(rawTarget?.notes || "", note),
        lookupResults: appendLookupResult(rawTarget?.lookupResults, lookupResult),
      });

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (targetType === "patron" && onUpdate && recordId) {
      await onUpdate("patrons", recordId, {
        notes: appendText(rawTarget?.notes || "", note),
        jobLookupResults: appendLookupResult(
          rawTarget?.jobLookupResults,
          lookupResult
        ),
      });

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (targetType === "starship" && onSaveCrew && crew) {
      await onSaveCrew({
        ...crew,
        starship: {
          ...(crew.starship || {}),
          notes: appendText(crew.starship?.notes || "", note),
          travelEvents: appendLookupResult(
            crew.starship?.travelEvents,
            lookupResult
          ),
        },
      });

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (onSaveCrew && crew) {
      await onSaveCrew({
        ...crew,
        notes: appendText(crew.notes || "", note),
        lookupResults: appendLookupResult(crew.lookupResults, lookupResult),
      });
    }

    setMessage(`${table.label || table.title}: applied ${row.title} to Adventure Notes.`);
    closeLookupTable();
  }

  return (
    <div className="fp-panel">
      <AccordionSection title="Campaign Turn Controls" defaultOpen>
        <div className="fp-actions">
          <button className="fp-btn fp-primary" onClick={onAddTurn}>
            Start New Campaign Turn
          </button>

          <button
            className="fp-btn"
            onClick={deleteCurrentCampaignTurn}
            disabled={!currentTurn || !onDelete}
          >
            Delete Current Campaign Turn
          </button>

          {onAddLog && currentTurnId && (
            <button
              className="fp-btn"
              onClick={() => onAddLog(currentTurnId)}
            >
              Add Campaign Turn Log
            </button>
          )}

          {onOpenRulesPage && (
            <button className="fp-btn" onClick={() => onOpenRulesPage(69)}>
              Open Travel Rules
            </button>
          )}
        </div>

        {currentTurn ? (
          <div className="fp-muted" style={{ marginTop: "10px" }}>
            Current Campaign Turn: {currentTurn.turnNumber || "unnumbered"}
          </div>
        ) : (
          <div className="fp-muted" style={{ marginTop: "10px" }}>
            Start a campaign turn before marking steps complete. Completion
            checkboxes are saved on the current campaign turn.
          </div>
        )}

        {message && (
          <div className="fp-turn-summary" style={{ marginTop: "10px" }}>
            {message}
          </div>
        )}
      </AccordionSection>

      <AccordionSection title="Campaign Steps" defaultOpen>
        <CampaignStep
          stepId="travel.fleeInvasion"
          label="Flee Invasion"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <FleeInvasionStep
            currentTurn={currentTurn}
            onPatchTurn={patchCurrentTurn}
          />
        </CampaignStep>

        <CampaignStep
          stepId="travel.decideWhetherToTravel"
          label="Decide Whether to Travel"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <DecideTravelStep
            crew={crew}
            currentTurn={currentTurn}
            onSaveCrew={onSaveCrew}
            onPatchTurn={patchCurrentTurn}
          />
        </CampaignStep>

        <CampaignStep
          stepId="travel.starshipTravelEvent"
          label="Starship Travel Event"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <StarshipTravelStep onOpenLookupTable={openLookupTable} />
        </CampaignStep>

        <CampaignStep
          stepId="travel.newWorldArrival"
          label="New World Arrival Steps"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <NewWorldArrivalStep
            crewMembers={crewMembers}
            worlds={worlds}
            currentTurn={currentTurn}
            onPatchTurn={patchCurrentTurn}
            onOpenLookupTable={openLookupTable}
          />
        </CampaignStep>

        <CampaignStep
          stepId="world.upkeepAndShipRepairs"
          label="Upkeep and Ship Repairs"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <UpkeepShipRepairsStep
            crew={crew}
            crewMembers={crewMembers}
            onSaveCrew={onSaveCrew}
          />
        </CampaignStep>

        <CampaignStep
          stepId="world.crewTasks"
          label="Assign and Resolve Crew Tasks"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <CrewTasksStep
            crew={crew}
            crewMembers={crewMembers}
            patrons={patrons}
            rivals={rivals}
            currentTurn={currentTurn}
            onPatchTurn={patchCurrentTurn}
            onOpenLookupTable={openLookupTable}
          />
        </CampaignStep>

        <CampaignStep
          stepId="world.jobOffers"
          label="Determine Job Offers"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <JobOffersStep onOpenLookupTable={openLookupTable} />
        </CampaignStep>

        <CampaignStep
          stepId="world.assignEquipment"
          label="Assign Equipment"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <AssignEquipmentStep equipment={equipment} />
        </CampaignStep>

        <CampaignStep
          stepId="world.rumors"
          label="Resolve any Rumors"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <RumorsStep
            rumors={rumors}
            quests={quests}
            currentTurn={currentTurn}
            onPatchTurn={patchCurrentTurn}
          />
        </CampaignStep>

        <CampaignStep
          stepId="world.chooseBattle"
          label="Choose Your Battle"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <ChooseBattleStep
            rivals={rivals}
            quests={quests}
            patrons={patrons}
            currentTurn={currentTurn}
            onPatchTurn={patchCurrentTurn}
          />
        </CampaignStep>

        <CampaignStep
          stepId="battle.readyForBattle"
          label="Ready for Tabletop Battle"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <ReadyForBattleStep currentTurn={currentTurn} />
        </CampaignStep>
      </AccordionSection>

      {activeLookupTableId && (
        <LookupTableModal
          tableId={activeLookupTableId}
          applyLabel="Apply"
          applyTargets={lookupApplyTargets}
          onApply={applyLookupResult}
          onClose={closeLookupTable}
        />
      )}
    </div>
  );
}