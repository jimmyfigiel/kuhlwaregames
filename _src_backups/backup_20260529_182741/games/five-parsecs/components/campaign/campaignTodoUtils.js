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

export function createTodoFromLookupResult({ table, row, roll, applyTo }) {
  const tableLabel = table?.label || table?.title || "Lookup Table";
  const rowTitle = row?.title || row?.name || row?.result || "Result";
  const description = row?.description || row?.effect || "Review this result and apply any required changes.";
  const rollText = roll === null || roll === undefined ? "selected" : roll;

  return normalizeTodo({
    sourceType: "lookupTable",
    sourceTableId: table?.id || "",
    sourceTableLabel: tableLabel,
    sourceRoll: rollText,
    sourceTitle: rowTitle,
    taskText: `${tableLabel}: ${rowTitle} — ${description}`,
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
