import React, { useState } from "react";

import { ResultCard, SimpleField, StepRulesText } from "../CampaignStep";
import { numberValue, resolveRumors } from "../campaignStepUtils";
import { createTodoFromStepResult } from "../campaignTodoUtils";
import { rollD6 } from "../../../data/campaignTables";

export default function RumorsStep({ rumors, quests, currentTurn, onPatchTurn, onAddTodo }) {
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

    const nextResult = resolveRumors({
      d6Roll: nextRoll,
      rumorCount: rumors.length,
      hasActiveQuest: quests.length > 0,
    });

    if (onPatchTurn) {
      await onPatchTurn({
        rumorRoll: nextRoll,
        rumorResult: nextResult,
      });
    }

    if (nextResult.questReceived && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "world.rumors",
          sourceStepLabel: "Resolve any Rumors",
          title: nextResult.title,
          taskText:
            "Remove all Rumors from the roster and create a new Quest. Future Rumors become Quest Rumors until this Quest is resolved.",
          relatedTargetType: "quest",
          relatedTargetLabel: "New Quest",
        })
      );
    }
  }

  async function saveRumorResult() {
    if (!onPatchTurn) return;

    await onPatchTurn({
      rumorRoll: rumorRoll === "" ? "" : numberValue(rumorRoll),
      rumorResult: result,
    });

    if (result?.questReceived && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "world.rumors",
          sourceStepLabel: "Resolve any Rumors",
          title: result.title,
          taskText:
            "Remove all Rumors from the roster and create a new Quest. Future Rumors become Quest Rumors until this Quest is resolved.",
          relatedTargetType: "quest",
          relatedTargetLabel: "New Quest",
        })
      );
    }
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
        <SimpleField label="D6 Roll" value={rumorRoll} onChange={setRumorRoll} type="number" min="1" />

        <button className="fp-btn" onClick={rollRumors}>Roll Rumors</button>

        <button className="fp-btn" onClick={saveRumorResult} disabled={!result}>
          Save Result
        </button>
      </div>

      <div className="fp-muted" style={{ marginTop: "8px" }}>
        Rumors: {rumors.length}. Active Quests: {quests.length}.
      </div>

      {result && <ResultCard title={result.title} description={result.description} />}
    </div>
  );
}
