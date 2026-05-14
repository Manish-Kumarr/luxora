import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, ListTodo, Pencil, Check, X } from "lucide-react";
import { useApp } from "../context/AppContext";

const PRIORITIES = ["Low", "Medium", "High"];
const PRIORITY_COLORS = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444" };

export default function Todo({ isMobile }) {
  const { todos, todosLoading, addTodo, toggleTodo, updateTodo, deleteTodo } = useApp();
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [filter, setFilter] = useState("All");

  // Edit state
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState("Medium");

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  const handleAdd = async () => {
    const text = input.trim();
    if (!text) return;
    await addTodo(text, priority);
    setInput("");
  };

  const startEdit = (todo) => {
    setEditId(todo.id);
    setEditText(todo.text);
    setEditPriority(todo.priority);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditText("");
    setEditPriority("Medium");
  };

  const saveEdit = async () => {
    const text = editText.trim();
    if (!text) return;
    await updateTodo(editId, text, editPriority);
    cancelEdit();
  };

  const filtered = todos.filter((t) => {
    if (filter === "Active") return !t.done;
    if (filter === "Completed") return t.done;
    return true;
  });

  const completedCount = todos.filter((t) => t.done).length;

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>
          Todo
        </h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
          {completedCount} of {todos.length} tasks completed
        </p>
      </div>

      {/* Add Task */}
      <div
        style={{
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: "12px",
          padding: isMobile ? "14px" : "20px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "10px",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New task..."
          style={{
            flex: 1,
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "#e0e0e0",
            fontSize: "14px",
            outline: "none",
          }}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            padding: "10px 14px",
            color: PRIORITY_COLORS[priority],
            fontSize: "13px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p} style={{ color: PRIORITY_COLORS[p] }}>
              {p}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 18px",
            background: "rgba(0,128,128,0.2)",
            border: "1px solid rgba(0,128,128,0.4)",
            borderRadius: "8px",
            color: "#33b5b5",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px" }}>
        {["All", "Active", "Completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 16px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: filter === f ? "rgba(0,128,128,0.5)" : "#2a2a2a",
              background: filter === f ? "rgba(0,128,128,0.15)" : "transparent",
              color: filter === f ? "#33b5b5" : "#555",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {todosLoading && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#444", fontSize: "14px" }}>
          Loading...
        </div>
      )}

      {/* Todo List */}
      {!todosLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                color: "#444",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <ListTodo size={36} color="#2a2a2a" />
              <span style={{ fontSize: "14px" }}>No tasks here</span>
            </div>
          )}
          {filtered.map((todo) => (
            <div
              key={todo.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: isMobile ? "12px 14px" : "14px 18px",
                background: "#111",
                border: `1px solid ${editId === todo.id ? "rgba(0,128,128,0.4)" : "#1e1e1e"}`,
                borderRadius: "10px",
                transition: "border-color 0.15s",
              }}
            >
              {/* Checkbox — hidden while editing */}
              {editId !== todo.id && (
                <button
                  onClick={() => toggleTodo(todo.id, !todo.done)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}
                >
                  {todo.done ? (
                    <CheckCircle2 size={20} color="#33b5b5" />
                  ) : (
                    <Circle size={20} color="#444" />
                  )}
                </button>
              )}

              {editId === todo.id ? (
                /* ── Edit mode ── */
                <>
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    style={{
                      flex: 1,
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      color: "#e0e0e0",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    style={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      color: PRIORITY_COLORS[editPriority],
                      fontSize: "12px",
                      cursor: "pointer",
                      outline: "none",
                      flexShrink: 0,
                    }}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p} style={{ color: PRIORITY_COLORS[p] }}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={saveEdit}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#33b5b5", flexShrink: 0 }}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#555", flexShrink: 0 }}
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                /* ── Normal mode ── */
                <>
                  <span
                    style={{
                      flex: 1,
                      fontSize: "14px",
                      color: todo.done ? "#444" : "#e0e0e0",
                      textDecoration: todo.done ? "line-through" : "none",
                    }}
                  >
                    {todo.text}
                  </span>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: PRIORITY_COLORS[todo.priority],
                      background: `${PRIORITY_COLORS[todo.priority]}18`,
                      border: `1px solid ${PRIORITY_COLORS[todo.priority]}40`,
                      padding: "3px 10px",
                      borderRadius: "20px",
                      flexShrink: 0,
                    }}
                  >
                    {todo.priority}
                  </span>

                  <button
                    onClick={() => startEdit(todo)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#444", flexShrink: 0 }}
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    onClick={() => deleteTodo(todo.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#333", flexShrink: 0 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
