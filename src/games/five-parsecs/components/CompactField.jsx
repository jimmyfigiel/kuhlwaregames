import React from "react";

export function CompactField({ label, value, onChange, type = "text", textarea = false, options = null }) {
  if (options) {
    return (
      <label className="fp-field">
        <span>{label}</span>
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (textarea) {
    return (
      <label className="fp-field fp-field-wide">
        <span>{label}</span>
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={2} />
      </label>
    );
  }

  return (
    <label className="fp-field">
      <span>{label}</span>
      <input value={value ?? ""} type={type} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)} />
    </label>
  );
}

export function CompactCheckbox({ label, checked, onChange }) {
  return (
    <label className="fp-check">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function CompactListField({ label, value, onChange, placeholder = "comma, separated, values" }) {
  const text = Array.isArray(value) ? value.join(", ") : value || "";
  return (
    <label className="fp-field fp-field-wide">
      <span>{label}</span>
      <input
        value={text}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean)
          )
        }
      />
    </label>
  );
}
