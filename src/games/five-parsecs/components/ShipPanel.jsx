import React, { useMemo, useState } from "react";

import AccordionSection from "./AccordionSection";
import CatalogModal from "./CatalogModal";

import { CompactField } from "./CompactField";

import {
  SHIP_COMPONENTS_TABLE,
  createShipComponentRecord,
  getInstalledComponentCount,
  getInstalledComponentFuelSurcharge,
} from "../data/equipmentCatalog";

import { makeId, nowIso } from "../utils/recordFactories";

function getDefaultStarship(starship = {}) {
  return {
    name: starship.name || "",
    shipType: starship.shipType || "",
    hasShip: starship.hasShip !== false,

    hullDamage: Number(starship.hullDamage || 0),
    hullThreshold: Number(starship.hullThreshold || 0),

    debtOwed: Number(starship.debtOwed || 0),
    financedAmount: Number(starship.financedAmount || 0),

    notes: starship.notes || "",

    components: Array.isArray(starship.components) ? starship.components : [],
  };
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function ShipPanel({ crew, playerId, onSaveCrew }) {
  const [showComponents, setShowComponents] = useState(false);
  const [message, setMessage] = useState("");

  const starship = useMemo(() => {
    return getDefaultStarship(crew?.starship || {});
  }, [crew]);

  if (!crew) {
    return (
      <div className="fp-panel">
        <div className="fp-muted">
          Create an adventure before editing the ship.
        </div>
      </div>
    );
  }

  function saveStarship(patch) {
    onSaveCrew({
      ...crew,
      starship: {
        ...starship,
        ...patch,
      },
    });
  }

  function updateComponent(componentId, patch) {
    const components = starship.components.map((component) => {
      if (component.shipComponentId !== componentId) return component;

      return {
        ...component,
        ...patch,
        updatedAt: nowIso(),
        updatedBy: playerId,
      };
    });

    saveStarship({ components });
  }

  function addComponent(component) {
    const record = createShipComponentRecord({
      component,
      playerId,
      makeId,
      nowIso,
    });

    saveStarship({
      components: [...starship.components, record],
    });

    setShowComponents(false);
  }

  function removeComponent(componentId) {
    updateComponent(componentId, {
      installed: false,
      removed: true,
    });
  }

  function repairOneHull() {
    const current = Number(starship.hullDamage || 0);

    saveStarship({
      hullDamage: Math.max(0, current - 1),
    });
  }

  function emergencyTakeoff() {
    const dice = [rollDie(6), rollDie(6), rollDie(6)];
    const damage = dice.reduce((sum, value) => sum + value, 0);

    saveStarship({
      hullDamage: Number(starship.hullDamage || 0) + damage,
    });

    setMessage(
      `Emergency Take-off caused ${damage} Hull damage. Rolled [${dice.join(
        ", "
      )}].`
    );
  }

  const installedCount = getInstalledComponentCount(starship.components);
  const fuelSurcharge = getInstalledComponentFuelSurcharge(starship.components);
  const visibleComponents = starship.components.filter(
    (component) => !component.removed
  );

  const isWrecked =
    starship.hullThreshold > 0 &&
    starship.hullDamage >= starship.hullThreshold;

  return (
    <div className="fp-panel">
      {message && <div className="fp-error">{message}</div>}

      <AccordionSection title="Ship Summary" defaultOpen>
        <div className="fp-grid">
          <CompactField
            label="Ship Name"
            value={starship.name}
            onChange={(value) => saveStarship({ name: value })}
          />

          <CompactField
            label="Ship Type"
            value={starship.shipType}
            onChange={(value) => saveStarship({ shipType: value })}
          />

          <label className="fp-check">
            <input
              type="checkbox"
              checked={Boolean(starship.hasShip)}
              onChange={(event) =>
                saveStarship({ hasShip: event.target.checked })
              }
            />
            Crew Has Ship
          </label>

          <CompactField
            label="Hull Damage"
            type="number"
            value={starship.hullDamage}
            onChange={(value) =>
              saveStarship({ hullDamage: Number(value || 0) })
            }
          />

          <CompactField
            label="Hull Threshold"
            type="number"
            value={starship.hullThreshold}
            onChange={(value) =>
              saveStarship({ hullThreshold: Number(value || 0) })
            }
          />

          <CompactField
            label="Debt Owed"
            type="number"
            value={starship.debtOwed}
            onChange={(value) => saveStarship({ debtOwed: Number(value || 0) })}
          />

          <CompactField
            label="Financed Amount"
            type="number"
            value={starship.financedAmount}
            onChange={(value) =>
              saveStarship({ financedAmount: Number(value || 0) })
            }
          />

          <CompactField
            label="Ship Notes"
            value={starship.notes}
            textarea
            onChange={(value) => saveStarship({ notes: value })}
          />
        </div>

        <div className="fp-turn-summary">
          Installed Components: {installedCount} · Fuel Surcharge: +
          {fuelSurcharge} credits
          {isWrecked ? " · Ship Wrecked/Lost" : ""}
          {starship.hullDamage > 0 && !isWrecked
            ? " · Damaged: travel is unsafe"
            : ""}
        </div>

        <div className="fp-actions">
          <button className="fp-btn" onClick={repairOneHull}>
            Repair 1 Hull
          </button>

          <button className="fp-btn fp-danger" onClick={emergencyTakeoff}>
            Emergency Take-off: 3D6 Damage
          </button>

          <button
            className="fp-btn fp-primary"
            onClick={() => setShowComponents(true)}
          >
            Add Component
          </button>
        </div>

        <div className="fp-mini-title">Ship Components</div>

        <div className="fp-table-wrap">
          <table className="fp-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Cost</th>
                <th>Installed</th>
                <th>Damaged</th>
                <th>Description / Effect</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {visibleComponents.map((component) => (
                <tr key={component.shipComponentId}>
                  <td>{component.name}</td>
                  <td>{component.cost}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(component.installed)}
                      onChange={(event) =>
                        updateComponent(component.shipComponentId, {
                          installed: event.target.checked,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(component.damaged)}
                      onChange={(event) =>
                        updateComponent(component.shipComponentId, {
                          damaged: event.target.checked,
                        })
                      }
                    />
                  </td>
                  <td className="fp-wrap-cell">
                    <strong>{component.description}</strong>
                    <br />
                    {component.effect}
                  </td>
                  <td>
                    <button
                      className="fp-btn fp-danger"
                      onClick={() => removeComponent(component.shipComponentId)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {visibleComponents.length === 0 && (
                <tr>
                  <td colSpan={6} className="fp-table-empty">
                    No ship components installed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AccordionSection>

      {showComponents && (
        <CatalogModal
          title="Ship Components"
          columns={["name", "cost", "description", "effect"]}
          rows={SHIP_COMPONENTS_TABLE}
          actionLabel="Install"
          onSelect={addComponent}
          onClose={() => setShowComponents(false)}
        />
      )}
    </div>
  );
}