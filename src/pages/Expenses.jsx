import { useState } from "react";
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
  const offset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
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

export default function Expenses() {
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

  const openAdd = () => {
    setForm(empty);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (exp) => {
    setForm({ ...exp });
    setEditId(exp.id);
    setShowForm(true);
  };

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

  const confirmDelete = (id) => setDeleteConfirm(id);

  const doDelete = async () => {
    await deleteExpense(deleteConfirm);
    setDeleteConfirm(null);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Expenses</h1>
          <p style={styles.sub}>{expenses.length} total entries</p>
        </div>
        <button onClick={openAdd} style={styles.addBtn}>
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          style={styles.select}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Date", "Category", "Description", "Total", "Nikhil", "Manish", "Keshaw", "Status", "Actions"].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={styles.empty}>Loading from database...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={styles.empty}>No expenses found</td>
              </tr>
            ) : (
              filtered.map((exp) => (
                <tr key={exp.id} style={styles.tr}>
                  <td style={styles.td}>{formatDate(exp.date)}</td>
                  <td style={styles.td}>
                    <span style={styles.catBadge}>{exp.category}</span>
                  </td>
                  <td style={styles.td}>
                    <div>
                      <p style={{ color: "#e0e0e0", fontSize: "13px" }}>{exp.description}</p>
                      {exp.notes && <p style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>{exp.notes}</p>}
                    </div>
                  </td>
                  <td style={{ ...styles.td, fontWeight: "600", color: "#33b5b5" }}>{fmt(exp.totalAmount)}</td>
                  <td style={styles.td}>{fmt(exp.nikhilPaid)}</td>
                  <td style={styles.td}>{fmt(exp.manishPaid)}</td>
                  <td style={styles.td}>{fmt(exp.keshawPaid)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...(exp.status === "Done" ? styles.statusDone : styles.statusPending) }}>
                      {exp.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button onClick={() => openEdit(exp)} style={styles.editBtn}><Pencil size={14} /></button>
                      <button onClick={() => confirmDelete(exp.id)} style={styles.deleteBtn}><Trash2 size={14} /></button>
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
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editId ? "Edit Expense" : "Add Expense"}</h2>
              <button onClick={() => setShowForm(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={styles.modalForm}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ ...styles.formInput, colorScheme: "dark" }} lang="en-IN" required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={styles.formInput} required>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={styles.formInput} required placeholder="What was this for?" />
              </div>

              <p style={styles.formSection}>Who Paid?</p>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Nikhil (₹)</label>
                  <input type="number" value={form.nikhilPaid} onChange={(e) => {
                    const val = e.target.value;
                    const total = (Number(val) || 0) + (Number(form.manishPaid) || 0) + (Number(form.keshawPaid) || 0);
                    setForm({ ...form, nikhilPaid: val, totalAmount: total });
                  }} style={styles.formInput} placeholder="0" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Manish (₹)</label>
                  <input type="number" value={form.manishPaid} onChange={(e) => {
                    const val = e.target.value;
                    const total = (Number(form.nikhilPaid) || 0) + (Number(val) || 0) + (Number(form.keshawPaid) || 0);
                    setForm({ ...form, manishPaid: val, totalAmount: total });
                  }} style={styles.formInput} placeholder="0" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Keshaw (₹)</label>
                  <input type="number" value={form.keshawPaid} onChange={(e) => {
                    const val = e.target.value;
                    const total = (Number(form.nikhilPaid) || 0) + (Number(form.manishPaid) || 0) + (Number(val) || 0);
                    setForm({ ...form, keshawPaid: val, totalAmount: total });
                  }} style={styles.formInput} placeholder="0" />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Total Amount (₹)</label>
                <input type="number" value={form.totalAmount} readOnly style={{ ...styles.formInput, background: "#141414", color: "#33b5b5", fontWeight: "600", cursor: "not-allowed" }} />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={styles.formInput}>
                    <option>Done</option>
                    <option>Pending</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Notes</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={styles.formInput} placeholder="Optional note..." />
                </div>
              </div>

              <div style={styles.modalActions}>
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
          <div style={{ ...styles.modal, maxWidth: "380px" }}>
            <h2 style={styles.modalTitle}>Delete Expense?</h2>
            <p style={{ color: "#888", fontSize: "14px", margin: "12px 0 24px" }}>This action cannot be undone.</p>
            <div style={styles.modalActions}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={doDelete} style={{ ...styles.submitBtn, background: "#ef4444" }}>
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "32px", display: "flex", flexDirection: "column", gap: "20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: "26px", fontWeight: "700", color: "#f0f0f0" },
  sub: { color: "#555", fontSize: "14px", marginTop: "4px" },
  addBtn: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 18px", background: "linear-gradient(135deg, #008080, #00a0a0)",
    border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600",
    fontSize: "14px", cursor: "pointer",
  },
  filters: { display: "flex", gap: "12px" },
  searchInput: {
    flex: 1, padding: "10px 14px", background: "#111", border: "1px solid #222",
    borderRadius: "8px", color: "#e0e0e0", fontSize: "14px", outline: "none",
  },
  select: {
    padding: "10px 14px", background: "#111", border: "1px solid #222",
    borderRadius: "8px", color: "#e0e0e0", fontSize: "14px", outline: "none",
  },
  tableWrap: {
    background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflow: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "600",
    color: "#555", textTransform: "uppercase", letterSpacing: "0.06em",
    borderBottom: "1px solid #1e1e1e", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #161616", transition: "background 0.1s" },
  td: { padding: "14px 16px", fontSize: "13px", color: "#999", verticalAlign: "middle" },
  empty: { padding: "40px", textAlign: "center", color: "#444", fontSize: "14px" },
  catBadge: {
    padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
    background: "rgba(0,128,128,0.15)", color: "#33b5b5",
  },
  statusBadge: { padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" },
  statusDone: { background: "rgba(16,185,129,0.15)", color: "#34d399" },
  statusPending: { background: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  actions: { display: "flex", gap: "6px" },
  editBtn: {
    padding: "6px", borderRadius: "6px", border: "1px solid #2a2a2a", background: "#1a1a1a",
    color: "#888", cursor: "pointer",
  },
  deleteBtn: {
    padding: "6px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.2)",
    background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px",
  },
  modal: {
    background: "#111", border: "1px solid #222", borderRadius: "16px",
    padding: "28px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  modalTitle: { fontSize: "18px", fontWeight: "600", color: "#f0f0f0" },
  closeBtn: { background: "none", border: "none", color: "#555", cursor: "pointer" },
  modalForm: { display: "flex", flexDirection: "column", gap: "14px" },
  formRow: { display: "flex", gap: "14px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  formLabel: { fontSize: "12px", color: "#777", fontWeight: "500" },
  formInput: {
    padding: "10px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: "7px", color: "#e0e0e0", fontSize: "13px", outline: "none", width: "100%",
  },
  formSection: { fontSize: "12px", color: "#666", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" },
  modalActions: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" },
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
