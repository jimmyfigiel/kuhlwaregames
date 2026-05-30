import React, { useState } from "react";

import { ResultCard, SimpleField, StepRulesText } from "../CampaignStep";
import { numberValue, resolveFleeInvasion } from "../campaignStepUtils";
import { createTodoFromStepResult } from "../campaignTodoUtils";
import { rollDice } from "../../../data/campaignTables";

export default function FleeInvasionStep({ currentTurn, onPatchTurn, onAddTodo }) {
  const [roll, setRoll] = useState(currentTurn?.fleeInvasionRoll || "");

  const result =
    roll === "" || roll === null || roll === undefined
      ? null
      : resolveFleeInvasion({ roll });

  async function rollNow() {
    const nextRoll = rollDice(2, 6);
    setRoll(nextRoll);

    const nextResult = resolveFleeInvasion({ roll: nextRoll });

    if (onPatchTurn) {
      await onPatchTurn({
        fleeInvasionRoll: nextRoll,
        fleeInvasionResult: nextResult,
      });
    }

    if (!nextResult.success && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "travel.fleeInvasion",
          sourceStepLabel: "Flee Invasion",
          title: nextResult.title,
          taskText:
            "Fight an Invasion Battle. Before the battle, only Assign Equipment may be completed during the World step.",
        })
      );
    }
  }

  async function saveResult() {
    if (!onPatchTurn) return;

    await onPatchTurn({
      fleeInvasionRoll: numberValue(roll),
      fleeInvasionResult: result,
    });

    if (result && !result.success && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "travel.fleeInvasion",
          sourceStepLabel: "Flee Invasion",
          title: result.title,
          taskText:
            "Fight an Invasion Battle. Before the battle, only Assign Equipment may be completed during the World step.",
        })
      );
    }
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
