import React, { useMemo, useState } from "react";

function stringifyValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "";
  return String(value);
}

function rowMatchesSearch(row, search) {
  const term = search.trim().toLowerCase();

  if (!term) return true;

  return Object.values(row).some((value) => {
    return stringifyValue(value).toLowerCase().includes(term);
  });
}

export default function CatalogModal({
  title,
  subtitle = "",
  columns,
  rows,
  actionLabel = "Add",
  onSelect,
  onClose,
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

            {subtitle && (
              <div className="fp-modal-subtitle">{subtitle}</div>
            )}
          </div>

          <button className="fp-btn fp-danger" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="fp-toolbar">
          <label className="fp-field fp-field-wide">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

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
              {filteredRows.map((row) => (
                <tr key={row.name}>
                  {columns.map((column) => (
                    <td key={`${row.name}-${column}`} className="fp-catalog-cell">
                      {stringifyValue(row[column])}
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
              ))}

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