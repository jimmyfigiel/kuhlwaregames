export function rollD100() {
  return Math.floor(Math.random() * 100) + 1;
}

export function findByRoll(table, roll) {
  const numericRoll = Number(roll);

  if (!Array.isArray(table) || !Number.isFinite(numericRoll)) {
    return null;
  }

  return (
    table.find(
      (entry) => numericRoll >= Number(entry.rollMin) && numericRoll <= Number(entry.rollMax)
    ) || null
  );
}
