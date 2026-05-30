import React from "react";

import { getCompletedTodos, getOpenTodos } from "./campaignTodoUtils";

export default function CampaignTodosPanel({
  currentTurn = null,
  onCompleteTodo,
  onDeleteTodo,
}) {
  const todos = Array.isArray(currentTurn?.todos) ? currentTurn.todos : [];
  const openTodos = getOpenTodos(todos);
  const completedTodos = getCompletedTodos(todos);

  return (
    <div
      className="fp-inline-card fp-campaign-todos-panel"
      style={{
        marginTop: "10px",
        marginLeft: 0,
        marginRight: 0,
        width: "100%",
        maxWidth: "none",
        alignSelf: "stretch",
        boxSizing: "border-box",
        display: "block",
        textAlign: "left",
      }}
    >
      <div className="fp-card-title-row">
        <strong>Campaign Turn To Do List</strong>
        <span className="fp-muted-inline">
          {openTodos.length} open
          {completedTodos.length ? ` · ${completedTodos.length} complete` : ""}
        </span>
      </div>

      {!currentTurn && (
        <div className="fp-muted" style={{ marginTop: "8px" }}>
          Start a campaign turn to track unresolved results.
        </div>
      )}

      {currentTurn && openTodos.length === 0 && (
        <div className="fp-muted" style={{ marginTop: "8px" }}>
          No open campaign todos.
        </div>
      )}

      {openTodos.length > 0 && (
        <div
          className="fp-table-wrap fp-campaign-todos-table-wrap"
          style={{
            marginTop: "8px",
            marginLeft: 0,
            marginRight: 0,
            width: "100%",
            maxWidth: "none",
          }}
        >
          <table className="fp-compact-table fp-campaign-todos-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "56px" }}>Done</th>
                <th>Source</th>
                <th>Task</th>
                <th>Apply To</th>
                <th style={{ width: "88px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {openTodos.map((todo) => (
                <tr key={todo.todoId}>
                  <td>
                    <input
                      type="checkbox"
                      title="Mark complete"
                      onChange={() => onCompleteTodo(todo.todoId)}
                    />
                  </td>

                  <td>
                    <strong>
                      {todo.sourceTableLabel || todo.sourceStepLabel || "Manual"}
                    </strong>
                    {todo.sourceRoll !== "" && todo.sourceRoll !== undefined && (
                      <div className="fp-muted-inline">Roll: {todo.sourceRoll}</div>
                    )}
                    {todo.sourceTitle && (
                      <div className="fp-muted-inline">{todo.sourceTitle}</div>
                    )}
                  </td>

                  <td style={{ whiteSpace: "pre-wrap" }}>{todo.taskText}</td>

                  <td>{todo.relatedTargetLabel || "Campaign Turn"}</td>

                  <td>
                    <button
                      className="fp-btn fp-btn-compact"
                      onClick={() => onDeleteTodo(todo.todoId)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
