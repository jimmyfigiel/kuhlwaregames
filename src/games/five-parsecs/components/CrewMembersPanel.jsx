import React, { useState } from "react";

import AccordionSection from "./AccordionSection";

import {
  CompactField,
  CompactCheckbox,
} from "./CompactField";

const STATS = [
  "reactions",
  "speed",
  "combat",
  "toughness",
  "savvy",
  "luck",
];

function equipmentForMember(equipment, memberId) {
  return equipment.filter(
    (e) =>
      e.locationType === "crewMember" &&
      e.crewMemberId === memberId
  );
}

export default function CrewMembersPanel({
  crewMembers,
  equipment,
  onAdd,
  onUpdate,
  onDelete,
  onAddLog,
}) {
  const [editingId, setEditingId] = useState("");

  function patchStats(member, field, value) {
    onUpdate("crewMembers", member.crewMemberId, {
      stats: {
        ...(member.stats || {}),
        [field]: value,
      },
    });
  }

  return (
    <div className="fp-panel">
      <div className="fp-table-wrap">
        <table className="fp-table fp-crew-table">
          <thead>
            <tr>
              <th>Name / Item</th>
              <th>Role / Type</th>
              <th>R</th>
              <th>S</th>
              <th>C</th>
              <th>T</th>
              <th>Sv</th>
              <th>L</th>
              <th>XP</th>
              <th>Status</th>
              <th>Range</th>
              <th>Shots</th>
              <th>Dmg</th>
              <th>Traits / Notes</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {crewMembers.length === 0 ? (
              <tr>
                <td colSpan="15" className="fp-table-empty">
                  No crew added yet.
                </td>
              </tr>
            ) : (
              crewMembers.map((m) => {
                const assignedEquipment = equipmentForMember(
                  equipment,
                  m.crewMemberId
                );

                return (
                  <React.Fragment key={m.crewMemberId}>
                    <tr className="fp-crew-main-row">
                      <td>{m.name || "Unnamed"}</td>
                      <td>{m.role || "—"}</td>
                      <td>{m.stats?.reactions ?? 0}</td>
                      <td>{m.stats?.speed ?? 0}</td>
                      <td>{m.stats?.combat ?? 0}</td>
                      <td>{m.stats?.toughness ?? 0}</td>
                      <td>{m.stats?.savvy ?? 0}</td>
                      <td>{m.stats?.luck ?? 0}</td>
                      <td>{m.xp ?? 0}</td>
                      <td>{m.status || "active"}</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>{m.injury || "—"}</td>
                      <td>
                        <button
                          className="fp-btn"
                          onClick={() =>
                            setEditingId(
                              editingId === m.crewMemberId
                                ? ""
                                : m.crewMemberId
                            )
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>

                    {assignedEquipment.length === 0 ? (
                      <tr className="fp-equipment-row fp-crew-end-row">
                        <td className="fp-equipment-name">↳ No gear assigned</td>
                        <td colSpan="14">Assign gear from the Gear tab.</td>
                      </tr>
                    ) : (
                      assignedEquipment.map((e, index) => {
                        const isWeapon = e.category === "weapon";
                        const isLast = index === assignedEquipment.length - 1;

                        return (
                          <tr
                            key={e.equipmentId}
                            className={`fp-equipment-row ${
                              isLast ? "fp-crew-end-row" : ""
                            }`}
                          >
                            <td className="fp-equipment-name">
                              ↳ {e.name || "item"}
                              {e.quantity > 1 ? ` x${e.quantity}` : ""}
                            </td>
                            <td>{e.category || "item"}</td>
                            <td colSpan="8">{e.subtype || "—"}</td>
                            <td>{isWeapon ? e.weapon?.range || "—" : "—"}</td>
                            <td>{isWeapon ? e.weapon?.shots ?? 0 : "—"}</td>
                            <td>{isWeapon ? e.weapon?.damage ?? 0 : "—"}</td>
                            <td>
                              {isWeapon
                                ? (e.weapon?.traits || []).join(", ") || "—"
                                : e.gear?.effect ||
                                  e.armor?.traits?.join(", ") ||
                                  e.notes ||
                                  "—"}
                            </td>
                            <td></td>
                          </tr>
                        );
                      })
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="fp-toolbar fp-toolbar-bottom">
        <button className="fp-btn fp-primary" onClick={onAdd}>
          Add Crew
        </button>
      </div>

      {crewMembers.map((m) => {
        if (editingId !== m.crewMemberId) {
          return null;
        }

        const assigned = equipmentForMember(equipment, m.crewMemberId);

        return (
          <AccordionSection
            key={`edit-${m.crewMemberId}`}
            title={`Edit: ${m.name || "Crew Member"}`}
            subtitle={m.status || ""}
            defaultOpen
            actions={
              <button
                className="fp-btn"
                onClick={() => onAddLog(m.crewMemberId)}
              >
                Log
              </button>
            }
          >
            <div className="fp-grid">
              <CompactField
                label="Name"
                value={m.name}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    name: v,
                  })
                }
              />

              <CompactField
                label="Role"
                value={m.role}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    role: v,
                  })
                }
              />

              <CompactField
                label="Species/Type"
                value={m.speciesType}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    speciesType: v,
                  })
                }
              />

              <CompactField
                label="Background"
                value={m.background}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    background: v,
                  })
                }
              />

              <CompactField
                label="Motivation"
                value={m.motivation}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    motivation: v,
                  })
                }
              />

              <CompactField
                label="Class"
                value={m.class}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    class: v,
                  })
                }
              />

              <CompactField
                label="XP"
                type="number"
                value={m.xp}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    xp: v,
                  })
                }
              />

              <CompactField
                label="Injury"
                value={m.injury}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    injury: v,
                  })
                }
              />

              <CompactField
                label="Status"
                value={m.status}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    status: v,
                  })
                }
              />

              <CompactCheckbox
                label="Captain"
                checked={m.isCaptain}
                onChange={(v) =>
                  onUpdate("crewMembers", m.crewMemberId, {
                    isCaptain: v,
                  })
                }
              />

              {STATS.map((s) => (
                <CompactField
                  key={s}
                  label={s}
                  type="number"
                  value={m.stats?.[s] ?? 0}
                  onChange={(v) => patchStats(m, s, v)}
                />
              ))}
            </div>

            <div className="fp-mini-title">Assigned Equipment</div>

            <div className="fp-chip-row">
              {assigned.length ? (
                assigned.map((e) => (
                  <span key={e.equipmentId} className="fp-chip">
                    {e.name || "item"}
                  </span>
                ))
              ) : (
                <span className="fp-muted">None</span>
              )}
            </div>

            <div className="fp-actions">
              <button className="fp-btn" onClick={() => setEditingId("")}>
                Close
              </button>

              <button
                className="fp-btn fp-danger"
                onClick={() => {
                  setEditingId("");
                  onDelete("crewMembers", m.crewMemberId);
                }}
              >
                Delete
              </button>
            </div>
          </AccordionSection>
        );
      })}
    </div>
  );
}