import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { ArrowRight, ArrowDown, CheckCircle2, IndianRupee, Pencil, Trash2, X, ChevronDown, Plus } from "lucide-react";

function calcSettlement(balances) {
  const people = Object.keys(balances);
  const bal = people.map((p) => ({ name: p, amount: balances[p] }));
  const transactions = [];
  const sorted = () => bal.sort((a, b) => a.amount - b.amount);
  for (let i = 0; i < people.length * 2; i++) {
    sorted();
    const debtor = bal[0];
    const creditor = bal[bal.length - 1];
    if (Math.abs(debtor.amount) < 1 || Math.abs(creditor.amount) < 1) break;
    const settle = Math.min(-debtor.amount, creditor.amount);
    transactions.push({ from: debtor.name, to: creditor.name, amount: Math.round(settle) });
    debtor.amount += settle;
    creditor.amount -= settle;
  }
  return transactions;
}

const COLORS = ["#008080", "#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#f97316"];

const BLANK_PAY = { amount: "", description: "", date: new Date().toISOString().split("T")[0] };

export default function Settlement({ isMobile }) {
  const { expenses, owners, bookings, markBrokerCommissionPaid, memberTransfers, addMemberTransfer, updateMemberTransfer, deleteMemberTransfer } = useApp();

  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState(BLANK_PAY);
  const [payLoading, setPayLoading] = useState(false);
  const [editTransfer, setEditTransfer] = useState(null);
  const [editForm, setEditForm] = useState(BLANK_PAY);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [manualModal, setManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ from_owner_id: "", to_owner_id: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
  const [manualLoading, setManualLoading] = useState(false);

  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

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

  const inRange = (dateStr) => {
    if (!dateRange.from && !dateRange.to) return true;
    if (!dateStr) return false;
    if (dateRange.from && dateStr < dateRange.from) return false;
    if (dateRange.to && dateStr > dateRange.to) return false;
    return true;
  };

  const fmt = (n) => "₹" + Number(Math.abs(n)).toLocaleString("en-IN");

  if (owners.length === 0) {
    return (
      <div style={{ padding: isMobile ? "16px" : "32px" }}>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0", marginBottom: "8px" }}>Settlement</h1>
        <p style={{ color: "#444", fontSize: "14px" }}>Add owners first to see settlement calculations.</p>
      </div>
    );
  }

  const filteredExpenses = expenses.filter((e) => inRange(e.date));
  const filteredTransfers = memberTransfers.filter((t) => inRange(t.date));

  // Total paid by each owner
  const paid = {};
  owners.forEach((o) => {
    paid[o.id] = filteredExpenses.reduce((s, e) => s + (Number((e.paid_amounts || {})[o.id]) || 0), 0);
  });

  const total = Object.values(paid).reduce((s, v) => s + v, 0);

  const fairShares = {};
  owners.forEach((o) => {
    fairShares[o.id] = total * (Number(o.ownership_percent) / 100);
  });

  const balances = {};
  owners.forEach((o) => {
    balances[o.id] = paid[o.id] - fairShares[o.id];
  });

  // Adjust balances for recorded member transfers
  // from_owner paid to_owner → from_owner owes less, to_owner gets back less
  filteredTransfers.forEach((t) => {
    if (balances[t.from_owner_id] !== undefined) balances[t.from_owner_id] += Number(t.amount);
    if (balances[t.to_owner_id] !== undefined) balances[t.to_owner_id] -= Number(t.amount);
  });

  // Adjust balances for owner stays
  // Staying owners consumed the room → non-staying owners lose their revenue share
  // Staying owners owe non-staying owners proportionally
  const ownerStayBookings = bookings.filter(
    (b) => b.is_owner_stay && Array.isArray(b.staying_owner_ids) && b.staying_owner_ids.length > 0
      && inRange(b.check_in)
  );
  ownerStayBookings.forEach((b) => {
    const V = Number(b.owner_stay_value) || 0;
    if (V <= 0) return;
    const stayingIds = b.staying_owner_ids;
    const nonStaying = owners.filter((o) => !stayingIds.includes(o.id));
    const staying = owners.filter((o) => stayingIds.includes(o.id));
    if (nonStaying.length === 0) return; // all owners stayed, no adjustment needed
    const stayingTotalPct = staying.reduce((s, o) => s + Number(o.ownership_percent), 0);
    // Non-staying owners ko milta hai unka revenue share
    nonStaying.forEach((o) => {
      if (balances[o.id] !== undefined) balances[o.id] += V * (Number(o.ownership_percent) / 100);
    });
    // Staying owners owe this amount proportionally among themselves
    const totalOwed = nonStaying.reduce((s, o) => s + V * (Number(o.ownership_percent) / 100), 0);
    staying.forEach((o) => {
      if (balances[o.id] !== undefined) {
        const share = stayingTotalPct > 0 ? totalOwed * (Number(o.ownership_percent) / stayingTotalPct) : 0;
        balances[o.id] -= share;
      }
    });
  });

  const transactions = calcSettlement({ ...balances });
  const allSettled = transactions.length === 0;

  const ownerById = (id) => owners.find((o) => o.id === id);

  // ── Stats ──
  const totalTransferred = filteredTransfers.reduce((s, t) => s + Number(t.amount), 0);
  const totalPending = transactions.reduce((s, t) => s + t.amount, 0);

  // ── Category breakdown ──
  const catBreakdown = Object.entries(
    filteredExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + (Number(e.totalAmount) || 0);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  // ── Manual transfer handler ──
  const handleManualSave = async () => {
    if (!manualForm.from_owner_id || !manualForm.to_owner_id || !manualForm.amount) return;
    if (manualForm.from_owner_id === manualForm.to_owner_id) return;
    setManualLoading(true);
    await addMemberTransfer({
      from_owner_id: manualForm.from_owner_id,
      to_owner_id: manualForm.to_owner_id,
      amount: Number(manualForm.amount),
      description: manualForm.description.trim() || null,
      date: manualForm.date,
    });
    setManualLoading(false);
    setManualModal(false);
    setManualForm({ from_owner_id: "", to_owner_id: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
  };

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "20px";

  const openPayModal = (t) => {
    setPayModal(t);
    setPayForm({ ...BLANK_PAY, amount: String(t.amount) });
  };

  const closePayModal = () => {
    setPayModal(null);
    setPayForm(BLANK_PAY);
  };

  const handlePaySave = async () => {
    if (!payForm.amount || isNaN(Number(payForm.amount)) || Number(payForm.amount) <= 0) return;
    setPayLoading(true);
    await addMemberTransfer({
      from_owner_id: payModal.from,
      to_owner_id: payModal.to,
      amount: Number(payForm.amount),
      description: payForm.description.trim() || null,
      date: payForm.date,
    });
    setPayLoading(false);
    closePayModal();
  };

  const openEditTransfer = (t) => {
    setEditTransfer(t);
    setEditForm({ amount: String(t.amount), description: t.description || "", date: t.date });
  };

  const handleEditSave = async () => {
    if (!editForm.amount || isNaN(Number(editForm.amount)) || Number(editForm.amount) <= 0) return;
    setEditLoading(true);
    await updateMemberTransfer(editTransfer.id, {
      amount: Number(editForm.amount),
      description: editForm.description.trim() || null,
      date: editForm.date,
    });
    setEditLoading(false);
    setEditTransfer(null);
    setEditForm(BLANK_PAY);
  };

  const handleDelete = async (id) => {
    await deleteMemberTransfer(id);
    setDeleteConfirm(null);
  };

  const ownerAvatar = (owner, size = 36, colorOverride) => {
    const color = colorOverride || owner.color || COLORS[0];
    const initials = owner.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    return (
      <div style={{
        width: size, height: size, borderRadius: "10px", flexShrink: 0,
        background: color + "22", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size === 36 ? "14px" : "12px", fontWeight: "700", color, overflow: "hidden",
      }}>
        {owner.image_url ? <img src={owner.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
      </div>
    );
  };

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>

      {/* Header + Filter */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Settlement</h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Clear outstanding payments between all members</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "14px" }}>
        {[
          { label: "Total Pool", value: "₹" + Number(total).toLocaleString("en-IN"), color: "#33b5b5" },
          { label: "Settled via Transfers", value: "₹" + Number(totalTransferred).toLocaleString("en-IN"), color: "#10b981" },
          { label: "Still Pending", value: "₹" + Number(totalPending).toLocaleString("en-IN"), color: totalPending > 0 ? "#f59e0b" : "#555" },
          { label: "Transfers Recorded", value: filteredTransfers.length, color: "#8b5cf6" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "10px", padding: isMobile ? "12px 14px" : "14px 18px" }}>
            <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", letterSpacing: "0.05em", marginBottom: "5px" }}>{s.label}</p>
            <p style={{ fontSize: isMobile ? "17px" : "20px", fontWeight: "800", color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Member Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(owners.length, 3)}, 1fr)`,
        gap: isMobile ? "10px" : "16px",
      }}>
        {owners.map((o, i) => {
          const bal = balances[o.id] || 0;
          const isPositive = bal >= 0;
          const color = o.color || COLORS[i % COLORS.length];
          const initials = o.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
          return (
            <div key={o.id} style={{
              background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px",
              padding: isMobile ? "16px" : "20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "12px",
                  background: color + "22", border: `1.5px solid ${color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", fontWeight: "700", color, overflow: "hidden", flexShrink: 0,
                }}>
                  {o.image_url ? (
                    <img src={o.image_url} alt={o.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : initials}
                </div>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{o.name}</p>
                  <p style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>{Number(o.ownership_percent).toFixed(2)}% owner</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={styles.statRow}>
                  <span style={styles.statKey}>Total Paid</span>
                  <span style={{ ...styles.statVal, color: "#f0f0f0" }}>{fmt(paid[o.id])}</span>
                </div>
                <div style={styles.statRow}>
                  <span style={styles.statKey}>Fair Share ({Number(o.ownership_percent).toFixed(2)}%)</span>
                  <span style={{ ...styles.statVal, color: "#888" }}>{fmt(fairShares[o.id])}</span>
                </div>
                <div style={{ height: "1px", background: "#1e1e1e" }} />
                <div style={styles.statRow}>
                  <span style={{ ...styles.statKey, fontWeight: "600", color: "#ccc" }}>Net Balance</span>
                  <span style={{
                    ...styles.statVal, fontWeight: "700", fontSize: "16px",
                    color: Math.abs(bal) < 1 ? "#888" : isPositive ? "#34d399" : "#f87171",
                  }}>
                    {Math.abs(bal) < 1 ? "Settled" : (isPositive ? "+" : "-") + fmt(bal)}
                  </span>
                </div>
              </div>

              {Math.abs(bal) >= 1 && (
                <div style={{
                  marginTop: "14px", padding: "7px 12px", borderRadius: "8px", textAlign: "center",
                  background: isPositive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                  border: `1px solid ${isPositive ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
                  fontSize: "12px", fontWeight: "600",
                  color: isPositive ? "#34d399" : "#f87171",
                }}>
                  {isPositive ? `Gets back ${fmt(bal)}` : `Owes ${fmt(bal)}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settlement Transactions */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>Who Pays Whom?</h2>
          {allSettled && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34d399", fontSize: "13px", fontWeight: "600" }}>
              <CheckCircle2 size={16} /> All Settled
            </div>
          )}
        </div>

        {allSettled ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <CheckCircle2 size={40} color="#34d399" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#34d399", fontWeight: "600", fontSize: "16px" }}>All settled up!</p>
            <p style={{ color: "#555", fontSize: "13px", marginTop: "4px" }}>No payments needed</p>
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {transactions.map((t, i) => {
              const fromOwner = ownerById(t.from);
              const toOwner = ownerById(t.to);
              if (!fromOwner || !toOwner) return null;
              const fromColor = fromOwner.color || COLORS[0];
              const toColor = toOwner.color || COLORS[1];
              const fromInitials = fromOwner.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
              const toInitials = toOwner.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

              return (
                <div key={i} style={{ padding: isMobile ? "16px" : "16px 20px", borderBottom: i < transactions.length - 1 ? "1px solid #161616" : "none" }}>
                  {isMobile ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", alignSelf: "stretch", background: "#1a1a1a", borderRadius: "10px", padding: "12px 14px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0, background: fromColor + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: fromColor, overflow: "hidden" }}>
                          {fromOwner.image_url ? <img src={fromOwner.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : fromInitials}
                        </div>
                        <div>
                          <p style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{fromOwner.name}</p>
                          <p style={{ fontSize: "11px", color: "#f87171", marginTop: "1px" }}>Pays</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <ArrowDown size={14} color="#444" />
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 14px", borderRadius: "20px", background: "rgba(0,128,128,0.12)", border: "1px solid rgba(0,128,128,0.25)" }}>
                          <IndianRupee size={12} color="#33b5b5" />
                          <span style={{ fontSize: "15px", fontWeight: "700", color: "#33b5b5" }}>{Number(t.amount).toLocaleString("en-IN")}</span>
                        </div>
                        <ArrowDown size={14} color="#444" />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", alignSelf: "stretch", background: "#1a1a1a", borderRadius: "10px", padding: "12px 14px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0, background: toColor + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: toColor, overflow: "hidden" }}>
                          {toOwner.image_url ? <img src={toOwner.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : toInitials}
                        </div>
                        <div>
                          <p style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{toOwner.name}</p>
                          <p style={{ fontSize: "11px", color: "#34d399", marginTop: "1px" }}>Receives</p>
                        </div>
                      </div>
                      <button onClick={() => openPayModal(t)} style={styles.payBtn}>
                        Pay ₹{Number(t.amount).toLocaleString("en-IN")}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: fromColor + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: fromColor, overflow: "hidden" }}>
                          {fromOwner.image_url ? <img src={fromOwner.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : fromInitials}
                        </div>
                        <span style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{fromOwner.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, justifyContent: "center" }}>
                        <div style={{ height: "1px", flex: 1, background: "#2a2a2a", maxWidth: "40px" }} />
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 14px", borderRadius: "20px", background: "rgba(0,128,128,0.12)", border: "1px solid rgba(0,128,128,0.25)" }}>
                          <IndianRupee size={12} color="#33b5b5" />
                          <span style={{ fontSize: "14px", fontWeight: "700", color: "#33b5b5" }}>{Number(t.amount).toLocaleString("en-IN")}</span>
                        </div>
                        <ArrowRight size={16} color="#444" />
                        <div style={{ height: "1px", flex: 1, background: "#2a2a2a", maxWidth: "40px" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: toColor + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: toColor, overflow: "hidden" }}>
                          {toOwner.image_url ? <img src={toOwner.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : toInitials}
                        </div>
                        <span style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{toOwner.name}</span>
                      </div>
                      <button onClick={() => openPayModal(t)} style={styles.payBtn}>
                        Pay
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Category Breakdown ── */}
      {catBreakdown.length > 0 && (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "16px 20px" }}>
          <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", letterSpacing: "0.07em", marginBottom: "14px" }}>EXPENSE BREAKDOWN</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {catBreakdown.map(([cat, amt]) => {
              const pct = total > 0 ? (amt / total) * 100 : 0;
              return (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", color: "#888" }}>{cat}</span>
                    <span style={{ fontSize: "13px", color: "#e0e0e0", fontWeight: "600" }}>
                      ₹{Number(amt).toLocaleString("en-IN")} <span style={{ color: "#444", fontWeight: "400", fontSize: "11px" }}>({Math.round(pct)}%)</span>
                    </span>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: "4px", height: "4px", overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", background: "#008080", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #1e1e1e", paddingTop: "10px" }}>
              <span style={{ fontSize: "13px", color: "#888", fontWeight: "600" }}>Total</span>
              <span style={{ fontSize: "15px", color: "#33b5b5", fontWeight: "700" }}>₹{Number(total).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Transfer total bar */}
      {filteredTransfers.length > 0 && (
        <div style={{ background: "rgba(0,128,128,0.07)", border: "1px solid rgba(0,128,128,0.15)", borderRadius: "12px", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ color: "#888", fontSize: "14px" }}>Total Transferred ({filteredTransfers.length} records)</span>
          <span style={{ color: "#33b5b5", fontWeight: "700", fontSize: "20px" }}>₹{Number(totalTransferred).toLocaleString("en-IN")}</span>
        </div>
      )}

      {/* Transfer History */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>Transfer History</h2>
            <p style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}>Recorded payments between members</p>
          </div>
          <button onClick={() => setManualModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "8px", color: "#8b5cf6", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
            <Plus size={14} /> Add Transfer
          </button>
        </div>
        {filteredTransfers.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center" }}>
            <p style={{ color: "#444", fontSize: "13px" }}>No transfers recorded yet</p>
            <p style={{ color: "#333", fontSize: "12px", marginTop: "4px" }}>Use the Pay button on a suggested transaction to record a payment</p>
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {filteredTransfers.map((t, i) => {
              const fromOwner = ownerById(t.from_owner_id);
              const toOwner = ownerById(t.to_owner_id);
              if (!fromOwner || !toOwner) return null;
              const fromColor = fromOwner.color || COLORS[0];
              const toColor = toOwner.color || COLORS[1];
              return (
                <div key={t.id} style={{
                  padding: isMobile ? "12px 16px" : "14px 20px",
                  borderBottom: i < filteredTransfers.length - 1 ? "1px solid #161616" : "none",
                  display: "flex", alignItems: isMobile ? "flex-start" : "center",
                  justifyContent: "space-between", gap: "12px",
                  flexDirection: isMobile ? "column" : "row",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    {ownerAvatar(fromOwner, 32, fromColor)}
                    <div style={{ flexShrink: 0 }}>
                      <ArrowRight size={14} color="#444" />
                    </div>
                    {ownerAvatar(toOwner, 32, toColor)}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>
                        {fromOwner.name} → {toOwner.name}
                      </p>
                      {t.description && (
                        <p style={{ fontSize: "11px", color: "#666", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.description}
                        </p>
                      )}
                      <p style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{t.date?.split("-").reverse().join("/")}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    <span style={{ fontSize: "15px", fontWeight: "700", color: "#33b5b5" }}>
                      ₹{Number(t.amount).toLocaleString("en-IN")}
                    </span>
                    <button
                      onClick={() => openEditTransfer(t)}
                      style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", borderRadius: "7px", padding: "5px 10px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(t.id)}
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", borderRadius: "7px", padding: "5px 10px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Owner Stay Adjustments */}
      {ownerStayBookings.length > 0 && (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>Owner Stay Adjustments</h2>
              <p style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}>Owner room stays adjusted in settlement</p>
            </div>
            <span style={{ fontSize: "12px", color: "#c084fc", fontWeight: "600" }}>
              {ownerStayBookings.length} stay{ownerStayBookings.length > 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {ownerStayBookings.map((b, i) => {
              const V = Number(b.owner_stay_value) || 0;
              const stayingOwners = owners.filter((o) => (b.staying_owner_ids || []).includes(o.id));
              const nonStaying = owners.filter((o) => !(b.staying_owner_ids || []).includes(o.id));
              const nights = b.check_in && b.check_out
                ? Math.max(0, (new Date(b.check_out) - new Date(b.check_in)) / 86400000)
                : 0;
              return (
                <div key={b.id} style={{
                  padding: isMobile ? "12px 16px" : "14px 20px",
                  borderBottom: i < ownerStayBookings.length - 1 ? "1px solid #161616" : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#c084fc", background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "4px", padding: "2px 8px" }}>
                          OWNER STAY
                        </span>
                        <span style={{ fontSize: "13px", color: "#e0e0e0", fontWeight: "600" }}>
                          {stayingOwners.map((o) => o.name).join(", ")}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#555" }}>
                        {b.check_in?.split("-").reverse().join("/")} → {b.check_out?.split("-").reverse().join("/")} · {nights} night{nights !== 1 ? "s" : ""}
                      </p>
                      {nonStaying.length > 0 && (
                        <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                          {nonStaying.map((o) => `${o.name} receives ₹${Math.round(V * Number(o.ownership_percent) / 100).toLocaleString("en-IN")}`).join(", ")}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: "16px", fontWeight: "700", color: "#c084fc" }}>
                        ₹{V.toLocaleString("en-IN")}
                      </p>
                      <p style={{ fontSize: "11px", color: "#666" }}>room value</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Broker Payouts */}
      {(() => {
        const brokerBookings = bookings.filter((b) => b.broker_name && b.broker_commission > 0);
        if (brokerBookings.length === 0) return null;
        const totalPending = brokerBookings.filter((b) => !b.broker_commission_paid).reduce((s, b) => s + Number(b.broker_commission), 0);
        const totalPaid = brokerBookings.filter((b) => b.broker_commission_paid).reduce((s, b) => s + Number(b.broker_commission), 0);
        return (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>Partner Payouts</h2>
              <div style={{ display: "flex", gap: "16px" }}>
                {totalPending > 0 && <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "600" }}>₹{Number(totalPending).toLocaleString("en-IN")} pending</span>}
                {totalPaid > 0 && <span style={{ fontSize: "12px", color: "#34d399", fontWeight: "600" }}>₹{Number(totalPaid).toLocaleString("en-IN")} paid</span>}
              </div>
            </div>
            <div style={{ padding: "8px 0" }}>
              {brokerBookings.map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 16px" : "14px 20px", borderBottom: "1px solid #161616", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "#e0e0e0" }}>{b.broker_name}</p>
                    {b.broker_phone && <p style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>{b.broker_phone}</p>}
                    <p style={{ fontSize: "11px", color: "#444", marginTop: "3px" }}>
                      Booking: {b.name} · {b.check_in ? b.check_in : "—"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "15px", fontWeight: "700", color: b.broker_commission_paid ? "#34d399" : "#f59e0b" }}>
                        ₹{Number(b.broker_commission).toLocaleString("en-IN")}
                      </p>
                      <p style={{ fontSize: "11px", color: b.broker_commission_paid ? "#34d399" : "#f59e0b" }}>
                        {b.broker_commission_paid ? "Paid" : "Pending"}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await markBrokerCommissionPaid(b.id, !b.broker_commission_paid);
                      }}
                      style={{
                        padding: "6px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
                        background: b.broker_commission_paid ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                        border: `1px solid ${b.broker_commission_paid ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                        color: b.broker_commission_paid ? "#ef4444" : "#34d399",
                      }}
                    >
                      {b.broker_commission_paid ? "Mark Unpaid" : "Mark Paid"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Pay Modal */}
      {payModal && (() => {
        const fromOwner = ownerById(payModal.from);
        const toOwner = ownerById(payModal.to);
        if (!fromOwner || !toOwner) return null;
        return (
          <div style={styles.overlay} onClick={closePayModal}>
            <div style={{ ...styles.modal, maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f0f0f0" }}>Record Payment</h3>
                <button onClick={closePayModal} style={styles.closeBtn}><X size={18} /></button>
              </div>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* From → To */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#1a1a1a", borderRadius: "10px", padding: "12px 14px" }}>
                  {ownerAvatar(fromOwner, 32, fromOwner.color || COLORS[0])}
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>{fromOwner.name}</span>
                  <ArrowRight size={14} color="#444" style={{ flexShrink: 0 }} />
                  {ownerAvatar(toOwner, 32, toOwner.color || COLORS[1])}
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>{toOwner.name}</span>
                </div>

                {/* Amount */}
                <div>
                  <label style={styles.label}>Amount</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="number"
                      value={payForm.amount}
                      onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="Enter amount"
                      style={{ ...styles.input, flex: 1 }}
                    />
                    <button
                      onClick={() => setPayForm((f) => ({ ...f, amount: String(payModal.amount) }))}
                      style={styles.fullPayBtn}
                    >
                      Full ₹{Number(payModal.amount).toLocaleString("en-IN")}
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={styles.label}>Description (optional)</label>
                  <input
                    type="text"
                    value={payForm.description}
                    onChange={(e) => setPayForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Settlement for March"
                    style={styles.input}
                  />
                </div>

                {/* Date */}
                <div>
                  <label style={styles.label}>Date</label>
                  <input
                    type="date"
                    value={payForm.date}
                    onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
                    style={styles.input}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
                  <button onClick={closePayModal} style={styles.cancelBtn}>Cancel</button>
                  <button
                    onClick={handlePaySave}
                    disabled={payLoading || !payForm.amount}
                    style={{ ...styles.saveBtn, opacity: payLoading || !payForm.amount ? 0.6 : 1 }}
                  >
                    {payLoading ? "Saving..." : "Record Payment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Transfer Modal */}
      {editTransfer && (() => {
        const fromOwner = ownerById(editTransfer.from_owner_id);
        const toOwner = ownerById(editTransfer.to_owner_id);
        return (
          <div style={styles.overlay} onClick={() => setEditTransfer(null)}>
            <div style={{ ...styles.modal, maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f0f0f0" }}>Edit Transfer</h3>
                <button onClick={() => setEditTransfer(null)} style={styles.closeBtn}><X size={18} /></button>
              </div>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {fromOwner && toOwner && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#1a1a1a", borderRadius: "10px", padding: "12px 14px" }}>
                    {ownerAvatar(fromOwner, 32, fromOwner.color || COLORS[0])}
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>{fromOwner.name}</span>
                    <ArrowRight size={14} color="#444" style={{ flexShrink: 0 }} />
                    {ownerAvatar(toOwner, 32, toOwner.color || COLORS[1])}
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>{toOwner.name}</span>
                  </div>
                )}

                <div>
                  <label style={styles.label}>Amount</label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>Description (optional)</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                    style={styles.input}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
                  <button onClick={() => setEditTransfer(null)} style={styles.cancelBtn}>Cancel</button>
                  <button
                    onClick={handleEditSave}
                    disabled={editLoading || !editForm.amount}
                    style={{ ...styles.saveBtn, opacity: editLoading || !editForm.amount ? 0.6 : 1 }}
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Manual Transfer Modal */}
      {manualModal && (
        <div style={styles.overlay} onClick={() => setManualModal(false)}>
          <div style={{ ...styles.modal, maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f0f0f0" }}>Add Manual Transfer</h3>
              <button onClick={() => setManualModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>From</label>
                  <select value={manualForm.from_owner_id} onChange={(e) => setManualForm(f => ({ ...f, from_owner_id: e.target.value }))}
                    style={{ ...styles.input, colorScheme: "dark" }}>
                    <option value="">Select owner...</option>
                    {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>To</label>
                  <select value={manualForm.to_owner_id} onChange={(e) => setManualForm(f => ({ ...f, to_owner_id: e.target.value }))}
                    style={{ ...styles.input, colorScheme: "dark" }}>
                    <option value="">Select owner...</option>
                    {owners.filter(o => o.id !== manualForm.from_owner_id).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={styles.label}>Amount (₹)</label>
                <input type="number" value={manualForm.amount} onChange={(e) => setManualForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter amount" style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Description (optional)</label>
                <input value={manualForm.description} onChange={(e) => setManualForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Partial settlement" style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Date</label>
                <input type="date" value={manualForm.date} onChange={(e) => setManualForm(f => ({ ...f, date: e.target.value }))} style={{ ...styles.input, colorScheme: "dark" }} />
              </div>
              <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
                <button onClick={() => setManualModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button onClick={handleManualSave} disabled={manualLoading || !manualForm.from_owner_id || !manualForm.to_owner_id || !manualForm.amount}
                  style={{ ...styles.saveBtn, opacity: (!manualForm.from_owner_id || !manualForm.to_owner_id || !manualForm.amount) ? 0.6 : 1 }}>
                  {manualLoading ? "Saving..." : "Record Transfer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={styles.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={{ ...styles.modal, maxWidth: "360px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f0f0f0" }}>Delete Transfer?</h3>
              <button onClick={() => setDeleteConfirm(null)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "14px", color: "#aaa" }}>This action cannot be undone.</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setDeleteConfirm(null)} style={styles.cancelBtn}>Cancel</button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  style={{ ...styles.saveBtn, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  statRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statKey: { fontSize: "13px", color: "#666" },
  statVal: { fontSize: "14px", fontWeight: "600" },
  payBtn: {
    padding: "7px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer",
    background: "rgba(0,128,128,0.15)", border: "1px solid rgba(0,128,128,0.35)", color: "#33b5b5",
    flexShrink: 0,
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
  },
  modal: {
    background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px",
    width: "100%", maxHeight: "90vh", overflowY: "auto",
  },
  modalHeader: {
    padding: "16px 20px", borderBottom: "1px solid #1e1e1e",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  closeBtn: { background: "none", border: "none", color: "#666", cursor: "pointer", display: "flex", alignItems: "center" },
  label: { fontSize: "12px", color: "#888", marginBottom: "6px", display: "block" },
  input: {
    width: "100%", padding: "10px 12px", borderRadius: "8px", fontSize: "14px",
    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#e0e0e0",
    outline: "none", boxSizing: "border-box",
  },
  fullPayBtn: {
    padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
    background: "rgba(0,128,128,0.15)", border: "1px solid rgba(0,128,128,0.35)", color: "#33b5b5",
    whiteSpace: "nowrap", flexShrink: 0,
  },
  cancelBtn: {
    flex: 1, padding: "10px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888",
  },
  saveBtn: {
    flex: 2, padding: "10px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer",
    background: "rgba(0,128,128,0.2)", border: "1px solid rgba(0,128,128,0.4)", color: "#33b5b5",
  },
};
