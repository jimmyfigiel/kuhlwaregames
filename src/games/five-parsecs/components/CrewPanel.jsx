import React from "react";
import AccordionSection from "./AccordionSection";
import { CompactField, CompactListField } from "./CompactField";

export default function CrewPanel({
  crew,
  crewMembers,
  quests,
  rumors,
  onSaveCrew,
  onUpdate,
  onDelete,
  onAddQuest,
  onAddRumor,
  onAddLog,
}) {
  if (!crew) return <div className="fp-muted">Create a crew to begin.</div>;

  function patchCrew(patch) {
    onSaveCrew({ ...crew, ...patch });
  }

  function patchShip(patch) {
    patchCrew({ ship: { ...(crew.ship || {}), ...patch } });
  }

  return (
    <div className="fp-panel">
      <AccordionSection title="Crew Summary" defaultOpen actions={<button className="fp-btn" onClick={onAddLog}>Log</button>}>
        <div className="fp-grid">
          <CompactField label="Crew" value={crew.crewName} onChange={(v) => patchCrew({ crewName: v })} />
          <CompactField
            label="Captain"
            value={crew.captainCrewMemberId}
            onChange={(v) => patchCrew({ captainCrewMemberId: v })}
            options={crewMembers.map((m) => m.crewMemberId)}
          />
          <CompactField label="Credits" type="number" value={crew.credits} onChange={(v) => patchCrew({ credits: v })} />
          <CompactField label="Story Points" type="number" value={crew.storyPoints} onChange={(v) => patchCrew({ storyPoints: v })} />
          <CompactField label="Turn" type="number" value={crew.campaignTurn} onChange={(v) => patchCrew({ campaignTurn: v })} />
          <CompactField label="Clock" value={crew.clock} onChange={(v) => patchCrew({ clock: v })} />
          <CompactField label="Event" value={crew.event} onChange={(v) => patchCrew({ event: v })} />
          <CompactField label="Story Track" value={crew.storyTrack} onChange={(v) => patchCrew({ storyTrack: v })} textarea />
        </div>
      </AccordionSection>

      <AccordionSection title="Ship" defaultOpen>
        <div className="fp-grid">
          <CompactField label="Name" value={crew.ship?.name} onChange={(v) => patchShip({ name: v })} />
          <CompactField label="Type/Details" value={crew.ship?.type} onChange={(v) => patchShip({ type: v })} />
          <CompactField label="Debt" type="number" value={crew.ship?.debt} onChange={(v) => patchShip({ debt: v })} />
          <CompactField label="Hull" type="number" value={crew.ship?.hullPoints} onChange={(v) => patchShip({ hullPoints: v })} />
          <CompactListField label="Traits" value={crew.ship?.traits || []} onChange={(v) => patchShip({ traits: v })} />
          <CompactListField label="Upgrades" value={crew.ship?.upgrades || []} onChange={(v) => patchShip({ upgrades: v })} />
        </div>
      </AccordionSection>

      <AccordionSection title="Quests" actions={<button className="fp-btn" onClick={onAddQuest}>Add</button>}>
        {quests.map((q) => (
          <AccordionSection key={q.questId} title={q.name || "Quest"} subtitle={q.status}>
            <div className="fp-grid">
              <CompactField label="Name" value={q.name} onChange={(v) => onUpdate("quests", q.questId, { name: v })} />
              <CompactField label="Source" value={q.source} onChange={(v) => onUpdate("quests", q.questId, { source: v })} />
              <CompactField label="Status" value={q.status} onChange={(v) => onUpdate("quests", q.questId, { status: v })} />
              <CompactField label="Progress" value={q.progress} onChange={(v) => onUpdate("quests", q.questId, { progress: v })} textarea />
            </div>
            <button className="fp-btn fp-danger" onClick={() => onDelete("quests", q.questId)}>Delete</button>
          </AccordionSection>
        ))}
      </AccordionSection>

      <AccordionSection title="Rumors" actions={<button className="fp-btn" onClick={onAddRumor}>Add</button>}>
        {rumors.map((r) => (
          <AccordionSection key={r.rumorId} title={r.text || "Rumor"} subtitle={r.status}>
            <div className="fp-grid">
              <CompactField label="Text" value={r.text} onChange={(v) => onUpdate("rumors", r.rumorId, { text: v })} textarea />
              <CompactField label="Source" value={r.source} onChange={(v) => onUpdate("rumors", r.rumorId, { source: v })} />
              <CompactField label="Status" value={r.status} onChange={(v) => onUpdate("rumors", r.rumorId, { status: v })} />
            </div>
            <button className="fp-btn fp-danger" onClick={() => onDelete("rumors", r.rumorId)}>Delete</button>
          </AccordionSection>
        ))}
      </AccordionSection>
    </div>
  );
}
