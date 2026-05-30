import React, { useMemo, useState } from "react";

import AccordionSection from "./AccordionSection";
import LookupTableModal from "./LookupTableModal";
import CampaignStep from "./campaign/CampaignStep";
import CampaignTodosPanel from "./campaign/CampaignTodosPanel";
import { createLookupApplyTargets } from "../data/lookupApplyTargets";
import {
  appendLookupResult,
  appendText,
  createLookupResultRecord,
  formatLookupResultNote,
  getLatestCampaignTurn,
  getNextIncompleteStepId,
  getRecordId,
} from "./campaign/campaignStepUtils";
import {
  appendTodo,
  completeTodo,
  createTodoFromLookupResult,
  deleteTodo,
} from "./campaign/campaignTodoUtils";

import FleeInvasionStep from "./campaign/steps/FleeInvasionStep";
import DecideTravelStep from "./campaign/steps/DecideTravelStep";
import StarshipTravelStep from "./campaign/steps/StarshipTravelStep";
import NewWorldArrivalStep from "./campaign/steps/NewWorldArrivalStep";
import UpkeepShipRepairsStep from "./campaign/steps/UpkeepShipRepairsStep";
import CrewTasksStep from "./campaign/steps/CrewTasksStep";
import JobOffersStep from "./campaign/steps/JobOffersStep";
import AssignEquipmentStep from "./campaign/steps/AssignEquipmentStep";
import RumorsStep from "./campaign/steps/RumorsStep";
import ChooseBattleStep from "./campaign/steps/ChooseBattleStep";
import ReadyForBattleStep from "./campaign/steps/ReadyForBattleStep";

export default function TurnPanel({
  campaignTurns = [],
  crew = null,
  crewMembers = [],
  equipment = [],
  worlds = [],
  patrons = [],
  rivals = [],
  quests = [],
  rumors = [],
  onSaveCrew,
  onAddTurn,
  onUpdate,
  onDelete,
  onAddLog,
  onOpenRulesPage,
}) {
  const currentTurn = getLatestCampaignTurn(campaignTurns);
  const currentTurnId = getRecordId(currentTurn);
  const progress = currentTurn?.progress || {};

  const [activeStepId, setActiveStepId] = useState(() => {
    return getNextIncompleteStepId(progress);
  });

  const [activeLookupTableId, setActiveLookupTableId] = useState("");
  const [message, setMessage] = useState("");

  const lookupApplyTargets = useMemo(() => {
    return createLookupApplyTargets({
      tableId: activeLookupTableId,
      crew,
      crewMembers,
      worlds,
      patrons,
      campaignTurns,
    });
  }, [activeLookupTableId, crew, crewMembers, worlds, patrons, campaignTurns]);

  async function patchCurrentTurn(patch) {
    if (!currentTurn || !currentTurnId || !onUpdate) return;
    await onUpdate("campaignTurns", currentTurnId, patch);
  }

  async function toggleProgress(stepId, checked) {
    if (!currentTurn || !currentTurnId || !onUpdate) return;

    const nextProgress = {
      ...(currentTurn.progress || {}),
      [stepId]: checked,
    };

    await onUpdate("campaignTurns", currentTurnId, {
      progress: nextProgress,
    });

    if (checked) {
      const nextStepId = getNextIncompleteStepId(nextProgress, stepId);
      setActiveStepId(nextStepId);
    } else {
      setActiveStepId(stepId);
    }
  }

  async function addCampaignTodo(todo) {
    if (!currentTurn || !currentTurnId || !onUpdate || !todo?.taskText) return;

    await onUpdate("campaignTurns", currentTurnId, {
      todos: appendTodo(currentTurn.todos, todo),
    });
  }

  async function completeCampaignTodo(todoId) {
    if (!currentTurn || !currentTurnId || !onUpdate) return;

    await onUpdate("campaignTurns", currentTurnId, {
      todos: completeTodo(currentTurn.todos, todoId),
    });
  }

  async function deleteCampaignTodo(todoId) {
    if (!currentTurn || !currentTurnId || !onUpdate) return;

    await onUpdate("campaignTurns", currentTurnId, {
      todos: deleteTodo(currentTurn.todos, todoId),
    });
  }

  async function deleteCurrentCampaignTurn() {
    if (!currentTurn || !currentTurnId || !onDelete) return;

    const confirmed = window.confirm(
      `Delete Campaign Turn ${
        currentTurn.turnNumber || ""
      }? This cannot be undone.`
    );

    if (!confirmed) return;

    await onDelete("campaignTurns", currentTurnId);
    setMessage("Campaign turn deleted.");
  }

  function openLookupTable(tableId) {
    setActiveLookupTableId(tableId);
  }

  function closeLookupTable() {
    setActiveLookupTableId("");
  }

  async function applyLookupResult({ table, row, roll, applyTo }) {
    const targetType = applyTo?.targetType || "crewNotes";
    const recordId = applyTo?.recordId || "";
    const rawTarget = applyTo?.raw || null;

    const lookupResult = createLookupResultRecord({ table, row, roll });
    const note = formatLookupResultNote({ table, row, roll });
    const todo = createTodoFromLookupResult({ table, row, roll, applyTo });
    const shouldCreateTodo = table?.id !== "worldTraits";

    if (targetType === "world" && onUpdate && recordId) {
      const existingTraits = Array.isArray(rawTarget?.traits)
        ? rawTarget.traits
        : [];

      await onUpdate("worlds", recordId, {
        traits: [
          ...existingTraits,
          {
            source: table.id,
            sourceLabel: table.label || table.title,
            roll,
            title: row.title,
            description: row.description,
          },
        ],
        worldTrait: row.title,
        worldTraitRoll: roll,
        worldTraitDescription: row.description,
        notes: appendText(rawTarget?.notes || "", note),
        lookupResults: appendLookupResult(rawTarget?.lookupResults, lookupResult),
      });

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (targetType === "campaignTurn" && onUpdate && recordId) {
      await onUpdate("campaignTurns", recordId, {
        notes: appendText(rawTarget?.notes || "", note),
        lookupResults: appendLookupResult(rawTarget?.lookupResults, lookupResult),
        todos: shouldCreateTodo
          ? appendTodo(rawTarget?.todos, todo)
          : rawTarget?.todos,
      });

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (targetType === "crewMember" && onUpdate && recordId) {
      await onUpdate("crewMembers", recordId, {
        notes: appendText(rawTarget?.notes || "", note),
        lookupResults: appendLookupResult(rawTarget?.lookupResults, lookupResult),
      });

      if (shouldCreateTodo) {
        await addCampaignTodo(todo);
      }

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (targetType === "patron" && onUpdate && recordId) {
      await onUpdate("patrons", recordId, {
        notes: appendText(rawTarget?.notes || "", note),
        jobLookupResults: appendLookupResult(rawTarget?.jobLookupResults, lookupResult),
      });

      if (shouldCreateTodo) {
        await addCampaignTodo(todo);
      }

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (targetType === "starship" && onSaveCrew && crew) {
      await onSaveCrew({
        ...crew,
        starship: {
          ...(crew.starship || {}),
          notes: appendText(crew.starship?.notes || "", note),
          travelEvents: appendLookupResult(crew.starship?.travelEvents, lookupResult),
        },
      });

      if (shouldCreateTodo) {
        await addCampaignTodo(todo);
      }

      setMessage(`${table.label || table.title}: applied ${row.title} to ${applyTo.label}.`);
      closeLookupTable();
      return;
    }

    if (onSaveCrew && crew) {
      await onSaveCrew({
        ...crew,
        notes: appendText(crew.notes || "", note),
        lookupResults: appendLookupResult(crew.lookupResults, lookupResult),
      });
    }

    if (shouldCreateTodo) {
      await addCampaignTodo(todo);
    }

    setMessage(`${table.label || table.title}: applied ${row.title} to Adventure Notes.`);
    closeLookupTable();
  }

  return (
    <div className="fp-panel">
      <AccordionSection title="Campaign Turn Controls" defaultOpen>
        <div className="fp-actions">
          <button className="fp-btn fp-primary" onClick={onAddTurn}>
            Start New Campaign Turn
          </button>

          <button
            className="fp-btn"
            onClick={deleteCurrentCampaignTurn}
            disabled={!currentTurn || !onDelete}
          >
            Delete Current Campaign Turn
          </button>

          {onAddLog && currentTurnId && (
            <button className="fp-btn" onClick={() => onAddLog(currentTurnId)}>
              Add Campaign Turn Log
            </button>
          )}

          {onOpenRulesPage && (
            <button className="fp-btn" onClick={() => onOpenRulesPage(69)}>
              Open Travel Rules
            </button>
          )}
        </div>

        {currentTurn ? (
          <div className="fp-muted" style={{ marginTop: "10px" }}>
            Current Campaign Turn: {currentTurn.turnNumber || "unnumbered"}
          </div>
        ) : (
          <div className="fp-muted" style={{ marginTop: "10px" }}>
            Start a campaign turn before marking steps complete. Completion
            checkboxes are saved on the current campaign turn.
          </div>
        )}

        {message && (
          <div className="fp-turn-summary" style={{ marginTop: "10px" }}>
            {message}
          </div>
        )}

        <CampaignTodosPanel
          currentTurn={currentTurn}
          onCompleteTodo={completeCampaignTodo}
          onDeleteTodo={deleteCampaignTodo}
        />
      </AccordionSection>

      <AccordionSection title="Campaign Steps" defaultOpen>
        <CampaignStep
          stepId="travel.fleeInvasion"
          label="Flee Invasion"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <FleeInvasionStep currentTurn={currentTurn} onPatchTurn={patchCurrentTurn} onAddTodo={addCampaignTodo} />
        </CampaignStep>

        <CampaignStep
          stepId="travel.decideWhetherToTravel"
          label="Decide Whether to Travel"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <DecideTravelStep
            crew={crew}
            currentTurn={currentTurn}
            onSaveCrew={onSaveCrew}
            onPatchTurn={patchCurrentTurn}
          />
        </CampaignStep>

        <CampaignStep
          stepId="travel.starshipTravelEvent"
          label="Starship Travel Event"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <StarshipTravelStep onOpenLookupTable={openLookupTable} />
        </CampaignStep>

        <CampaignStep
          stepId="travel.newWorldArrival"
          label="New World Arrival Steps"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <NewWorldArrivalStep
            crewMembers={crewMembers}
            worlds={worlds}
            currentTurn={currentTurn}
            onPatchTurn={patchCurrentTurn}
            onOpenLookupTable={openLookupTable}
            onAddTodo={addCampaignTodo}
          />
        </CampaignStep>

        <CampaignStep
          stepId="world.upkeepAndShipRepairs"
          label="Upkeep and Ship Repairs"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <UpkeepShipRepairsStep
            crew={crew}
            crewMembers={crewMembers}
            onSaveCrew={onSaveCrew}
          />
        </CampaignStep>

        <CampaignStep
          stepId="world.crewTasks"
          label="Assign and Resolve Crew Tasks"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <CrewTasksStep
            crew={crew}
            crewMembers={crewMembers}
            patrons={patrons}
            rivals={rivals}
            currentTurn={currentTurn}
            onPatchTurn={patchCurrentTurn}
            onOpenLookupTable={openLookupTable}
            onAddTodo={addCampaignTodo}
          />
        </CampaignStep>

        <CampaignStep
          stepId="world.jobOffers"
          label="Determine Job Offers"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <JobOffersStep onOpenLookupTable={openLookupTable} />
        </CampaignStep>

        <CampaignStep
          stepId="world.assignEquipment"
          label="Assign Equipment"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <AssignEquipmentStep equipment={equipment} />
        </CampaignStep>

        <CampaignStep
          stepId="world.rumors"
          label="Resolve any Rumors"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <RumorsStep
            rumors={rumors}
            quests={quests}
            currentTurn={currentTurn}
            onPatchTurn={patchCurrentTurn}
            onAddTodo={addCampaignTodo}
          />
        </CampaignStep>

        <CampaignStep
          stepId="world.chooseBattle"
          label="Choose Your Battle"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <ChooseBattleStep
            rivals={rivals}
            quests={quests}
            patrons={patrons}
            currentTurn={currentTurn}
            onPatchTurn={patchCurrentTurn}
            onAddTodo={addCampaignTodo}
          />
        </CampaignStep>

        <CampaignStep
          stepId="battle.readyForBattle"
          label="Ready for Tabletop Battle"
          currentTurn={currentTurn}
          progress={progress}
          activeStepId={activeStepId}
          onSetActiveStep={setActiveStepId}
          onToggleProgress={toggleProgress}
        >
          <ReadyForBattleStep currentTurn={currentTurn} />
        </CampaignStep>
      </AccordionSection>

      {activeLookupTableId && (
        <LookupTableModal
          tableId={activeLookupTableId}
          applyLabel="Apply"
          applyTargets={lookupApplyTargets}
          onApply={applyLookupResult}
          onClose={closeLookupTable}
        />
      )}
    </div>
  );
}
