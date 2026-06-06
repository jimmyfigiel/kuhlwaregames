export function removeUndefinedValues(value) {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedValues(item));
  }

  if (value && typeof value === "object") {
    const cleaned = {};

    Object.entries(value).forEach(([key, entryValue]) => {
      if (entryValue !== undefined) {
        cleaned[key] = removeUndefinedValues(entryValue);
      }
    });

    return cleaned;
  }

  return value;
}

export function addDefinedValue(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }

  return target;
}
