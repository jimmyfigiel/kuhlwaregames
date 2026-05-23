import React from "react";
import AccordionSection from "./AccordionSection";
import { CompactField, CompactListField } from "./CompactField";

export default function EnemyTemplatesPanel({ enemyTemplates, onAdd, onUpdate, onDelete }) {
  function patchWeapon(template, patch) {
    onUpdate("enemyTemplates", template.enemyTemplateId, {
      weapon: { ...(template.weapon || {}), ...patch },
    });
  }

  return (
    <div className="fp-panel">
      <div className="fp-toolbar">
        <button className="fp-btn fp-primary" onClick={onAdd}>Add Enemy Template</button>
      </div>

      {enemyTemplates.map((t) => (
        <AccordionSection key={t.enemyTemplateId} title={t.name || "Enemy Template"} subtitle={t.type || ""}>
          <div className="fp-grid">
            <CompactField label="Name" value={t.name} onChange={(v) => onUpdate("enemyTemplates", t.enemyTemplateId, { name: v })} />
            <CompactField label="Type" value={t.type} onChange={(v) => onUpdate("enemyTemplates", t.enemyTemplateId, { type: v })} />
            <CompactField label="AI" value={t.ai} onChange={(v) => onUpdate("enemyTemplates", t.enemyTemplateId, { ai: v })} />
            <CompactField label="Speed" type="number" value={t.speed} onChange={(v) => onUpdate("enemyTemplates", t.enemyTemplateId, { speed: v })} />
            <CompactField label="Panic" value={t.panic} onChange={(v) => onUpdate("enemyTemplates", t.enemyTemplateId, { panic: v })} />
            <CompactField label="Combat" type="number" value={t.combat} onChange={(v) => onUpdate("enemyTemplates", t.enemyTemplateId, { combat: v })} />
            <CompactField label="Toughness" type="number" value={t.toughness} onChange={(v) => onUpdate("enemyTemplates", t.enemyTemplateId, { toughness: v })} />
            <CompactField label="Weapon" value={t.weapon?.name} onChange={(v) => patchWeapon(t, { name: v })} />
            <CompactField label="Shots" type="number" value={t.weapon?.shots} onChange={(v) => patchWeapon(t, { shots: v })} />
            <CompactField label="Range" value={t.weapon?.range} onChange={(v) => patchWeapon(t, { range: v })} />
            <CompactField label="Damage" type="number" value={t.weapon?.damage} onChange={(v) => patchWeapon(t, { damage: v })} />
            <CompactListField label="Weapon Traits" value={t.weapon?.traits || []} onChange={(v) => patchWeapon(t, { traits: v })} />
            <CompactListField label="Enemy Traits" value={t.traits || []} onChange={(v) => onUpdate("enemyTemplates", t.enemyTemplateId, { traits: v })} />
            <CompactField label="Notes" value={t.notes} textarea onChange={(v) => onUpdate("enemyTemplates", t.enemyTemplateId, { notes: v })} />
          </div>
          <button className="fp-btn fp-danger" onClick={() => onDelete("enemyTemplates", t.enemyTemplateId)}>Delete</button>
        </AccordionSection>
      ))}
    </div>
  );
}
