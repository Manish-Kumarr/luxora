import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { Plus, Pencil, Trash2, X, Check, ChevronDown, Wrench, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

const ROOMS = ["Room 1", "Room 2", "Room 3", "Kitchen", "Bathroom", "Terrace", "Common Area", "Parking", "Other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "in-progress", "resolved"];

const PRIORITY_META = {
  low:    { label: "Low",    color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)" },
  medium: { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  high:   { label: "High",   color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.25)" },
  urgent: { label: "Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

const STATUS_META = {
  "open":        { label: "Open",        color: "#f87171", bg: "rgba(248,113,113,0.1)", icon: AlertTriangle },
  "in-progress": { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: Clock },
  "resolved":    { label: "Resolved",    color: "#34d399", bg: "rgba(52,211,153,0.1)",  icon: CheckCircle2 },
};

const todayIST = () => {
  const now = new Date();
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
};

const fmtAmt = (n) => n ? "₹" + Number(n).toLocaleString("en-IN") : null;

const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
};

const getEmpty = (owners) => ({
  date: todayIST(),
  category: "Maintenance",
  description: "",
  room: "",
  issue_priority: "medium",
  maintenance_status: "open",
  totalAmount: 0,
  paid_amounts: owners.reduce((acc, o) => ({ ...acc, [o.id]: "" }), {}),
  status: "Done",
  notes: "",
});

export default function Maintenance({ isMobile }) {
  const { expenses, addExpense, updateExpense, deleteExpense, loading, owners } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterRoom, setFilterRoom] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const maintenanceExpenses = useMemo(
    () => expenses.filter((e) => e.category === "Maintenance"),
    [expenses]
  );

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

  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

  const filtered = maintenanceExpenses
    .filter((e) => {
      const matchStatus = statusTab === "all" || e.maintenance_status === statusTab;
      const matchPriority = filterPriority === "all" || e.issue_priority === filterPriority;
      const matchRoom = filterRoom === "all" || e.room === filterRoom;
      const matchSearch = !search.trim() ||
        (e.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.room || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.notes || "").toLowerCase().includes(search.toLowerCase());
      const d = e.date?.slice(0, 10);
      const matchDate =
        (!dateRange.from || d >= dateRange.from) &&
        (!dateRange.to || d <= dateRange.to);
      return matchStatus && matchPriority && matchRoom && matchSearch && matchDate;
    })
    .sort((a, b) => {
      if (sortBy === "priority") return (PRIORITY_ORDER[a.issue_priority] ?? 2) - (PRIORITY_ORDER[b.issue_priority] ?? 2);
      if (sortBy === "date-desc") return (b.date || "").localeCompare(a.date || "");
      if (sortBy === "date-asc") return (a.date || "").localeCompare(b.date || "");
      if (sortBy === "cost-desc") return (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0);
      return 0;
    });

  // ── Room-wise cost breakdown ──
  const roomBreakdown = Object.entries(
    maintenanceExpenses.reduce((acc, e) => {
      const room = e.room || "Unspecified";
      if (!acc[room]) acc[room] = { cost: 0, count: 0 };
      acc[room].cost += Number(e.totalAmount) || 0;
      acc[room].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1].cost - a[1].cost);

  const openCount     = maintenanceExpenses.filter((e) => e.maintenance_status === "open").length;
  const inProgCount   = maintenanceExpenses.filter((e) => e.maintenance_status === "in-progress").length;
  const resolvedCount = maintenanceExpenses.filter((e) => e.maintenance_status === "resolved").length;
  const totalCost     = maintenanceExpenses.reduce((s, e) => s + (Number(e.totalAmount) || 0), 0);

  const openAdd = () => {
    setForm(getEmpty(owners));
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (exp) => {
    const basePaid = owners.reduce((acc, o) => ({ ...acc, [o.id]: "" }), {});
    setForm({ ...exp, paid_amounts: { ...basePaid, ...(exp.paid_amounts || {}) } });
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
    const data = { ...form, category: "Maintenance", totalAmount: Number(form.totalAmount), paid_amounts };
    if (editId) await updateExpense(editId, data);
    else await addExpense(data);
    setShowForm(false);
  };

  const updateStatus = async (exp, newStatus) => {
    await updateExpense(exp.id, { ...exp, maintenance_status: newStatus });
  };

  const doDelete = async () => {
    await deleteExpense(deleteConfirm);
    setDeleteConfirm(null);
  };

  const pad = isMobile ? "16px" : "32px";

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap: isMobile ? "14px" : "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Maintenance Log</h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Track issues, repairs and upkeep</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Search */}
          <input
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 14px", color: "#e0e0e0", fontSize: "13px", outline: "none", width: isMobile ? "100%" : "170px", boxSizing: "border-box" }}
          />

          {/* Priority filter */}
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 12px", color: filterPriority === "all" ? "#555" : "#e0e0e0", fontSize: "13px", outline: "none", cursor: "pointer", colorScheme: "dark" }}>
            <option value="all">All Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </select>

          {/* Room filter */}
          <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 12px", color: filterRoom === "all" ? "#555" : "#e0e0e0", fontSize: "13px", outline: "none", cursor: "pointer", colorScheme: "dark" }}>
            <option value="all">All Rooms</option>
            {ROOMS.map(r => <option key={r}>{r}</option>)}
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 12px", color: "#555", fontSize: "13px", outline: "none", cursor: "pointer", colorScheme: "dark" }}>
            <option value="priority">By Priority</option>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="cost-desc">Highest Cost</option>
          </select>

          <div style={{ position: "relative" }}>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCustomFrom(""); setCustomTo(""); }}
              style={{
                appearance: "none", WebkitAppearance: "none",
                background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px",
                padding: "8px 32px 8px 12px", color: dateFilter === "all" ? "#555" : "#33b5b5",
                fontSize: "13px", fontWeight: "600", cursor: "pointer", outline: "none", colorScheme: "dark",
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
            </>
          )}
          {dateFilter !== "all" && (
            <button onClick={() => { setDateFilter("all"); setCustomFrom(""); setCustomTo(""); }}
              style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(51,181,181,0.1)", border: "1px solid rgba(51,181,181,0.3)", borderRadius: "6px", padding: "5px 10px", color: "#33b5b5", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
              Clear ×
            </button>
          )}
          <button onClick={openAdd} style={styles.addBtn}>
            <Plus size={16} />
            {!isMobile && "Add Issue"}
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "14px" }}>
        {[
          { label: "Open",        value: openCount,     color: "#f87171" },
          { label: "In Progress", value: inProgCount,   color: "#f59e0b" },
          { label: "Resolved",    value: resolvedCount, color: "#34d399" },
          { label: "Total Cost",  value: "₹" + Number(totalCost).toLocaleString("en-IN"), color: "#33b5b5" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
            <p style={{ fontSize: "11px", color: "#555", marginBottom: "6px" }}>{label}</p>
            <p style={{ fontSize: isMobile ? "22px" : "26px", fontWeight: "800", color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { key: "all",         label: `All (${maintenanceExpenses.length})` },
          { key: "open",        label: `Open (${openCount})` },
          { key: "in-progress", label: `In Progress (${inProgCount})` },
          { key: "resolved",    label: `Resolved (${resolvedCount})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setStatusTab(key)}
            style={{
              padding: "6px 14px", borderRadius: "20px", border: "1px solid",
              borderColor: statusTab === key ? "rgba(0,128,128,0.5)" : "#2a2a2a",
              background: statusTab === key ? "rgba(0,128,128,0.15)" : "transparent",
              color: statusTab === key ? "#33b5b5" : "#555",
              fontSize: "12px", fontWeight: "600", cursor: "pointer",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#444" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "60px 20px", textAlign: "center" }}>
          <Wrench size={36} color="#2a2a2a" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "#444", fontSize: "14px" }}>No issues found</p>
          <p style={{ color: "#333", fontSize: "12px", marginTop: "4px" }}>Click "Add Issue" to log a maintenance problem</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((exp) => {
            const pMeta = PRIORITY_META[exp.issue_priority] || PRIORITY_META.medium;
            const sMeta = STATUS_META[exp.maintenance_status] || STATUS_META.open;
            const StatusIcon = sMeta.icon;
            const nextStatus = exp.maintenance_status === "open" ? "in-progress" : exp.maintenance_status === "in-progress" ? "resolved" : "open";
            const nextLabel  = nextStatus === "in-progress" ? "Mark In Progress" : nextStatus === "resolved" ? "Mark Resolved" : "Reopen";

            return (
              <div key={exp.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", padding: isMobile ? "14px" : "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", background: pMeta.bg, border: `1px solid ${pMeta.border}`, color: pMeta.color }}>
                        {pMeta.label}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: sMeta.bg, color: sMeta.color }}>
                        <StatusIcon size={11} /> {sMeta.label}
                      </span>
                      {exp.room && (
                        <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "11px", background: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>
                          {exp.room}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "#e0e0e0", marginBottom: "4px" }}>{exp.description}</p>
                    {exp.notes && <p style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>{exp.notes}</p>}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#444" }}>{fmtDate(exp.date)}</span>
                      {exp.totalAmount > 0 && (
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "#33b5b5" }}>{fmtAmt(exp.totalAmount)}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end", flexShrink: 0 }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => openEdit(exp)} style={styles.editBtn}><Pencil size={13} /></button>
                      <button onClick={() => setDeleteConfirm(exp.id)} style={styles.deleteBtn}><Trash2 size={13} /></button>
                    </div>
                    <button
                      onClick={() => updateStatus(exp, nextStatus)}
                      style={{
                        padding: "5px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: "600", cursor: "pointer",
                        background: nextStatus === "resolved" ? "rgba(52,211,153,0.1)" : nextStatus === "in-progress" ? "rgba(245,158,11,0.1)" : "rgba(248,113,113,0.1)",
                        border: `1px solid ${nextStatus === "resolved" ? "rgba(52,211,153,0.3)" : nextStatus === "in-progress" ? "rgba(245,158,11,0.3)" : "rgba(248,113,113,0.3)"}`,
                        color: nextStatus === "resolved" ? "#34d399" : nextStatus === "in-progress" ? "#f59e0b" : "#f87171",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {nextLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Room-wise Cost Breakdown ── */}
      {roomBreakdown.length > 0 && roomBreakdown.some(([, d]) => d.cost > 0) && (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "16px 20px" }}>
          <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", letterSpacing: "0.07em", marginBottom: "14px" }}>COST BY ROOM</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {roomBreakdown.filter(([, d]) => d.cost > 0).map(([room, data]) => {
              const pct = totalCost > 0 ? (data.cost / totalCost) * 100 : 0;
              return (
                <div key={room}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", color: "#aaa" }}>{room} <span style={{ fontSize: "11px", color: "#444" }}>({data.count} issue{data.count > 1 ? "s" : ""})</span></span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#33b5b5" }}>₹{Number(data.cost).toLocaleString("en-IN")} <span style={{ fontSize: "11px", color: "#444", fontWeight: "400" }}>({Math.round(pct)}%)</span></span>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: "4px", height: "4px", overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", background: "#f97316", borderRadius: "4px", transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && form && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: isMobile ? "100%" : "560px", borderRadius: isMobile ? "16px 16px 0 0" : "16px", position: isMobile ? "fixed" : "relative", bottom: isMobile ? 0 : "auto", left: isMobile ? 0 : "auto", right: isMobile ? 0 : "auto" }}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editId ? "Edit Issue" : "Log Issue"}</h2>
              <button onClick={() => setShowForm(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", maxHeight: "75vh" }}>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Issue / Description *</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ ...styles.formInput, fontSize: "16px" }}
                  placeholder="e.g. AC not cooling, tap leaking..."
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "12px", flexDirection: isMobile ? "column" : "row" }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Room / Area</label>
                  <select value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}
                    style={{ ...styles.formInput, fontSize: "16px" }}>
                    <option value="">Select area...</option>
                    {ROOMS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    style={{ ...styles.formInput, colorScheme: "dark", fontSize: "16px" }} required />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", flexDirection: isMobile ? "column" : "row" }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Priority</label>
                  <select value={form.issue_priority} onChange={(e) => setForm({ ...form, issue_priority: e.target.value })}
                    style={{ ...styles.formInput, fontSize: "16px" }}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Status</label>
                  <select value={form.maintenance_status} onChange={(e) => setForm({ ...form, maintenance_status: e.target.value })}
                    style={{ ...styles.formInput, fontSize: "16px" }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Notes (optional)</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={{ ...styles.formInput, fontSize: "16px" }} placeholder="Additional details..." />
              </div>

              <p style={{ fontSize: "12px", color: "#666", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cost (optional)</p>
              {owners.length > 0 && (
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
              )}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Total Cost (₹)</label>
                <input type="number" value={form.totalAmount} readOnly
                  style={{ ...styles.formInput, background: "#141414", color: "#33b5b5", fontWeight: "600", cursor: "not-allowed" }} />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>
                  <Check size={15} />
                  {editId ? "Update" : "Log Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: "360px", padding: "24px", borderRadius: "16px" }}>
            <h2 style={styles.modalTitle}>Delete Issue?</h2>
            <p style={{ color: "#888", fontSize: "14px", margin: "12px 0 24px" }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={doDelete} style={{ ...styles.submitBtn, background: "#ef4444", border: "none" }}>
                <Trash2 size={15} /> Delete
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
  editBtn: { padding: "6px", borderRadius: "6px", border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#888", cursor: "pointer", display: "flex" },
  deleteBtn: { padding: "6px", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", display: "flex" },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex",
    alignItems: "flex-end", justifyContent: "center", zIndex: 100,
  },
  modal: {
    background: "#111", border: "1px solid #222",
    width: "100%", overflowY: "auto",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #1e1e1e" },
  modalTitle: { fontSize: "17px", fontWeight: "600", color: "#f0f0f0" },
  closeBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", padding: "4px", display: "flex" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  formLabel: { fontSize: "12px", color: "#777", fontWeight: "500" },
  formInput: {
    padding: "10px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: "7px", color: "#e0e0e0", fontSize: "14px", outline: "none", width: "100%",
    boxSizing: "border-box",
  },
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
