import React from "react";

import { StepRulesText } from "../CampaignStep";

export default function JobOffersStep({ onOpenLookupTable }) {
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
        <button className="fp-btn fp-primary" onClick={() => onOpenLookupTable("patronTable")}>
          Patron Table
        </button>
        <button className="fp-btn" onClick={() => onOpenLookupTable("dangerPayTable")}>
          Danger Pay Table
        </button>
        <button className="fp-btn" onClick={() => onOpenLookupTable("timeFrameTable")}>
          Time Frame Table
        </button>
        <button className="fp-btn" onClick={() => onOpenLookupTable("benefitsSubtable")}>
          Benefits Subtable
        </button>
        <button className="fp-btn" onClick={() => onOpenLookupTable("hazardsSubtable")}>
          Hazards Subtable
        </button>
        <button className="fp-btn" onClick={() => onOpenLookupTable("conditionsSubtable")}>
          Conditions Subtable
        </button>
      </div>
    </div>
  );
}
