import React from "react";
import AccordionSection from "./AccordionSection";
import { CompactField, CompactCheckbox } from "./CompactField";

const STATS = ["reactions", "speed", "combat", "toughness", "savvy", "luck"];

export default function CrewMembersPanel({ crewMembers, equipment, onAdd, onUpdate, onDelete, onAddLog }) {
  function patchStats(member, field, value) {
    onUpdate("crewMembers", member.crewMemberId, {
      stats: { ...(member.stats || {}), [field]: value },
    });
  }

  return (
    <div className="fp-panel">
      <div className="fp-toolbar">
        <button className="fp-btn fp-primary" onClick={onAdd}>Add Crew Member</button>
      </div>

      {crewMembers.map((m) => {
        const assigned = equipment.filter((e) => e.locationType === "crewMember" && e.crewMemberId === m.crewMemberId);
        return (
          <AccordionSection
            key={m.crewMemberId}
            title={m.name || "Crew Member"}
            subtitle={m.status || ""}
            actions={<button className="fp-btn" onClick={() => onAddLog(m.crewMemberId)}>Log</button>}
          >
            <div className="fp-grid">
              <CompactField label="Name" value={m.name} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { name: v })} />
              <CompactField label="Role" value={m.role} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { role: v })} />
              <CompactField label="Species/Type" value={m.speciesType} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { speciesType: v })} />
              <CompactField label="Background" value={m.background} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { background: v })} />
              <CompactField label="Motivation" value={m.motivation} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { motivation: v })} />
              <CompactField label="Class" value={m.class} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { class: v })} />
              <CompactField label="XP" type="number" value={m.xp} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { xp: v })} />
              <CompactField label="Injury" value={m.injury} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { injury: v })} />
              <CompactField label="Status" value={m.status} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { status: v })} />
              <CompactCheckbox label="Captain" checked={m.isCaptain} onChange={(v) => onUpdate("crewMembers", m.crewMemberId, { isCaptain: v })} />
              {STATS.map((s) => (
                <CompactField key={s} label={s} type="number" value={m.stats?.[s] ?? 0} onChange={(v) => patchStats(m, s, v)} />
              ))}
            </div>

            <div className="fp-mini-title">Assigned Gear</div>
            <div className="fp-chip-row">
              {assigned.length ? assigned.map((e) => <span key={e.equipmentId} className="fp-chip">{e.name || "item"}</span>) : <span className="fp-muted">None</span>}
            </div>

            <div className="fp-actions">
              <button className="fp-btn fp-danger" onClick={() => onDelete("crewMembers", m.crewMemberId)}>Delete</button>
            </div>
          </AccordionSection>
        );
      })}
    </div>
  );
}
