import React from "react";

import { StepRulesText } from "../CampaignStep";

export default function StarshipTravelStep({ onOpenLookupTable }) {
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
