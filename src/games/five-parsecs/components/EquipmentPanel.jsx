import React, { useMemo, useState } from "react";

import AccordionSection from "./AccordionSection";
import CatalogModal from "./CatalogModal";

import { CompactField, CompactListField } from "./CompactField";

import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATALOGS,
  GUN_MODS_TABLE,
  GUN_SIGHTS_TABLE,
  catalogItemToEquipment,
} from "../data/equipmentCatalog";

import {
  canAssignEquipmentToCrewMember,
  canAttachGunModToWeapon,
  canAttachGunSightToWeapon,
  getCrewMemberName,
} from "../utils/equipmentRules";

import { makeId, nowIso } from "../utils/recordFactories";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getCategoryLabel(category) {
  return EQUIPMENT_CATEGORIES.find((item) => item.value === category)?.label || category || "";
}

function getLocationLabel(item, crewMembers) {
  if (item.locationType === "crewMember") {
    return getCrewMemberName(crewMembers, item.crewMemberId) || "Crew Member";
  }

  return "Stash";
}

function getWeaponSummary(item) {
  if (item.category !== "weapon") return "";

  const weapon = item.weapon || {};

  return [
    weapon.range ? `Range ${weapon.range}` : "",
    weapon.shots !== "" && weapon.shots !== undefined ? `Shots ${weapon.shots}` : "",
    weapon.damage !== "" && weapon.damage !== undefined ? `Damage ${weapon.damage}` : "",
    asArray(weapon.traits).length ? `Traits: ${weapon.traits.join(", ")}` : "",
    asArray(weapon.mods).length ? `Mods: ${weapon.mods.join(", ")}` : "",
    weapon.sight ? `Sight: ${weapon.sight}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function getEffectSummary(item) {
  if (item.category === "weapon") return getWeaponSummary(item);

  return item.gear?.effect || item.notes || "";
}

function EquipmentEditor({
  item,
  equipment,
  crewMembers,
  onUpdate,
  onDelete,
  onOpenMods,
  onOpenSights,
}) {
  const [warning, setWarning] = useState("");

  const crewOptions = [
    { value: "", label: "Stash" },
    ...crewMembers.map((member) => ({
      value: member.crewMemberId,
      label: member.name || "Unnamed Crew",
    })),
  ];

  function patch(patchValue) {
    onUpdate("equipment", item.equipmentId, patchValue);
  }

  function patchWeapon(patchValue) {
    patch({
      weapon: {
        ...(item.weapon || {}),
        ...patchValue,
      },
    });
  }

  function patchArmor(patchValue) {
    patch({
      armor: {
        ...(item.armor || {}),
        ...patchValue,
      },
    });
  }

  function patchGear(patchValue) {
    patch({
      gear: {
        ...(item.gear || {}),
        ...patchValue,
      },
    });
  }

  function assignTo(value) {
    setWarning("");

    if (!value) {
      patch({
        locationType: "stash",
        crewMemberId: "",
      });

      return;
    }

    const result = canAssignEquipmentToCrewMember({
      equipment: item,
      allEquipment: equipment,
      crewMembers,
      targetCrewMemberId: value,
    });

    if (!result.ok) {
      setWarning(result.message);
      return;
    }

    patch({
      locationType: "crewMember",
      crewMemberId: value,
    });
  }

  return (
    <div className="fp-inline-card fp-equipment-instance-card">
      <CompactField
        label="Name"
        value={item.name || ""}
        onChange={(value) => patch({ name: value })}
      />

      <CompactField
        label="Category"
        value={item.category || "gear"}
        options={EQUIPMENT_CATEGORIES}
        onChange={(value) => patch({ category: value })}
      />

      <CompactField
        label="Subtype"
        value={item.subtype || ""}
        onChange={(value) => patch({ subtype: value })}
      />

      <CompactField
        label="Qty"
        type="number"
        value={item.quantity || 1}
        onChange={(value) => patch({ quantity: Number(value || 1) })}
      />

      <CompactField
        label="Assigned To"
        value={item.locationType === "crewMember" ? item.crewMemberId : ""}
        options={crewOptions}
        onChange={assignTo}
      />

      <label className="fp-check">
        <input
          type="checkbox"
          checked={Boolean(item.damaged)}
          onChange={(event) => patch({ damaged: event.target.checked })}
        />
        Damaged
      </label>

      <label className="fp-check">
        <input
          type="checkbox"
          checked={Boolean(item.destroyed)}
          onChange={(event) => patch({ destroyed: event.target.checked })}
        />
        Destroyed
      </label>

      {item.category === "weapon" && (
        <>
          <CompactField
            label="Range"
            value={item.weapon?.range || ""}
            onChange={(value) => patchWeapon({ range: value })}
          />

          <CompactField
            label="Shots"
            value={item.weapon?.shots ?? ""}
            onChange={(value) => patchWeapon({ shots: value })}
          />

          <CompactField
            label="Damage"
            value={item.weapon?.damage ?? ""}
            onChange={(value) => patchWeapon({ damage: value })}
          />

          <CompactListField
            label="Weapon Traits"
            value={asArray(item.weapon?.traits)}
            onChange={(value) => patchWeapon({ traits: value })}
          />

          <CompactListField
            label="Gun Mods"
            value={asArray(item.weapon?.mods)}
            onChange={(value) => patchWeapon({ mods: value })}
          />

          <CompactField
            label="Gun Sight"
            value={item.weapon?.sight || ""}
            onChange={(value) => patchWeapon({ sight: value })}
          />
        </>
      )}

      {item.category === "protection" && (
        <CompactField
          label="Save"
          value={item.armor?.save || item.armor?.armorValue || ""}
          onChange={(value) =>
            patchArmor({
              save: value,
              armorValue: value,
            })
          }
        />
      )}

      {item.category !== "weapon" && (
        <CompactField
          label="Effect"
          value={item.gear?.effect || ""}
          textarea
          onChange={(value) => patchGear({ effect: value })}
        />
      )}

      <CompactField
        label="Notes"
        value={item.notes || ""}
        textarea
        onChange={(value) => patch({ notes: value })}
      />

      {warning && (
        <div className="fp-error fp-field-wide">
          {warning}
        </div>
      )}

      <div className="fp-actions fp-field-wide">
        {item.category === "weapon" && (
          <>
            <button className="fp-btn" onClick={() => onOpenMods(item)}>
              Mods
            </button>

            <button className="fp-btn" onClick={() => onOpenSights(item)}>
              Sight
            </button>
          </>
        )}

        <button
          className="fp-btn fp-danger"
          onClick={() => onDelete("equipment", item.equipmentId)}
        >
          Delete Item
        </button>
      </div>
    </div>
  );
}

export default function EquipmentPanel({
  roomId,
  crewId,
  playerId,
  equipment,
  crewMembers,
  onAddBlankEquipment,
  onAddCatalogEquipment,
  onUpdate,
  onDelete,
}) {
  const [catalogId, setCatalogId] = useState("");
  const [modTarget, setModTarget] = useState(null);
  const [sightTarget, setSightTarget] = useState(null);
  const [message, setMessage] = useState("");

  const selectedCatalog = EQUIPMENT_CATALOGS.find((catalog) => catalog.id === catalogId);

  const stashItems = useMemo(() => {
    return equipment.filter((item) => item.locationType !== "crewMember");
  }, [equipment]);

  const assignedItems = useMemo(() => {
    return equipment.filter((item) => item.locationType === "crewMember");
  }, [equipment]);

  function addCatalogItemToStash(item) {
    const equipmentRecord = catalogItemToEquipment({
      catalogId,
      item,
      roomId,
      crewId,
      playerId,
      makeId,
      nowIso,
    });

    onAddCatalogEquipment(equipmentRecord);
  }

  function updateWeaponTarget(target, patch) {
    onUpdate("equipment", target.equipmentId, {
      weapon: {
        ...(target.weapon || {}),
        ...patch,
      },
    });

    setMessage("");
  }

  function addModToTarget(mod) {
    const target = modTarget;
    if (!target) return;

    const result = canAttachGunModToWeapon({
      equipment: target,
      mod,
    });

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    const currentMods = asArray(target.weapon?.mods);

    if (currentMods.includes(mod.name)) {
      setMessage("That mod is already attached.");
      return;
    }

    updateWeaponTarget(target, {
      mods: [...currentMods, mod.name],
    });

    setModTarget(null);
  }

  function setSightOnTarget(sight) {
    const target = sightTarget;
    if (!target) return;

    const result = canAttachGunSightToWeapon({
      equipment: target,
      sight,
    });

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    updateWeaponTarget(target, {
      sight: sight.name,
    });

    setSightTarget(null);
  }

  function clearSight(target) {
    updateWeaponTarget(target, {
      sight: "",
    });
  }

  return (
    <div className="fp-panel">
      {message && (
        <div className="fp-error">
          {message}
        </div>
      )}

      <AccordionSection title="Add Equipment From Rule Tables" defaultOpen>
        <div className="fp-toolbar">
          {EQUIPMENT_CATALOGS.map((catalog) => (
            <button
              key={catalog.id}
              className="fp-btn fp-primary"
              onClick={() => setCatalogId(catalog.id)}
            >
              {catalog.title}
            </button>
          ))}

          <button className="fp-btn" onClick={onAddBlankEquipment}>
            Blank Item
          </button>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Stash / Ship Inventory"
        subtitle={`${stashItems.length} item${stashItems.length === 1 ? "" : "s"}`}
        defaultOpen
      >
        {stashItems.length === 0 ? (
          <div className="fp-muted">No items in stash.</div>
        ) : (
          stashItems.map((item) => (
            <EquipmentEditor
              key={item.equipmentId}
              item={item}
              equipment={equipment}
              crewMembers={crewMembers}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onOpenMods={setModTarget}
              onOpenSights={setSightTarget}
            />
          ))
        )}
      </AccordionSection>

      <AccordionSection
        title="Assigned Crew Equipment"
        subtitle={`${assignedItems.length} assigned item${assignedItems.length === 1 ? "" : "s"}`}
      >
        {crewMembers.map((member) => {
          const memberItems = assignedItems.filter(
            (item) => item.crewMemberId === member.crewMemberId
          );

          return (
            <AccordionSection
              key={member.crewMemberId}
              title={member.name || "Unnamed Crew Member"}
              subtitle={`${memberItems.length} item${memberItems.length === 1 ? "" : "s"}`}
            >
              {memberItems.length === 0 ? (
                <div className="fp-muted">No assigned items.</div>
              ) : (
                memberItems.map((item) => (
                  <EquipmentEditor
                    key={item.equipmentId}
                    item={item}
                    equipment={equipment}
                    crewMembers={crewMembers}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onOpenMods={setModTarget}
                    onOpenSights={setSightTarget}
                  />
                ))
              )}
            </AccordionSection>
          );
        })}
      </AccordionSection>

      <AccordionSection title="Inventory Summary" defaultOpen>
        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Subtype</th>
                <th>Location</th>
                <th>Summary</th>
              </tr>
            </thead>

            <tbody>
              {equipment.map((item) => (
                <tr key={item.equipmentId}>
                  <td>{item.name}</td>
                  <td>{getCategoryLabel(item.category)}</td>
                  <td>{item.subtype}</td>
                  <td>{getLocationLabel(item, crewMembers)}</td>
                  <td className="fp-wrap-cell">{getEffectSummary(item)}</td>
                </tr>
              ))}

              {equipment.length === 0 && (
                <tr>
                  <td colSpan={5} className="fp-table-empty">
                    No equipment yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AccordionSection>

      {selectedCatalog && (
        <CatalogModal
          title={selectedCatalog.title}
          columns={selectedCatalog.columns}
          rows={selectedCatalog.rows}
          actionLabel={selectedCatalog.actionLabel}
          onSelect={addCatalogItemToStash}
          onClose={() => setCatalogId("")}
        />
      )}

      {modTarget && (
        <CatalogModal
          title="Gun Mods"
          subtitle={modTarget.name}
          columns={["name", "effect", "restrictions"]}
          rows={GUN_MODS_TABLE}
          actionLabel="Add Mod"
          onSelect={addModToTarget}
          onClose={() => setModTarget(null)}
        />
      )}

      {sightTarget && !sightTarget?.weapon?.sight && (
        <CatalogModal
          title="Gun Sights"
          subtitle={sightTarget.name}
          columns={["name", "effect", "restrictions"]}
          rows={GUN_SIGHTS_TABLE}
          actionLabel="Attach Sight"
          onSelect={setSightOnTarget}
          onClose={() => setSightTarget(null)}
        />
      )}

      {sightTarget?.weapon?.sight && (
        <div className="fp-modal-backdrop">
          <div className="fp-modal">
            <div className="fp-modal-header">
              <div>
                <div className="fp-modal-title">Current Sight</div>
                <div className="fp-modal-subtitle">{sightTarget.weapon.sight}</div>
              </div>

              <button className="fp-btn fp-danger" onClick={() => setSightTarget(null)}>
                Close
              </button>
            </div>

            <div className="fp-actions">
              <button
                className="fp-btn fp-danger"
                onClick={() => {
                  clearSight(sightTarget);
                  setSightTarget(null);
                }}
              >
                Remove Sight
              </button>

              <button
                className="fp-btn"
                onClick={() => {
                  clearSight(sightTarget);
                }}
              >
                Replace Sight
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}