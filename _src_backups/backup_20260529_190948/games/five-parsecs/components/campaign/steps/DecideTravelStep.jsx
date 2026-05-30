import React, { useState } from "react";

import { ResultCard, SimpleField, SimpleSelect, StepRulesText } from "../CampaignStep";
import { getCrewCredits, numberValue } from "../campaignStepUtils";

export default function DecideTravelStep({ crew, currentTurn, onSaveCrew, onPatchTurn }) {
  const [travelChoice, setTravelChoice] = useState(currentTurn?.travelChoice || "stay");
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
        description={`Crew credits: ${credits}. Travel cost: ${numberValue(fuelCost)}.`}
      />
    </div>
  );
}
