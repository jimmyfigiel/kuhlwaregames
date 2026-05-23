import React from "react";
import AccordionSection from "./AccordionSection";
import { CompactField } from "./CompactField";
import { LOG_TARGET_TYPES } from "../fiveParsecsSchema";

export default function LogsPanel({ logEntries, crewMembers, worlds, encounters, onAdd, onUpdate, onDelete }) {
  function targetLabel(log) {
    if (log.targetType === "crewMember") return crewMembers.find((m) => m.crewMemberId === log.targetId)?.name || log.targetId;
    if (log.targetType === "world") return worlds.find((w) => w.worldId === log.targetId)?.name || log.targetId;
    if (log.targetType === "encounter") return encounters.find((e) => e.encounterId === log.targetId)?.mission || log.targetId;
    return log.targetId || log.targetType;
  }

  return (
    <div className="fp-panel">
      <div className="fp-toolbar">
        <button className="fp-btn fp-primary" onClick={onAdd}>Add General Log</button>
      </div>

      {logEntries.map((l) => (
        <AccordionSection key={l.logEntryId} title={l.title || "Log Entry"} subtitle={`${l.targetType}: ${targetLabel(l)}`}>
          <div className="fp-grid">
            <CompactField label="Title" value={l.title} onChange={(v) => onUpdate("logEntries", l.logEntryId, { title: v })} />
            <CompactField label="Target Type" value={l.targetType} options={LOG_TARGET_TYPES} onChange={(v) => onUpdate("logEntries", l.logEntryId, { targetType: v })} />
            <CompactField label="Target ID" value={l.targetId} onChange={(v) => onUpdate("logEntries", l.logEntryId, { targetId: v })} />
            <CompactField label="Turn" type="number" value={l.turnNumber} onChange={(v) => onUpdate("logEntries", l.logEntryId, { turnNumber: v })} />
            <CompactField label="Date Label" value={l.dateLabel} onChange={(v) => onUpdate("logEntries", l.logEntryId, { dateLabel: v })} />
            <CompactField label="Body" value={l.body} textarea onChange={(v) => onUpdate("logEntries", l.logEntryId, { body: v })} />
          </div>
          <button className="fp-btn fp-danger" onClick={() => onDelete("logEntries", l.logEntryId)}>Delete</button>
        </AccordionSection>
      ))}
    </div>
  );
}
