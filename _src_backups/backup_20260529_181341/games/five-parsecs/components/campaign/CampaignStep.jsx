import React from "react";

import { getProgressValue, getStepPhase } from "./campaignStepUtils";

export default function CampaignStep({
  stepId,
  label,
  currentTurn,
  progress,
  activeStepId,
  onSetActiveStep,
  onToggleProgress,
  children,
}) {
  const checked = getProgressValue(progress, stepId);
  const isActive = activeStepId === stepId;
  const disabled = !currentTurn;

  return (
    <div className="fp-campaign-step-table">
      <div className="fp-campaign-step-row">
        <div className="fp-campaign-step-complete-cell">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            title={checked ? "Complete" : "Mark complete"}
            onChange={(event) => onToggleProgress(stepId, event.target.checked)}
          />
        </div>

        <button
          type="button"
          className="fp-campaign-step-title-cell"
          onClick={() => onSetActiveStep(stepId)}
        >
          <span className="fp-campaign-step-phase">{getStepPhase(stepId)}</span>
          <span className="fp-campaign-step-title">{label}</span>
        </button>

        <div className="fp-campaign-step-status-cell">
          {checked ? "Complete" : isActive ? "Active" : "Pending"}
        </div>

        <div className="fp-campaign-step-action-cell">
          <button
            type="button"
            className="fp-btn fp-btn-compact"
            onClick={() => onSetActiveStep(stepId)}
          >
            {isActive ? "Open" : "Go"}
          </button>
        </div>
      </div>

      {isActive && <div className="fp-campaign-step-body">{children}</div>}
    </div>
  );
}

export function ResultCard({ title, roll, row, description, children }) {
  if (!title && !row && !description && !children) return null;

  return (
    <div className="fp-inline-card" style={{ marginTop: "8px" }}>
      {roll !== undefined && roll !== null && (
        <div className="fp-muted-inline">Roll: {roll}</div>
      )}

      <strong>{title || row?.title || "Result"}</strong>

      {(description || row?.description) && (
        <div style={{ marginTop: "4px", whiteSpace: "pre-wrap" }}>
          {description || row.description}
        </div>
      )}

      {children}
    </div>
  );
}

export function StepRulesText({ children }) {
  return <div className="fp-rules-text">{children}</div>;
}

export function SimpleField({ label, value, onChange, type = "text", min }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <input
        className="fp-input"
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SimpleSelect({ label, value, onChange, options }) {
  return (
    <label className="fp-field">
      <span>{label}</span>
      <select
        className="fp-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
