import { useState } from "react";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/initialData";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

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

const empty = {
  date: todayIST(),
  category: "Utilities",
  description: "",
  totalAmount: "",
  nikhilPaid: "",
  manishPaid: "",
  keshawPaid: "",
  status: "Pending",
  notes: "",
};

export default function Expenses({ isMobile }) {
  const { expenses, addExpense, updateExpense, deleteExpense, loading } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");

  const fmt = (n) => n ? "₹" + Number(n).toLocaleString("en-IN") : "—";

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const openAdd = () => { setForm(empty); setEditId(null); setShowForm(true); };
  const openEdit = (exp) => { setForm({ ...exp }); setEditId(exp.id); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      totalAmount: Number(form.totalAmount),
      nikhilPaid: Number(form.nikhilPaid) || 0,
      manishPaid: Number(form.manishPaid) || 0,
      keshawPaid: Number(form.keshawPaid) || 0,
    };
    if (editId) await updateExpense(editId, data);
    else await addExpense(data);
    setShowForm(false);
  };

  const doDelete = async () => {
    await deleteExpense(deleteConfirm);
    setDeleteConfirm(null);
  };

  const pad = isMobile ? "16px" : "32px";

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap: isMobile ? "14px" : "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Expenses</h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>{expenses.length} total entries</p>
        </div>
        <button onClick={openAdd} style={styles.addBtn}>
          <Plus size={16} />
          {!isMobile && "Add Expense"}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "10px" }}>
        <input
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...styles.searchInput, fontSize: "16px" }}
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          style={{ ...styles.select, fontSize: "16px" }}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table — always scrollable horizontally */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "650px" }}>
          <thead>
            <tr>
              {["Date", "Category", "Description", "Total", "Nikhil", "Manish", "Keshaw", "Status", ""].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={styles.empty}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={styles.empty}>No expenses found</td></tr>
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
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{fmt(exp.nikhilPaid)}</td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{fmt(exp.manishPaid)}</td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>{fmt(exp.keshawPaid)}</td>
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
      {showForm && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: isMobile ? "100%" : "600px", margin: isMobile ? "0" : "auto", borderRadius: isMobile ? "16px 16px 0 0" : "16px", position: isMobile ? "fixed" : "relative", bottom: isMobile ? 0 : "auto", left: isMobile ? 0 : "auto", right: isMobile ? 0 : "auto", maxHeight: isMobile ? "90vh" : "90vh" }}>
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
              <div style={{ display: "flex", gap: "12px", flexDirection: isMobile ? "column" : "row" }}>
                {[
                  { label: "Nikhil (₹)", key: "nikhilPaid" },
                  { label: "Manish (₹)", key: "manishPaid" },
                  { label: "Keshaw (₹)", key: "keshawPaid" },
                ].map(({ label, key }) => (
                  <div key={key} style={styles.formGroup}>
                    <label style={styles.formLabel}>{label}</label>
                    <input
                      type="number"
                      value={form[key]}
                      onChange={(e) => {
                        const val = e.target.value;
                        const vals = { nikhilPaid: Number(form.nikhilPaid) || 0, manishPaid: Number(form.manishPaid) || 0, keshawPaid: Number(form.keshawPaid) || 0 };
                        vals[key] = Number(val) || 0;
                        setForm({ ...form, [key]: val, totalAmount: vals.nikhilPaid + vals.manishPaid + vals.keshawPaid });
                      }}
                      style={{ ...styles.formInput, fontSize: "16px" }}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>

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
