import React from "react";

import { StepRulesText } from "../CampaignStep";

export default function AssignEquipmentStep() {
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
