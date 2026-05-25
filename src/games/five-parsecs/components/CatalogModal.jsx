import React, { useMemo, useState } from "react";

function stringifyValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return "";
  return String(value);
}

function rowMatchesSearch(row, search) {
  const term = search.trim().toLowerCase();

  if (!term) return true;

  return Object.entries(row).some(([key, value]) => {
    if (key.startsWith("__")) return false;
    return stringifyValue(value).toLowerCase().includes(term);
  });
}

function getRowKey(row) {
  if (row?.__rowKey) return row.__rowKey;

  const raw = row?.__raw || row;

  return [
    raw?.rollMin ?? "",
    raw?.rollMax ?? "",
    raw?.name ?? "",
    raw?.result ?? "",
    raw?.ship ?? "",
    raw?.weaponKey ?? "",
    raw?.itemKey ?? "",
  ].join("::");
}

function renderCellValue(row, column) {
  if (column === "roll") {
    if (row.roll) return row.roll;

    if (
      row.rollMin !== undefined &&
      row.rollMax !== undefined &&
      row.rollMin === row.rollMax
    ) {
      return String(row.rollMin);
    }

    if (row.rollMin !== undefined && row.rollMax !== undefined) {
      return `${row.rollMin}-${row.rollMax}`;
    }
  }

  return stringifyValue(row[column]);
}

export default function CatalogModal({
  title,
  subtitle = "",
  columns,
  rows,
  actionLabel = "Add",
  onSelect,
  onClose,
  onRoll,
  rollLabel = "Roll",
  headerControls = null,
  highlightedRowKey = "",
  rollSummary = "",
}) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    return rows.filter((row) => rowMatchesSearch(row, search));
  }, [rows, search]);

  return (
    <div className="fp-modal-backdrop">
      <div className="fp-modal fp-catalog-modal">
        <div className="fp-modal-header">
          <div>
            <div className="fp-modal-title">{title}</div>

            {subtitle && <div className="fp-modal-subtitle">{subtitle}</div>}
          </div>

          <button className="fp-btn fp-danger" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="fp-toolbar fp-catalog-toolbar">
          <label className="fp-field fp-field-wide">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          {headerControls}

          {onRoll && (
            <button className="fp-btn fp-primary" onClick={onRoll}>
              {rollLabel}
            </button>
          )}
        </div>

        {rollSummary && <div className="fp-turn-summary">{rollSummary}</div>}

        <div className="fp-table-wrap fp-catalog-table-wrap">
          <table className="fp-table fp-catalog-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}

                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => {
                const rowKey = getRowKey(row);
                const isHighlighted = highlightedRowKey === rowKey;

                return (
                  <tr
                    key={rowKey}
                    className={isHighlighted ? "fp-selected-roll-row" : ""}
                  >
                    {columns.map((column) => (
                      <td key={`${rowKey}-${column}`} className="fp-catalog-cell">
                        {renderCellValue(row, column)}
                      </td>
                    ))}

                    <td>
                      <button
                        className="fp-btn fp-primary"
                        onClick={() => onSelect(row)}
                      >
                        {actionLabel}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="fp-table-empty">
                    No matching records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}