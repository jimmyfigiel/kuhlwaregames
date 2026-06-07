import { useEffect, useMemo, useRef, useState } from "react";
import { CompoundNameGenerator, MarkovNameGenerator } from "../../procedure-core/name-generator";
import {
  FIVE_PARSECS_WORLD_NAME_PARTS,
  SHIP_NAMES,
  fiveParsecsWorldNames,
  pulpyFiveParsecsNames,
  randomShipName,
} from "./data/nameSets";
import "./view.css";

const GAME_VERSION = "five-parsecs-procedure-v1-51";

const nameGenerator = new MarkovNameGenerator({
  five_parsecs_pulp: pulpyFiveParsecsNames,
  five_parsecs_world: fiveParsecsWorldNames,
});

const worldNameGenerator = new CompoundNameGenerator(FIVE_PARSECS_WORLD_NAME_PARTS);

function generateRandomName(nameSetId = "five_parsecs_pulp") {
  if (nameSetId === "five_parsecs_world_parts") {
    return worldNameGenerator.generate() || "";
  }

  if (nameSetId === "five_parsecs_ship") {
    return randomShipName ? randomShipName() : SHIP_NAMES[Math.floor(Math.random() * SHIP_NAMES.length)] || "The Wandering Star";
  }

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

function NumberInputPanel({ command, onSubmit }) {
  const [value, setValue] = useState(command.defaultValue ?? 0);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <form className="fp-command-card" onSubmit={handleSubmit}>
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
  );
}

function TextInputPanel({ command, onSubmit }) {
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
    <form className="fp-command-card" onSubmit={handleSubmit}>
        <h2>{command.title}</h2>
        <p>{command.prompt}</p>

        {command.errorMessage && (
          <p className="fp-error-message">{command.errorMessage}</p>
        )}

        <label className="fp-input-label" htmlFor={`text-input-${command.id}`}>
          {command.label || "Name"}
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
  );
}


function ChoicePanel({ command, onSubmit }) {
  const options = Array.isArray(command.options) ? command.options : [];
  const [selectedValue, setSelectedValue] = useState(
    options.find((option) => option.disabled !== true)?.value ?? ""
  );

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(selectedValue);
  }

  return (
    <form className="fp-command-card" onSubmit={handleSubmit}>
      <h2>{command.title}</h2>
      <p>{command.prompt}</p>

      {command.errorMessage && (
        <p className="fp-error-message">{command.errorMessage}</p>
      )}

      <div className="fp-choice-list">
        {options.map((option) => (
          <label
            className={`fp-choice-option ${option.disabled ? "fp-choice-option-disabled" : ""}`}
            key={option.id || String(option.value)}
          >
            <input
              type="radio"
              name={`choice-${command.id}`}
              value={String(option.value)}
              checked={String(selectedValue) === String(option.value)}
              disabled={option.disabled === true}
              onChange={() => setSelectedValue(option.value)}
            />
            <span>
              <strong>{option.label}</strong>
              {option.description && <em>{option.description}</em>}
            </span>
          </label>
        ))}
      </div>

      <button className="fp-primary-button" type="submit">
        {command.buttonText || "Continue"}
      </button>
    </form>
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

function TableRollPanel({ command, onConfirm }) {
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
    <div className="fp-command-card fp-table-command-card">
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
  );
}


function parseCreditDiceLabel(diceText) {
  const cleanText = String(diceText || "1D6").trim().toUpperCase();
  const match = cleanText.match(/^(\d*)D(\d+)$/);

  if (!match) {
    return {
      count: 1,
      sides: 6,
      label: cleanText || "1D6",
    };
  }

  const count = Number(match[1] || 1);
  const sides = Number(match[2] || 6);

  return {
    count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 1,
    sides: Number.isFinite(sides) && sides > 0 ? Math.floor(sides) : 6,
    label: cleanText,
  };
}

function CreditRollPanel({ command, onConfirm }) {
  const dice = parseCreditDiceLabel(command.dice || "1D6");
  const [total, setTotal] = useState(command.appRoll?.total ?? "");
  const [rolls, setRolls] = useState(command.appRoll?.rolls || []);
  const adjustment = Number(command.adjustment || 0);
  const numericTotal = Number(total);
  const adjustedTotal = Number.isFinite(numericTotal)
    ? Math.max(0, Math.floor(numericTotal) + adjustment)
    : null;

  function handleRollWithAppDice() {
    const nextRolls = [];

    for (let index = 0; index < dice.count; index += 1) {
      nextRolls.push(rollDie(dice.sides));
    }

    setRolls(nextRolls);
    setTotal(nextRolls.reduce((sum, roll) => sum + roll, 0));
  }

  function handleSubmit(event) {
    event.preventDefault();

    onConfirm({
      total,
      appRoll: rolls.length > 0
        ? {
            dice,
            rolls,
            total: Number(total),
          }
        : null,
    });
  }

  return (
    <form className="fp-command-card" onSubmit={handleSubmit}>
        <h2>{command.title || "Roll Credits"}</h2>

        <p>
          Source: <strong>{command.source || "Creation effect"}</strong>
        </p>

        <div className="fp-table-roll-summary">
          <div className="fp-table-roll-line">
            <span>Dice</span>
            <strong>{dice.label}</strong>
          </div>
          <div className="fp-table-roll-line">
            <span>App roll</span>
            <strong>{rolls.length > 0 ? rolls.join(" + ") : "Not rolled"}</strong>
          </div>
          {command.adjustmentLabel && (
            <div className="fp-table-roll-line">
              <span>Adjustment</span>
              <strong>{command.adjustmentLabel}</strong>
            </div>
          )}
          {adjustedTotal !== null && adjustment !== 0 && (
            <div className="fp-table-roll-line">
              <span>Final credits</span>
              <strong>{adjustedTotal}</strong>
            </div>
          )}
        </div>

        {command.errorMessage && (
          <p className="fp-error-message">{command.errorMessage}</p>
        )}

        <button
          className="fp-secondary-button"
          type="button"
          onClick={handleRollWithAppDice}
        >
          Roll with App Dice
        </button>

        <p className="fp-table-help-text">
          Roll physical dice and enter the total, or roll with the app and confirm the total.
        </p>

        <label className="fp-input-label" htmlFor={`credit-roll-${command.id}`}>
          Rolled credit total
        </label>
        <input
          id={`credit-roll-${command.id}`}
          className="fp-number-input"
          type="number"
          min="0"
          value={total}
          onChange={(event) => setTotal(event.target.value)}
          autoFocus
        />

        <button className="fp-primary-button" type="submit">
          {adjustment !== 0 ? "Apply Adjusted Credits" : "Add Credits"}
        </button>
    </form>
  );
}




function StartingStoryPointsPanel({ command, onConfirm }) {
  const [roll, setRoll] = useState(command.roll ?? "");
  const adjustment = Number(command.adjustment || 0);
  const parsedRoll = Number(roll);
  const rawTotal = Number.isFinite(parsedRoll) ? Math.floor(parsedRoll) + 1 : null;
  const finalTotal = rawTotal === null ? null : Math.max(0, rawTotal + adjustment);

  function handleRollWithAppDice() {
    setRoll(rollDie(6));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm({ roll });
  }

  return (
    <form className="fp-command-card" onSubmit={handleSubmit}>
      <h2>{command.title || "Starting Story Points"}</h2>
      <p>Roll 1D6 + 1 to determine starting story points.</p>

      {command.adjustmentLabel && (
        <p className="fp-muted">{command.adjustmentLabel}</p>
      )}

      <div className="fp-table-roll-summary">
        <div className="fp-table-roll-line">
          <span>D6 roll</span>
          <strong>{roll || "Not rolled"}</strong>
        </div>
        <div className="fp-table-roll-line">
          <span>Base total</span>
          <strong>{rawTotal === null ? "—" : rawTotal}</strong>
        </div>
        <div className="fp-table-roll-line">
          <span>Final story points</span>
          <strong>{finalTotal === null ? "—" : finalTotal}</strong>
        </div>
      </div>

      {command.errorMessage && (
        <p className="fp-error-message">{command.errorMessage}</p>
      )}

      <button
        className="fp-secondary-button"
        type="button"
        onClick={handleRollWithAppDice}
      >
        Roll with App Dice
      </button>

      <label className="fp-input-label" htmlFor={`story-point-roll-${command.id}`}>
        D6 roll
      </label>
      <input
        id={`story-point-roll-${command.id}`}
        className="fp-number-input"
        type="number"
        min="1"
        max="6"
        value={roll}
        onChange={(event) => setRoll(event.target.value)}
        autoFocus
      />

      <button className="fp-primary-button" type="submit">
        Save Story Points
      </button>
    </form>
  );
}

function ShipDebtRollPanel({ command, onConfirm }) {
  const selectedShip = command.selectedShip || {};
  const debtBonus = Number(command.debtBonus || selectedShip.debtBonus || 0);
  const [roll, setRoll] = useState(command.debtRoll ?? "");
  const numericRoll = Number(roll);
  const generatedDebt = Number.isFinite(numericRoll)
    ? Math.max(0, Math.floor(numericRoll) + debtBonus)
    : null;

  function handleRollWithAppDice() {
    setRoll(rollDie(6));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm({ roll });
  }

  return (
    <form className="fp-command-card" onSubmit={handleSubmit}>
        <h2>{command.title || "Resolve Ship Debt"}</h2>

        <p>
          Ship: <strong>{selectedShip.name || selectedShip.label || "Selected ship"}</strong>
        </p>

        <div className="fp-table-roll-summary">
          <div className="fp-table-roll-line">
            <span>Debt formula</span>
            <strong>{command.debtFormula || selectedShip.debt || `1D6 + ${debtBonus}`}</strong>
          </div>
          <div className="fp-table-roll-line">
            <span>Debt bonus</span>
            <strong>{debtBonus}</strong>
          </div>
          <div className="fp-table-roll-line">
            <span>Generated debt</span>
            <strong>{generatedDebt === null ? "Not rolled" : generatedDebt}</strong>
          </div>
        </div>

        {command.errorMessage && (
          <p className="fp-error-message">{command.errorMessage}</p>
        )}

        <button
          className="fp-secondary-button"
          type="button"
          onClick={handleRollWithAppDice}
        >
          Roll with App Dice
        </button>

        <p className="fp-table-help-text">
          Roll a physical D6 and enter it, or roll with the app and confirm the result.
        </p>

        <label className="fp-input-label" htmlFor={`ship-debt-roll-${command.id}`}>
          D6 roll
        </label>
        <input
          id={`ship-debt-roll-${command.id}`}
          className="fp-number-input"
          type="number"
          min="1"
          max="6"
          value={roll}
          onChange={(event) => setRoll(event.target.value)}
          autoFocus
        />

        <button className="fp-primary-button" type="submit">
          Save Ship Debt
        </button>
    </form>
  );
}

function ActiveCommandPanel({
  command,
  onPopupOk,
  onNumberSubmit,
  onTextSubmit,
  onChoiceSubmit,
  onTableConfirm,
  onCreditConfirm,
  onShipDebtConfirm,
  onStartingStoryPointsConfirm,
}) {
  if (!command) {
    return null;
  }

  const title = `Active Command: ${command.title || command.type || "Command"}`;

  return (
    <AccordionSection title={title} defaultOpen>
      {command.type === "popupMessage" && (
        <div className="fp-command-card">
          <h2>{command.title}</h2>
          <p>{command.message}</p>

          <button className="fp-primary-button" onClick={onPopupOk}>
            {command.buttonText || "OK"}
          </button>
        </div>
      )}

      {command.type === "startTurn" && (
        <div className="fp-command-card">
          <div className="fp-eyebrow">Campaign Turn</div>
          <h2>{command.title}</h2>
          <p>
            {command.message ||
              `Ready to start Campaign Turn ${command.turnNumber || ""}?`}
          </p>

          <button className="fp-primary-button" onClick={onPopupOk}>
            {command.buttonText || "Start Turn"}
          </button>
        </div>
      )}

      {command.type === "numberInput" && (
        <NumberInputPanel
          key={command.id}
          command={command}
          onSubmit={onNumberSubmit}
        />
      )}

      {(command.type === "crewMemberName" || command.type === "textInput") && (
        <TextInputPanel
          key={command.id}
          command={command}
          onSubmit={onTextSubmit}
        />
      )}

      {command.type === "choice" && (
        <ChoicePanel
          key={command.id}
          command={command}
          onSubmit={onChoiceSubmit}
        />
      )}

      {command.type === "tableRoll" && (
        <TableRollPanel
          key={command.id}
          command={command}
          onConfirm={onTableConfirm}
        />
      )}

      {command.type === "resolveCreditRoll" && (
        <CreditRollPanel
          key={command.id}
          command={command}
          onConfirm={onCreditConfirm}
        />
      )}

      {command.type === "resolveStartingStoryPoints" && (
        <StartingStoryPointsPanel
          key={command.id}
          command={command}
          onConfirm={onStartingStoryPointsConfirm}
        />
      )}

      {command.type === "resolveShipDebt" && (
        <ShipDebtRollPanel
          key={command.id}
          command={command}
          onConfirm={onShipDebtConfirm}
        />
      )}

      {![
        "popupMessage",
        "startTurn",
        "numberInput",
        "crewMemberName",
        "textInput",
        "choice",
        "tableRoll",
        "resolveCreditRoll",
        "resolveStartingStoryPoints",
        "resolveShipDebt",
      ].includes(command.type) && (
        <div className="fp-command-card">
          <h2>{command.title || "Active Command"}</h2>
          <p className="fp-muted">
            This active command type does not have a custom panel yet.
          </p>
          <button className="fp-primary-button" onClick={onPopupOk}>
            Continue
          </button>
        </div>
      )}
    </AccordionSection>
  );
}


function QueueManager({ gameState, submitAction, showStackInspectorButton = false, onOpenStackInspector }) {
  const commandQueue = Array.isArray(gameState.commandQueue)
    ? gameState.commandQueue
    : [];

  const activeCommand = gameState.activeCommand || null;
  const currentPendingCommand = commandQueue[0] || null;
  const stepsRemaining = commandQueue.length;
  const queueTitle = activeCommand
    ? activeCommand.title
    : currentPendingCommand
      ? currentPendingCommand.title
      : "No Pending Commands";
  const queueSummary = activeCommand
    ? `Active: ${activeCommand.type || "command"}`
    : currentPendingCommand
      ? `Next: ${currentPendingCommand.type || "command"}`
      : "No current step";
  const [isQueueOpen, setIsQueueOpen] = useState(true);

  useEffect(() => {
    if (activeCommand) {
      setIsQueueOpen(true);
    }
  }, [activeCommand?.id]);

  function executeQueue() {
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

  const autoExecutedCommandIdsRef = useRef(new Set());

  useEffect(() => {
    if (activeCommand || !currentPendingCommand) {
      return;
    }

    const commandKey = currentPendingCommand.id || `${currentPendingCommand.type}-${stepsRemaining}`;

    if (autoExecutedCommandIdsRef.current.has(commandKey)) {
      return;
    }

    autoExecutedCommandIdsRef.current.add(commandKey);
    executeQueue();
  }, [
    activeCommand,
    currentPendingCommand?.id,
    currentPendingCommand?.type,
    stepsRemaining,
    gameState,
    submitAction,
  ]);

  function handleNumberSubmit(value) {
    resolveActiveCommand({ value });
  }

  function handleTextSubmit(value) {
    resolveActiveCommand({ value });
  }

  function handleChoiceSubmit(value) {
    resolveActiveCommand({ value });
  }

  return (
    <section className="fp-accordion-section fp-queue-accordion-section">
      <button
        className="fp-accordion-header fp-queue-accordion-header"
        type="button"
        onClick={() => setIsQueueOpen((current) => !current)}
        aria-expanded={isQueueOpen}
      >
        <span className="fp-queue-header-title">
          <span>Current Step</span>
          <span className="fp-queue-header-summary">
            {activeCommand
              ? `Active: ${queueTitle}`
              : currentPendingCommand
                ? `Next: ${queueTitle}`
                : "Empty"}
          </span>
        </span>
        <span className="fp-accordion-indicator">{isQueueOpen ? "−" : "+"}</span>
      </button>

      {isQueueOpen && (
        <div className="fp-accordion-body fp-queue-details-body">
          <section className="fp-active-command-area">
            {activeCommand ? (
              <ActiveCommandPanel
                command={activeCommand}
                onPopupOk={handlePopupOk}
                onNumberSubmit={handleNumberSubmit}
                onTextSubmit={handleTextSubmit}
                onChoiceSubmit={handleChoiceSubmit}
                onTableConfirm={resolveActiveCommand}
                onCreditConfirm={resolveActiveCommand}
                onShipDebtConfirm={resolveActiveCommand}
                onStartingStoryPointsConfirm={resolveActiveCommand}
              />
            ) : (
              <div className="fp-command-card fp-empty-active-command-card">
                <h2>No Active Command</h2>
                <p>{currentPendingCommand ? "The next command will start automatically." : "The command queue is empty."}</p>
              </div>
            )}
          </section>

          <section className="fp-queue-meta-panel">
            <div className="fp-step-count fp-queue-meta-count">
              <span className="fp-step-number">{stepsRemaining}</span>
              <span className="fp-step-label">
                {stepsRemaining === 1 ? "step" : "steps"} left
              </span>
            </div>

            <div className="fp-queue-meta-details">
              <div>
                <strong>{activeCommand ? "Active" : currentPendingCommand ? "Next" : "Status"}:</strong>{" "}
                {activeCommand ? activeCommand.type : currentPendingCommand ? currentPendingCommand.type : "empty"}
              </div>
              <div>
                <strong>Step status:</strong> {gameState.queueStatus || "idle"}
              </div>
              <div>
                <strong>Version:</strong> {GAME_VERSION}
              </div>
            </div>

            {showStackInspectorButton && (
              <button
                type="button"
                className="fp-inspector-button fp-queue-meta-inspector"
                onClick={onOpenStackInspector}
              >
                Stack Inspector
              </button>
            )}
          </section>
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

function formatPendingEffect(effect) {
  if (!effect || typeof effect !== "object") {
    return "";
  }

  const label = effect.label || effect.effectType || effect.type || "Effect";
  const source = effect.source ? ` — ${effect.source}` : "";
  return `${label}${source}`;
}

function formatInventoryItem(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  const category = item.category ? `${item.category}: ` : "";
  const source = item.source ? ` — ${item.source}` : "";
  return `${category}${item.name || "Unknown Item"}${source}`;
}

function formatPlainValue(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    return value.label || value.name || value.title || JSON.stringify(value);
  }

  return String(value);
}

function formatFlagSummary(flags) {
  if (!flags || typeof flags !== "object" || Array.isArray(flags)) {
    return "";
  }

  return Object.entries(flags)
    .map(([key, value]) => `${key}: ${formatPlainValue(value)}`)
    .join("; ");
}


function CampaignSheet({ campaign }) {
  const safeCampaign = campaign && typeof campaign === "object" ? campaign : {};

  return (
    <AccordionSection title="Campaign" defaultOpen={false}>
      <FieldRow label="Turn" value={safeCampaign.turnNumber ?? 0} />
      <FieldRow label="Phase" value={safeCampaign.phase || "setup"} />
      <FieldRow label="Status" value={safeCampaign.status || "setup"} />
      <FieldRow label="Current Step" value={safeCampaign.currentStep || "initialSetup"} />
      <FieldRow label="Crew Size" value={safeCampaign.crewSize || "Not set"} />
      <FieldRow label="Deploy Limit" value={safeCampaign.deployLimit || "Not set"} />
      <FieldRow label="Enemy Number Rule" value={safeCampaign.enemyNumberRuleLabel || "Not set"} />
      <FieldRow label="Story Track" value={safeCampaign.storyTrackLabel || "No Story Track"} />
      <FieldRow label="Victory Condition" value={safeCampaign.victoryConditionLabel || "No Victory Condition"} />
      <FieldRow label="Difficulty" value={safeCampaign.difficultyModeLabel || "Normal"} />
      <FieldRow label="Starting Story Points" value={safeCampaign.startingStoryPoints ?? 0} />
      <FieldRow label="Story Point Rule" value={safeCampaign.storyPointRule || safeCampaign.startingStoryPointAdjustmentLabel || "Standard"} />
      <FieldRow label="Setup Complete" value={safeCampaign.setupComplete ? "Yes" : "No"} />
      <FieldRow label="Version" value={GAME_VERSION} />
    </AccordionSection>
  );
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
    const pendingEffectSummary = summarizeList(detail.pendingEffects, formatPendingEffect);
    const saveSummary = summarizeList(detail.saves, (save) => {
      const type = save.type || "Save";
      const level = save.level || "";
      const source = save.source ? ` — ${save.source}` : "";
      return `${type} ${level}${source}`.trim();
    });
    const equipmentSummary = summarizeList(detail.equipment, formatInventoryItem);
    const flagSummary = formatFlagSummary(detail.flags);
    const specialRuleSummary = summarizeList(detail.specialRules, formatPlainValue);
    const restrictionSummary = summarizeList(detail.restrictions, formatPlainValue);
    const battleRuleSummary = summarizeList(detail.battleRules, formatPlainValue);
    const movementRuleSummary = summarizeList(detail.movementRules, formatPlainValue);
    const campaignRuleSummary = summarizeList(detail.campaignRules, formatPlainValue);
    const campaignTurnRuleSummary = summarizeList(detail.campaignTurnRules, formatPlainValue);
    const campaignEventRuleSummary = summarizeList(detail.campaignEventRules, formatPlainValue);
    const postBattleRuleSummary = summarizeList(detail.postBattleRules, formatPlainValue);
    const injuryRuleSummary = summarizeList(detail.injuryRules, formatPlainValue);
    const equipmentRuleSummary = summarizeList(detail.equipmentRules, formatPlainValue);
    const advancementRuleSummary = summarizeList(detail.advancementRules, formatPlainValue);
    const taskRuleSummary = summarizeList(detail.campaignTaskRules, formatPlainValue);
    const taskRestrictionSummary = summarizeList(detail.campaignTaskRestrictions, formatPlainValue);
    const eventRuleSummary = summarizeList(detail.eventRules, formatPlainValue);
    const creationRuleSummary = summarizeList(detail.creationRules, formatPlainValue);
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
      detail.maxStats ? `Max Stats: ${formatStats(detail.maxStats)}` : null,
      flagSummary ? `Flags: ${flagSummary}` : null,
      detail.implantLimit !== undefined && detail.implantLimit !== null ? `Implant Limit: ${detail.implantLimit}` : null,
      detail.injuryTable ? `Injury Table: ${detail.injuryTable}` : null,
      saveSummary ? `Saves: ${saveSummary}` : null,
      specialRuleSummary ? `Special Rules: ${specialRuleSummary}` : null,
      restrictionSummary ? `Restrictions: ${restrictionSummary}` : null,
      battleRuleSummary ? `Battle Rules: ${battleRuleSummary}` : null,
      movementRuleSummary ? `Movement Rules: ${movementRuleSummary}` : null,
      campaignRuleSummary ? `Campaign Rules: ${campaignRuleSummary}` : null,
      campaignTurnRuleSummary ? `Campaign Turn Rules: ${campaignTurnRuleSummary}` : null,
      campaignEventRuleSummary ? `Campaign Event Rules: ${campaignEventRuleSummary}` : null,
      postBattleRuleSummary ? `Post-Battle Rules: ${postBattleRuleSummary}` : null,
      injuryRuleSummary ? `Injury Rules: ${injuryRuleSummary}` : null,
      equipmentRuleSummary ? `Equipment Rules: ${equipmentRuleSummary}` : null,
      advancementRuleSummary ? `Advancement Rules: ${advancementRuleSummary}` : null,
      taskRuleSummary ? `Task Rules: ${taskRuleSummary}` : null,
      taskRestrictionSummary ? `Task Restrictions: ${taskRestrictionSummary}` : null,
      eventRuleSummary ? `Event Rules: ${eventRuleSummary}` : null,
      creationRuleSummary ? `Creation Rules: ${creationRuleSummary}` : null,
      equipmentSummary ? `Historic Gear: ${equipmentSummary}` : null,
      resourceSummary ? `Resources: ${resourceSummary}` : null,
      startingRollSummary ? `Starting Rolls: ${startingRollSummary}` : null,
      pendingEffectSummary ? `Pending Effects: ${pendingEffectSummary}` : null,
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
    <AccordionSection title="Crew">
      <FieldRow label="Crew Name" value={crewLog.crewName} />
      <FieldRow label="Starting Crew Members" value={crewLog.startingCrewCount} />
      <FieldRow label="Credits" value={crewLog.credits} />
      <FieldRow label="Ship" value={crewLog.ship} />
      {crewLog.starship && typeof crewLog.starship === "object" && (
        <>
          <FieldRow label="Ship Type" value={crewLog.starship.shipType} />
          <FieldRow label="Hull" value={`${crewLog.starship.hullDamage ?? 0} / ${crewLog.starship.hullThreshold ?? 0}`} />
          <FieldRow label="Debt Owed" value={crewLog.starship.debtOwed} />
          <FieldRow label="Ship Traits" value={Array.isArray(crewLog.starship.traits) && crewLog.starship.traits.length > 0 ? crewLog.starship.traits.join("; ") : "None"} />
        </>
      )}
      <FieldRow
        label="Pending Crew Effects"
        value={summarizeList(crewLog.pendingEffects, formatPendingEffect)}
      />
      <FieldRow
        label="Inventory / Stash"
        value={summarizeList(crewLog.inventory, formatInventoryItem)}
      />

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
    <AccordionSection title="Encounter">
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
  const currentWorld =
    worldLog.currentWorld && typeof worldLog.currentWorld === "object"
      ? worldLog.currentWorld
      : { name: worldLog.currentWorld || "" };
  const traits = Array.isArray(currentWorld.traits)
    ? currentWorld.traits
    : Array.isArray(worldLog.worldTraits)
      ? worldLog.worldTraits
      : [];
  const patrons = Array.isArray(worldLog.patrons) ? worldLog.patrons : [];
  const rivals = Array.isArray(worldLog.rivals) ? worldLog.rivals : [];
  const pendingWorldEffects = summarizeList(worldLog.pendingEffects, formatPendingEffect);

  return (
    <AccordionSection title="World">
      <FieldRow label="Current World" value={currentWorld.name} />
      <FieldRow label="License" value={currentWorld.license || worldLog.license} />
      <FieldRow label="Invasion" value={currentWorld.invasion || worldLog.invasion} />
      <FieldRow label="Story Points" value={worldLog.storyPoints} />
      <FieldRow label="Rumors" value={worldLog.rumors} />
      <FieldRow label="Quest Rumors" value={worldLog.questRumors} />
      <FieldRow label="Pending World Effects" value={pendingWorldEffects} />

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
        <h3>Patrons</h3>
        {patrons.length > 0 ? (
          <ul className="fp-simple-list">
            {patrons.map((patron, index) => (
              <li key={patron.id || patron.name || index}>{patron.name || patron}</li>
            ))}
          </ul>
        ) : (
          <p className="fp-muted">No patrons yet.</p>
        )}
      </div>

      <div className="fp-subsection">
        <h3>Rivals</h3>
        {rivals.length > 0 ? (
          <ul className="fp-simple-list">
            {rivals.map((rival, index) => (
              <li key={rival.id || rival.name || index}>{rival.name || rival}</li>
            ))}
          </ul>
        ) : (
          <p className="fp-muted">No rivals yet.</p>
        )}
      </div>

      <div className="fp-subsection">
        <h3>Notes</h3>
        <p>{currentWorld.notes || worldLog.notes || <EmptyValue />}</p>
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
      campaign: gameState?.campaign || {},
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
        <CampaignSheet campaign={safeGameState.campaign} />
        <CrewLogSheet crewLog={safeGameState.crewLog} />
        <EncounterLogSheet encounterLog={safeGameState.encounterLog} />
        <WorldLogSheet worldLog={safeGameState.worldLog} />
      </section>
    </main>
  );
}
