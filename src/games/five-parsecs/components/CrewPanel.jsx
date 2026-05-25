import React, { useMemo, useState } from "react";

import AccordionSection from "./AccordionSection";
import { CompactField } from "./CompactField";
import ShipPanel from "./ShipPanel";

function safeNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getCaptainName(crew, crewMembers) {
  const captainId = crew?.captainCrewMemberId || "";

  if (!captainId) return "";

  const captain = crewMembers.find((member) => {
    return member.crewMemberId === captainId;
  });

  return captain?.name || "";
}

function getCrewMemberEquipment(member, equipment) {
  return equipment.filter((item) => {
    return (
      item.locationType === "crewMember" &&
      item.crewMemberId === member.crewMemberId
    );
  });
}

function getCategoryLabel(item) {
  if (item.category === "weapon") return "Weapon";
  if (item.category === "protection") return "Protection";
  if (item.category === "consumable") return "Consumable";
  if (item.category === "implant") return "Implant";
  if (item.category === "utility") return "Utility";
  if (item.category === "onBoard") return "On-board";
  if (item.category === "gunMod") return "Gun Mod";
  if (item.category === "gunSight") return "Gun Sight";
  if (item.category === "shipComponent") return "Ship Component";

  return item.category || "Gear";
}

function getWeaponDetail(item) {
  const weapon = item.weapon || {};

  return [
    weapon.range ? `Range ${weapon.range}` : "",
    weapon.shots !== "" && weapon.shots !== undefined
      ? `Shots ${weapon.shots}`
      : "",
    weapon.damage !== "" && weapon.damage !== undefined
      ? `Damage ${weapon.damage}`
      : "",
    asArray(weapon.traits).length
      ? `Traits: ${weapon.traits.join(", ")}`
      : "",
    asArray(weapon.mods).length ? `Mods: ${weapon.mods.join(", ")}` : "",
    weapon.sight ? `Sight: ${weapon.sight}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function getGearDetail(item) {
  if (item.category === "weapon") {
    return getWeaponDetail(item);
  }

  return item.gear?.effect || item.armor?.effect || item.notes || "";
}

function CrewEquipmentRows({ member, equipment }) {
  const memberEquipment = getCrewMemberEquipment(member, equipment);

  if (memberEquipment.length === 0) {
    return null;
  }

  return (
    <tr className="fp-crew-equipment-row">
      <td colSpan={14}>
        <div className="fp-crew-equipment-indent">
          <table className="fp-table fp-crew-gear-table">
            <thead>
              <tr>
                <th>Gear / Weapon</th>
                <th>Type</th>
                <th>Subtype</th>
                <th>Qty</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {memberEquipment.map((item) => {
                const status = [
                  item.damaged ? "Damaged" : "",
                  item.destroyed ? "Destroyed" : "",
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <tr key={item.equipmentId}>
                    <td>{item.name || "Unnamed Item"}</td>
                    <td>{getCategoryLabel(item)}</td>
                    <td>{item.subtype || ""}</td>
                    <td>{item.quantity || 1}</td>
                    <td className="fp-wrap-cell">{getGearDetail(item)}</td>
                    <td>{status || "OK"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

function CrewDetailsRow({ member, onUpdate, onDelete, onAddCrewMemberLog }) {
  function patch(patchValue) {
    onUpdate("crewMembers", member.crewMemberId, patchValue);
  }

  return (
    <tr className="fp-crew-details-row">
      <td colSpan={14}>
        <div className="fp-inline-card fp-crew-details-card">
          <CompactField
            label="Background"
            value={member.background || ""}
            textarea
            onChange={(value) => patch({ background: value })}
          />

          <CompactField
            label="Motivation"
            value={member.motivation || ""}
            textarea
            onChange={(value) => patch({ motivation: value })}
          />

          <CompactField
            label="Notes"
            value={member.notes || ""}
            textarea
            onChange={(value) => patch({ notes: value })}
          />

          <div className="fp-actions fp-field-wide">
            <button
              className="fp-btn"
              onClick={() => onAddCrewMemberLog(member.crewMemberId)}
            >
              Add Log
            </button>

            <button
              className="fp-btn fp-danger"
              onClick={() => onDelete("crewMembers", member.crewMemberId)}
            >
              Delete Crew Member
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function EditableCrewRow({
  crew,
  member,
  expanded,
  onToggleExpanded,
  onUpdate,
  onSetCaptain,
}) {
  const isCaptain = crew?.captainCrewMemberId === member.crewMemberId;

  function patch(patchValue) {
    onUpdate("crewMembers", member.crewMemberId, patchValue);
  }

  function toggleCaptain(event) {
    if (event.target.checked) {
      onSetCaptain(member.crewMemberId);
      return;
    }

    if (isCaptain) {
      onSetCaptain("");
    }
  }

  return (
    <tr className={isCaptain ? "fp-crew-captain-row" : ""}>
      <td className="fp-crew-captain-cell">
        <input
          type="checkbox"
          checked={isCaptain}
          onChange={toggleCaptain}
          title="Captain"
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-name-input"
          value={member.name || ""}
          onChange={(event) => patch({ name: event.target.value })}
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-short-text-input"
          value={member.speciesType || ""}
          onChange={(event) => patch({ speciesType: event.target.value })}
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-short-text-input"
          value={member.class || ""}
          onChange={(event) => patch({ class: event.target.value })}
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-stat-input"
          type="number"
          value={member.reactions ?? 0}
          onChange={(event) =>
            patch({ reactions: safeNumber(event.target.value) })
          }
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-stat-input"
          type="number"
          value={member.speed ?? 0}
          onChange={(event) => patch({ speed: safeNumber(event.target.value) })}
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-stat-input"
          type="number"
          value={member.combatSkill ?? 0}
          onChange={(event) =>
            patch({ combatSkill: safeNumber(event.target.value) })
          }
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-stat-input"
          type="number"
          value={member.toughness ?? 0}
          onChange={(event) =>
            patch({ toughness: safeNumber(event.target.value) })
          }
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-stat-input"
          type="number"
          value={member.savvy ?? 0}
          onChange={(event) => patch({ savvy: safeNumber(event.target.value) })}
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-stat-input"
          type="number"
          value={member.luck ?? 0}
          onChange={(event) => patch({ luck: safeNumber(event.target.value) })}
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-stat-input"
          type="number"
          value={member.xp ?? 0}
          onChange={(event) => patch({ xp: safeNumber(event.target.value) })}
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-status-input"
          value={member.currentStatus || ""}
          onChange={(event) => patch({ currentStatus: event.target.value })}
        />
      </td>

      <td className="fp-table-actions-cell">
        <button className="fp-btn fp-mini-btn" onClick={onToggleExpanded}>
          {expanded ? "Hide" : "Details"}
        </button>
      </td>
    </tr>
  );
}

export default function CrewPanel({
  crew,
  crewMembers,
  equipment,
  quests,
  rumors,
  playerId,
  onSaveCrew,
  onUpdate,
  onDelete,
  onAddQuest,
  onAddRumor,
  onAddCrewMember,
  onAddCrewMemberLog,
  onAddLog,
}) {
  const [expandedCrewMemberIds, setExpandedCrewMemberIds] = useState({});

  const sortedCrewMembers = useMemo(() => {
    return [...crewMembers].sort((a, b) => {
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [crewMembers]);

  const activeQuestCount = quests.filter((quest) => {
    return quest.status !== "complete" && quest.status !== "completed";
  }).length;

  const activeRumorCount = rumors.filter((rumor) => {
    return rumor.status !== "complete" && rumor.status !== "completed";
  }).length;

  function patchCrew(patchValue) {
    if (!crew) return;

    onSaveCrew({
      ...crew,
      ...patchValue,
    });
  }

  function toggleCrewMember(memberId) {
    setExpandedCrewMemberIds((current) => ({
      ...current,
      [memberId]: !current[memberId],
    }));
  }

  function setCaptain(crewMemberId) {
    patchCrew({
      captainCrewMemberId: crewMemberId,
    });
  }

  if (!crew) {
    return (
      <div className="fp-panel">
        <div className="fp-muted">
          No adventure has been created yet. Use the Create Adventure button in
          the header.
        </div>
      </div>
    );
  }

  return (
    <div className="fp-panel">
      <AccordionSection title="Adventure Summary" defaultOpen>
        <div className="fp-grid">
          <CompactField
            label="Adventure Name"
            value={crew.crewName || ""}
            onChange={(value) => patchCrew({ crewName: value })}
          />

          <CompactField
            label="Captain"
            value={crew.captainCrewMemberId || ""}
            options={[
              { value: "", label: "No Captain" },
              ...crewMembers.map((member) => ({
                value: member.crewMemberId,
                label: member.name || "Unnamed Crew Member",
              })),
            ]}
            onChange={(value) => patchCrew({ captainCrewMemberId: value })}
          />

          <CompactField
            label="Story Points"
            type="number"
            value={crew.storyPoints ?? 0}
            onChange={(value) => patchCrew({ storyPoints: safeNumber(value) })}
          />

          <CompactField
            label="Credits"
            type="number"
            value={crew.credits ?? 0}
            onChange={(value) => patchCrew({ credits: safeNumber(value) })}
          />

          <CompactField
            label="Debt"
            type="number"
            value={crew.debt ?? 0}
            onChange={(value) => patchCrew({ debt: safeNumber(value) })}
          />

          <CompactField
            label="Campaign Turn"
            type="number"
            value={crew.campaignTurn ?? 1}
            onChange={(value) =>
              patchCrew({ campaignTurn: safeNumber(value) })
            }
          />

          <CompactField
            label="Adventure Notes"
            value={crew.notes || ""}
            textarea
            onChange={(value) => patchCrew({ notes: value })}
          />
        </div>

        <div className="fp-turn-summary">
          Captain: {getCaptainName(crew, crewMembers) || "None"} · Crew:{" "}
          {crewMembers.length} · Active Quests: {activeQuestCount} · Active
          Rumors: {activeRumorCount}
        </div>

        <div className="fp-actions">
          <button className="fp-btn" onClick={onAddQuest}>
            Add Quest
          </button>

          <button className="fp-btn" onClick={onAddRumor}>
            Add Rumor
          </button>

          <button className="fp-btn" onClick={onAddLog}>
            Add Adventure Log
          </button>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Crew"
        subtitle={`${crewMembers.length} crew member${
          crewMembers.length === 1 ? "" : "s"
        }`}
        defaultOpen
      >
        <div className="fp-actions">
          <button className="fp-btn fp-primary" onClick={onAddCrewMember}>
            Add Crew Member
          </button>
        </div>

        <div className="fp-table-wrap fp-crew-table-wrap">
          <table className="fp-table fp-crew-table">
            <thead>
              <tr>
                <th>Cap</th>
                <th>Name</th>
                <th>Species</th>
                <th>Class</th>
                <th>Rea</th>
                <th>Spd</th>
                <th>Cbt</th>
                <th>Tgh</th>
                <th>Sav</th>
                <th>Luck</th>
                <th>XP</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {sortedCrewMembers.map((member) => {
                const expanded = Boolean(
                  expandedCrewMemberIds[member.crewMemberId]
                );

                return (
                  <React.Fragment key={member.crewMemberId}>
                    <EditableCrewRow
                      crew={crew}
                      member={member}
                      expanded={expanded}
                      onToggleExpanded={() =>
                        toggleCrewMember(member.crewMemberId)
                      }
                      onUpdate={onUpdate}
                      onSetCaptain={setCaptain}
                    />

                    <CrewEquipmentRows member={member} equipment={equipment} />

                    {expanded && (
                      <CrewDetailsRow
                        member={member}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onAddCrewMemberLog={onAddCrewMemberLog}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {sortedCrewMembers.length === 0 && (
                <tr>
                  <td colSpan={13} className="fp-table-empty">
                    No crew members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AccordionSection>

      <AccordionSection title="Ship Summary" defaultOpen={false}>
        <ShipPanel crew={crew} playerId={playerId} onSaveCrew={onSaveCrew} />
      </AccordionSection>
    </div>
  );
}