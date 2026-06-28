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

const GAME_VERSION = "five-parsecs-procedure-v1-54";

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

      {(command.type === "crewMemberName" || command.type === "textInput" || command.type === "newWorldArrival") && (
        <TextInputPanel
          key={command.id}
          command={command}
          onSubmit={onTextSubmit}
        />
      )}

      {(command.type === "choice" || command.type === "decideTravel") && (
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
        "newWorldArrival",
        "choice",
        "decideTravel",
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



function CardField({ label, value }) {
  const hasValue = value || value === 0;

  return (
    <div className="fp-card-field">
      <span className="fp-card-field-label">{label}</span>
      <span className="fp-card-field-value">
        {hasValue ? value : <EmptyValue />}
      </span>
    </div>
  );
}

function DetailCard({ title, subtitle, badge, children, className = "" }) {
  return (
    <article className={`fp-detail-card ${className}`.trim()}>
      <div className="fp-detail-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {badge && <span className="fp-detail-badge">{badge}</span>}
      </div>
      {children && <div className="fp-detail-card-body">{children}</div>}
    </article>
  );
}

function DetailSection({ title, children, emptyText = "None yet." }) {
  const hasChildren = Boolean(children);

  return (
    <section className="fp-detail-section">
      <h3>{title}</h3>
      {hasChildren ? children : <p className="fp-muted">{emptyText}</p>}
    </section>
  );
}

function StatGrid({ stats, title = "Stats" }) {
  if (!stats || typeof stats !== "object") {
    return null;
  }

  const statRows = [
    ["reactions", "Reactions"],
    ["speed", "Speed"],
    ["combatSkill", "Combat"],
    ["toughness", "Toughness"],
    ["savvy", "Savvy"],
    ["luck", "Luck"],
  ].filter(([key]) => stats[key] !== undefined && stats[key] !== null);

  if (statRows.length === 0) {
    return null;
  }

  return (
    <div className="fp-stat-block">
      <h4>{title}</h4>
      <div className="fp-stat-grid">
        {statRows.map(([key, label]) => (
          <div className="fp-stat-cell" key={key}>
            <span>{label}</span>
            <strong>{stats[key]}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagList({ values }) {
  const list = Array.isArray(values)
    ? values.filter((value) => value !== undefined && value !== null && value !== "")
    : [];

  if (list.length === 0) {
    return null;
  }

  return (
    <div className="fp-tag-list">
      {list.map((value, index) => (
        <span className="fp-tag" key={`${formatPlainValue(value)}-${index}`}>
          {formatPlainValue(value)}
        </span>
      ))}
    </div>
  );
}

function RuleCardList({ groups }) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      values: Array.isArray(group.values)
        ? group.values.filter((value) => value !== undefined && value !== null && value !== "")
        : [],
    }))
    .filter((group) => group.values.length > 0);

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <div className="fp-rule-card-list">
      {visibleGroups.map((group) => (
        <article className="fp-rule-card" key={group.title}>
          <h4>{group.title}</h4>
          <ul>
            {group.values.map((value, index) => (
              <li key={`${group.title}-${index}`}>{formatPlainValue(value)}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function ItemCard({ item, fallbackTitle = "Item" }) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const traits = Array.isArray(item.traits) ? item.traits : [];
  const title = item.name || item.label || item.title || fallbackTitle;
  const subtitleParts = [item.category, item.type, item.source].filter(Boolean);

  return (
    <DetailCard
      title={title}
      subtitle={subtitleParts.join(" · ")}
      badge={item.equipped ? "Equipped" : item.status}
      className="fp-item-card"
    >
      <div className="fp-card-field-grid">
        {item.range !== undefined && <CardField label="Range" value={item.range} />}
        {item.shots !== undefined && <CardField label="Shots" value={item.shots} />}
        {item.damage !== undefined && <CardField label="Damage" value={item.damage} />}
        {item.hands !== undefined && <CardField label="Hands" value={item.hands} />}
      </div>
      <TagList values={traits} />
      {(item.description || item.effect || item.notes) && (
        <p className="fp-card-note">{item.description || item.effect || item.notes}</p>
      )}
    </DetailCard>
  );
}

function TableResultCard({ label, result }) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const title = result.label || result.name || result.value || label;
  const rollRange = result.rollRange || getTableRollRange(result);

  return (
    <DetailCard title={title} subtitle={label} badge={rollRange !== "—" ? rollRange : null}>
      {result.description && <p className="fp-card-note">{result.description}</p>}
    </DetailCard>
  );
}

function PendingEffectCard({ effect }) {
  if (!effect || typeof effect !== "object") {
    return null;
  }

  const title = effect.label || effect.effectType || effect.type || "Pending Effect";
  const subtitle = effect.source || effect.target || "Pending";

  return (
    <DetailCard title={title} subtitle={subtitle} badge={effect.count || effect.amount || effect.dice}>
      {effect.description && <p className="fp-card-note">{effect.description}</p>}
    </DetailCard>
  );
}

function CampaignSheet({ campaign }) {
  const safeCampaign = campaign && typeof campaign === "object" ? campaign : {};

  return (
    <AccordionSection title="Campaign" defaultOpen={false}>
      <div className="fp-card-stack">
        <DetailCard
          title={`Campaign Turn ${safeCampaign.turnNumber ?? 0}`}
          subtitle={`${safeCampaign.phase || "setup"} · ${safeCampaign.status || "setup"}`}
          badge={safeCampaign.setupComplete ? "Setup Complete" : "Setup"}
        >
          <div className="fp-card-field-grid">
            <CardField label="Current Step" value={safeCampaign.currentStep || "initialSetup"} />
            <CardField label="Crew Size" value={safeCampaign.crewSize || "Not set"} />
            <CardField label="Deploy Limit" value={safeCampaign.deployLimit || "Not set"} />
            <CardField label="Enemy Numbers" value={safeCampaign.enemyNumberRuleLabel || "Not set"} />
          </div>
        </DetailCard>

        <DetailCard title="Campaign Options" subtitle="Story, victory, and difficulty">
          <div className="fp-card-field-grid">
            <CardField label="Story Track" value={safeCampaign.storyTrackLabel || "No Story Track"} />
            <CardField label="Victory" value={safeCampaign.victoryConditionLabel || "No Victory Condition"} />
            <CardField label="Difficulty" value={safeCampaign.difficultyModeLabel || "Normal"} />
            <CardField label="Version" value={GAME_VERSION} />
          </div>
        </DetailCard>

        <DetailCard title="Story Points" subtitle={safeCampaign.storyPointRule || safeCampaign.startingStoryPointAdjustmentLabel || "Standard"}>
          <div className="fp-card-field-grid">
            <CardField label="Starting" value={safeCampaign.startingStoryPoints ?? 0} />
            <CardField label="Current" value={safeCampaign.storyPoints ?? safeCampaign.startingStoryPoints ?? 0} />
          </div>
        </DetailCard>

        {safeCampaign.lastStarshipTravelEvent && (
          <DetailCard
            title={safeCampaign.lastStarshipTravelEvent.title || safeCampaign.lastStarshipTravelEvent.label || "Starship Travel Event"}
            subtitle="Latest starship travel event"
            badge={safeCampaign.lastStarshipTravelEvent.roll ? `Roll ${safeCampaign.lastStarshipTravelEvent.roll}` : null}
          >
            {safeCampaign.lastStarshipTravelEvent.description && (
              <p className="fp-card-note">{safeCampaign.lastStarshipTravelEvent.description}</p>
            )}
          </DetailCard>
        )}
      </div>
    </AccordionSection>
  );
}

function CrewLogSheet({ crewLog }) {
  const members = Array.isArray(crewLog.crewMembers)
    ? crewLog.crewMembers
    : [];
  const crewDetails = crewLog.crewDetails || {};
  const inventory = Array.isArray(crewLog.inventory) ? crewLog.inventory : [];
  const pendingEffects = Array.isArray(crewLog.pendingEffects) ? crewLog.pendingEffects : [];
  const starship = crewLog.starship && typeof crewLog.starship === "object" ? crewLog.starship : null;

  function renderCrewDetail(member, index) {
    const detail = crewDetails[member.id] || {};
    const equipment = Array.isArray(detail.equipment) ? detail.equipment : [];
    const pendingMemberEffects = Array.isArray(detail.pendingEffects) ? detail.pendingEffects : [];
    const creationResults = [
      ["Crew Type", detail.crewType],
      ["Primary Alien", detail.primaryAlien],
      ["Strange Character", detail.strangeCharacter],
      ["Background", detail.background],
      ["Background 1", detail.background1],
      ["Background 2", detail.background2],
      ["Motivation", detail.motivation],
      ["Motivation 1", detail.motivation1],
      ["Motivation 2", detail.motivation2],
      ["Class", detail.class],
    ].filter(([, result]) => result);

    const ruleGroups = [
      { title: "Special Rules", values: detail.specialRules },
      { title: "Restrictions", values: detail.restrictions },
      { title: "Battle Rules", values: detail.battleRules },
      { title: "Movement Rules", values: detail.movementRules },
      { title: "Campaign Rules", values: detail.campaignRules },
      { title: "Campaign Turn Rules", values: detail.campaignTurnRules },
      { title: "Campaign Event Rules", values: detail.campaignEventRules },
      { title: "Post-Battle Rules", values: detail.postBattleRules },
      { title: "Injury Rules", values: detail.injuryRules },
      { title: "Equipment Rules", values: detail.equipmentRules },
      { title: "Advancement Rules", values: detail.advancementRules },
      { title: "Task Rules", values: detail.campaignTaskRules },
      { title: "Task Restrictions", values: detail.campaignTaskRestrictions },
      { title: "Event Rules", values: detail.eventRules },
      { title: "Creation Rules", values: detail.creationRules },
      { title: "Notes", values: detail.resultNotes },
    ];

    const flagSummary = formatFlagSummary(detail.flags);
    const saveSummary = summarizeList(detail.saves, (save) => {
      const type = save.type || "Save";
      const level = save.level || "";
      const source = save.source ? ` — ${save.source}` : "";
      return `${type} ${level}${source}`.trim();
    });

    return (
      <DetailCard
        title={`${member.number || index + 1}. ${member.name || "Unnamed Crew Member"}`}
        subtitle={[detail.characterType, detail.class?.label, detail.background?.label].filter(Boolean).join(" · ")}
        badge={detail.creationComplete ? "Complete" : "Creating"}
        className="fp-crew-member-card"
      >
        <StatGrid stats={detail.stats} />
        <StatGrid stats={detail.maxStats} title="Maximums" />

        <DetailSection title="Profile">
          <div className="fp-card-field-grid">
            <CardField label="Character Type" value={detail.characterType} />
            <CardField label="Implant Limit" value={detail.implantLimit} />
            <CardField label="Injury Table" value={detail.injuryTable} />
            <CardField label="Saves" value={saveSummary} />
            <CardField label="Flags" value={flagSummary} />
          </div>
        </DetailSection>

        <DetailSection title="Weapons & Gear" emptyText="No personal equipment yet.">
          {equipment.length > 0 ? (
            <div className="fp-card-list">
              {equipment.map((item, itemIndex) => (
                <ItemCard item={item} key={item.id || item.name || itemIndex} />
              ))}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Special Rules" emptyText="No special rules yet.">
          <RuleCardList groups={ruleGroups} />
        </DetailSection>

        <DetailSection title="Creation Results" emptyText="No creation results yet.">
          {creationResults.length > 0 ? (
            <div className="fp-card-list fp-compact-card-list">
              {creationResults.map(([label, result]) => (
                <TableResultCard label={label} result={result} key={`${member.id}-${label}`} />
              ))}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Pending Effects" emptyText="No pending effects.">
          {pendingMemberEffects.length > 0 ? (
            <div className="fp-card-list fp-compact-card-list">
              {pendingMemberEffects.map((effect, effectIndex) => (
                <PendingEffectCard effect={effect} key={effect.id || effectIndex} />
              ))}
            </div>
          ) : null}
        </DetailSection>
      </DetailCard>
    );
  }

  return (
    <AccordionSection title="Crew">
      <div className="fp-card-stack">
        <DetailCard title={crewLog.crewName || "Crew"} subtitle="Crew overview">
          <div className="fp-card-field-grid">
            <CardField label="Starting Crew" value={crewLog.startingCrewCount} />
            <CardField label="Credits" value={crewLog.credits ?? 0} />
            <CardField label="Pending Effects" value={pendingEffects.length} />
            <CardField label="Stash Items" value={inventory.length} />
          </div>
        </DetailCard>

        {starship && (
          <DetailCard
            title={starship.name || crewLog.ship || "Starship"}
            subtitle={starship.shipType || "Ship"}
            badge={starship.hasShip ? "Crew Ship" : null}
          >
            <div className="fp-card-field-grid">
              <CardField label="Hull" value={`${starship.hullDamage ?? 0} / ${starship.hullThreshold ?? 0}`} />
              <CardField label="Debt Owed" value={starship.debtOwed} />
              <CardField label="Financed" value={starship.financedAmount} />
            </div>
            <TagList values={starship.traits} />
          </DetailCard>
        )}

        <DetailSection title="Crew Stash" emptyText="No stash equipment yet.">
          {inventory.length > 0 ? (
            <div className="fp-card-list">
              {inventory.map((item, itemIndex) => (
                <ItemCard item={item} key={item.id || item.name || itemIndex} />
              ))}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Crew Members" emptyText="No crew members yet.">
          {members.length > 0 ? (
            <div className="fp-card-stack">
              {members.map((member, index) => (
                <div key={member.id || `${member.name}-${index}`}>{renderCrewDetail(member, index)}</div>
              ))}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Notes">
          <p>{crewLog.notes || <EmptyValue />}</p>
        </DetailSection>
      </div>
    </AccordionSection>
  );
}

function EncounterLogSheet({ encounterLog }) {
  const safeEncounter = encounterLog && typeof encounterLog === "object" ? encounterLog : {};

  return (
    <AccordionSection title="Encounter">
      <div className="fp-card-stack">
        <DetailCard title="Current Encounter" subtitle="Battle and job tracking">
          <div className="fp-card-field-grid">
            <CardField label="Patron" value={safeEncounter.patron} />
            <CardField label="Rival" value={safeEncounter.rival} />
            <CardField label="Objective" value={safeEncounter.objective} />
            <CardField label="Enemy" value={safeEncounter.enemy} />
            <CardField label="Result" value={safeEncounter.result} />
          </div>
        </DetailCard>

        <DetailSection title="Notes">
          <p>{safeEncounter.notes || <EmptyValue />}</p>
        </DetailSection>
      </div>
    </AccordionSection>
  );
}

function WorldLogSheet({ worldLog, campaign }) {
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
  const pendingWorldEffects = Array.isArray(worldLog.pendingEffects) ? worldLog.pendingEffects : [];
  const visitedWorlds = Array.isArray(worldLog.visitedWorlds) ? worldLog.visitedWorlds : [];
  const arrivalHistory = Array.isArray(worldLog.arrivalHistory) ? worldLog.arrivalHistory : [];
  const travelEvents = Array.isArray(worldLog.travelEvents)
    ? worldLog.travelEvents
    : Array.isArray(campaign?.travelEvents)
      ? campaign.travelEvents
      : [];

  const mostRecentPreviousWorld = visitedWorlds.length > 0
    ? visitedWorlds[visitedWorlds.length - 1]
    : null;
  const mostRecentPreviousWorldName = typeof mostRecentPreviousWorld === "object"
    ? mostRecentPreviousWorld.name
    : mostRecentPreviousWorld;

  return (
    <AccordionSection title="World">
      <div className="fp-card-stack">
        <DetailCard title="World Travel Overview" subtitle="Current and previous worlds">
          <div className="fp-card-field-grid">
            <CardField label="Current World" value={currentWorld.name || "Not set"} />
            <CardField label="Previous Worlds" value={visitedWorlds.length} />
            <CardField label="Most Recent Previous" value={mostRecentPreviousWorldName || "None"} />
            <CardField label="Travel Events" value={travelEvents.length} />
          </div>
        </DetailCard>

        <DetailCard title={currentWorld.name || "Current World"} subtitle="Current World">
          <div className="fp-card-field-grid">
            <CardField label="License" value={currentWorld.license || worldLog.license} />
            <CardField label="Invasion" value={currentWorld.invasion || worldLog.invasion} />
            <CardField label="Story Points" value={worldLog.storyPoints} />
            <CardField label="Rumors" value={worldLog.rumors} />
            <CardField label="Quest Rumors" value={worldLog.questRumors} />
            <CardField label="Pending Effects" value={pendingWorldEffects.length} />
          </div>
          <TagList values={traits} />
        </DetailCard>

        <DetailSection title="Patrons" emptyText="No patrons yet.">
          {patrons.length > 0 ? (
            <div className="fp-card-list fp-compact-card-list">
              {patrons.map((patron, index) => {
                const patronObject = typeof patron === "object" ? patron : { name: patron };
                return (
                  <DetailCard
                    title={patronObject.name || "Unnamed Patron"}
                    subtitle={patronObject.source || patronObject.type || "Patron"}
                    badge={patronObject.status}
                    key={patronObject.id || patronObject.name || index}
                  />
                );
              })}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Rivals" emptyText="No rivals yet.">
          {rivals.length > 0 ? (
            <div className="fp-card-list fp-compact-card-list">
              {rivals.map((rival, index) => {
                const rivalObject = typeof rival === "object" ? rival : { name: rival };
                return (
                  <DetailCard
                    title={rivalObject.name || "Unnamed Rival"}
                    subtitle={rivalObject.source || rivalObject.type || "Rival"}
                    badge={rivalObject.status}
                    key={rivalObject.id || rivalObject.name || index}
                  />
                );
              })}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Previous Worlds" emptyText="No previous worlds yet.">
          {visitedWorlds.length > 0 ? (
            <div className="fp-card-list fp-compact-card-list">
              {visitedWorlds.map((world, index) => {
                const worldObject = typeof world === "object" ? world : { name: world };
                const traitCount = Array.isArray(worldObject.traits) ? worldObject.traits.length : 0;
                return (
                  <DetailCard
                    title={worldObject.name || "Unnamed World"}
                    subtitle={worldObject.departedAt ? `Departed ${new Date(worldObject.departedAt).toLocaleDateString()}` : "Visited world"}
                    badge={traitCount > 0 ? `${traitCount} trait${traitCount === 1 ? "" : "s"}` : null}
                    key={worldObject.id || worldObject.name || index}
                  >
                    <div className="fp-card-field-grid">
                      <CardField label="License" value={worldObject.license} />
                      <CardField label="Invasion" value={worldObject.invasion} />
                      <CardField label="Traits" value={traitCount} />
                    </div>
                  </DetailCard>
                );
              })}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Arrival History" emptyText="No arrival history yet.">
          {arrivalHistory.length > 0 ? (
            <div className="fp-card-list fp-compact-card-list">
              {arrivalHistory.map((arrival, index) => {
                const arrivalObject = typeof arrival === "object" ? arrival : { worldName: arrival };
                return (
                  <DetailCard
                    title={arrivalObject.worldName || "Arrival"}
                    subtitle={arrivalObject.notes || "Arrived at world"}
                    badge={arrivalObject.turnNumber ? `Turn ${arrivalObject.turnNumber}` : null}
                    key={arrivalObject.id || `${arrivalObject.worldName}-${index}`}
                  />
                );
              })}
            </div>
          ) : null}
        </DetailSection>


        <DetailSection title="Starship Travel Events" emptyText="No starship travel events recorded yet.">
          {travelEvents.length > 0 ? (
            <div className="fp-card-list fp-compact-card-list">
              {travelEvents.slice().reverse().map((event, index) => {
                const eventObject = typeof event === "object" ? event : { title: event };
                return (
                  <DetailCard
                    title={eventObject.title || eventObject.label || "Starship Travel Event"}
                    subtitle={eventObject.worldName ? `Near ${eventObject.worldName}` : "Travel event"}
                    badge={eventObject.roll ? `Roll ${eventObject.roll}` : null}
                    key={eventObject.id || `${eventObject.title || eventObject.label}-${index}`}
                  >
                    {eventObject.description && <p className="fp-card-note">{eventObject.description}</p>}
                  </DetailCard>
                );
              })}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Pending World Effects" emptyText="No pending world effects.">
          {pendingWorldEffects.length > 0 ? (
            <div className="fp-card-list fp-compact-card-list">
              {pendingWorldEffects.map((effect, index) => (
                <PendingEffectCard effect={effect} key={effect.id || index} />
              ))}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Notes">
          <p>{currentWorld.notes || worldLog.notes || <EmptyValue />}</p>
        </DetailSection>
      </div>
    </AccordionSection>
  );
}

// ─── Status Bar ─────────────────────────────────────────────────────────────

const PHASE_LABELS = {
  setup: "Setup",
  travel: "Travel",
  world: "World",
  tabletopBattle: "Battle",
  postBattle: "Post-Battle",
  complete: "Complete",
};

const COMBAT_PHASE_LABELS = {
  "pre-battle": "Pre-Battle",
  "reaction-roll": "Reaction Roll",
  "quick-actions": "Quick Actions",
  "enemy-actions": "Enemy Actions",
  "slow-actions": "Slow Actions",
  "end-phase": "End Phase",
  "complete": "Complete",
};

function StatusBar({ campaign, encounter }) {
  const turnNumber = campaign?.turnNumber ?? 0;
  const phase = campaign?.phase ?? "setup";
  const phaseLabel = PHASE_LABELS[phase] || phase;
  const resolutionMode = encounter?.resolutionMode;
  const combatPhase = encounter?.combatPhase;
  const roundNumber = encounter?.roundNumber ?? 0;
  const inBattle = phase === "tabletopBattle" && resolutionMode && combatPhase && combatPhase !== "pre-battle";
  const combatPhaseLabel = COMBAT_PHASE_LABELS[combatPhase] || combatPhase;
  const modeLabel = resolutionMode === "no-minis" ? "No-Minis" : resolutionMode === "tabletop" ? "Miniatures" : null;

  return (
    <div className="fp-status-bar">
      <span className="fp-status-turn">Turn {turnNumber}</span>
      <span className="fp-status-sep">·</span>
      <span className="fp-status-phase">{phaseLabel}</span>
      {inBattle && modeLabel && (
        <>
          <span className="fp-status-sep">·</span>
          <span className="fp-status-mode">{modeLabel}</span>
          {roundNumber > 0 && (
            <>
              <span className="fp-status-sep">·</span>
              <span className="fp-status-round">Round {roundNumber}</span>
            </>
          )}
          {combatPhaseLabel && (
            <>
              <span className="fp-status-sep">·</span>
              <span className="fp-status-combat-phase">{combatPhaseLabel}</span>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Quick Reference Drawer ──────────────────────────────────────────────────

const QUICK_REF_TABS = [
  {
    id: "shooting",
    label: "Shooting",
    content: [
      { heading: "To Hit — Roll 1D6 + Combat Skill" },
      { text: "Open target within 6\" → 3+" },
      { text: "Open target within range → 5+" },
      { text: "Covered target within range → 6+" },
      { text: "Must fire at a target within 3\" if any enemies are within 3\"." },
      { heading: "Damage — Roll 1D6 + Damage Rating" },
      { text: "Target eliminated if die is a 6 OR modified score equals or exceeds Toughness." },
      { text: "Survivor is pushed 1\" back and Stunned." },
    ],
  },
  {
    id: "brawling",
    label: "Brawling",
    content: [
      { heading: "Brawling — Roll 1D6 + Combat Skill" },
      { text: "+2 Melee bonus / +1 Pistol bonus" },
      { text: "Loser takes a Hit. Both take a Hit on a draw." },
      { text: "Inflict additional Hit if rolling a 6." },
      { text: "Suffer additional Hit if rolling a 1." },
    ],
  },
  {
    id: "movement",
    label: "Movement",
    content: [
      { heading: "Movement" },
      { text: "Move up to Speed in inches (vertical or horizontal)." },
      { text: "Difficult terrain costs +1\" per 2\" moved." },
      { text: "If entering contact with enemy → Brawl." },
      { text: "Move +2\" bonus if not firing." },
      { heading: "Stunned Figures" },
      { text: "May Move OR make a Combat Action (not both)." },
      { text: "Remove 1 Stun marker after acting." },
    ],
  },
  {
    id: "morale",
    label: "Morale",
    content: [
      { heading: "Enemy Morale — End of Each Round" },
      { text: "Roll 1D6 per enemy casualty this round." },
      { text: "Each die ≤ Panic range → 1 enemy Bails." },
      { text: "Apply Bail starting with figure closest to enemy edge." },
      { text: "Fearless enemies never test Morale." },
      { heading: "Ending the Battle" },
      { text: "All enemies slain or Bailed → you Hold the Field." },
      { text: "Win condition: achieve your objective AND/OR Hold the Field." },
      { text: "Player forces do NOT test Morale — you may abandon by moving crew off any edge." },
    ],
  },
  {
    id: "terrain",
    label: "Terrain",
    content: [
      { heading: "Cover" },
      { text: "Covered target → needs 6+ to hit (instead of 5+)." },
      { text: "Difficult terrain: +1\" cost per 2\" of movement." },
      { heading: "Snap Fire" },
      { text: "Crew in Quick Actions may hold to fire when enemy moves, or delay to Slow Actions." },
      { text: "Firing during Enemy Actions prevents moving this round." },
      { text: "If moving enemy is Stunned by snap fire, they lose ability to fire this round." },
    ],
  },
];

function QuickRefDrawer({ open, onClose }) {
  const [activeTab, setActiveTab] = useState("shooting");
  const tab = QUICK_REF_TABS.find((t) => t.id === activeTab) || QUICK_REF_TABS[0];

  return (
    <>
      {open && <div className="fp-drawer-backdrop" onClick={onClose} />}
      <div className={`fp-quick-ref-drawer${open ? " fp-drawer-open" : ""}`} role="dialog" aria-label="Quick Reference">
        <div className="fp-drawer-handle-bar" />
        <div className="fp-drawer-header">
          <span className="fp-drawer-title">Quick Reference</span>
          <button className="fp-drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="fp-drawer-tabs">
          {QUICK_REF_TABS.map((t) => (
            <button
              key={t.id}
              className={`fp-drawer-tab${activeTab === t.id ? " fp-drawer-tab-active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="fp-drawer-content">
          {tab.content.map((item, i) =>
            item.heading ? (
              <p key={i} className="fp-drawer-heading">{item.heading}</p>
            ) : (
              <p key={i} className="fp-drawer-line">{item.text}</p>
            )
          )}
        </div>
      </div>
    </>
  );
}

// ─── Story Prompt Download ───────────────────────────────────────────────────

function buildStoryPrompt({ crewLog, worldLog, campaign, logEntries, startTurn, endTurn }) {
  const crewName = crewLog?.crewName || "the crew";
  const worldName = worldLog?.currentWorld?.name || "Unknown World";
  const turnNumber = campaign?.turnNumber ?? "?";
  const difficultyLabel = campaign?.difficultyModeLabel || "Normal";
  const crewMembers = Array.isArray(crewLog?.crewMembers) ? crewLog.crewMembers : [];
  const crewDetails = crewLog?.crewDetails || {};

  const rosterLines = crewMembers.map((m) => {
    const detail = crewDetails[m.id] || {};
    const stats = detail.stats || {};
    const type = detail.characterType || detail.category || "Human";
    return `  - ${m.name} (${type}) — Reactions ${stats.reactions ?? 1}, Speed ${stats.speed ?? 4}", Combat Skill +${stats.combatSkill ?? 0}, Toughness ${stats.toughness ?? 3}, Savvy +${stats.savvy ?? 0}`;
  }).join("\n");

  const rangeLabel = startTurn === endTurn
    ? `Turn ${startTurn}`
    : `Turns ${startTurn}–${endTurn}`;

  const narrativeEntries = logEntries.filter((e) => {
    const turnNum = e.turnNumber ?? e.turn ?? null;
    if (turnNum !== null) {
      const n = Number(turnNum);
      if (n < startTurn || n > endTurn) return false;
    }
    return e.type !== "commandCompleted" || (e.text && !e.text.startsWith("Loaded") && !e.text.startsWith("Queued"));
  });

  const logLines = narrativeEntries.map((e) => {
    const time = e.createdAt ? new Date(e.createdAt).toLocaleString() : "";
    return `[${time}] ${e.text || e.summary || e.body || JSON.stringify(e)}`;
  }).join("\n");

  return `# Five Parsecs From Home — Story Prompt
## Campaign: ${crewName} | ${rangeLabel} | ${worldName} | Difficulty: ${difficultyLabel}

---

## SYSTEM PROMPT

You are a pulp science-fiction author writing a vivid, immersive short story based on actual events from a solo tabletop campaign of Five Parsecs From Home.

Write in past tense, third person. Give the crew personality. Use the crew roster below to name characters. Make dice results feel consequential — a missed shot, a Bailed enemy, a rolled Battle Event should read like a story beat, not a stat. Include sensory detail (the smell of ozone, the echo of boots on metal grating). Keep it 3–5 paragraphs unless the events warrant more.

Do not invent major plot events that contradict the log. Embellish tone and sensation, not facts.

---

## CREW ROSTER

Campaign crew: ${crewName}
Current world: ${worldName}
Campaign turn: ${turnNumber}

${rosterLines || "  (No crew data available)"}

---

## CAMPAIGN EVENTS LOG (${rangeLabel})

${logLines || "(No log entries for this range)"}

---

## YOUR TASK

Write the story of these campaign events. Begin in the action. End on a note that makes the reader want to know what happens next turn.
`;
}

function StoryPromptModal({ open, onClose, campaign, crewLog, worldLog, logEntries }) {
  const maxTurn = campaign?.turnNumber ?? 1;
  const [startTurn, setStartTurn] = useState(maxTurn);
  const [endTurn, setEndTurn] = useState(maxTurn);

  const entryCount = useMemo(() => {
    return logEntries.filter((e) => {
      const t = e.turnNumber ?? e.turn ?? null;
      if (t !== null) {
        const n = Number(t);
        return n >= startTurn && n <= endTurn;
      }
      return true;
    }).length;
  }, [logEntries, startTurn, endTurn]);

  function handleDownload() {
    const prompt = buildStoryPrompt({ crewLog, worldLog, campaign, logEntries, startTurn: Number(startTurn), endTurn: Number(endTurn) });
    const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `five-parsecs-story-turn-${startTurn}${startTurn !== endTurn ? `-${endTurn}` : ""}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fp-modal-backdrop" onClick={onClose}>
      <div className="fp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fp-modal-header">
          <span className="fp-modal-title">Generate Story Prompt</span>
          <button className="fp-drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="fp-modal-desc">
          Downloads a <code>.md</code> file with your crew roster and campaign log. Paste it into any AI (Claude, ChatGPT, etc.) to generate a story.
        </p>
        <div className="fp-modal-row">
          <label className="fp-modal-label">
            Start Turn
            <input
              className="fp-modal-input"
              type="number"
              min={1}
              max={endTurn}
              value={startTurn}
              onChange={(e) => setStartTurn(Math.max(1, Math.min(Number(e.target.value), endTurn)))}
            />
          </label>
          <label className="fp-modal-label">
            End Turn
            <input
              className="fp-modal-input"
              type="number"
              min={startTurn}
              max={maxTurn}
              value={endTurn}
              onChange={(e) => setEndTurn(Math.max(startTurn, Math.min(Number(e.target.value), maxTurn)))}
            />
          </label>
        </div>
        <p className="fp-modal-count">{entryCount} log entries in this range</p>
        <button className="fp-primary-button fp-modal-download-btn" onClick={handleDownload}>
          Download Story Prompt
        </button>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────────────

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

  const [quickRefOpen, setQuickRefOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);

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
      <StatusBar
        campaign={safeGameState.campaign}
        encounter={gameState?.encounter}
      />

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
        <WorldLogSheet worldLog={safeGameState.worldLog} campaign={safeGameState.campaign} />
      </section>

      {/* Floating action buttons */}
      <div className="fp-fab-group">
        <button
          className="fp-fab fp-fab-story"
          onClick={() => setStoryModalOpen(true)}
          title="Generate Story Prompt"
          aria-label="Generate Story Prompt"
        >
          📖
        </button>
        <button
          className="fp-fab fp-fab-ref"
          onClick={() => setQuickRefOpen(true)}
          title="Quick Reference"
          aria-label="Quick Reference"
        >
          ?
        </button>
      </div>

      <QuickRefDrawer open={quickRefOpen} onClose={() => setQuickRefOpen(false)} />

      <StoryPromptModal
        open={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        campaign={safeGameState.campaign}
        crewLog={safeGameState.crewLog}
        worldLog={safeGameState.worldLog}
        logEntries={safeGameState.logEntries}
      />
    </main>
  );
}
