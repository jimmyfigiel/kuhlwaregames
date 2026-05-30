import React from "react";

import { ResultCard, StepRulesText } from "../CampaignStep";

export default function ReadyForBattleStep({ currentTurn }) {
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
