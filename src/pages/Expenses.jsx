import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/initialData";
import { Plus, Pencil, Trash2, X, Check, ChevronDown } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`;
};

const todayIST = () => {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + offset).toISOString().split("T")[0];
};

const getEmpty = (owners) => ({
  date: todayIST(),
  category: "Utilities",
  description: "",
  totalAmount: 0,
  paid_amounts: owners.reduce((acc, o) => ({ ...acc, [o.id]: "" }), {}),
  status: "Pending",
  notes: "",
});

export default function Expenses({ isMobile }) {
  const { expenses, addExpense, updateExpense, deleteExpense, loading, owners } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fmt = (n) => n ? "₹" + Number(n).toLocaleString("en-IN") : "—";

  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (dateFilter === "today") return { from: todayStr, to: todayStr };
    if (dateFilter === "this_week") {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const mon = new Date(now);
      mon.setDate(now.getDate() - diff);
      return { from: mon.toISOString().split("T")[0], to: todayStr };
    }
    if (dateFilter === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: first.toISOString().split("T")[0], to: todayStr };
    }
    if (dateFilter === "custom") return { from: customFrom, to: customTo };
    return { from: null, to: null };
  }, [dateFilter, customFrom, customTo]);

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || e.category === filterCat;
    const d = e.date?.slice(0, 10);
    const matchDate =
      (!dateRange.from || d >= dateRange.from) &&
      (!dateRange.to || d <= dateRange.to);
    return matchSearch && matchCat && matchDate;
  });

  const openAdd = () => {
    setForm(getEmpty(owners));
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (exp) => {
    const basePaid = owners.reduce((acc, o) => ({ ...acc, [o.id]: "" }), {});
    const mergedPaid = { ...basePaid, ...(exp.paid_amounts || {}) };
    setForm({ ...exp, paid_amounts: mergedPaid });
    setEditId(exp.id);
    setShowForm(true);
  };

  const handlePaidChange = (ownerId, val) => {
    const newPaid = { ...(form.paid_amounts || {}), [ownerId]: val };
    const total = owners.reduce((s, o) => s + (Number(newPaid[o.id]) || 0), 0);
    setForm({ ...form, paid_amounts: newPaid, totalAmount: total });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paid_amounts = Object.fromEntries(
      Object.entries(form.paid_amounts || {}).map(([k, v]) => [k, Number(v) || 0])
    );
    const data = { ...form, totalAmount: Number(form.totalAmount), paid_amounts };
    if (editId) await updateExpense(editId, data);
    else await addExpense(data);
    setShowForm(false);
  };

  const doDelete = async () => {
    await deleteExpense(deleteConfirm);
    setDeleteConfirm(null);
  };

  const pad = isMobile ? "16px" : "32px";
  const colSpan = 4 + owners.length + 2;

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap: isMobile ? "14px" : "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Expenses</h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>{expenses.length} total entries</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Search */}
          <input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 14px", color: "#e0e0e0", fontSize: "13px", outline: "none", width: isMobile ? "100%" : "180px", boxSizing: "border-box" }}
          />

          {/* Category */}
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 12px", color: filterCat === "All" ? "#555" : "#e0e0e0", fontSize: "13px", outline: "none", cursor: "pointer", colorScheme: "dark" }}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          {/* Date filter dropdown */}
          <div style={{ position: "relative" }}>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                appearance: "none", WebkitAppearance: "none",
                background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px",
                padding: "8px 32px 8px 12px", color: dateFilter === "all" ? "#555" : "#33b5b5",
                fontSize: "13px", fontWeight: "600", cursor: "pointer", outline: "none",
                colorScheme: "dark",
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown size={13} color="#555" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>

          {dateFilter === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "7px 10px", color: customFrom ? "#e0e0e0" : "#555", fontSize: "12px", outline: "none", colorScheme: "dark" }} />
              <span style={{ color: "#444", fontSize: "12px" }}>to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "7px 10px", color: customTo ? "#e0e0e0" : "#555", fontSize: "12px", outline: "none", colorScheme: "dark" }} />
              {(customFrom || customTo) && (
                <button onClick={() => { setCustomFrom(""); setCustomTo(""); }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "16px", padding: "0 2px" }}>×</button>
              )}
            </>
          )}

          {dateFilter !== "all" && (
            <button
              onClick={() => { setDateFilter("all"); setCustomFrom(""); setCustomTo(""); }}
              style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(51,181,181,0.1)", border: "1px solid rgba(51,181,181,0.3)", borderRadius: "6px", padding: "5px 10px", color: "#33b5b5", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
            >
              {dateFilter === "today" ? "Today" : dateFilter === "this_week" ? "This Week" : dateFilter === "this_month" ? "This Month" : "Custom Range"} ×
            </button>
          )}

          <button onClick={openAdd} style={styles.addBtn}>
            <Plus size={16} />
            {!isMobile && "Add Expense"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: `${400 + owners.length * 90}px` }}>
          <thead>
            <tr>
              {["Date", "Category", "Description", "Total", ...owners.map(o => o.name), "Status", ""].map((h, i) => (
                <th key={i} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colSpan} style={styles.empty}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={colSpan} style={styles.empty}>No expenses found</td></tr>
            ) : (
              filtered.map((exp) => (
                <tr key={exp.id} style={styles.tr}>
                  <td style={styles.td}><span style={{ whiteSpace: "nowrap" }}>{formatDate(exp.date)}</span></td>
                  <td style={styles.td}>
                    <span style={styles.catBadge}>{exp.category}</span>
                  </td>
                  <td style={{ ...styles.td, maxWidth: "160px" }}>
                    <p style={{ color: "#e0e0e0", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.description}</p>
                    {exp.notes && <p style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>{exp.notes}</p>}
                  </td>
                  <td style={{ ...styles.td, fontWeight: "600", color: "#33b5b5", whiteSpace: "nowrap" }}>{fmt(exp.totalAmount)}</td>
                  {owners.map((o) => (
                    <td key={o.id} style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      {fmt((exp.paid_amounts || {})[o.id])}
                    </td>
                  ))}
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...(exp.status === "Done" ? styles.statusDone : styles.statusPending) }}>
                      {exp.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => openEdit(exp)} style={styles.editBtn}><Pencil size={14} /></button>
                      <button onClick={() => setDeleteConfirm(exp.id)} style={styles.deleteBtn}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showForm && form && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: isMobile ? "100%" : "600px", margin: isMobile ? "0" : "auto", borderRadius: isMobile ? "16px 16px 0 0" : "16px", position: isMobile ? "fixed" : "relative", bottom: isMobile ? 0 : "auto", left: isMobile ? 0 : "auto", right: isMobile ? 0 : "auto", maxHeight: "90vh" }}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editId ? "Edit Expense" : "Add Expense"}</h2>
              <button onClick={() => setShowForm(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", gap: "12px", flexDirection: isMobile ? "column" : "row" }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    style={{ ...styles.formInput, colorScheme: "dark", fontSize: "16px" }} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ ...styles.formInput, fontSize: "16px" }} required>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ ...styles.formInput, fontSize: "16px" }} required placeholder="What was this for?" />
              </div>

              <p style={styles.formSection}>Who Paid?</p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {owners.map((o) => (
                  <div key={o.id} style={{ ...styles.formGroup, minWidth: "120px" }}>
                    <label style={{ ...styles.formLabel, color: o.color || "#666" }}>{o.name} (₹)</label>
                    <input
                      type="number"
                      value={(form.paid_amounts || {})[o.id] ?? ""}
                      onChange={(e) => handlePaidChange(o.id, e.target.value)}
                      style={{ ...styles.formInput, fontSize: "16px" }}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>

              {owners.length === 0 && (
                <p style={{ fontSize: "12px", color: "#555", fontStyle: "italic" }}>
                  Add owners first to track who paid.
                </p>
              )}

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Total Amount (₹)</label>
                <input type="number" value={form.totalAmount} readOnly
                  style={{ ...styles.formInput, background: "#141414", color: "#33b5b5", fontWeight: "600", cursor: "not-allowed" }} />
              </div>

              <div style={{ display: "flex", gap: "12px", flexDirection: isMobile ? "column" : "row" }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ ...styles.formInput, fontSize: "16px" }}>
                    <option>Done</option>
                    <option>Pending</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Notes</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    style={{ ...styles.formInput, fontSize: "16px" }} placeholder="Optional note..." />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>
                  <Check size={15} />
                  {editId ? "Update" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: "360px" }}>
            <h2 style={styles.modalTitle}>Delete Expense?</h2>
            <p style={{ color: "#888", fontSize: "14px", margin: "12px 0 24px" }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={doDelete} style={{ ...styles.submitBtn, background: "#ef4444" }}>
                <Trash2 size={15} />Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  addBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "10px 16px", background: "linear-gradient(135deg, #008080, #00a0a0)",
    border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600",
    fontSize: "14px", cursor: "pointer", flexShrink: 0,
  },
  searchInput: {
    flex: 1, padding: "10px 14px", background: "#111", border: "1px solid #222",
    borderRadius: "8px", color: "#e0e0e0", outline: "none",
  },
  select: {
    padding: "10px 14px", background: "#111", border: "1px solid #222",
    borderRadius: "8px", color: "#e0e0e0", outline: "none",
  },
  th: {
    padding: "12px 14px", textAlign: "left", fontSize: "11px", fontWeight: "600",
    color: "#555", textTransform: "uppercase", letterSpacing: "0.06em",
    borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #161616" },
  td: { padding: "13px 14px", fontSize: "13px", color: "#999", verticalAlign: "middle" },
  empty: { padding: "40px", textAlign: "center", color: "#444", fontSize: "14px" },
  catBadge: {
    padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
    background: "rgba(0,128,128,0.15)", color: "#33b5b5", whiteSpace: "nowrap",
  },
  statusBadge: { padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap" },
  statusDone: { background: "rgba(16,185,129,0.15)", color: "#34d399" },
  statusPending: { background: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  editBtn: { padding: "6px", borderRadius: "6px", border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#888", cursor: "pointer" },
  deleteBtn: { padding: "6px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer" },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex",
    alignItems: "flex-end", justifyContent: "center", zIndex: 100,
  },
  modal: {
    background: "#111", border: "1px solid #222",
    padding: "24px", width: "100%", overflowY: "auto",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" },
  modalTitle: { fontSize: "17px", fontWeight: "600", color: "#f0f0f0" },
  closeBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", padding: "4px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  formLabel: { fontSize: "12px", color: "#777", fontWeight: "500" },
  formInput: {
    padding: "10px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: "7px", color: "#e0e0e0", fontSize: "14px", outline: "none", width: "100%",
    boxSizing: "border-box",
  },
  formSection: { fontSize: "12px", color: "#666", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" },
  cancelBtn: {
    padding: "10px 18px", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: "8px", color: "#888", cursor: "pointer", fontSize: "14px",
  },
  submitBtn: {
    display: "flex", alignItems: "center", gap: "7px",
    padding: "10px 20px", background: "linear-gradient(135deg, #008080, #00a0a0)",
    border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600",
    fontSize: "14px", cursor: "pointer",
  },
};
