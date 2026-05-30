import React, { useState } from "react";

import { ResultCard, SimpleField, StepRulesText } from "../CampaignStep";
import {
  getCrewCredits,
  numberValue,
  resolveFindPatron,
  resolveRecruit,
  resolveRepair,
  resolveTrack,
} from "../campaignStepUtils";
import { createTodoFromStepResult } from "../campaignTodoUtils";
import { CAMPAIGN_TASKS, rollD6 } from "../../../data/campaignTables";

export default function CrewTasksStep({
  crew,
  crewMembers,
  patrons,
  rivals,
  currentTurn,
  onPatchTurn,
  onOpenLookupTable,
  onAddTodo,
}) {
  const [taskCounts, setTaskCounts] = useState(
    currentTurn?.crewTaskCounts || {
      findPatron: 0,
      train: 0,
      trade: 0,
      recruit: 0,
      explore: 0,
      track: 0,
      repair: 0,
      decoy: 0,
    }
  );

  const [findPatronRoll, setFindPatronRoll] = useState(currentTurn?.findPatronRoll || "");
  const [findPatronCredits, setFindPatronCredits] = useState(currentTurn?.findPatronCredits || 0);
  const [recruitRoll, setRecruitRoll] = useState(currentTurn?.recruitRoll || "");
  const [trackRoll, setTrackRoll] = useState(currentTurn?.trackRoll || "");
  const [trackCredits, setTrackCredits] = useState(currentTurn?.trackCredits || 0);
  const [repairRoll, setRepairRoll] = useState(currentTurn?.repairRoll || "");
  const [repairSavvy, setRepairSavvy] = useState(currentTurn?.repairSavvy || 0);
  const [repairCredits, setRepairCredits] = useState(currentTurn?.repairCredits || 0);
  const [repairEngineer, setRepairEngineer] = useState(Boolean(currentTurn?.repairEngineer));

  function setTaskCount(taskId, value) {
    setTaskCounts((prev) => ({
      ...prev,
      [taskId]: Math.max(0, numberValue(value)),
    }));
  }

  const findPatronResult =
    findPatronRoll === ""
      ? null
      : resolveFindPatron({
          d6Roll: findPatronRoll,
          crewLooking: taskCounts.findPatron,
          existingPatrons: patrons.length,
          creditsSpent: findPatronCredits,
        });

  const recruitResult =
    recruitRoll === ""
      ? null
      : resolveRecruit({
          currentCrewSize: crewMembers.length,
          recruiters: taskCounts.recruit,
          d6Roll: recruitRoll,
        });

  const trackResult =
    trackRoll === ""
      ? null
      : resolveTrack({
          d6Roll: trackRoll,
          trackers: taskCounts.track,
          creditsSpent: trackCredits,
        });

  const repairResult =
    repairRoll === ""
      ? null
      : resolveRepair({
          d6Roll: repairRoll,
          savvy: repairSavvy,
          isEngineer: repairEngineer,
          creditsSpent: repairCredits,
        });

  async function saveTasks(extraPatch = {}) {
    if (!onPatchTurn) return;

    await onPatchTurn({
      crewTaskCounts: taskCounts,
      findPatronRoll: findPatronRoll === "" ? "" : numberValue(findPatronRoll),
      findPatronCredits: numberValue(findPatronCredits),
      findPatronResult,
      recruitRoll: recruitRoll === "" ? "" : numberValue(recruitRoll),
      recruitResult,
      trackRoll: trackRoll === "" ? "" : numberValue(trackRoll),
      trackCredits: numberValue(trackCredits),
      trackResult,
      repairRoll: repairRoll === "" ? "" : numberValue(repairRoll),
      repairSavvy: numberValue(repairSavvy),
      repairCredits: numberValue(repairCredits),
      repairEngineer,
      repairResult,
      ...extraPatch,
    });
  }

  async function rollFindPatron() {
    const nextRoll = rollD6();
    setFindPatronRoll(nextRoll);

    const nextResult = resolveFindPatron({
      d6Roll: nextRoll,
      crewLooking: taskCounts.findPatron,
      existingPatrons: patrons.length,
      creditsSpent: findPatronCredits,
    });

    await saveTasks({ findPatronRoll: nextRoll, findPatronResult: nextResult });
    await addTodoForTaskResult("findPatron", nextResult);
  }

  async function rollRecruit() {
    const nextRoll = rollD6();
    setRecruitRoll(nextRoll);

    const nextResult = resolveRecruit({
      currentCrewSize: crewMembers.length,
      recruiters: taskCounts.recruit,
      d6Roll: nextRoll,
    });

    await saveTasks({ recruitRoll: nextRoll, recruitResult: nextResult });
    await addTodoForTaskResult("recruit", nextResult);
  }

  async function rollTrack() {
    const nextRoll = rollD6();
    setTrackRoll(nextRoll);

    const nextResult = resolveTrack({
      d6Roll: nextRoll,
      trackers: taskCounts.track,
      creditsSpent: trackCredits,
    });

    await saveTasks({ trackRoll: nextRoll, trackResult: nextResult });
    await addTodoForTaskResult("track", nextResult);
  }

  async function rollRepair() {
    const nextRoll = rollD6();
    setRepairRoll(nextRoll);

    const nextResult = resolveRepair({
      d6Roll: nextRoll,
      savvy: repairSavvy,
      isEngineer: repairEngineer,
      creditsSpent: repairCredits,
    });

    await saveTasks({ repairRoll: nextRoll, repairResult: nextResult });
    await addTodoForTaskResult("repair", nextResult);
  }

  async function addTodoForTaskResult(taskId, result) {
    if (!result || !onAddTodo) return;

    if (taskId === "findPatron" && result.jobsFound > 0) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "world.crewTasks",
          sourceStepLabel: "Find a Patron",
          title: result.title,
          taskText:
            result.jobsFound === 2
              ? "Generate two Patron job offers and choose which job to accept."
              : "Generate one Patron job offer.",
          relatedTargetType: "patron",
          relatedTargetLabel: "Patron Jobs",
        })
      );
    }

    if (taskId === "recruit" && result.recruitsFound > 0) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "world.crewTasks",
          sourceStepLabel: "Recruit",
          title: result.title,
          taskText:
            "Create the new recruit using the random method. The recruit gets the basic profile for their type, a Handgun, and no random background table rolls.",
          relatedTargetType: "crewMember",
          relatedTargetLabel: "New Recruit",
        })
      );
    }

    if (taskId === "track" && result.success) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "world.crewTasks",
          sourceStepLabel: "Track Rival",
          title: result.title,
          taskText:
            "Choose the Rival you located. You may fight a battle against them this campaign turn.",
          relatedTargetType: "rival",
          relatedTargetLabel: "Tracked Rival",
        })
      );
    }

    if (taskId === "repair" && result.destroyed) {
      await onAddTodo(
        createTodoFromStepResult({
          sourceStepId: "world.crewTasks",
          sourceStepLabel: "Repair Your Kit",
          title: result.title,
          taskText:
            "Remove the failed item from damaged equipment because the repair roll was a natural 1.",
          relatedTargetType: "equipment",
          relatedTargetLabel: "Damaged Item",
        })
      );
    }
  }

  return (
    <div>
      <StepRulesText>
        <p>
          Each crew member that is not in Sick Bay can take one task. Up to two
          characters may be assigned to any one task.
        </p>
      </StepRulesText>

      <div className="fp-table-wrap">
        <table className="fp-compact-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Crew Assigned</th>
              <th>Lookup / Roll</th>
            </tr>
          </thead>

          <tbody>
            {CAMPAIGN_TASKS.map((task) => (
              <tr key={task.id}>
                <td>
                  <strong>{task.label}</strong>
                  <div className="fp-muted-inline">{task.description}</div>
                </td>

                <td>
                  <input
                    className="fp-input fp-input-small"
                    type="number"
                    min="0"
                    max="2"
                    value={taskCounts[task.id] || 0}
                    onChange={(event) => setTaskCount(task.id, event.target.value)}
                  />
                </td>

                <td>
                  {task.id === "trade" && (
                    <button
                      className="fp-btn fp-btn-compact"
                      onClick={() => onOpenLookupTable("tradeTable")}
                    >
                      Trade Table
                    </button>
                  )}

                  {task.id === "explore" && (
                    <button
                      className="fp-btn fp-btn-compact"
                      onClick={() => onOpenLookupTable("explorationTable")}
                    >
                      Exploration Table
                    </button>
                  )}

                  {task.id !== "trade" && task.id !== "explore" && (
                    <span className="fp-muted-inline">Use task controls below</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fp-actions">
        <button className="fp-btn" onClick={() => saveTasks()}>
          Save Task Assignments
        </button>
      </div>

      <div className="fp-inline-card">
        <strong>Find a Patron</strong>
        <div className="fp-actions">
          <SimpleField label="D6 Roll" value={findPatronRoll} onChange={setFindPatronRoll} type="number" min="1" />
          <SimpleField label="Credits Spent" value={findPatronCredits} onChange={setFindPatronCredits} type="number" min="0" />
          <button className="fp-btn" onClick={rollFindPatron}>Roll Find Patron</button>
        </div>
        {findPatronResult && (
          <ResultCard title={findPatronResult.title} description={findPatronResult.description}>
            <div className="fp-muted-inline">Total: {findPatronResult.total}</div>
          </ResultCard>
        )}
      </div>

      <div className="fp-inline-card">
        <strong>Recruit</strong>
        <div className="fp-actions">
          <SimpleField label="D6 Roll" value={recruitRoll} onChange={setRecruitRoll} type="number" min="1" />
          <button className="fp-btn" onClick={rollRecruit}>Roll Recruit</button>
        </div>
        {recruitResult && (
          <ResultCard title={recruitResult.title} description={recruitResult.description}>
            {recruitResult.total !== null && (
              <div className="fp-muted-inline">Total: {recruitResult.total}</div>
            )}
          </ResultCard>
        )}
      </div>

      <div className="fp-inline-card">
        <strong>Track Rival</strong>
        <div className="fp-actions">
          <SimpleField label="D6 Roll" value={trackRoll} onChange={setTrackRoll} type="number" min="1" />
          <SimpleField label="Credits Spent" value={trackCredits} onChange={setTrackCredits} type="number" min="0" />
          <button className="fp-btn" onClick={rollTrack}>Roll Track</button>
        </div>
        {trackResult && (
          <ResultCard title={trackResult.title} description={trackResult.description}>
            <div className="fp-muted-inline">Total: {trackResult.total}</div>
          </ResultCard>
        )}
      </div>

      <div className="fp-inline-card">
        <strong>Repair Your Kit</strong>
        <div className="fp-actions">
          <SimpleField label="D6 Roll" value={repairRoll} onChange={setRepairRoll} type="number" min="1" />
          <SimpleField label="Savvy" value={repairSavvy} onChange={setRepairSavvy} type="number" />
          <SimpleField label="Credits Spent" value={repairCredits} onChange={setRepairCredits} type="number" min="0" />
          <label className="fp-check-field">
            <input
              type="checkbox"
              checked={repairEngineer}
              onChange={(event) => setRepairEngineer(event.target.checked)}
            />
            Engineer +1
          </label>
          <button className="fp-btn" onClick={rollRepair}>Roll Repair</button>
        </div>
        {repairResult && (
          <ResultCard title={repairResult.title} description={repairResult.description}>
            <div className="fp-muted-inline">Total: {repairResult.total}</div>
          </ResultCard>
        )}
      </div>

      <div className="fp-muted" style={{ marginTop: "8px" }}>
        Rivals available: {rivals.length}. Existing Patrons: {patrons.length}.
        Crew credits: {getCrewCredits(crew)}.
      </div>
    </div>
  );
}
