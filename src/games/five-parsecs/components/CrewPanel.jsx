import React, { useMemo, useState } from "react";

import AccordionSection from "./AccordionSection";
import { CompactField } from "./CompactField";
import ShipPanel from "./ShipPanel";

const WEAPON_TRAIT_HELP = {
  Area:
    "Area weapons may affect more than one target. Resolve the main attack, then apply the Area weapon rules.",
  Clumsy:
    "Clumsy weapons are awkward to use. They usually make close combat less flexible or less efficient.",
  Critical:
    "Critical weapons are especially dangerous when they score strong results.",
  Elegant:
    "Elegant melee weapons are refined and easier to use skillfully in close combat.",
  Focused:
    "Focused weapons concentrate their fire and are most useful when the shooter can line up a good shot.",
  Heavy:
    "Heavy weapons are cumbersome and may limit movement or firing options.",
  Impact:
    "Impact weapons hit with extra force and may knock enemies back or add force in close combat.",
  Melee:
    "Melee weapons are used in Brawling instead of normal shooting.",
  Piercing:
    "Piercing weapons are better at getting through armor or protection.",
  Pistol:
    "Pistol weapons are sidearms. Some mods, sights, and special rules only apply to pistols.",
  "Single use":
    "Single-use items are used once, then removed from inventory.",
  "Snap Shot":
    "Snap Shot weapons are easier to fire quickly or while reacting.",
  Stun:
    "Stun effects interfere with a target's ability to act.",
  Terrifying:
    "Terrifying weapons can affect enemy morale or reactions as described in the rules.",
};

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

function getWeaponRange(item) {
  return item.weapon?.range || "";
}

function getWeaponShots(item) {
  if (item.category !== "weapon") return "";
  if (item.weapon?.shots === undefined || item.weapon?.shots === null) return "";
  return item.weapon.shots;
}

function getWeaponDamage(item) {
  if (item.category !== "weapon") return "";
  if (item.weapon?.damage === undefined || item.weapon?.damage === null) {
    return "";
  }
  return item.weapon.damage;
}

function getWeaponTraits(item) {
  if (item.category !== "weapon") return [];
  return asArray(item.weapon?.traits);
}

function getWeaponMods(item) {
  if (item.category !== "weapon") return "";
  return asArray(item.weapon?.mods).join(", ");
}

function getWeaponSight(item) {
  if (item.category !== "weapon") return "";
  return item.weapon?.sight || "";
}

function getGearEffect(item) {
  if (item.category === "weapon") return "";

  return item.gear?.effect || item.armor?.effect || item.notes || "";
}

function TraitPill({ trait }) {
  const help =
    WEAPON_TRAIT_HELP[trait] ||
    "No help text has been entered for this trait yet.";

  return (
    <span className="fp-trait-pill" title={help} data-tooltip={help}>
      {trait}
    </span>
  );
}

function TraitList({ traits }) {
  if (!traits.length) return "";

  return (
    <div className="fp-trait-list">
      {traits.map((trait) => (
        <TraitPill key={trait} trait={trait} />
      ))}
    </div>
  );
}

function CrewEquipmentRows({ member, equipment }) {
  const memberEquipment = getCrewMemberEquipment(member, equipment);

  if (memberEquipment.length === 0) {
    return null;
  }

  return (
    <tr className="fp-crew-equipment-row">
      <td colSpan={13}>
        <div className="fp-crew-equipment-indent">
          <table className="fp-table fp-crew-gear-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Subtype</th>
                <th>Qty</th>
                <th>Range</th>
                <th>Shots</th>
                <th>Damage</th>
                <th>Traits</th>
                <th>Mods</th>
                <th>Sight</th>
                <th>Effect</th>
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
                    <td>{getWeaponRange(item)}</td>
                    <td>{getWeaponShots(item)}</td>
                    <td>{getWeaponDamage(item)}</td>
                    <td className="fp-wrap-cell">
                      <TraitList traits={getWeaponTraits(item)} />
                    </td>
                    <td className="fp-wrap-cell">{getWeaponMods(item)}</td>
                    <td>{getWeaponSight(item)}</td>
                    <td className="fp-wrap-cell">{getGearEffect(item)}</td>
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
      <td colSpan={13}>
        <div className="fp-crew-details-card">
          <div className="fp-crew-details-grid">
            <label className="fp-crew-detail-field">
              <span>Background</span>
              <input
                value={member.background || ""}
                onChange={(event) => patch({ background: event.target.value })}
              />
            </label>

            <label className="fp-crew-detail-field">
              <span>Motivation</span>
              <input
                value={member.motivation || ""}
                onChange={(event) => patch({ motivation: event.target.value })}
              />
            </label>

            <label className="fp-crew-detail-field fp-crew-notes-field">
              <span>Notes</span>
              <textarea
                value={member.notes || ""}
                onChange={(event) => patch({ notes: event.target.value })}
              />
            </label>
          </div>

          <div className="fp-actions fp-crew-details-actions">
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

      <td className="fp-table-actions-cell fp-crew-action-cell">
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