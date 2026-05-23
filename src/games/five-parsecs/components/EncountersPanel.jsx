import React from "react";
import AccordionSection from "./AccordionSection";
import { CompactField, CompactListField } from "./CompactField";

export default function EncountersPanel({
  encounters,
  encounterEnemies,
  enemyTemplates,
  worldLookups,
  onAdd,
  onUpdate,
  onDelete,
  onAddEnemy,
  onAddLog,
}) {
  function patchWeapon(enemy, patch) {
    onUpdate("encounterEnemies", enemy.encounterEnemyId, {
      weapon: { ...(enemy.weapon || {}), ...patch },
    });
  }

  return (
    <div className="fp-panel">
      <div className="fp-toolbar">
        <button className="fp-btn fp-primary" onClick={onAdd}>Add Encounter</button>
      </div>

      {encounters.map((enc) => {
        const enemies = encounterEnemies.filter((e) => e.encounterId === enc.encounterId);
        return (
          <AccordionSection
            key={enc.encounterId}
            title={enc.mission || "Encounter"}
            subtitle={enc.encounterType || ""}
            actions={<button className="fp-btn" onClick={() => onAddLog(enc.encounterId)}>Log</button>}
          >
            <div className="fp-grid">
              <CompactField label="Mission" value={enc.mission} onChange={(v) => onUpdate("encounters", enc.encounterId, { mission: v })} />
              <CompactField label="World" value={enc.worldId} options={Object.keys(worldLookups)} onChange={(v) => onUpdate("encounters", enc.encounterId, { worldId: v })} />
              <CompactField label="Encounter Type" value={enc.encounterType} onChange={(v) => onUpdate("encounters", enc.encounterId, { encounterType: v })} />
              <CompactField label="Shiny Bits" value={enc.shinyBits} onChange={(v) => onUpdate("encounters", enc.encounterId, { shinyBits: v })} />
              <CompactField label="Deployment Conditions" value={enc.deploymentConditions} textarea onChange={(v) => onUpdate("encounters", enc.encounterId, { deploymentConditions: v })} />
              <CompactField label="Outcome / Events" value={enc.outcomeNotableEvents} textarea onChange={(v) => onUpdate("encounters", enc.encounterId, { outcomeNotableEvents: v })} />
              <CompactField label="Enemy Weapons Summary" value={enc.enemyWeaponsSummary} textarea onChange={(v) => onUpdate("encounters", enc.encounterId, { enemyWeaponsSummary: v })} />
              <CompactField label="Enemy Types Summary" value={enc.enemyTypesSummary} textarea onChange={(v) => onUpdate("encounters", enc.encounterId, { enemyTypesSummary: v })} />
            </div>

            <AccordionSection title={`Enemies (${enemies.length})`} defaultOpen>
              <div className="fp-template-row">
                <button className="fp-btn" onClick={() => onAddEnemy(enc.encounterId, null)}>Add Blank Enemy</button>
                {enemyTemplates.map((t) => (
                  <button key={t.enemyTemplateId} className="fp-btn" onClick={() => onAddEnemy(enc.encounterId, t)}>
                    + {t.name || "Template"}
                  </button>
                ))}
              </div>

              {enemies.map((enemy) => (
                <AccordionSection key={enemy.encounterEnemyId} title={enemy.name || "Enemy"} subtitle={`#${enemy.number || 0}`}>
                  <div className="fp-grid">
                    <CompactField label="Name" value={enemy.name} onChange={(v) => onUpdate("encounterEnemies", enemy.encounterEnemyId, { name: v })} />
                    <CompactField label="Type" value={enemy.type} onChange={(v) => onUpdate("encounterEnemies", enemy.encounterEnemyId, { type: v })} />
                    <CompactField label="AI" value={enemy.ai} onChange={(v) => onUpdate("encounterEnemies", enemy.encounterEnemyId, { ai: v })} />
                    <CompactField label="Number" type="number" value={enemy.number} onChange={(v) => onUpdate("encounterEnemies", enemy.encounterEnemyId, { number: v })} />
                    <CompactField label="Speed" type="number" value={enemy.speed} onChange={(v) => onUpdate("encounterEnemies", enemy.encounterEnemyId, { speed: v })} />
                    <CompactField label="Panic" value={enemy.panic} onChange={(v) => onUpdate("encounterEnemies", enemy.encounterEnemyId, { panic: v })} />
                    <CompactField label="Combat" type="number" value={enemy.combat} onChange={(v) => onUpdate("encounterEnemies", enemy.encounterEnemyId, { combat: v })} />
                    <CompactField label="Toughness" type="number" value={enemy.toughness} onChange={(v) => onUpdate("encounterEnemies", enemy.encounterEnemyId, { toughness: v })} />
                    <CompactField label="Weapon" value={enemy.weapon?.name} onChange={(v) => patchWeapon(enemy, { name: v })} />
                    <CompactField label="Shots" type="number" value={enemy.weapon?.shots} onChange={(v) => patchWeapon(enemy, { shots: v })} />
                    <CompactField label="Range" value={enemy.weapon?.range} onChange={(v) => patchWeapon(enemy, { range: v })} />
                    <CompactField label="Damage" type="number" value={enemy.weapon?.damage} onChange={(v) => patchWeapon(enemy, { damage: v })} />
                    <CompactListField label="Weapon Traits" value={enemy.weapon?.traits || []} onChange={(v) => patchWeapon(enemy, { traits: v })} />
                    <CompactListField label="Enemy Traits" value={enemy.traits || []} onChange={(v) => onUpdate("encounterEnemies", enemy.encounterEnemyId, { traits: v })} />
                  </div>
                  <button className="fp-btn fp-danger" onClick={() => onDelete("encounterEnemies", enemy.encounterEnemyId)}>Delete Enemy</button>
                </AccordionSection>
              ))}
            </AccordionSection>

            <button className="fp-btn fp-danger" onClick={() => onDelete("encounters", enc.encounterId)}>Delete Encounter</button>
          </AccordionSection>
        );
      })}
    </div>
  );
}
