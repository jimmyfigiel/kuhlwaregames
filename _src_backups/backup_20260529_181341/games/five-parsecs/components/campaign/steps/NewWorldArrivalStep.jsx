import React, { useState } from "react";

import { ResultCard, SimpleField, StepRulesText } from "../CampaignStep";
import {
  numberValue,
  resolveForgedLicense,
  resolveLicensingRoll,
} from "../campaignStepUtils";
import { createTodoFromStepResult } from "../campaignTodoUtils";
import { rollD6 } from "../../../data/campaignTables";

export default function NewWorldArrivalStep({
  crewMembers,
  worlds,
  currentTurn,
  onPatchTurn,
  onOpenLookupTable,
  onAddTodo,
}) {
  const [licenseRoll, setLicenseRoll] = useState(currentTurn?.licenseRoll || "");
  const [licenseCostRoll, setLicenseCostRoll] = useState(
    currentTurn?.licenseCostRoll || ""
  );
  const [forgeryRoll, setForgeryRoll] = useState(currentTurn?.forgeryRoll || "");
  const [forgerySavvy, setForgerySavvy] = useState(currentTurn?.forgerySavvy || 0);

  const licensingResult =
    licenseRoll === "" ? null : resolveLicensingRoll({ roll: licenseRoll });

  const forgeryResult =
    forgeryRoll === ""
      ? null
      : resolveForgedLicense({ roll: forgeryRoll, savvy: forgerySavvy });

  async function rollLicenseRequirement() {
    const nextRoll = rollD6();
    setLicenseRoll(nextRoll);

    const nextResult = resolveLicensingRoll({ roll: nextRoll });

    if (onPatchTurn) {
      await onPatchTurn({
        licenseRoll: nextRoll,
        licenseResult: nextResult,
      });
    }

    if (nextResult.required && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "travel.newWorldArrival",
          sourceStepLabel: "New World Arrival Steps",
          title: nextResult.title,
          taskText:
            "This world requires a Freelancer License for Patron jobs. Roll the license cost, pay it, or attempt one forged License roll.",
          relatedTargetType: "world",
          relatedTargetLabel: "Current World",
        })
      );
    }
  }

  async function rollLicenseCost() {
    const nextRoll = rollD6();
    setLicenseCostRoll(nextRoll);

    if (onPatchTurn) {
      await onPatchTurn({ licenseCostRoll: nextRoll });
    }
  }

  async function rollForgery() {
    const nextRoll = rollD6();
    setForgeryRoll(nextRoll);

    const nextResult = resolveForgedLicense({ roll: nextRoll, savvy: forgerySavvy });

    if (onPatchTurn) {
      await onPatchTurn({
        forgeryRoll: nextRoll,
        forgerySavvy: numberValue(forgerySavvy),
        forgeryResult: nextResult,
      });
    }

    if (nextResult.rival && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "travel.newWorldArrival",
          sourceStepLabel: "New World Arrival Steps",
          title: nextResult.title,
          taskText:
            "Add a Rival on this world because the forged License attempt rolled a natural 1.",
          relatedTargetType: "world",
          relatedTargetLabel: "Current World",
        })
      );
    }
  }

  async function saveArrivalDetails() {
    if (!onPatchTurn) return;

    await onPatchTurn({
      licenseRoll: licenseRoll === "" ? "" : numberValue(licenseRoll),
      licenseCostRoll: licenseCostRoll === "" ? "" : numberValue(licenseCostRoll),
      forgeryRoll: forgeryRoll === "" ? "" : numberValue(forgeryRoll),
      forgerySavvy: numberValue(forgerySavvy),
      licenseResult: licensingResult,
      forgeryResult,
    });

    if (licensingResult?.required && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "travel.newWorldArrival",
          sourceStepLabel: "New World Arrival Steps",
          title: licensingResult.title,
          taskText:
            "Resolve this world's Freelancer License requirement before taking Patron jobs.",
          relatedTargetType: "world",
          relatedTargetLabel: "Current World",
        })
      );
    }

    if (forgeryResult?.rival && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "travel.newWorldArrival",
          sourceStepLabel: "New World Arrival Steps",
          title: forgeryResult.title,
          taskText:
            "Add a Rival on this world because the forged License attempt rolled a natural 1.",
          relatedTargetType: "world",
          relatedTargetLabel: "Current World",
        })
      );
    }
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
          <ResultCard title={forgeryResult.title} description={forgeryResult.description}>
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
