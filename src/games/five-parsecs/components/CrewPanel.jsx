import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import AccordionSection from "./AccordionSection";
import CampaignTodosPanel from "./campaign/CampaignTodosPanel";
import { CompactField } from "./CompactField";
import { getLatestCampaignTurn, getRecordId } from "./campaign/campaignStepUtils";
import { completeTodo, deleteTodo } from "./campaign/campaignTodoUtils";
import {
  getWeaponTraitDescription,
  normalizeWeaponTraitName,
} from "../data/weaponTraits";

function safeNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;
  return Number(value);
}

function getCrewMemberGearItems(member, equipment) {
  return equipment.filter((item) => {
    return (
      item.locationType === "crewMember" &&
      item.crewMemberId === member.crewMemberId
    );
  });
}

function getCaptainName(crew, crewMembers) {
  const captainId = crew?.captainCrewMemberId || "";

  if (!captainId) return "";

  const captain = crewMembers.find((member) => {
    return member.crewMemberId === captainId;
  });

  return captain?.name || "";
}


const CREW_GEAR_COLUMN_STORAGE_KEY = "fiveParsecsCrewGearColumnWidths";

const DEFAULT_CREW_GEAR_COLUMN_WIDTHS = {
  item: 18,
  type: 7,
  subtype: 8,
  range: 5,
  shots: 5,
  damage: 5,
  traits: 14,
  mods: 6,
  sight: 6,
  protection: 8,
  status: 7,
  notes: 11,
};

const CREW_GEAR_COLUMNS = [
  { id: "item", label: "Item" },
  { id: "type", label: "Type" },
  { id: "subtype", label: "Subtype" },
  { id: "range", label: "Rng" },
  { id: "shots", label: "Shots" },
  { id: "damage", label: "Dmg" },
  { id: "traits", label: "Traits" },
  { id: "mods", label: "Mods" },
  { id: "sight", label: "Sight" },
  { id: "protection", label: "Protection" },
  { id: "status", label: "Status" },
  { id: "notes", label: "Notes" },
];

function clampGearColumnWidth(value) {
  return Math.max(4, Math.min(45, value));
}

function loadCrewGearColumnWidths() {
  if (typeof window === "undefined") return DEFAULT_CREW_GEAR_COLUMN_WIDTHS;

  try {
    const saved = window.localStorage.getItem(CREW_GEAR_COLUMN_STORAGE_KEY);
    if (!saved) return DEFAULT_CREW_GEAR_COLUMN_WIDTHS;

    const parsed = JSON.parse(saved);

    return {
      ...DEFAULT_CREW_GEAR_COLUMN_WIDTHS,
      ...parsed,
    };
  } catch (error) {
    console.warn("Could not load crew gear column widths", error);
    return DEFAULT_CREW_GEAR_COLUMN_WIDTHS;
  }
}

function ResizableCrewGearHeader({ column, onBeginResize }) {
  return (
    <th>
      <div className="fp-resizable-th">
        {column.label}
        <span
          className="fp-column-resizer"
          title={`Resize ${column.label} column`}
          onMouseDown={(event) => onBeginResize(event, column.id)}
        />
      </div>
    </th>
  );
}

function WeaponTraitTooltip({ trait }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    transform: "translateX(-50%)",
  });

  const triggerRef = useRef(null);

  const normalizedTrait = normalizeWeaponTraitName(trait);
  const description = getWeaponTraitDescription(normalizedTrait);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 360;
    const screenPadding = 12;

    let left = rect.left + rect.width / 2;
    let transform = "translateX(-50%)";

    if (left - tooltipWidth / 2 < screenPadding) {
      left = screenPadding;
      transform = "translateX(0)";
    }

    if (left + tooltipWidth / 2 > window.innerWidth - screenPadding) {
      left = window.innerWidth - screenPadding;
      transform = "translateX(-100%)";
    }

    setPosition({
      top: rect.bottom + 8,
      left,
      transform,
    });
  }, [open]);

  if (!normalizedTrait) return null;

  const tooltip =
    open && description
      ? createPortal(
          <div
            className="fp-weapon-trait-tooltip"
            role="tooltip"
            style={{
              position: "fixed",
              zIndex: 999999,
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: position.transform,
              width: "360px",
              maxWidth: "calc(100vw - 24px)",
              padding: "8px 10px",
              border: "1px solid #68d8ff",
              borderRadius: "6px",
              background: "#06131a",
              color: "#d9faff",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.45)",
              fontSize: "12px",
              lineHeight: "1.4",
              whiteSpace: "normal",
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <strong>{normalizedTrait}</strong>
            <br />
            {description}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <span
        ref={triggerRef}
        className="fp-weapon-trait"
        tabIndex={description ? 0 : -1}
        aria-label={
          description ? `${normalizedTrait}: ${description}` : normalizedTrait
        }
        style={{
          display: "inline-block",
          borderBottom: description ? "1px dotted currentColor" : "none",
          cursor: description ? "help" : "default",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {normalizedTrait}
      </span>

      {tooltip}
    </>
  );
}

function WeaponTraits({ traits = [] }) {
  if (!Array.isArray(traits) || traits.length === 0) return null;

  return (
    <>
      {traits.map((trait, index) => {
        const normalizedTrait = normalizeWeaponTraitName(trait);

        return (
          <React.Fragment key={`${normalizedTrait}-${index}`}>
            {index > 0 && "/"}
            <WeaponTraitTooltip trait={normalizedTrait} />
          </React.Fragment>
        );
      })}
    </>
  );
}

function CrewEquipmentRow({ member, equipment, columnWidths, onBeginColumnResize }) {
  const items = getCrewMemberGearItems(member, equipment);

  return (
    <tr className="fp-crew-equipment-row">
      <td colSpan={13}>
        <div className="fp-crew-equipment-indent">
          <table
            className="fp-crew-gear-table"
            style={{ width: "100%", tableLayout: "fixed" }}
          >
            <colgroup>
              {CREW_GEAR_COLUMNS.map((column) => (
                <col
                  key={column.id}
                  style={{ width: `${columnWidths[column.id] || 8}%` }}
                />
              ))}
            </colgroup>

            <thead>
              <tr>
                {CREW_GEAR_COLUMNS.map((column) => (
                  <ResizableCrewGearHeader
                    key={column.id}
                    column={column}
                    onBeginResize={onBeginColumnResize}
                  />
                ))}
              </tr>
            </thead>

            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={12} className="fp-table-empty">
                    No gear assigned.
                  </td>
                </tr>
              )}

              {items.map((item) => {
                const weapon = item.weapon || {};
                const protection = item.protection || {};

                return (
                  <tr key={item.equipmentId || item.id || item.name}>
                    <td>{item.name || "Unnamed item"}</td>
                    <td>{item.category || ""}</td>
                    <td>{item.subtype || ""}</td>

                    <td>
                      {item.category === "weapon" && weapon.range
                        ? weapon.range
                        : ""}
                    </td>

                    <td>
                      {item.category === "weapon" &&
                      weapon.shots !== "" &&
                      weapon.shots !== undefined
                        ? weapon.shots
                        : ""}
                    </td>

                    <td>
                      {item.category === "weapon" &&
                      weapon.damage !== "" &&
                      weapon.damage !== undefined
                        ? weapon.damage
                        : ""}
                    </td>

                    <td>
                      {item.category === "weapon" &&
                      Array.isArray(weapon.traits) &&
                      weapon.traits.length > 0 ? (
                        <WeaponTraits traits={weapon.traits} />
                      ) : (
                        ""
                      )}
                    </td>

                    <td>
                      {item.category === "weapon" &&
                      Array.isArray(weapon.mods) &&
                      weapon.mods.length > 0
                        ? weapon.mods.join("/")
                        : ""}
                    </td>

                    <td>
                      {item.category === "weapon" ? weapon.sight || "" : ""}
                    </td>

                    <td>
                      {item.category === "protection"
                        ? protection.armor ||
                          protection.savingThrow ||
                          protection.value ||
                          item.protectionValue ||
                          ""
                        : ""}
                    </td>

                    <td>{item.status || ""}</td>
                    <td>{item.notes || ""}</td>
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

function CrewDetailsRow({
  member,
  onUpdate,
  onDelete,
  onAddCrewMemberLog,
}) {
  function patch(patchValue) {
    onUpdate("crewMembers", member.crewMemberId, patchValue);
  }

  return (
    <tr className="fp-crew-details-row">
      <td colSpan={13}>
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
          onChange={(event) =>
            patch({ speed: safeNumber(event.target.value) })
          }
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
          onChange={(event) =>
            patch({ savvy: safeNumber(event.target.value) })
          }
        />
      </td>

      <td>
        <input
          className="fp-table-input fp-stat-input"
          type="number"
          value={member.luck ?? 0}
          onChange={(event) =>
            patch({ luck: safeNumber(event.target.value) })
          }
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
  campaignTurns = [],
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
  const [crewGearColumnWidths, setCrewGearColumnWidths] = useState(() =>
    loadCrewGearColumnWidths()
  );

  const gearResizeStateRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        CREW_GEAR_COLUMN_STORAGE_KEY,
        JSON.stringify(crewGearColumnWidths)
      );
    } catch (error) {
      console.warn("Could not save crew gear column widths", error);
    }
  }, [crewGearColumnWidths]);

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", resizeCrewGearColumn);
      window.removeEventListener("mouseup", endCrewGearColumnResize);
    };
  }, []);

  function beginCrewGearColumnResize(event, columnId) {
    event.preventDefault();
    event.stopPropagation();

    gearResizeStateRef.current = {
      columnId,
      startX: event.clientX,
      startWidths: { ...crewGearColumnWidths },
    };

    window.addEventListener("mousemove", resizeCrewGearColumn);
    window.addEventListener("mouseup", endCrewGearColumnResize);
  }

  function resizeCrewGearColumn(event) {
    const resizeState = gearResizeStateRef.current;
    if (!resizeState) return;

    const tableWidth =
      document.querySelector(".fp-crew-gear-table")?.clientWidth || 900;
    const deltaPixels = event.clientX - resizeState.startX;
    const deltaPercent = (deltaPixels / tableWidth) * 100;

    const columnId = resizeState.columnId;
    const pairedColumnId = columnId === "notes" ? "item" : "notes";

    const nextWidths = { ...resizeState.startWidths };
    nextWidths[columnId] = clampGearColumnWidth(
      resizeState.startWidths[columnId] + deltaPercent
    );

    const actualDelta = nextWidths[columnId] - resizeState.startWidths[columnId];
    nextWidths[pairedColumnId] = clampGearColumnWidth(
      resizeState.startWidths[pairedColumnId] - actualDelta
    );

    setCrewGearColumnWidths(nextWidths);
  }

  function endCrewGearColumnResize() {
    gearResizeStateRef.current = null;

    window.removeEventListener("mousemove", resizeCrewGearColumn);
    window.removeEventListener("mouseup", endCrewGearColumnResize);
  }

  const currentTurn = getLatestCampaignTurn(campaignTurns);
  const currentTurnId = getRecordId(currentTurn);

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

  async function completeCampaignTodo(todoId) {
    if (!currentTurn || !currentTurnId || !onUpdate) return;

    await onUpdate("campaignTurns", currentTurnId, {
      todos: completeTodo(currentTurn.todos, todoId),
    });
  }

  async function deleteCampaignTodo(todoId) {
    if (!currentTurn || !currentTurnId || !onUpdate) return;

    await onUpdate("campaignTurns", currentTurnId, {
      todos: deleteTodo(currentTurn.todos, todoId),
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

        </div>

        <CampaignTodosPanel
          currentTurn={currentTurn}
          onCompleteTodo={completeCampaignTodo}
          onDeleteTodo={deleteCampaignTodo}
        />

        <div className="fp-adventure-notes-row" style={{ marginTop: "10px" }}>
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

                    <CrewEquipmentRow
                      member={member}
                      equipment={equipment}
                      columnWidths={crewGearColumnWidths}
                      onBeginColumnResize={beginCrewGearColumnResize}
                    />

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
    </div>
  );
}