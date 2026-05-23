import React from "react";
import AccordionSection from "./AccordionSection";
import { CompactField, CompactListField } from "./CompactField";
import { EQUIPMENT_CATEGORIES, EQUIPMENT_LOCATIONS } from "../fiveParsecsSchema";

export default function EquipmentPanel({ equipment, crewMembers, onAdd, onUpdate, onDelete, onAddLog }) {
  function patchNested(e, key, patch) {
    onUpdate("equipment", e.equipmentId, { [key]: { ...(e[key] || {}), ...patch } });
  }

  return (
    <div className="fp-panel">
      <div className="fp-toolbar">
        <button className="fp-btn fp-primary" onClick={onAdd}>Add Equipment</button>
      </div>

      {equipment.map((e) => (
        <AccordionSection
          key={e.equipmentId}
          title={e.name || "Equipment"}
          subtitle={`${e.category || "item"} · ${e.locationType || "stash"}`}
          actions={<button className="fp-btn" onClick={() => onAddLog(e.equipmentId)}>Log</button>}
        >
          <div className="fp-grid">
            <CompactField label="Name" value={e.name} onChange={(v) => onUpdate("equipment", e.equipmentId, { name: v })} />
            <CompactField label="Category" value={e.category} options={EQUIPMENT_CATEGORIES} onChange={(v) => onUpdate("equipment", e.equipmentId, { category: v })} />
            <CompactField label="Subtype" value={e.subtype} onChange={(v) => onUpdate("equipment", e.equipmentId, { subtype: v })} />
            <CompactField label="Location" value={e.locationType} options={EQUIPMENT_LOCATIONS} onChange={(v) => onUpdate("equipment", e.equipmentId, { locationType: v, crewMemberId: v === "stash" ? "" : e.crewMemberId })} />
            {e.locationType === "crewMember" && (
              <CompactField label="Crew Member" value={e.crewMemberId} options={crewMembers.map((m) => m.crewMemberId)} onChange={(v) => onUpdate("equipment", e.equipmentId, { crewMemberId: v })} />
            )}
            <CompactField label="Quantity" type="number" value={e.quantity} onChange={(v) => onUpdate("equipment", e.equipmentId, { quantity: v })} />
          </div>

          {e.category === "weapon" && (
            <AccordionSection title="Weapon Stats" defaultOpen>
              <div className="fp-grid">
                <CompactField label="Range" value={e.weapon?.range} onChange={(v) => patchNested(e, "weapon", { range: v })} />
                <CompactField label="Shots" type="number" value={e.weapon?.shots} onChange={(v) => patchNested(e, "weapon", { shots: v })} />
                <CompactField label="Damage" type="number" value={e.weapon?.damage} onChange={(v) => patchNested(e, "weapon", { damage: v })} />
                <CompactListField label="Traits" value={e.weapon?.traits || []} onChange={(v) => patchNested(e, "weapon", { traits: v })} />
              </div>
            </AccordionSection>
          )}

          {e.category === "armor" && (
            <AccordionSection title="Armor Stats" defaultOpen>
              <div className="fp-grid">
                <CompactField label="Armor" type="number" value={e.armor?.armorValue} onChange={(v) => patchNested(e, "armor", { armorValue: v })} />
                <CompactListField label="Traits" value={e.armor?.traits || []} onChange={(v) => patchNested(e, "armor", { traits: v })} />
              </div>
            </AccordionSection>
          )}

          {e.category === "gear" && (
            <AccordionSection title="Gear Stats" defaultOpen>
              <div className="fp-grid">
                <CompactField label="Effect" value={e.gear?.effect} textarea onChange={(v) => patchNested(e, "gear", { effect: v })} />
                <CompactField label="Uses" type="number" value={e.gear?.uses} onChange={(v) => patchNested(e, "gear", { uses: v })} />
                <CompactListField label="Traits" value={e.gear?.traits || []} onChange={(v) => patchNested(e, "gear", { traits: v })} />
              </div>
            </AccordionSection>
          )}

          <button className="fp-btn fp-danger" onClick={() => onDelete("equipment", e.equipmentId)}>Delete</button>
        </AccordionSection>
      ))}
    </div>
  );
}
