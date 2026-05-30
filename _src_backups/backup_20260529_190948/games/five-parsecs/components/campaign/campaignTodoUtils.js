export function createTodoId(prefix = "todo") {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now()}-${random}`;
}

export function getOpenTodos(todos = []) {
  return (Array.isArray(todos) ? todos : []).filter((todo) => {
    return todo?.status !== "complete";
  });
}

export function getCompletedTodos(todos = []) {
  return (Array.isArray(todos) ? todos : []).filter((todo) => {
    return todo?.status === "complete";
  });
}

export function appendTodo(existingTodos = [], todo) {
  const list = Array.isArray(existingTodos) ? existingTodos : [];
  const cleanTodo = normalizeTodo(todo);

  if (!cleanTodo.taskText) return list;

  return [...list, cleanTodo];
}

export function completeTodo(existingTodos = [], todoId) {
  const list = Array.isArray(existingTodos) ? existingTodos : [];

  return list.map((todo) => {
    if (todo.todoId !== todoId) return todo;

    return {
      ...todo,
      status: "complete",
      completedAt: new Date().toISOString(),
    };
  });
}

export function deleteTodo(existingTodos = [], todoId) {
  const list = Array.isArray(existingTodos) ? existingTodos : [];
  return list.filter((todo) => todo.todoId !== todoId);
}

export function normalizeTodo(todo = {}) {
  return {
    todoId: todo.todoId || createTodoId(),
    status: todo.status || "open",
    sourceType: todo.sourceType || "manual",
    sourceStepId: todo.sourceStepId || "",
    sourceStepLabel: todo.sourceStepLabel || "",
    sourceTableId: todo.sourceTableId || "",
    sourceTableLabel: todo.sourceTableLabel || "",
    sourceRoll: todo.sourceRoll ?? "",
    sourceTitle: todo.sourceTitle || "",
    taskText: todo.taskText || "",
    relatedTargetType: todo.relatedTargetType || "",
    relatedTargetId: todo.relatedTargetId || "",
    relatedTargetLabel: todo.relatedTargetLabel || "",
    createdAt: todo.createdAt || new Date().toISOString(),
    completedAt: todo.completedAt || "",
  };
}

function formatTodoPart(value) {
  if (!value) return "";

  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    return value.map(formatTodoPart).filter(Boolean).join("; ");
  }

  if (typeof value === "object") {
    const label =
      value.label ||
      value.title ||
      value.name ||
      value.type ||
      value.key ||
      "Item";

    const amount =
      value.amount ??
      value.count ??
      value.quantity ??
      value.value ??
      "";

    const text = value.description || value.effect || value.notes || value.text || "";
    const amountText = amount === "" ? "" : ` ${amount}`;
    const textPart = text ? ` — ${text}` : "";

    return `${label}${amountText}${textPart}`;
  }

  return String(value).trim();
}

function getLookupEffects(row = {}) {
  return [
    row.effect,
    row.effects,
    row.effectText,
    row.effectDescription,
    row.resultEffect,
    row.specialEffect,
  ]
    .map(formatTodoPart)
    .filter(Boolean);
}

export function createTodoFromLookupResult({ table, row, roll, applyTo }) {
  const tableLabel = table?.label || table?.title || "Lookup Table";
  const rowTitle = row?.title || row?.name || row?.result || "Result";
  const description = row?.description || row?.notes || "";
  const rollText = roll === null || roll === undefined ? "selected" : roll;
  const taskParts = [];
  const effects = getLookupEffects(row);

  if (effects.length) {
    taskParts.push(`Apply effect: ${effects.join("; ")}.`);
  }

  if (Array.isArray(row?.resources) && row.resources.length) {
    const resourcesText = row.resources.map(formatTodoPart).filter(Boolean).join(", ");

    if (resourcesText) {
      taskParts.push(`Apply, add, or create resources/records: ${resourcesText}.`);
    }
  }

  if (Array.isArray(row?.startingRolls) && row.startingRolls.length) {
    const rollsText = row.startingRolls.map(formatTodoPart).filter(Boolean).join(", ");

    if (rollsText) {
      taskParts.push(`Make starting rolls: ${rollsText}.`);
    }
  }

  if (description) {
    taskParts.push(`Review result text: ${description}`);
  }

  if (!taskParts.length) {
    taskParts.push("Review this result and apply any required changes.");
  }

  return normalizeTodo({
    sourceType: "lookupTable",
    sourceTableId: table?.id || "",
    sourceTableLabel: tableLabel,
    sourceRoll: rollText,
    sourceTitle: rowTitle,
    taskText: `${tableLabel}: ${rowTitle} — ${taskParts.join(" ")}`,
    relatedTargetType: applyTo?.targetType || "",
    relatedTargetId: applyTo?.recordId || "",
    relatedTargetLabel: applyTo?.label || "",
  });
}

export function createTodoFromStepResult({
  sourceStepId,
  sourceStepLabel,
  title,
  taskText,
  relatedTargetType = "campaignTurn",
  relatedTargetId = "",
  relatedTargetLabel = "Current Campaign Turn",
}) {
  return normalizeTodo({
    sourceType: "campaignStep",
    sourceStepId,
    sourceStepLabel,
    sourceTitle: title || sourceStepLabel || "Campaign Step",
    taskText,
    relatedTargetType,
    relatedTargetId,
    relatedTargetLabel,
  });
}
