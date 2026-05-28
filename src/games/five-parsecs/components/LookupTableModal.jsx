import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  formatLookupRollRange,
  getLookupRowKey,
  getLookupTable,
  rollOnLookupTable,
} from "../data/lookupTables";

const DEFAULT_APPLY_TARGETS = [
  {
    id: "notes",
    label: "Adventure Notes",
    targetType: "crewNotes",
  },
];

function clampColumnWidth(value) {
  return Math.max(8, Math.min(75, value));
}

function normalizeApplyTargets(applyTargets) {
  if (!Array.isArray(applyTargets) || applyTargets.length === 0) {
    return DEFAULT_APPLY_TARGETS;
  }

  return applyTargets
    .filter(Boolean)
    .map((target, index) => ({
      id: target.id || target.value || `target-${index}`,
      label: target.label || target.name || target.title || `Target ${index + 1}`,
      targetType: target.targetType || target.type || "",
      recordId: target.recordId || target.id || "",
      collectionName: target.collectionName || "",
      raw: target.raw || target,
    }));
}

function getRowsForTable(table) {
  return (table?.rows || []).map((row) => ({
    ...row,
    rowKey: getLookupRowKey(row),
  }));
}

export default function LookupTableModal({
  tableId,
  title = "",
  subtitle = "",
  applyLabel = "Apply",
  applyTargets = DEFAULT_APPLY_TARGETS,
  onApply,
  onClose,
}) {
  const table = getLookupTable(tableId);

  const normalizedApplyTargets = useMemo(() => {
    return normalizeApplyTargets(applyTargets);
  }, [applyTargets]);

  const rows = useMemo(() => {
    return getRowsForTable(table);
  }, [table]);

  const [selectedRowKey, setSelectedRowKey] = useState("");
  const [selectedApplyTargetId, setSelectedApplyTargetId] = useState(
    normalizedApplyTargets[0]?.id || "notes"
  );
  const [rolledValue, setRolledValue] = useState(null);
  const [message, setMessage] = useState("");

  const [columnWidths, setColumnWidths] = useState({
    roll: 10,
    result: 22,
    description: 54,
    use: 14,
  });

  const resizeStateRef = useRef(null);

  const selectedApplyTarget =
    normalizedApplyTargets.find((target) => target.id === selectedApplyTargetId) ||
    normalizedApplyTargets[0] ||
    DEFAULT_APPLY_TARGETS[0];

  useEffect(() => {
    const stillExists = normalizedApplyTargets.some((target) => {
      return target.id === selectedApplyTargetId;
    });

    if (!stillExists) {
      setSelectedApplyTargetId(normalizedApplyTargets[0]?.id || "notes");
    }
  }, [normalizedApplyTargets, selectedApplyTargetId]);

  function beginColumnResize(event, columnName) {
    event.preventDefault();
    event.stopPropagation();

    resizeStateRef.current = {
      columnName,
      startX: event.clientX,
      startWidths: { ...columnWidths },
    };

    window.addEventListener("mousemove", resizeColumn);
    window.addEventListener("mouseup", endColumnResize);
  }

  function resizeColumn(event) {
    const resizeState = resizeStateRef.current;
    if (!resizeState) return;

    const modalWidth =
      document.querySelector(".fp-roll-table-modal")?.clientWidth || 1000;

    const deltaPixels = event.clientX - resizeState.startX;
    const deltaPercent = (deltaPixels / modalWidth) * 100;

    const nextWidths = { ...resizeState.startWidths };

    if (resizeState.columnName === "roll") {
      nextWidths.roll = clampColumnWidth(
        resizeState.startWidths.roll + deltaPercent
      );
      nextWidths.description = clampColumnWidth(
        resizeState.startWidths.description - deltaPercent
      );
    }

    if (resizeState.columnName === "result") {
      nextWidths.result = clampColumnWidth(
        resizeState.startWidths.result + deltaPercent
      );
      nextWidths.description = clampColumnWidth(
        resizeState.startWidths.description - deltaPercent
      );
    }

    if (resizeState.columnName === "description") {
      nextWidths.description = clampColumnWidth(
        resizeState.startWidths.description + deltaPercent
      );
      nextWidths.use = clampColumnWidth(
        resizeState.startWidths.use - deltaPercent
      );
    }

    const total =
      nextWidths.roll +
      nextWidths.result +
      nextWidths.description +
      nextWidths.use;

    if (total > 100) {
      const overage = total - 100;
      nextWidths.description = clampColumnWidth(
        nextWidths.description - overage
      );
    }

    setColumnWidths(nextWidths);
  }

  function endColumnResize() {
    resizeStateRef.current = null;

    window.removeEventListener("mousemove", resizeColumn);
    window.removeEventListener("mouseup", endColumnResize);
  }

  function handleRoll() {
    if (!table) {
      setMessage(`Unknown lookup table: ${tableId}`);
      return;
    }

    const result = rollOnLookupTable(tableId);
    const rowKey = getLookupRowKey(result.row);

    setRolledValue(result.roll);
    setSelectedRowKey(rowKey);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    if (!result.row) {
      setMessage(`Rolled ${result.roll}, but no matching row was found.`);
      return;
    }

    setMessage(
      `Rolled ${result.roll}: ${result.row.title}. Apply it to ${selectedApplyTarget.label}, or choose another row.`
    );
  }

  async function handleApply(row) {
    if (!row) {
      setMessage("Select or roll a row before applying.");
      return;
    }

    setSelectedRowKey(row.rowKey);

    if (onApply) {
      await onApply({
        tableId,
        table,
        row,
        rawRow: row.raw || row,
        roll: rolledValue,
        applyTo: selectedApplyTarget,
      });
    }
  }

  if (!table) {
    return (
      <div className="fp-modal-backdrop">
        <div className="fp-modal fp-roll-table-modal">
          <div className="fp-modal-header">
            <div>
              <div className="fp-modal-title">Unknown Lookup Table</div>
              <div className="fp-modal-subtitle">{tableId}</div>
            </div>

            <button className="fp-btn" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="fp-error">
            No lookup table exists for: {tableId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fp-modal-backdrop">
      <div className="fp-modal fp-roll-table-modal">
        <div className="fp-modal-header">
          <div>
            <div className="fp-modal-title">
              {title || table.label || table.title}
            </div>

            <div className="fp-modal-subtitle">
              {subtitle || table.description || table.group}
            </div>

            <div className="fp-modal-subtitle">
              Dice: {table.dice}
              {table.rulesPage ? ` · Rules p.${table.rulesPage}` : ""}
            </div>
          </div>

          <button className="fp-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="fp-actions fp-catalog-toolbar">
          <button className="fp-btn fp-primary" onClick={handleRoll}>
            Roll {table.dice}
          </button>

          <label className="fp-apply-to-field">
            <span>Apply To</span>

            <select
              value={selectedApplyTargetId}
              onChange={(event) => setSelectedApplyTargetId(event.target.value)}
            >
              {normalizedApplyTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>

          {rolledValue !== null && (
            <span className="fp-muted">Last roll: {rolledValue}</span>
          )}
        </div>

        {message && <div className="fp-muted">{message}</div>}

        <div className="fp-roll-table-wrap">
          <table className="fp-roll-table">
            <colgroup>
              <col style={{ width: `${columnWidths.roll}%` }} />
              <col style={{ width: `${columnWidths.result}%` }} />
              <col style={{ width: `${columnWidths.description}%` }} />
              <col style={{ width: `${columnWidths.use}%` }} />
            </colgroup>

            <thead>
              <tr>
                <th>
                  <div className="fp-resizable-th">
                    Roll
                    <span
                      className="fp-column-resizer"
                      onMouseDown={(event) => beginColumnResize(event, "roll")}
                    />
                  </div>
                </th>

                <th>
                  <div className="fp-resizable-th">
                    Result
                    <span
                      className="fp-column-resizer"
                      onMouseDown={(event) => beginColumnResize(event, "result")}
                    />
                  </div>
                </th>

                <th>
                  <div className="fp-resizable-th">
                    Description / Effect
                    <span
                      className="fp-column-resizer"
                      onMouseDown={(event) =>
                        beginColumnResize(event, "description")
                      }
                    />
                  </div>
                </th>

                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const isSelected = row.rowKey === selectedRowKey;

                return (
                  <tr
                    key={row.rowKey}
                    className={isSelected ? "fp-selected-roll-row" : ""}
                    onClick={() => setSelectedRowKey(row.rowKey)}
                  >
                    <td>{formatLookupRollRange(row)}</td>

                    <td>
                      <strong>{row.title}</strong>
                    </td>

                    <td>{row.description}</td>

                    <td>
                      <button
                        className="fp-btn fp-btn-compact"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleApply(row);
                        }}
                      >
                        {applyLabel}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="fp-table-empty">
                    No rows found for this table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="fp-muted fp-roll-table-help">
          Drag the right edge of the Roll, Result, or Description column header
          to adjust column widths.
        </div>
      </div>
    </div>
  );
}