import React, { useMemo, useState } from "react";

import { CompactField } from "./CompactField";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "create", label: "Created" },
  { value: "delete", label: "Deleted" },
  { value: "undo", label: "Undo" },
  { value: "note", label: "Manual Notes" },
  { value: "crew", label: "Adventure" },
  { value: "crewMember", label: "Crew" },
  { value: "equipment", label: "Equipment" },
  { value: "world", label: "Worlds" },
  { value: "patron", label: "Patrons" },
  { value: "rival", label: "Rivals" },
  { value: "quest", label: "Quests" },
  { value: "rumor", label: "Rumors" },
  { value: "encounter", label: "Encounters" },
  { value: "encounterEnemy", label: "Encounter Enemies" },
  { value: "enemyTemplate", label: "Enemy Templates" },
];

const SORTS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
];

function getTimeValue(log) {
  if (!log.createdAt) return 0;

  if (typeof log.createdAt === "string") {
    return new Date(log.createdAt).getTime() || 0;
  }

  if (log.createdAt?.seconds) {
    return log.createdAt.seconds * 1000;
  }

  return 0;
}

function formatTimestamp(log) {
  const value = getTimeValue(log);
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

function stringifyValue(value) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function getLine(log) {
  const time = formatTimestamp(log);
  const action = (log.action || "log").toUpperCase();
  const target = log.targetName || log.targetType || "record";
  const summary = log.summary || log.body || `${log.action || "Log"} ${target}`;

  return `[${time}] ${action} — ${summary}`;
}

function getChangeLine(log) {
  if (!log.fieldPath && !log.oldValue && !log.newValue) {
    return "";
  }

  const field = log.fieldPath || "value";
  const oldValue = stringifyValue(log.oldValue);
  const newValue = stringifyValue(log.newValue);

  return `${field}: ${oldValue} → ${newValue}`;
}

export default function LogsPanel({ logEntries, onAdd }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const filteredLogs = useMemo(() => {
    let logs = [...logEntries];

    if (filter !== "all") {
      logs = logs.filter(
        (log) => log.action === filter || log.targetType === filter
      );
    }

    logs.sort((a, b) => {
      const aTime = getTimeValue(a);
      const bTime = getTimeValue(b);

      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return logs;
  }, [logEntries, filter, sort]);

  return (
    <div className="fp-panel">
      <div className="fp-toolbar">
        <button className="fp-btn fp-primary" onClick={onAdd}>
          Add Manual Note
        </button>
      </div>

      <div className="fp-grid">
        <CompactField
          label="Filter"
          value={filter}
          options={FILTERS}
          onChange={setFilter}
        />

        <CompactField
          label="Sort"
          value={sort}
          options={SORTS}
          onChange={setSort}
        />
      </div>

      <div className="fp-log-text-screen">
        {filteredLogs.length === 0 ? (
          <div className="fp-muted">No log entries.</div>
        ) : (
          filteredLogs.map((log) => {
            const changeLine = getChangeLine(log);

            return (
              <div key={log.logEntryId} className="fp-log-text-entry">
                <div className="fp-log-line-main">{getLine(log)}</div>

                {changeLine && (
                  <div className="fp-log-line-change">{changeLine}</div>
                )}

                {(log.targetType || log.targetId || log.createdBy) && (
                  <div className="fp-log-line-detail">
                    {log.targetType && <span>Target: {log.targetType}</span>}

                    {log.targetId && <span>ID: {log.targetId}</span>}

                    {log.createdBy && <span>By: {log.createdBy}</span>}
                  </div>
                )}

                {log.body && (
                  <div className="fp-log-line-body">{log.body}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}