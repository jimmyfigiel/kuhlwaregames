import BaseCommand from "./BaseCommand";
import { removeUndefinedValues } from "../utils";

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const min = Number(entry.min ?? entry.roll ?? 0);
  const max = Number(entry.max ?? entry.roll ?? min);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  return removeUndefinedValues({
    ...entry,
    min,
    max,
  });
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function findResult(table, roll) {
  const entries = Array.isArray(table?.entries) ? table.entries : [];

  return (
    entries
      .map(normalizeEntry)
      .filter(Boolean)
      .find((entry) => roll >= entry.min && roll <= entry.max) || null
  );
}

function normalizeTable(table) {
  const safeTable = table || {
    id: "unknown-table",
    title: "Unknown Table",
    dice: "d100",
    sides: 100,
    entries: [],
  };

  return removeUndefinedValues({
    ...safeTable,
    entries: Array.isArray(safeTable.entries)
      ? safeTable.entries.map(normalizeEntry).filter(Boolean)
      : [],
  });
}

export class TableRollCommand extends BaseCommand {
  constructor({
    id,
    title = "Choose from Table",
    table = null,
    roll = null,
    result = null,
    saveTo = null,
    buttonText = "Select",
    rollButtonText = "Roll with App Dice",
    afterSelectionCommands = [],
    status = "pending",
    pauseAfter = false,
    visible = true,
  }) {
    super({
      id,
      type: "tableRoll",
      title,
      status,
      pauseAfter,
      visible,
    });

    this.table = normalizeTable(table);
    this.roll = roll;
    this.result = result;
    this.saveTo = saveTo;
    this.buttonText = buttonText;
    this.rollButtonText = rollButtonText;
    this.afterSelectionCommands = Array.isArray(afterSelectionCommands)
      ? afterSelectionCommands
      : [];
  }

  rollForResult() {
    const sides = Number(this.table?.sides || 100);
    const safeSides = Number.isFinite(sides) && sides > 0 ? Math.floor(sides) : 100;
    const roll = rollDie(safeSides);
    const result = findResult(this.table, roll);

    return {
      roll,
      result: result || {
        label: "No result",
        description: `No table entry matched roll ${roll}.`,
      },
    };
  }

  execute(engineContext) {
    this.status = "waitingForUser";

    engineContext.showActiveCommand(this);
    engineContext.setStatus("waitingForUser");
    engineContext.stopAfterCurrentCommand();

    engineContext.addLogEntry({
      type: "commandStarted",
      text: `Started table selection: ${this.table?.title || this.title}`,
      commandId: this.id,
    });
  }

  resolve(engineContext, input = {}) {
    const selectedEntry = normalizeEntry(input.selectedEntry || input.result);
    const roll = input.roll ?? null;

    if (!selectedEntry) {
      engineContext.setStatus("waitingForUser");
      engineContext.showActiveCommand({
        ...this,
        status: "waitingForUser",
        errorMessage: "Please select a table result.",
      });
      engineContext.stopAfterCurrentCommand();
      return;
    }

    this.roll = roll;
    this.result = selectedEntry;

    const saveSelectionCommands = [];

    if (this.saveTo) {
      const { followUpCommands, ...resultWithoutFollowUps } = this.result || {};
      const selectedResult = removeUndefinedValues({
        tableId: this.table?.id,
        tableTitle: this.table?.title,
        roll: this.roll,
        ...resultWithoutFollowUps,
      });

      if (!engineContext.commandFactory?.updateState) {
        throw new Error("TableRollCommand requires commandFactory.updateState() to save table selections.");
      }

      saveSelectionCommands.push(
        engineContext.commandFactory.updateState({
          id: `${this.id}-save-selection`,
          title: `${this.title}: Save Selection`,
          operations: [
            {
              op: "set",
              path: this.saveTo,
              value: selectedResult,
            },
          ],
          pauseAfter: false,
          visible: false,
        })
      );
    }

    const afterSelectionCommands = Array.isArray(this.afterSelectionCommands)
      ? this.afterSelectionCommands
      : [];
    const followUpCommands = Array.isArray(this.result?.followUpCommands)
      ? this.result.followUpCommands
      : [];
    const commandsToPush = [
      ...saveSelectionCommands,
      ...afterSelectionCommands,
      ...followUpCommands,
    ];

    if (commandsToPush.length > 0) {
      engineContext.pushCommandsToTop(commandsToPush);
    }

    this.status = "complete";
    engineContext.clearActiveCommand();
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Selected table result: ${this.table?.title || this.title} → ${this.result?.label || "No result"}`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      table: this.table,
      roll: this.roll,
      result: this.result,
      saveTo: this.saveTo,
      buttonText: this.buttonText,
      rollButtonText: this.rollButtonText,
      afterSelectionCommands: this.afterSelectionCommands,
    });
  }
}

export default TableRollCommand;
