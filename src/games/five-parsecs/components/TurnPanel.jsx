import React, { useMemo, useState } from "react";

import AccordionSection from "./AccordionSection";

import { CompactField } from "./CompactField";

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
];

const TURN_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
];

function getTimeValue(record) {
  if (!record?.createdAt) return 0;

  if (typeof record.createdAt === "string") {
    return new Date(record.createdAt).getTime() || 0;
  }

  if (record.createdAt?.seconds) {
    return record.createdAt.seconds * 1000;
  }

  return 0;
}

function cloneSteps(steps) {
  return (steps || []).map((step) => ({
    ...step,
    tasks: (step.tasks || []).map((task) => ({
      ...task,
    })),
  }));
}

function getStepProgress(step) {
  const tasks = step.tasks || [];

  if (tasks.length === 0) {
    return step.status === "done" ? "1/1" : "0/1";
  }

  const completeCount = tasks.filter(
    (task) => task.status === "done" || task.status === "skipped"
  ).length;

  return `${completeCount}/${tasks.length}`;
}

function getTurnProgress(turn) {
  const steps = turn?.steps || [];
  const tasks = steps.flatMap((step) => step.tasks || []);

  if (tasks.length === 0) {
    return "0/0";
  }

  const completeCount = tasks.filter(
    (task) => task.status === "done" || task.status === "skipped"
  ).length;

  return `${completeCount}/${tasks.length}`;
}

function getLatestTurn(campaignTurns) {
  if (!campaignTurns.length) return null;

  return [...campaignTurns].sort((a, b) => {
    const turnDiff = Number(b.turnNumber || 0) - Number(a.turnNumber || 0);

    if (turnDiff !== 0) return turnDiff;

    return getTimeValue(b) - getTimeValue(a);
  })[0];
}

function parsePageNumber(pageReference) {
  const text = String(pageReference || "");
  const match = text.match(/(\d+)/);

  if (!match) return 1;

  return Math.max(1, Number(match[1]));
}

export default function TurnPanel({
  campaignTurns,
  crew,
  onAddTurn,
  onUpdate,
  onDelete,
  onAddLog,
  onOpenRulesPage,
}) {
  const [selectedTurnId, setSelectedTurnId] = useState("");

  const sortedTurns = useMemo(() => {
    return [...campaignTurns].sort((a, b) => {
      const turnDiff = Number(b.turnNumber || 0) - Number(a.turnNumber || 0);

      if (turnDiff !== 0) return turnDiff;

      return getTimeValue(b) - getTimeValue(a);
    });
  }, [campaignTurns]);

  const activeTurn = useMemo(() => {
    if (selectedTurnId) {
      const selected = campaignTurns.find(
        (turn) => turn.campaignTurnId === selectedTurnId
      );

      if (selected) return selected;
    }

    return getLatestTurn(campaignTurns);
  }, [campaignTurns, selectedTurnId]);

  const turnOptions = sortedTurns.map((turn) => ({
    value: turn.campaignTurnId,
    label: `Turn ${turn.turnNumber || "?"} — ${turn.status || "active"}`,
  }));

  function updateTurn(patch) {
    if (!activeTurn) return;

    onUpdate("campaignTurns", activeTurn.campaignTurnId, patch);
  }

  function updateStep(stepIndex, patch) {
    if (!activeTurn) return;

    const steps = cloneSteps(activeTurn.steps);

    steps[stepIndex] = {
      ...steps[stepIndex],
      ...patch,
    };

    updateTurn({ steps });
  }

  function updateTask(stepIndex, taskIndex, patch) {
    if (!activeTurn) return;

    const steps = cloneSteps(activeTurn.steps);

    steps[stepIndex].tasks[taskIndex] = {
      ...steps[stepIndex].tasks[taskIndex],
      ...patch,
    };

    updateTurn({ steps });
  }

  function markStepDone(stepIndex) {
    if (!activeTurn) return;

    const steps = cloneSteps(activeTurn.steps);

    steps[stepIndex] = {
      ...steps[stepIndex],
      status: "done",
      tasks: (steps[stepIndex].tasks || []).map((task) => ({
        ...task,
        status: task.status === "skipped" ? "skipped" : "done",
      })),
    };

    updateTurn({ steps });
  }

  function markStepActive(stepIndex) {
    updateStep(stepIndex, { status: "active" });
  }

  function completeTurn() {
    updateTurn({ status: "complete" });
  }

  function openStepRules(step) {
    const page = parsePageNumber(step.pageReference);

    if (onOpenRulesPage) {
      onOpenRulesPage(page);
    }
  }

  if (!crew) {
    return (
      <div className="fp-panel">
        <div className="fp-muted">
          Create an adventure before starting campaign turns.
        </div>
      </div>
    );
  }

  return (
    <div className="fp-panel">
      <div className="fp-toolbar">
        <button className="fp-btn fp-primary" onClick={onAddTurn}>
          Start New Turn
        </button>
      </div>

      {campaignTurns.length === 0 ? (
        <div className="fp-muted">
          No campaign turns yet. Start a new turn to create the checklist.
        </div>
      ) : (
        <>
          <div className="fp-grid">
            <CompactField
              label="Selected Turn"
              value={activeTurn?.campaignTurnId || ""}
              options={turnOptions}
              onChange={setSelectedTurnId}
            />

            <CompactField
              label="Turn Number"
              type="number"
              value={activeTurn?.turnNumber || 1}
              onChange={(v) => updateTurn({ turnNumber: v })}
            />

            <CompactField
              label="Status"
              value={activeTurn?.status || "active"}
              options={TURN_STATUS_OPTIONS}
              onChange={(v) => updateTurn({ status: v })}
            />

            <CompactField
              label="Turn Notes"
              value={activeTurn?.notes || ""}
              textarea
              onChange={(v) => updateTurn({ notes: v })}
            />
          </div>

          <div className="fp-turn-summary">
            Campaign Turn {activeTurn?.turnNumber || "?"} · Progress{" "}
            {getTurnProgress(activeTurn)} · {activeTurn?.status || "active"}
          </div>

          <div className="fp-actions">
            <button
              className="fp-btn"
              onClick={() => onAddLog(activeTurn.campaignTurnId)}
            >
              Log Note
            </button>

            <button className="fp-btn" onClick={completeTurn}>
              Complete Turn
            </button>

            <button
              className="fp-btn fp-danger"
              onClick={() =>
                onDelete("campaignTurns", activeTurn.campaignTurnId)
              }
            >
              Delete Turn
            </button>
          </div>

          {(activeTurn?.steps || []).map((step, stepIndex) => (
            <AccordionSection
              key={`${activeTurn.campaignTurnId}-${step.stepOrder}`}
              title={`${step.stepName} — ${step.pageReference}`}
              subtitle={`${step.status || "not_started"} · ${getStepProgress(
                step
              )}`}
              defaultOpen={step.status === "active"}
              actions={
                <>
                  <button
                    className="fp-btn"
                    onClick={() => openStepRules(step)}
                  >
                    Rules
                  </button>

                  <button
                    className="fp-btn"
                    onClick={() => markStepDone(stepIndex)}
                  >
                    Done
                  </button>
                </>
              }
            >
              <div className="fp-grid">
                <CompactField
                  label="Step Status"
                  value={step.status || "not_started"}
                  options={STATUS_OPTIONS}
                  onChange={(v) => updateStep(stepIndex, { status: v })}
                />

                <CompactField
                  label="Page"
                  value={step.pageReference || ""}
                  onChange={(v) =>
                    updateStep(stepIndex, { pageReference: v })
                  }
                />

                <CompactField
                  label="Step Notes"
                  value={step.notes || ""}
                  textarea
                  onChange={(v) => updateStep(stepIndex, { notes: v })}
                />
              </div>

              <div className="fp-actions">
                <button
                  className="fp-btn fp-primary"
                  onClick={() => openStepRules(step)}
                >
                  Open Rules Page {parsePageNumber(step.pageReference)}
                </button>
              </div>

              <div className="fp-turn-task-list">
                {(step.tasks || []).map((task, taskIndex) => (
                  <div
                    key={`${step.stepOrder}-${task.taskOrder}`}
                    className="fp-turn-task"
                  >
                    <label className="fp-turn-task-check">
                      <input
                        type="checkbox"
                        checked={task.status === "done"}
                        onChange={(e) =>
                          updateTask(stepIndex, taskIndex, {
                            status: e.target.checked ? "done" : "not_started",
                          })
                        }
                      />

                      <span>
                        {task.taskName}
                        {task.condition ? (
                          <em> — {task.condition}</em>
                        ) : null}
                      </span>
                    </label>

                    <div className="fp-turn-task-controls">
                      <select
                        value={task.status || "not_started"}
                        onChange={(e) =>
                          updateTask(stepIndex, taskIndex, {
                            status: e.target.value,
                          })
                        }
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      value={task.notes || ""}
                      placeholder="Task notes"
                      rows={2}
                      onChange={(e) =>
                        updateTask(stepIndex, taskIndex, {
                          notes: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="fp-actions">
                <button
                  className="fp-btn"
                  onClick={() => markStepActive(stepIndex)}
                >
                  Mark Active
                </button>

                <button
                  className="fp-btn"
                  onClick={() => markStepDone(stepIndex)}
                >
                  Mark Step Done
                </button>
              </div>
            </AccordionSection>
          ))}
        </>
      )}
    </div>
  );
}