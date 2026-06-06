import { useEffect, useMemo, useRef, useState } from "react";
import { MarkovNameGenerator } from "../../procedure-core/name-generator";
import { pulpyFiveParsecsNames } from "./data/nameSets";
import "./view.css";

const nameGenerator = new MarkovNameGenerator({
  five_parsecs_pulp: pulpyFiveParsecsNames,
});

function generateRandomName(nameSetId = "five_parsecs_pulp") {
  const generatedName = nameGenerator.generateName(nameSetId);
  return generatedName || "";
}

function buildStackInspectorPayload(gameState, visibilityReason = "") {
  const activeCommand = gameState.activeCommand || null;
  const commandQueue = Array.isArray(gameState.commandQueue)
    ? gameState.commandQueue
    : [];

  return {
    generatedAt: new Date().toLocaleString(),
    visibilityReason,
    queueStatus: gameState.queueStatus || "idle",
    pendingCount: commandQueue.length,
    activeCommandType: activeCommand ? activeCommand.type : "None",
    activeCommand,
    commandQueue,
  };
}

function writeStackInspectorWindow(inspectorWindow, payload) {
  const escapedPayload = JSON.stringify(payload).replace(/</g, "\\u003c");

  inspectorWindow.document.open();
  inspectorWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Five Parsecs Stack Inspector</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        padding: 18px;
        background: #111827;
        color: #f9fafb;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      header {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #111827;
        border-bottom: 1px solid #374151;
        padding-bottom: 12px;
        margin-bottom: 14px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 1.25rem;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 8px;
        margin-bottom: 14px;
      }
      .summary div, details {
        border: 1px solid #374151;
        border-radius: 12px;
        background: #1f2937;
      }
      .summary div {
        padding: 10px;
      }
      .label {
        display: block;
        color: #9ca3af;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .value {
        display: block;
        margin-top: 3px;
        font-weight: 800;
      }
      details {
        margin: 10px 0;
        overflow: hidden;
      }
      summary {
        cursor: pointer;
        padding: 12px;
        font-weight: 800;
        background: #273449;
      }
      pre {
        margin: 0;
        padding: 12px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
        color: #d1d5db;
      }
      .muted {
        color: #9ca3af;
      }
      .command-title {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .command-type {
        color: #93c5fd;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Five Parsecs Stack Inspector</h1>
      <div class="muted" id="lastUpdated"></div>
    </header>

    <main id="app"></main>

    <script>
      let latestPayload = ${escapedPayload};

      function escapeHtml(value) {
        return String(value)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#039;');
      }

      function displayText(value, fallback = '') {
        if (value === null || value === undefined) {
          return fallback;
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }

        if (typeof value === 'object') {
          return String(
            value.title ||
            value.name ||
            value.label ||
            value.id ||
            value.type ||
            fallback ||
            'Object'
          );
        }

        return String(value || fallback);
      }

      function commandSummary(command, index, labelPrefix = '') {
        const title = displayText(command?.title || command?.name || command?.id || command?.type, 'Untitled command');
        const type = displayText(command?.type, 'unknown');
        const prefix = labelPrefix ? displayText(labelPrefix, '') : String(index + 1) + '.';
        const prefixText = prefix ? prefix + ' ' : '';

        return '<details>' +
          '<summary><span class="command-title"><span>' + escapeHtml(prefixText + title) + '</span><span class="command-type">' + escapeHtml(type) + '</span></span></summary>' +
          '<pre>' + escapeHtml(JSON.stringify(command, null, 2)) + '</pre>' +
          '</details>';
      }

      function render(payload) {
        latestPayload = payload || latestPayload || {};
        document.getElementById('lastUpdated').textContent = 'Last updated: ' + (latestPayload.generatedAt || 'unknown');

        const queue = Array.isArray(latestPayload.commandQueue) ? latestPayload.commandQueue : [];
        const activeCommand = latestPayload.activeCommand || null;

        document.getElementById('app').innerHTML =
          '<section class="summary">' +
            '<div><span class="label">Queue status</span><span class="value">' + escapeHtml(latestPayload.queueStatus || 'idle') + '</span></div>' +
            '<div><span class="label">Pending commands</span><span class="value">' + escapeHtml(latestPayload.pendingCount ?? queue.length) + '</span></div>' +
            '<div><span class="label">Active command</span><span class="value">' + escapeHtml(latestPayload.activeCommandType || 'None') + '</span></div>' +
            '<div><span class="label">Shown because</span><span class="value">' + escapeHtml(latestPayload.visibilityReason || 'debug') + '</span></div>' +
          '</section>' +
          (activeCommand
            ? commandSummary(activeCommand, -1, 'Active')
            : '<p class="muted">No active command.</p>') +
          '<h2>Pending Queue</h2>' +
          (queue.length > 0
            ? queue.map((command, index) => commandSummary(command, index)).join('')
            : '<p class="muted">No pending commands.</p>');
      }

      window.addEventListener('message', (event) => {
        if (!event.data || event.data.type !== 'FP_STACK_INSPECTOR_UPDATE') {
          return;
        }
        render(event.data.payload);
      });

      render(latestPayload);
    </script>
  </body>
</html>`);
  inspectorWindow.document.close();
}

function sendStackInspectorPayload(inspectorWindow, payload) {
  if (!inspectorWindow || inspectorWindow.closed) {
    return;
  }

  inspectorWindow.postMessage({
    type: "FP_STACK_INSPECTOR_UPDATE",
    payload,
  }, "*");
}

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

function TextInputModal({ command, onSubmit }) {
  const [value, setValue] = useState(command.defaultValue ?? "");

  function handleGenerateName() {
    const generatedName = generateRandomName(command.randomNameSet || "five_parsecs_pulp");

    if (generatedName) {
      setValue(generatedName);
    }
  }

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

        <label className="fp-input-label" htmlFor={`text-input-${command.id}`}>
          Name
        </label>
        <input
          id={`text-input-${command.id}`}
          className="fp-text-input"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoFocus
        />

        {command.allowRandomName && (
          <button
            className="fp-secondary-button"
            type="button"
            onClick={handleGenerateName}
          >
            {command.randomNameButtonText || "Generate Name"}
          </button>
        )}

        <button className="fp-primary-button" type="submit">
          {command.buttonText || "OK"}
        </button>
      </form>
    </div>
  );
}

function getTableRollRange(entry) {
  if (!entry) {
    return "—";
  }

  if (entry.min === entry.max) {
    return String(entry.min);
  }

  return `${entry.min}-${entry.max}`;
}

function rollDie(sides) {
  const safeSides = Number.isFinite(Number(sides)) && Number(sides) > 0
    ? Math.floor(Number(sides))
    : 100;

  return Math.floor(Math.random() * safeSides) + 1;
}

function findEntryForRoll(entries, roll) {
  return entries.find((entry) => roll >= entry.min && roll <= entry.max) || null;
}

function TableRollModal({ command, onConfirm }) {
  const table = command.table || {};
  const entries = Array.isArray(table.entries) ? table.entries : [];
  const [appRoll, setAppRoll] = useState(command.roll ?? null);
  const [highlightedEntry, setHighlightedEntry] = useState(command.result ?? null);

  function handleRollWithAppDice() {
    const roll = rollDie(table.sides || 100);
    const result = findEntryForRoll(entries, roll);

    setAppRoll(roll);
    setHighlightedEntry(result);
  }

  function handleSelectEntry(entry) {
    onConfirm({
      roll: appRoll,
      selectedEntry: entry,
    });
  }

  function isHighlighted(entry) {
    if (!highlightedEntry) {
      return false;
    }

    return entry.min === highlightedEntry.min && entry.max === highlightedEntry.max;
  }

  return (
    <div className="fp-modal-backdrop">
      <div className="fp-modal-card fp-table-modal-card" role="dialog" aria-modal="true">
        <h2>{command.title}</h2>

        <div className="fp-table-roll-summary">
          <div className="fp-table-roll-line">
            <span>Table</span>
            <strong>{table.title || "Table"}</strong>
          </div>
          <div className="fp-table-roll-line">
            <span>Dice</span>
            <strong>{table.dice || `d${table.sides || 100}`}</strong>
          </div>
          <div className="fp-table-roll-line">
            <span>App roll</span>
            <strong>{appRoll || "Not rolled"}</strong>
          </div>
        </div>

        {command.errorMessage && (
          <p className="fp-error-message">{command.errorMessage}</p>
        )}

        {table.note && <p className="fp-muted">{table.note}</p>}

        <button
          className="fp-secondary-button"
          type="button"
          onClick={handleRollWithAppDice}
        >
          {command.rollButtonText || "Roll with App Dice"}
        </button>

        <p className="fp-table-help-text">
          Roll physical dice and select your result, or roll with the app and select the highlighted row.
          You may select any table option.
        </p>

        <div className="fp-table-choice-list">
          {entries.map((entry) => {
            const highlighted = isHighlighted(entry);
            const followUpCount = Array.isArray(entry.followUpCommands)
              ? entry.followUpCommands.length
              : 0;

            return (
              <button
                key={`${entry.min}-${entry.max}-${entry.value || entry.label}`}
                className={highlighted ? "fp-table-choice fp-table-choice-highlighted" : "fp-table-choice"}
                type="button"
                onClick={() => handleSelectEntry(entry)}
              >
                <span className="fp-table-choice-range">{getTableRollRange(entry)}</span>
                <span className="fp-table-choice-main">
                  <strong>{entry.label || "Unnamed result"}</strong>
                  {entry.description && <span>{entry.description}</span>}
                  {followUpCount > 0 && (
                    <em>
                      Adds {followUpCount} follow-up step{followUpCount === 1 ? "" : "s"}.
                    </em>
                  )}
                </span>
                <span className="fp-table-choice-action">Select</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QueueManager({ gameState, submitAction, showStackInspectorButton = false, onOpenStackInspector }) {
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

  function handleTextSubmit(value) {
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

        <div className="fp-step-tools">
          <div className="fp-step-count">
            <span className="fp-step-number">{stepsRemaining}</span>
            <span className="fp-step-label">
              {stepsRemaining === 1 ? "step" : "steps"} left
            </span>
          </div>

          {showStackInspectorButton && (
            <button
              type="button"
              className="fp-inspector-button"
              onClick={onOpenStackInspector}
            >
              Stack Inspector
            </button>
          )}
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
          key={activeCommand.id}
          command={activeCommand}
          onSubmit={handleNumberSubmit}
        />
      )}

      {activeCommand && activeCommand.type === "crewMemberName" && (
        <TextInputModal
          key={activeCommand.id}
          command={activeCommand}
          onSubmit={handleTextSubmit}
        />
      )}

      {activeCommand && activeCommand.type === "tableRoll" && (
        <TableRollModal
          key={activeCommand.id}
          command={activeCommand}
          onConfirm={resolveActiveCommand}
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

function formatStats(stats) {
  if (!stats || typeof stats !== "object") {
    return "";
  }

  const labels = [
    ["reactions", "Reactions"],
    ["speed", "Speed"],
    ["combatSkill", "Combat"],
    ["toughness", "Toughness"],
    ["savvy", "Savvy"],
    ["luck", "Luck"],
  ];

  return labels
    .filter(([key]) => stats[key] !== undefined && stats[key] !== null)
    .map(([key, label]) => `${label} ${stats[key]}`)
    .join(" · ");
}

function summarizeList(values, formatter) {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  return values.map(formatter).filter(Boolean).join("; ");
}

function CrewLogSheet({ crewLog }) {
  const members = Array.isArray(crewLog.crewMembers)
    ? crewLog.crewMembers
    : [];
  const crewDetails = crewLog.crewDetails || {};

  function renderCrewDetail(member) {
    const detail = crewDetails[member.id] || {};
    const resourceSummary = summarizeList(detail.resources, (resource) => {
      const amount = resource.amount ?? resource.count ?? "";
      const label = resource.label || resource.type || "Resource";
      return amount ? `${amount} ${label}` : label;
    });
    const startingRollSummary = summarizeList(detail.startingRolls, (roll) => {
      return roll.label || `${roll.count || 1} ${roll.type || "starting roll"}`;
    });
    const rows = [
      detail.characterType ? `Character Type: ${detail.characterType}` : null,
      detail.crewType?.label ? `Crew Type: ${detail.crewType.label}` : null,
      detail.primaryAlien?.label ? `Primary Alien: ${detail.primaryAlien.label}` : null,
      detail.strangeCharacter?.label ? `Strange Character: ${detail.strangeCharacter.label}` : null,
      detail.background?.label ? `Background: ${detail.background.label}` : null,
      detail.background1?.label ? `Background 1: ${detail.background1.label}` : null,
      detail.background2?.label ? `Background 2: ${detail.background2.label}` : null,
      detail.motivation?.label ? `Motivation: ${detail.motivation.label}` : null,
      detail.motivation1?.label ? `Motivation 1: ${detail.motivation1.label}` : null,
      detail.motivation2?.label ? `Motivation 2: ${detail.motivation2.label}` : null,
      detail.class?.label ? `Class: ${detail.class.label}` : null,
      detail.stats ? `Stats: ${formatStats(detail.stats)}` : null,
      resourceSummary ? `Resources: ${resourceSummary}` : null,
      startingRollSummary ? `Starting Rolls: ${startingRollSummary}` : null,
      Array.isArray(detail.resultNotes) && detail.resultNotes.length > 0
        ? `Notes: ${detail.resultNotes.join("; ")}`
        : null,
      detail.creationComplete ? "Creation complete" : null,
    ].filter(Boolean);

    return (
      <div className="fp-crew-member-detail">
        {rows.map((row) => (
          <span key={row}>{row}</span>
        ))}
      </div>
    );
  }

  return (
    <AccordionSection title="Crew Log" defaultOpen>
      <FieldRow label="Crew Name" value={crewLog.crewName} />
      <FieldRow label="Starting Crew Members" value={crewLog.startingCrewCount} />
      <FieldRow label="Credits" value={crewLog.credits} />
      <FieldRow label="Ship" value={crewLog.ship} />

      <div className="fp-subsection">
        <h3>Crew Members</h3>

        {members.length > 0 ? (
          <ul className="fp-simple-list fp-crew-list">
            {members.map((member, index) => (
              <li key={member.id || `${member.name}-${index}`}>
                <div className="fp-crew-member-name">
                  {member.number ? `${member.number}. ` : ""}
                  {member.name}
                </div>
                {renderCrewDetail(member)}
              </li>
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

export default function FiveParsecsProcedureView({ gameState, submitAction, player }) {
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

  const isSuperuser = Boolean(player?.isSuperuser || player?.isSuperUser);
  const playerPropMissing = !player;
  const debugStackEnabled = Boolean(
    gameState?.debugShowStackInspector ||
      gameState?.showStackInspector ||
      gameState?.debugMode
  );
  const showStackInspector = isSuperuser || debugStackEnabled || playerPropMissing;
  const stackInspectorReason = isSuperuser
    ? "current player is a superuser"
    : debugStackEnabled
      ? "debug stack inspector flag is enabled"
      : playerPropMissing
        ? "player prop was not passed into the game view"
        : "";

  const inspectorWindowRef = useRef(null);
  const stackInspectorPayload = useMemo(() => {
    return buildStackInspectorPayload(safeGameState, stackInspectorReason);
  }, [safeGameState, stackInspectorReason]);

  function openStackInspectorInNewTab() {
    const inspectorWindow = window.open(
      "",
      "five-parsecs-stack-inspector",
      "noopener=false,noreferrer=false,width=980,height=820"
    );

    if (!inspectorWindow) {
      window.alert("The stack inspector tab was blocked by the browser. Allow popups for this site and try again.");
      return;
    }

    inspectorWindowRef.current = inspectorWindow;
    writeStackInspectorWindow(inspectorWindow, stackInspectorPayload);
    sendStackInspectorPayload(inspectorWindow, stackInspectorPayload);
  }

  useEffect(() => {
    sendStackInspectorPayload(inspectorWindowRef.current, stackInspectorPayload);
  }, [stackInspectorPayload]);

  return (
    <main className="fp-game-dashboard">
      <QueueManager
        gameState={safeGameState}
        submitAction={submitAction}
        showStackInspectorButton={showStackInspector}
        onOpenStackInspector={openStackInspectorInNewTab}
      />

      <section className="fp-record-sheets">
        <CrewLogSheet crewLog={safeGameState.crewLog} />
        <EncounterLogSheet encounterLog={safeGameState.encounterLog} />
        <WorldLogSheet worldLog={safeGameState.worldLog} />
      </section>
    </main>
  );
}
