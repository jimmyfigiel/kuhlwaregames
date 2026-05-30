import React, { useState } from "react";

import { SimpleField, StepRulesText } from "../CampaignStep";
import {
  getCrewCredits,
  getCrewDebt,
  getCrewHullDamage,
  getHullDamageField,
  numberValue,
} from "../campaignStepUtils";

export default function UpkeepShipRepairsStep({ crew, crewMembers, onSaveCrew }) {
  const [upkeepPaid, setUpkeepPaid] = useState(1);
  const [shipPayment, setShipPayment] = useState(0);
  const [repairSpend, setRepairSpend] = useState(0);

  const activeCrewCount = crewMembers.filter((member) => !member.inSickBay).length;

  const baseUpkeep =
    activeCrewCount <= 0 ? 0 : activeCrewCount <= 6 ? 1 : 1 + (activeCrewCount - 6);

  const credits = getCrewCredits(crew);
  const debt = getCrewDebt(crew);
  const hullDamage = getCrewHullDamage(crew);
  const hullDamageField = getHullDamageField(crew);

  async function saveCrewPatch(patch) {
    if (!crew || !onSaveCrew) return;
    await onSaveCrew({ ...crew, ...patch });
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
