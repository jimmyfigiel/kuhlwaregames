import React from "react";
import AccordionSection from "./AccordionSection";
import { CompactField, CompactCheckbox, CompactListField } from "./CompactField";
import { INVASION_STATUSES, LICENSING_STATUSES } from "../fiveParsecsSchema";

export default function WorldsPanel({
  worlds,
  patrons,
  rivals,
  logEntries,
  onAdd,
  onUpdate,
  onDelete,
  onAddPatron,
  onAddRival,
  onAddLog,
}) {
  function patchNested(world, key, patch) {
    onUpdate("worlds", world.worldId, { [key]: { ...(world[key] || {}), ...patch } });
  }

  return (
    <div className="fp-panel">
      <div className="fp-toolbar">
        <button className="fp-btn fp-primary" onClick={onAdd}>Add World</button>
      </div>

      {worlds.map((w) => {
        const worldPatrons = patrons.filter((p) => p.worldId === w.worldId);
        const worldRivals = rivals.filter((r) => r.worldId === w.worldId);
        const worldLogs = logEntries.filter((l) => l.targetType === "world" && l.targetId === w.worldId);

        return (
          <AccordionSection
            key={w.worldId}
            title={w.name || "World"}
            subtitle={w.currentWorld ? "current" : ""}
            actions={<button className="fp-btn" onClick={() => onAddLog(w.worldId)}>Log</button>}
          >
            <div className="fp-grid">
              <CompactField label="Name" value={w.name} onChange={(v) => onUpdate("worlds", w.worldId, { name: v })} />
              <CompactField label="Type" value={w.type} onChange={(v) => onUpdate("worlds", w.worldId, { type: v })} />
              <CompactListField label="Traits" value={w.worldTraits || []} onChange={(v) => onUpdate("worlds", w.worldId, { worldTraits: v })} />
              <CompactCheckbox label="Current World" checked={w.currentWorld} onChange={(v) => onUpdate("worlds", w.worldId, { currentWorld: v })} />
              <CompactCheckbox label="Visited" checked={w.visited} onChange={(v) => onUpdate("worlds", w.worldId, { visited: v })} />
            </div>

            <AccordionSection title="Licensing" defaultOpen>
              <div className="fp-grid">
                <CompactCheckbox label="Required" checked={w.licensing?.required} onChange={(v) => patchNested(w, "licensing", { required: v })} />
                <CompactField label="Type" value={w.licensing?.licenseType} onChange={(v) => patchNested(w, "licensing", { licenseType: v })} />
                <CompactField label="Status" value={w.licensing?.status} options={LICENSING_STATUSES} onChange={(v) => patchNested(w, "licensing", { status: v })} />
                <CompactField label="Notes" value={w.licensing?.notes} textarea onChange={(v) => patchNested(w, "licensing", { notes: v })} />
              </div>
            </AccordionSection>

            <AccordionSection title="Invasion" defaultOpen>
              <div className="fp-grid">
                <CompactField label="Status" value={w.invasion?.status} options={INVASION_STATUSES} onChange={(v) => patchNested(w, "invasion", { status: v })} />
                <CompactField label="Invader Type" value={w.invasion?.invaderType} onChange={(v) => patchNested(w, "invasion", { invaderType: v })} />
                <CompactField label="Progress" value={w.invasion?.progress} onChange={(v) => patchNested(w, "invasion", { progress: v })} />
                <CompactField label="Notes" value={w.invasion?.notes} textarea onChange={(v) => patchNested(w, "invasion", { notes: v })} />
              </div>
            </AccordionSection>

            <AccordionSection title={`Patrons (${worldPatrons.length})`} actions={<button className="fp-btn" onClick={() => onAddPatron(w.worldId)}>Add</button>}>
              {worldPatrons.map((p) => (
                <div key={p.patronId} className="fp-inline-card">
                  <CompactField label="Name" value={p.name} onChange={(v) => onUpdate("patrons", p.patronId, { name: v })} />
                  <CompactField label="Type" value={p.type} onChange={(v) => onUpdate("patrons", p.patronId, { type: v })} />
                  <CompactField label="Status" value={p.status} onChange={(v) => onUpdate("patrons", p.patronId, { status: v })} />
                  <CompactField label="Benefits" value={p.benefits} onChange={(v) => onUpdate("patrons", p.patronId, { benefits: v })} />
                  <button className="fp-btn fp-danger" onClick={() => onDelete("patrons", p.patronId)}>Delete</button>
                </div>
              ))}
            </AccordionSection>

            <AccordionSection title={`Rivals (${worldRivals.length})`} actions={<button className="fp-btn" onClick={() => onAddRival(w.worldId)}>Add</button>}>
              {worldRivals.map((r) => (
                <div key={r.rivalId} className="fp-inline-card">
                  <CompactField label="Name" value={r.name} onChange={(v) => onUpdate("rivals", r.rivalId, { name: v })} />
                  <CompactField label="Type" value={r.type} onChange={(v) => onUpdate("rivals", r.rivalId, { type: v })} />
                  <CompactField label="Reason" value={r.reason} onChange={(v) => onUpdate("rivals", r.rivalId, { reason: v })} />
                  <CompactField label="Status" value={r.status} onChange={(v) => onUpdate("rivals", r.rivalId, { status: v })} />
                  <button className="fp-btn fp-danger" onClick={() => onDelete("rivals", r.rivalId)}>Delete</button>
                </div>
              ))}
            </AccordionSection>

            <AccordionSection title={`World Log (${worldLogs.length})`}>
              {worldLogs.map((l) => <div key={l.logEntryId} className="fp-log-line"><b>{l.title || "Log"}</b>: {l.body}</div>)}
            </AccordionSection>

            <button className="fp-btn fp-danger" onClick={() => onDelete("worlds", w.worldId)}>Delete World</button>
          </AccordionSection>
        );
      })}
    </div>
  );
}
