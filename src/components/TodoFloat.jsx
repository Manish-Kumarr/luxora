import { useState, useRef, useEffect } from "react";
import { ListTodo, X, Plus, CheckCircle2, Circle, Trash2, Pencil, Check } from "lucide-react";
import { useApp } from "../context/AppContext";

const PRIORITIES = ["Low", "Medium", "High"];
const PRIORITY_COLORS = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444" };

export default function TodoFloat() {
  const { todos, todosLoading, addTodo, toggleTodo, updateTodo, deleteTodo } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [filter, setFilter] = useState("All");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState("Medium");
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleAdd = async () => {
    const text = input.trim();
    if (!text) return;
    await addTodo(text, priority);
    setInput("");
    setTimeout(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };

  const startEdit = (todo) => {
    setEditId(todo.id);
    setEditText(todo.text);
    setEditPriority(todo.priority);
  };

  const cancelEdit = () => { setEditId(null); setEditText(""); setEditPriority("Medium"); };

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

  const pendingCount = todos.filter((t) => !t.done).length;

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: "80px", right: "20px",
          width: "360px", maxWidth: "calc(100vw - 40px)",
          height: "520px", maxHeight: "calc(100vh - 120px)",
          background: "#111", border: "1px solid #222",
          borderRadius: "16px", boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column", zIndex: 500,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderBottom: "1px solid #1e1e1e",
            background: "#111", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(0,128,128,0.15)", border: "1px solid rgba(0,128,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ListTodo size={16} color="#33b5b5" />
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#f0f0f0" }}>Todo</p>
                <p style={{ fontSize: "11px", color: "#555" }}>
                  {pendingCount} pending · {todos.length} total
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", display: "flex", padding: "4px" }}>
              <X size={18} />
            </button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "6px", padding: "10px 12px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            {["All", "Active", "Completed"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "4px 12px", borderRadius: "20px", border: "1px solid",
                borderColor: filter === f ? "rgba(0,128,128,0.5)" : "#2a2a2a",
                background: filter === f ? "rgba(0,128,128,0.15)" : "transparent",
                color: filter === f ? "#33b5b5" : "#555",
                fontSize: "12px", fontWeight: "500", cursor: "pointer",
              }}>
                {f}
              </button>
            ))}
          </div>

          {/* Todo list */}
          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
            {todosLoading && (
              <p style={{ textAlign: "center", color: "#444", fontSize: "13px", paddingTop: "24px" }}>Loading...</p>
            )}
            {!todosLoading && filtered.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: "40px", color: "#333", fontSize: "13px" }}>No tasks here</div>
            )}
            {!todosLoading && filtered.map((todo) => (
              <div key={todo.id} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", background: "#1a1a1a",
                border: `1px solid ${editId === todo.id ? "rgba(0,128,128,0.4)" : "#222"}`,
                borderRadius: "10px",
              }}>
                {editId !== todo.id && (
                  <button onClick={() => toggleTodo(todo.id, !todo.done)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}>
                    {todo.done ? <CheckCircle2 size={18} color="#33b5b5" /> : <Circle size={18} color="#444" />}
                  </button>
                )}

                {editId === todo.id ? (
                  <>
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                      style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "5px 10px", color: "#e0e0e0", fontSize: "13px", outline: "none" }}
                    />
                    <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}
                      style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "5px 8px", color: PRIORITY_COLORS[editPriority], fontSize: "11px", cursor: "pointer", outline: "none" }}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#33b5b5", display: "flex" }}><Check size={16} /></button>
                    <button onClick={cancelEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#555", display: "flex" }}><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: "13px", color: todo.done ? "#444" : "#e0e0e0", textDecoration: todo.done ? "line-through" : "none", lineHeight: "1.4" }}>
                      {todo.text}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: "600", color: PRIORITY_COLORS[todo.priority], background: `${PRIORITY_COLORS[todo.priority]}18`, border: `1px solid ${PRIORITY_COLORS[todo.priority]}40`, padding: "2px 8px", borderRadius: "20px", flexShrink: 0 }}>
                      {todo.priority}
                    </span>
                    <button onClick={() => startEdit(todo)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#444", display: "flex" }}><Pencil size={13} /></button>
                    <button onClick={() => deleteTodo(todo.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#333", display: "flex" }}><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Input bar */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #1a1a1a", background: "#111", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="New task..."
                style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "9px 12px", color: "#e0e0e0", fontSize: "13px", outline: "none" }}
              />
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "9px 8px", color: PRIORITY_COLORS[priority], fontSize: "11px", cursor: "pointer", outline: "none" }}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={handleAdd} style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(0,128,128,0.2)", border: "1px solid rgba(0,128,128,0.4)", color: "#33b5b5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed", bottom: "20px", right: "20px",
          width: "52px", height: "52px", borderRadius: "50%",
          background: open ? "#1a1a1a" : "linear-gradient(135deg, #008080, #00a0a0)",
          border: open ? "1px solid #333" : "none",
          boxShadow: "0 4px 20px rgba(0,128,128,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 500, transition: "all 0.2s",
        }}
      >
        {open
          ? <X size={22} color="#888" />
          : (
            <div style={{ position: "relative" }}>
              <ListTodo size={22} color="#fff" />
              {pendingCount > 0 && (
                <span style={{
                  position: "absolute", top: "-8px", right: "-10px",
                  background: "#ef4444", color: "#fff", fontSize: "10px",
                  fontWeight: "700", borderRadius: "10px", padding: "1px 5px",
                  minWidth: "16px", textAlign: "center", lineHeight: "14px",
                }}>
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </div>
          )
        }
      </button>
    </>
  );
}
