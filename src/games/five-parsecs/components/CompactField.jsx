import React from "react";

export function CompactField({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  options = null,
  placeholder = "",
}) {
  const safeValue = value ?? "";

  if (options) {
    return (
      <label className="fp-field">
        {label}
        <select
          value={safeValue}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => {
            if (typeof option === "string") {
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            }

            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          })}
        </select>
      </label>
    );
  }

  if (textarea) {
    return (
      <label className="fp-field fp-field-wide">
        {label}
        <textarea
          value={safeValue}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  return (
    <label className="fp-field">
      {label}
      <input
        type={type}
        value={safeValue}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function CompactCheckbox({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="fp-check">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function CompactListField({
  label,
  value,
  onChange,
  placeholder = "Separate items with commas",
}) {
  const safeArray = Array.isArray(value) ? value : [];
  const textValue = safeArray.join(", ");

  function parseList(text) {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return (
    <label className="fp-field fp-field-wide">
      {label}
      <input
        type="text"
        value={textValue}
        placeholder={placeholder}
        onChange={(event) => onChange(parseList(event.target.value))}
      />
    </label>
  );
}