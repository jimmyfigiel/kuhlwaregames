import { useMemo, useState } from "react";
import "./view.css";

function NumberInputModal({ command, onSubmit }) {
  const [value, setValue] = useState(command.defaultValue ?? 0);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <div className="fp-modal-backdrop">
      <form className="fp-modal-card" role="dialog" aria-modal="true" onSubmit={handleSubmit}>
        <h2>{command.title}</h2>
        <p>{command.prompt}</p>

        {command.errorMessage && (
          <p className="fp-error-message">{command.errorMessage}</p>
        )}

        <label className="fp-input-label" htmlFor={`number-input-${command.id}`}>
          Number
        </label>
        <input
          id={`number-input-${command.id}`}
          className="fp-number-input"
          type="number"
          value={value}
          min={command.min ?? undefined}
          max={command.max ?? undefined}
          onChange={(event) => setValue(event.target.value)}
          autoFocus
        />

        <button className="fp-primary-button" type="submit">
          {command.buttonText || "OK"}
        </button>
      </form>
    </div>
  );
}


function QueueManager({ gameState, submitAction }) {
  const commandQueue = Array.isArray(gameState.commandQueue)
    ? gameState.commandQueue
    : [];

  const activeCommand = gameState.activeCommand || null;
  const currentPendingCommand = commandQueue[0] || null;
  const stepsRemaining = commandQueue.length;

  function handleExecute() {
    submitAction({
      type: "EXECUTE_QUEUE",
      stateSnapshot: gameState,
    });
  }

  function resolveActiveCommand(input = {}) {
    submitAction({
      type: "RESOLVE_ACTIVE_COMMAND",
      stateSnapshot: gameState,
      input,
    });
  }

  function handlePopupOk() {
    resolveActiveCommand();
  }

  function handleNumberSubmit(value) {
    resolveActiveCommand({ value });
  }

  const buttonDisabled = Boolean(activeCommand) || stepsRemaining === 0;

  return (
    <section className="fp-queue-manager">
      <div className="fp-queue-header">
        <div>
          <div className="fp-eyebrow">Queue Manager</div>
          <h2 className="fp-queue-title">
            {activeCommand
              ? activeCommand.title
              : currentPendingCommand
                ? currentPendingCommand.title
                : "No Pending Commands"}
          </h2>
        </div>

        <div className="fp-step-count">
          <span className="fp-step-number">{stepsRemaining}</span>
          <span className="fp-step-label">
            {stepsRemaining === 1 ? "step" : "steps"} left
          </span>
        </div>
      </div>

      <div className="fp-current-command">
        {activeCommand ? (
          <p>
            Active command: <strong>{activeCommand.type}</strong>
          </p>
        ) : currentPendingCommand ? (
          <p>
            Next command: <strong>{currentPendingCommand.type}</strong>
          </p>
        ) : (
          <p>The command queue is empty.</p>
        )}

        <button
          className="fp-primary-button"
          onClick={handleExecute}
          disabled={buttonDisabled}
        >
          Execute
        </button>
      </div>

      <div className="fp-debug-line">
        Pending: {stepsRemaining} · Active: {activeCommand ? "yes" : "no"} · Status:{" "}
        {gameState.queueStatus || "idle"}
      </div>

      {activeCommand && activeCommand.type === "popupMessage" && (
        <div className="fp-modal-backdrop">
          <div className="fp-modal-card" role="dialog" aria-modal="true">
            <h2>{activeCommand.title}</h2>
            <p>{activeCommand.message}</p>

            <button className="fp-primary-button" onClick={handlePopupOk}>
              {activeCommand.buttonText || "OK"}
            </button>
          </div>
        </div>
      )}

      {activeCommand && activeCommand.type === "numberInput" && (
        <NumberInputModal
          command={activeCommand}
          onSubmit={handleNumberSubmit}
        />
      )}
    </section>
  );
}

function AccordionSection({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="fp-accordion-section">
      <button
        className="fp-accordion-header"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <span className="fp-accordion-indicator">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && <div className="fp-accordion-body">{children}</div>}
    </section>
  );
}

function EmptyValue({ children }) {
  return <span className="fp-empty-value">{children || "Not set"}</span>;
}

function FieldRow({ label, value }) {
  return (
    <div className="fp-field-row">
      <span className="fp-field-label">{label}</span>
      <span className="fp-field-value">
        {value || value === 0 ? value : <EmptyValue />}
      </span>
    </div>
  );
}

function CrewLogSheet({ crewLog }) {
  const members = Array.isArray(crewLog.crewMembers)
    ? crewLog.crewMembers
    : [];

  return (
    <AccordionSection title="Crew Log" defaultOpen>
      <FieldRow label="Crew Name" value={crewLog.crewName} />
      <FieldRow label="Starting Crew Members" value={crewLog.startingCrewCount} />
      <FieldRow label="Credits" value={crewLog.credits} />
      <FieldRow label="Ship" value={crewLog.ship} />

      <div className="fp-subsection">
        <h3>Crew Members</h3>

        {members.length > 0 ? (
          <ul className="fp-simple-list">
            {members.map((member) => (
              <li key={member.id || member.name}>{member.name}</li>
            ))}
          </ul>
        ) : (
          <p className="fp-muted">No crew members yet.</p>
        )}
      </div>

      <div className="fp-subsection">
        <h3>Notes</h3>
        <p>{crewLog.notes || <EmptyValue />}</p>
      </div>
    </AccordionSection>
  );
}

function EncounterLogSheet({ encounterLog }) {
  return (
    <AccordionSection title="Encounter Log">
      <FieldRow label="Patron" value={encounterLog.patron} />
      <FieldRow label="Rival" value={encounterLog.rival} />
      <FieldRow label="Objective" value={encounterLog.objective} />
      <FieldRow label="Enemy" value={encounterLog.enemy} />
      <FieldRow label="Result" value={encounterLog.result} />

      <div className="fp-subsection">
        <h3>Notes</h3>
        <p>{encounterLog.notes || <EmptyValue />}</p>
      </div>
    </AccordionSection>
  );
}

function WorldLogSheet({ worldLog }) {
  const traits = Array.isArray(worldLog.worldTraits)
    ? worldLog.worldTraits
    : [];

  return (
    <AccordionSection title="World Log">
      <FieldRow label="Current World" value={worldLog.currentWorld} />
      <FieldRow label="License" value={worldLog.license} />
      <FieldRow label="Invasion" value={worldLog.invasion} />

      <div className="fp-subsection">
        <h3>World Traits</h3>

        {traits.length > 0 ? (
          <ul className="fp-simple-list">
            {traits.map((trait) => (
              <li key={trait}>{trait}</li>
            ))}
          </ul>
        ) : (
          <p className="fp-muted">No world traits yet.</p>
        )}
      </div>

      <div className="fp-subsection">
        <h3>Notes</h3>
        <p>{worldLog.notes || <EmptyValue />}</p>
      </div>
    </AccordionSection>
  );
}

export default function FiveParsecsProcedureView({ gameState, submitAction }) {
  const safeGameState = useMemo(() => {
    return {
      gameTitle: gameState?.gameTitle || "Five Parsecs Procedure Engine",
      hasInitializedCommandQueue:
        gameState?.hasInitializedCommandQueue === true,
      queueStatus: gameState?.queueStatus || "idle",
      activeCommand: gameState?.activeCommand || null,
      commandQueue: Array.isArray(gameState?.commandQueue)
        ? gameState.commandQueue
        : [],
      crewLog: gameState?.crewLog || {},
      encounterLog: gameState?.encounterLog || {},
      worldLog: gameState?.worldLog || {},
      logEntries: Array.isArray(gameState?.logEntries)
        ? gameState.logEntries
        : [],
    };
  }, [gameState]);

  return (
    <main className="fp-game-dashboard">
      <QueueManager gameState={safeGameState} submitAction={submitAction} />

      <section className="fp-record-sheets">
        <CrewLogSheet crewLog={safeGameState.crewLog} />
        <EncounterLogSheet encounterLog={safeGameState.encounterLog} />
        <WorldLogSheet worldLog={safeGameState.worldLog} />
      </section>
    </main>
  );
}
