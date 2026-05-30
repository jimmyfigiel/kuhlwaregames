import React, { useState } from "react";

import { ResultCard, SimpleField, SimpleSelect, StepRulesText } from "../CampaignStep";
import { numberValue, resolveRivalAttack } from "../campaignStepUtils";
import { createTodoFromStepResult } from "../campaignTodoUtils";
import { rollD6 } from "../../../data/campaignTables";

export default function ChooseBattleStep({ rivals, quests, patrons, currentTurn, onPatchTurn, onAddTodo }) {
  const [rivalRoll, setRivalRoll] = useState(currentTurn?.rivalRoll || "");
  const [decoys, setDecoys] = useState(currentTurn?.decoys || 0);
  const [battleChoice, setBattleChoice] = useState(currentTurn?.battleChoice || "opportunity");

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

    const nextResult = resolveRivalAttack({
      d6Roll: nextRoll,
      rivalCount: rivals.length,
      decoys,
    });

    if (onPatchTurn) {
      await onPatchTurn({
        rivalRoll: nextRoll,
        decoys: numberValue(decoys),
        rivalResult: nextResult,
      });
    }

    if (nextResult.attacked && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "world.chooseBattle",
          sourceStepLabel: "Choose Your Battle",
          title: nextResult.title,
          taskText:
            "Randomly select which Rival attacks. This battle replaces whatever job you intended to do this campaign turn.",
          relatedTargetType: "rival",
          relatedTargetLabel: "Random Rival",
        })
      );
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

    if (rivalResult?.attacked && onAddTodo) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "world.chooseBattle",
          sourceStepLabel: "Choose Your Battle",
          title: rivalResult.title,
          taskText:
            "Randomly select which Rival attacks. This battle replaces whatever job you intended to do this campaign turn.",
          relatedTargetType: "rival",
          relatedTargetLabel: "Random Rival",
        })
      );
    }
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
        <SimpleField label="Rival Check D6" value={rivalRoll} onChange={setRivalRoll} type="number" min="1" />
        <SimpleField label="Decoys" value={decoys} onChange={setDecoys} type="number" min="0" />
        <button className="fp-btn" onClick={rollRivals}>Roll Rival Check</button>
      </div>

      {rivalResult && <ResultCard title={rivalResult.title} description={rivalResult.description} />}

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
        Rivals: {rivals.length}. Quests: {quests.length}. Patrons: {patrons.length}.
      </div>
    </div>
  );
}
