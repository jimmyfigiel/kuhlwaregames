import { useMemo, useState } from "react";
import "./view.css";

function QueueManager({ gameState, submitAction }) {
  const commandQueue = Array.isArray(gameState.commandQueue)
    ? gameState.commandQueue
    : [];

  const currentCommand = commandQueue[0];
  const stepsRemaining = commandQueue.length;

  const [activePopupCommand, setActivePopupCommand] = useState(null);

  function handleExecute() {
    if (!currentCommand) {
      return;
    }

    if (currentCommand.type === "popupMessage") {
      setActivePopupCommand(currentCommand);
      return;
    }

    submitAction({
      type: "COMPLETE_COMMAND",
      commandId: currentCommand.id,
    });
  }

  function handlePopupOk() {
    if (!activePopupCommand) {
      return;
    }

    const completedCommandId = activePopupCommand.id;

    setActivePopupCommand(null);

    submitAction({
      type: "COMPLETE_COMMAND",
      commandId: completedCommandId,
    });
  }

  return (
    <section className="fp-queue-manager">
      <div className="fp-queue-header">
        <div>
          <div className="fp-eyebrow">Queue Manager</div>
          <h2 className="fp-queue-title">
            {currentCommand ? currentCommand.title : "No Pending Commands"}
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
        {currentCommand ? (
          <>
            <p>
              Current command type: <strong>{currentCommand.type}</strong>
            </p>

            <button className="fp-primary-button" onClick={handleExecute}>
              Execute
            </button>
          </>
        ) : (
          <p>The command queue is empty.</p>
        )}
      </div>

      {activePopupCommand && (
        <div className="fp-modal-backdrop">
          <div className="fp-modal-card" role="dialog" aria-modal="true">
            <h2>{activePopupCommand.title}</h2>
            <p>{activePopupCommand.message}</p>

            <button className="fp-primary-button" onClick={handlePopupOk}>
              {activePopupCommand.buttonText || "OK"}
            </button>
          </div>
        </div>
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
