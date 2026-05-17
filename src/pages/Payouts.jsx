import { useState, useMemo } from "react";
import { ChevronDown, Plus, Trash2, X, Check, Pencil } from "lucide-react";
import { useApp } from "../context/AppContext";

const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const isoToDate = (iso) => iso ? iso.split("T")[0] : null;

const COLORS = ["#008080", "#6366f1", "#f59e0b", "#10b981", "#ec4899", "#3b82f6"];

export default function Payouts({ isMobile }) {
  const { bookings, payments, expenses, owners, markBrokerCommissionPaid, ownerPayouts, addOwnerPayout, updateOwnerPayout, deleteOwnerPayout } = useApp();

  const [statusFilter, setStatusFilter] = useState("all");
  const [brokerSearch, setBrokerSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [marking, setMarking] = useState(null);

  // Owner payout modal
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ owner_id: "", amount: "", date: new Date().toISOString().split("T")[0], method: "Cash", notes: "" });
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [deletePayoutId, setDeletePayoutId] = useState(null);

  // Edit payout
  const [editPayoutId, setEditPayoutId] = useState(null);
  const [editPayoutForm, setEditPayoutForm] = useState({ amount: "", date: "", method: "Cash", notes: "" });
  const [editPayoutSaving, setEditPayoutSaving] = useState(false);

  // History filter
  const [historyOwnerFilter, setHistoryOwnerFilter] = useState("all");

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

  const inRange = (iso) => {
    const dateStr = isoToDate(iso);
    if (!dateRange.from && !dateRange.to) return true;
    if (!dateStr) return false;
    if (dateRange.from && dateStr < dateRange.from) return false;
    if (dateRange.to && dateStr > dateRange.to) return false;
    return true;
  };

  const brokerBookings = bookings.filter((b) => b.broker_name && Number(b.broker_commission) > 0);

  const filtered = brokerBookings.filter((b) => {
    const matchStatus =
      statusFilter === "pending" ? !b.broker_commission_paid :
      statusFilter === "paid" ? b.broker_commission_paid : true;
    const matchDate = b.broker_commission_paid
      ? inRange(b.broker_commission_paid_at)
      : (dateRange.from || dateRange.to) ? false : true;
    const matchSearch = !brokerSearch.trim() ||
      (b.broker_name || "").toLowerCase().includes(brokerSearch.toLowerCase()) ||
      (b.name || "").toLowerCase().includes(brokerSearch.toLowerCase());
    return matchStatus && matchDate && matchSearch;
  });

  // ── Per-broker summary ──
  const brokerSummary = Object.entries(
    brokerBookings.reduce((acc, b) => {
      const name = b.broker_name;
      if (!acc[name]) acc[name] = { total: 0, paid: 0, pending: 0, count: 0, phone: b.broker_phone || "" };
      acc[name].total += Number(b.broker_commission);
      acc[name].count += 1;
      if (b.broker_commission_paid) acc[name].paid += Number(b.broker_commission);
      else acc[name].pending += Number(b.broker_commission);
      return acc;
    }, {})
  ).sort((a, b) => b[1].total - a[1].total);

  const dateScopedBroker = brokerBookings.filter((b) =>
    b.broker_commission_paid ? inRange(b.broker_commission_paid_at) : !(dateRange.from || dateRange.to)
  );
  const totalPartnerPaid = dateScopedBroker.filter((b) => b.broker_commission_paid).reduce((s, b) => s + Number(b.broker_commission), 0);
  const totalPartnerPending = dateScopedBroker.filter((b) => !b.broker_commission_paid).reduce((s, b) => s + Number(b.broker_commission), 0);

  const handleToggle = async (b) => {
    setMarking(b.id);
    await markBrokerCommissionPaid(b.id, !b.broker_commission_paid);
    setMarking(null);
  };

  // ── Owner payout calculations (all-time, no date filter) ──
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const brokerPaidTotal = bookings
    .filter((b) => b.broker_commission_paid && Number(b.broker_commission) > 0)
    .reduce((s, b) => s + Number(b.broker_commission), 0);
  const netRevenue = totalRevenue - brokerPaidTotal;
  const regularExpenses = expenses.filter(e => e.category !== "Maintenance").reduce((s, e) => s + (e.totalAmount || 0), 0);
  const maintenanceExpenses = expenses.filter(e => e.category === "Maintenance").reduce((s, e) => s + (e.totalAmount || 0), 0);
  const totalExpenses = regularExpenses + maintenanceExpenses;
  const profit = netRevenue - totalExpenses;
  const isProfit = profit >= 0;

  // ── Owner payout handlers ──
  const handleAddPayout = async () => {
    if (!payoutForm.owner_id || !payoutForm.amount) return;
    setPayoutSaving(true);
    await addOwnerPayout({
      owner_id: payoutForm.owner_id,
      amount: Number(payoutForm.amount),
      date: payoutForm.date,
      method: payoutForm.method,
      notes: payoutForm.notes,
    });
    setPayoutSaving(false);
    setPayoutModal(false);
    setPayoutForm({ owner_id: "", amount: "", date: new Date().toISOString().split("T")[0], method: "Cash", notes: "" });
  };

  const handleEditPayout = async () => {
    if (!editPayoutForm.amount) return;
    setEditPayoutSaving(true);
    await updateOwnerPayout(editPayoutId, {
      amount: Number(editPayoutForm.amount),
      date: editPayoutForm.date,
      method: editPayoutForm.method,
      notes: editPayoutForm.notes,
    });
    setEditPayoutSaving(false);
    setEditPayoutId(null);
  };

  const pendingBrokerCount = brokerBookings.filter(b => !b.broker_commission_paid).length;
  const pendingBrokerAmount = brokerBookings.filter(b => !b.broker_commission_paid).reduce((s, b) => s + Number(b.broker_commission), 0);
  const totalOutflow = brokerBookings.filter(b => b.broker_commission_paid).reduce((s, b) => s + Number(b.broker_commission), 0) + ownerPayouts.reduce((s, p) => s + Number(p.amount), 0);

  const filteredHistory = historyOwnerFilter === "all"
    ? ownerPayouts
    : ownerPayouts.filter(p => p.owner_id === historyOwnerFilter);

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Payouts</h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Partner commissions &amp; owner profit distribution</p>
        </div>

        {/* Broker search + Date filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <input
            placeholder="Search broker / guest..."
            value={brokerSearch}
            onChange={(e) => setBrokerSearch(e.target.value)}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 14px", color: "#e0e0e0", fontSize: "13px", outline: "none", width: isMobile ? "100%" : "190px", boxSizing: "border-box" }}
          />
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
              {(customFrom || customTo) && (
                <button onClick={() => { setCustomFrom(""); setCustomTo(""); }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "16px", padding: "0 2px" }}>×</button>
              )}
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

      {/* ── PENDING BROKER ALERT ── */}
      {pendingBrokerCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "18px" }}>⚠</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#f59e0b" }}>{pendingBrokerCount} broker payout{pendingBrokerCount > 1 ? "s" : ""} pending</p>
            <p style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{fmt(pendingBrokerAmount)} baaki hai — neeche Partner Payouts mein mark karo</p>
          </div>
        </div>
      )}

      {/* ── COMBINED OVERVIEW ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)", gap: isMobile ? "10px" : "14px" }}>
        {[
          {
            label: "Broker — Paid",
            value: fmt(brokerBookings.filter(b => b.broker_commission_paid).reduce((s, b) => s + Number(b.broker_commission), 0)),
            color: "#34d399",
            sub: `${brokerBookings.filter(b => b.broker_commission_paid).length} payouts`,
          },
          {
            label: "Broker — Pending",
            value: fmt(pendingBrokerAmount),
            color: pendingBrokerCount > 0 ? "#f59e0b" : "#555",
            sub: `${pendingBrokerCount} pending`,
          },
          {
            label: "Owner — Paid Out",
            value: fmt(ownerPayouts.reduce((s, p) => s + Number(p.amount), 0)),
            color: "#33b5b5",
            sub: `${ownerPayouts.length} records`,
          },
          {
            label: "Owner — Remaining",
            value: isProfit ? fmt(Math.max(0, profit - ownerPayouts.reduce((s, p) => s + Number(p.amount), 0))) : "—",
            color: "#8b5cf6",
            sub: isProfit ? "yet to withdraw" : "loss period",
          },
          {
            label: "Total Outflow",
            value: fmt(totalOutflow),
            color: "#ef4444",
            sub: "broker + owner paid",
          },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "16px 20px" }}>
            <p style={{ fontSize: "10px", color: "#555", fontWeight: "600", letterSpacing: "0.05em", marginBottom: "5px" }}>{s.label.toUpperCase()}</p>
            <p style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: "800", color: s.color }}>{s.value}</p>
            <p style={{ fontSize: "10px", color: "#444", marginTop: "3px" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── PARTNER PAYOUTS ── */}
      <div>
        <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "14px" }}>PARTNER PAYOUTS</p>

        {/* Summary tiles */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: isMobile ? "10px" : "16px", marginBottom: "16px" }}>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
            <p style={{ fontSize: "11px", color: "#555", marginBottom: "6px" }}>Total</p>
            <p style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", color: "#e0e0e0" }}>{fmt(totalPartnerPaid + totalPartnerPending)}</p>
          </div>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
            <p style={{ fontSize: "11px", color: "#555", marginBottom: "6px" }}>Paid Out</p>
            <p style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", color: "#34d399" }}>{fmt(totalPartnerPaid)}</p>
          </div>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px", gridColumn: isMobile ? "1 / -1" : "auto" }}>
            <p style={{ fontSize: "11px", color: "#555", marginBottom: "6px" }}>Pending</p>
            <p style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", color: totalPartnerPending > 0 ? "#f59e0b" : "#555" }}>{fmt(totalPartnerPending)}</p>
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          {[{ key: "all", label: "All" }, { key: "pending", label: "Pending" }, { key: "paid", label: "Paid" }].map(({ key, label }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              style={{
                padding: "6px 16px", borderRadius: "20px", border: "1px solid",
                borderColor: statusFilter === key ? "rgba(0,128,128,0.5)" : "#2a2a2a",
                background: statusFilter === key ? "rgba(0,128,128,0.15)" : "transparent",
                color: statusFilter === key ? "#33b5b5" : "#555",
                fontSize: "12px", fontWeight: "600", cursor: "pointer",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {brokerBookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#333", fontSize: "14px" }}>No partner bookings yet</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#333", fontSize: "14px" }}>No payouts in this range</div>
        ) : (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", overflow: "hidden" }}>
            {!isMobile && (
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 1fr 0.8fr 0.7fr 1.2fr 0.9fr", gap: "12px", padding: "12px 20px", borderBottom: "1px solid #1e1e1e", background: "#0d0d0d" }}>
                {["Broker", "Phone", "Guest", "Check-in", "Commission", "Paid At", "Status"].map((h) => (
                  <span key={h} style={{ fontSize: "11px", fontWeight: "600", color: "#444", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
                ))}
              </div>
            )}
            {filtered.map((b, i) => (
              <div key={b.id}
                style={{
                  display: isMobile ? "flex" : "grid",
                  gridTemplateColumns: isMobile ? undefined : "1.2fr 0.9fr 1fr 0.8fr 0.7fr 1.2fr 0.9fr",
                  flexDirection: isMobile ? "column" : undefined,
                  gap: isMobile ? "8px" : "12px",
                  padding: isMobile ? "14px 16px" : "14px 20px",
                  borderBottom: i < filtered.length - 1 ? "1px solid #161616" : "none",
                  alignItems: isMobile ? "stretch" : "center",
                }}
              >
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#e0e0e0" }}>{b.broker_name}</p>
                  {isMobile && b.broker_phone && <p style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>{b.broker_phone}</p>}
                </div>
                {!isMobile && <p style={{ fontSize: "13px", color: "#666" }}>{b.broker_phone || "—"}</p>}
                <p style={{ fontSize: "13px", color: "#888" }}>{b.name}</p>
                <p style={{ fontSize: "13px", color: "#555" }}>{fmtDate(b.check_in)}</p>
                <p style={{ fontSize: "14px", fontWeight: "700", color: b.broker_commission_paid ? "#34d399" : "#f59e0b" }}>{fmt(b.broker_commission)}</p>
                {isMobile ? (
                  b.broker_commission_paid && <p style={{ fontSize: "11px", color: "#555" }}>Paid: {fmtDateTime(b.broker_commission_paid_at)}</p>
                ) : (
                  <p style={{ fontSize: "12px", color: b.broker_commission_paid_at ? "#666" : "#333" }}>{fmtDateTime(b.broker_commission_paid_at)}</p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "11px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px",
                    background: b.broker_commission_paid ? "rgba(52,211,153,0.12)" : "rgba(245,158,11,0.12)",
                    border: `1px solid ${b.broker_commission_paid ? "rgba(52,211,153,0.3)" : "rgba(245,158,11,0.3)"}`,
                    color: b.broker_commission_paid ? "#34d399" : "#f59e0b",
                  }}>
                    {b.broker_commission_paid ? "Paid" : "Pending"}
                  </span>
                  <button disabled={marking === b.id} onClick={() => handleToggle(b)}
                    style={{
                      padding: "5px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: "600",
                      cursor: marking === b.id ? "not-allowed" : "pointer", opacity: marking === b.id ? 0.5 : 1,
                      background: b.broker_commission_paid ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                      border: `1px solid ${b.broker_commission_paid ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                      color: b.broker_commission_paid ? "#ef4444" : "#34d399",
                    }}>
                    {marking === b.id ? "..." : b.broker_commission_paid ? "Mark Unpaid" : "Mark Paid"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PER-BROKER SUMMARY ── */}
      {brokerSummary.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "14px" }}>BROKER SUMMARY</p>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflow: "hidden" }}>
            {brokerSummary.map(([name, data], i) => (
              <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 16px" : "14px 20px", borderBottom: i < brokerSummary.length - 1 ? "1px solid #161616" : "none", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#e0e0e0" }}>{name}</p>
                  <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{data.phone || "—"} · {data.count} booking{data.count > 1 ? "s" : ""}</p>
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "10px", color: "#444" }}>Total</p>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#e0e0e0" }}>{fmt(data.total)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "10px", color: "#444" }}>Paid</p>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#34d399" }}>{fmt(data.paid)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "10px", color: "#444" }}>Pending</p>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: data.pending > 0 ? "#f59e0b" : "#555" }}>{fmt(data.pending)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── OWNER PAYOUT ── */}
      {owners.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "14px" }}>OWNER PAYOUT</p>

          {/* ── Top total summary ── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? "10px" : "14px", marginBottom: isMobile ? "14px" : "20px" }}>
            {[
              { label: "Total Profit", value: fmt(Math.abs(profit)), color: isProfit ? "#34d399" : "#f87171", sub: isProfit ? "Available to distribute" : "Net loss this period" },
              { label: "Total Paid Out", value: fmt(ownerPayouts.reduce((s, p) => s + Number(p.amount), 0)), color: "#33b5b5", sub: "Across all owners" },
              { label: isProfit ? "Still Remaining" : "—", value: isProfit ? fmt(Math.max(0, profit - ownerPayouts.reduce((s, p) => s + Number(p.amount), 0))) : "—", color: "#f59e0b", sub: isProfit ? "Yet to be paid out" : "" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
                <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", letterSpacing: "0.05em", marginBottom: "5px" }}>{s.label}</p>
                <p style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", color: s.color }}>{s.value}</p>
                <p style={{ fontSize: "10px", color: "#444", marginTop: "3px" }}>{s.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "16px" : "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Revenue / Expenses / Profit strip */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? "10px" : "14px" }}>
              {[
                { label: "Net Revenue", value: fmt(netRevenue), color: "#10b981" },
                { label: "Total Expenses", value: fmt(totalExpenses), color: "#ef4444" },
                { label: isProfit ? "Net Profit" : "Net Loss", value: fmt(Math.abs(profit)), color: isProfit ? "#34d399" : "#f87171" },
              ].map((s) => (
                <div key={s.label} style={{ background: "#1a1a1a", border: `1px solid ${s.color}22`, borderRadius: "10px", padding: "14px" }}>
                  <p style={{ fontSize: "11px", color: "#555", marginBottom: "6px", fontWeight: "600", letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</p>
                  <p style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "800", color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Expense breakdown */}
            <div style={{ background: "#1a1a1a", borderRadius: "10px", padding: "14px 16px" }}>
              <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.07em", marginBottom: "10px" }}>EXPENSE BREAKDOWN</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>Regular Expenses</span>
                  <span style={{ color: "#ccc", fontWeight: "600" }}>{fmt(regularExpenses)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666" }}>Maintenance</span>
                  <span style={{ color: "#f97316", fontWeight: "600" }}>{fmt(maintenanceExpenses)}</span>
                </div>
                {brokerPaidTotal > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Broker Commissions</span>
                    <span style={{ color: "#f59e0b", fontWeight: "600" }}>{fmt(brokerPaidTotal)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #2a2a2a", paddingTop: "6px", fontWeight: "700" }}>
                  <span style={{ color: "#888" }}>Total</span>
                  <span style={{ color: "#ef4444" }}>{fmt(totalExpenses + brokerPaidTotal)}</span>
                </div>
              </div>
            </div>

            {/* Broker deduction note */}
            {brokerPaidTotal > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", padding: "8px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "8px" }}>
                <span style={{ fontSize: "12px", color: "#888" }}>Collected</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981" }}>{fmt(totalRevenue)}</span>
                <span style={{ fontSize: "12px", color: "#555" }}>−</span>
                <span style={{ fontSize: "12px", color: "#888" }}>Partner Payouts</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#f59e0b" }}>{fmt(brokerPaidTotal)}</span>
                <span style={{ fontSize: "12px", color: "#555" }}>=</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981" }}>{fmt(netRevenue)}</span>
              </div>
            )}

            {/* Owner summary tiles */}
            {isProfit && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : `repeat(${Math.min(owners.length + 1, 4)}, 1fr)`, gap: isMobile ? "10px" : "14px" }}>
                <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", padding: isMobile ? "12px" : "14px 16px" }}>
                  <p style={{ fontSize: "10px", color: "#555", marginBottom: "5px", fontWeight: "600" }}>TOTAL POOL</p>
                  <p style={{ fontSize: isMobile ? "17px" : "20px", fontWeight: "800", color: "#34d399" }}>{fmt(profit)}</p>
                  <p style={{ fontSize: "10px", color: "#444", marginTop: "3px" }}>Total paid: {fmt(ownerPayouts.reduce((s, p) => s + Number(p.amount), 0))}</p>
                </div>
                {owners.map((o, i) => {
                  const share = profit * (Number(o.ownership_percent) / 100);
                  const paidOut = ownerPayouts.filter(p => p.owner_id === o.id).reduce((s, p) => s + Number(p.amount), 0);
                  const remaining = share - paidOut;
                  const color = o.color || COLORS[i % COLORS.length];
                  const initials = o.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div key={o.id} style={{ background: "#1a1a1a", border: `1px solid ${color}22`, borderRadius: "10px", padding: isMobile ? "12px" : "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "5px", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700", color, overflow: "hidden", flexShrink: 0 }}>
                          {o.image_url ? <img src={o.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                        </div>
                        <p style={{ fontSize: "11px", color: "#888", fontWeight: "600" }}>{o.name.split(" ")[0].toUpperCase()}</p>
                      </div>
                      <p style={{ fontSize: isMobile ? "17px" : "20px", fontWeight: "800", color }}>{fmt(paidOut)}</p>
                      <p style={{ fontSize: "10px", color: remaining > 0 ? "#f59e0b" : "#555", marginTop: "3px" }}>
                        {remaining > 0 ? `${fmt(remaining)} left` : "Settled"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Per-owner rows */}
            <div>
              <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "10px" }}>
                DISTRIBUTION ({isProfit ? "PROFIT" : "LOSS"})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {owners.map((o, i) => {
                  const share = profit * (Number(o.ownership_percent) / 100);
                  const paidOut = ownerPayouts.filter(p => p.owner_id === o.id).reduce((s, p) => s + Number(p.amount), 0);
                  const remaining = share - paidOut;
                  const isOverpaid = isProfit && paidOut > share;
                  const pct = isProfit && share > 0 ? Math.min(100, (paidOut / share) * 100) : 0;
                  const color = o.color || COLORS[i % COLORS.length];
                  const initials = o.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div key={o.id} style={{ background: "#1a1a1a", borderRadius: "10px", border: `1px solid ${color}22`, padding: "14px" }}>
                      {/* Top row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isProfit ? "12px" : "0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color, overflow: "hidden", flexShrink: 0 }}>
                            {o.image_url ? <img src={o.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                          </div>
                          <div>
                            <p style={{ fontSize: "14px", fontWeight: "600", color: "#e0e0e0" }}>{o.name}</p>
                            <p style={{ fontSize: "11px", color: "#555" }}>
                              {Number(o.ownership_percent).toFixed(2)}% ·{" "}
                              {isProfit
                                ? <span>Share: <span style={{ color: "#34d399", fontWeight: "700" }}>+{fmt(share)}</span></span>
                                : <span>Loss Share: <span style={{ color: "#f87171", fontWeight: "700" }}>−{fmt(Math.abs(share))}</span></span>
                              }
                            </p>
                          </div>
                        </div>
                        {isProfit && (
                          <button
                            onClick={() => { setPayoutModal(true); setPayoutForm(f => ({ ...f, owner_id: o.id, amount: remaining > 0 ? String(Math.round(remaining)) : "" })); }}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", background: "rgba(0,128,128,0.12)", border: "1px solid rgba(0,128,128,0.3)", borderRadius: "7px", color: "#33b5b5", fontSize: "11px", fontWeight: "600", cursor: "pointer", flexShrink: 0 }}>
                            <Plus size={12} /> Payout
                          </button>
                        )}
                      </div>

                      {/* Profit scenario: show progress + stats */}
                      {isProfit && (
                        <>
                          <div style={{ marginBottom: "10px" }}>
                            <div style={{ background: "#111", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                              <div style={{ width: pct + "%", height: "100%", background: isOverpaid ? "#ef4444" : color, borderRadius: "4px", transition: "width 0.3s" }} />
                            </div>
                            <p style={{ fontSize: "10px", color: "#444", marginTop: "3px" }}>{Math.round(pct)}% paid out</p>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                            <div style={{ background: "#111", borderRadius: "7px", padding: "8px 10px" }}>
                              <p style={{ fontSize: "10px", color: "#444", marginBottom: "3px" }}>Paid Out</p>
                              <p style={{ fontSize: "13px", fontWeight: "700", color: "#34d399" }}>{fmt(paidOut)}</p>
                            </div>
                            <div style={{ background: "#111", borderRadius: "7px", padding: "8px 10px" }}>
                              <p style={{ fontSize: "10px", color: "#444", marginBottom: "3px" }}>Remaining</p>
                              <p style={{ fontSize: "13px", fontWeight: "700", color: remaining > 0 ? "#f59e0b" : "#555" }}>
                                {remaining > 0 ? fmt(remaining) : "—"}
                              </p>
                            </div>
                            <div style={{ background: "#111", borderRadius: "7px", padding: "8px 10px" }}>
                              <p style={{ fontSize: "10px", color: "#444", marginBottom: "3px" }}>Status</p>
                              <p style={{ fontSize: "11px", fontWeight: "700", color: isOverpaid ? "#ef4444" : remaining <= 0 ? "#34d399" : paidOut > 0 ? "#f59e0b" : "#555" }}>
                                {isOverpaid ? "Overpaid" : remaining <= 0 ? "Settled" : paidOut > 0 ? "Partial" : "Pending"}
                              </p>
                            </div>
                          </div>
                          {isOverpaid && (
                            <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "8px" }}>
                              ⚠ Overpaid by {fmt(paidOut - share)} — adjust in next cycle
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {profit === 0 && (
                <p style={{ fontSize: "13px", color: "#444", textAlign: "center", marginTop: "12px" }}>Revenue equals expenses — no profit or loss.</p>
              )}
            </div>

            {/* Payout History */}
            {ownerPayouts.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em" }}>PAYOUT HISTORY</p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {[{ id: "all", label: "All" }, ...owners.map(o => ({ id: o.id, label: o.name.split(" ")[0] }))].map(opt => (
                      <button key={opt.id} onClick={() => setHistoryOwnerFilter(opt.id)}
                        style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", cursor: "pointer", border: "1px solid", borderColor: historyOwnerFilter === opt.id ? "rgba(51,181,181,0.5)" : "#2a2a2a", background: historyOwnerFilter === opt.id ? "rgba(51,181,181,0.12)" : "transparent", color: historyOwnerFilter === opt.id ? "#33b5b5" : "#555" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[...filteredHistory].sort((a, b) => b.date.localeCompare(a.date)).map((p) => {
                    const o = owners.find(ow => ow.id === p.owner_id);
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#1a1a1a", borderRadius: "8px", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: (o?.color || "#555") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: o?.color || "#ccc" }}>
                            {o?.name?.[0] || "?"}
                          </div>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>{o?.name || "Unknown"}</p>
                            <p style={{ fontSize: "11px", color: "#555" }}>{p.date?.split("-").reverse().join("/")} · {p.method}{p.notes ? ` · ${p.notes}` : ""}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span style={{ fontSize: "15px", fontWeight: "700", color: "#34d399" }}>{fmt(p.amount)}</span>
                          <button onClick={() => { setEditPayoutId(p.id); setEditPayoutForm({ amount: String(p.amount), date: p.date, method: p.method || "Cash", notes: p.notes || "" }); }}
                            style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Pencil size={11} /> Edit
                          </button>
                          <button onClick={() => setDeletePayoutId(p.id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Trash2 size={11} /> Del
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", marginTop: "4px", background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#888" }}>
                    {historyOwnerFilter === "all" ? "Total Paid Out" : `${owners.find(o => o.id === historyOwnerFilter)?.name} — Total`}
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "#34d399" }}>{fmt(filteredHistory.reduce((s, p) => s + Number(p.amount), 0))}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Payout Modal */}
      {payoutModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: isMobile ? "16px 16px 0 0" : "16px", padding: "24px", width: "100%", maxWidth: isMobile ? "100%" : "420px", position: isMobile ? "fixed" : "relative", bottom: isMobile ? 0 : "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "600", color: "#f0f0f0" }}>Record Owner Payout</h2>
              <button onClick={() => setPayoutModal(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#777", display: "block", marginBottom: "6px" }}>Owner</label>
                <select value={payoutForm.owner_id} onChange={(e) => setPayoutForm(f => ({ ...f, owner_id: e.target.value }))}
                  style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "10px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", colorScheme: "dark", boxSizing: "border-box" }}>
                  <option value="">Select owner...</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#777", display: "block", marginBottom: "6px" }}>Amount (₹)</label>
                  <input type="number" value={payoutForm.amount} onChange={(e) => setPayoutForm(f => ({ ...f, amount: e.target.value }))} placeholder="0"
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "10px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#777", display: "block", marginBottom: "6px" }}>Date</label>
                  <input type="date" value={payoutForm.date} onChange={(e) => setPayoutForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "10px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", colorScheme: "dark", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#777", display: "block", marginBottom: "6px" }}>Method</label>
                  <select value={payoutForm.method} onChange={(e) => setPayoutForm(f => ({ ...f, method: e.target.value }))}
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "10px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", colorScheme: "dark", boxSizing: "border-box" }}>
                    {["Cash", "UPI", "Bank Transfer", "Other"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#777", display: "block", marginBottom: "6px" }}>Notes</label>
                  <input value={payoutForm.notes} onChange={(e) => setPayoutForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional..."
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "10px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button onClick={() => setPayoutModal(false)} style={{ padding: "10px 18px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#888", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
                <button onClick={handleAddPayout} disabled={payoutSaving || !payoutForm.owner_id || !payoutForm.amount}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "linear-gradient(135deg,#008080,#00a0a0)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600", fontSize: "14px", cursor: "pointer", opacity: (!payoutForm.owner_id || !payoutForm.amount) ? 0.5 : 1 }}>
                  <Check size={15} />{payoutSaving ? "Saving..." : "Record Payout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Payout Confirm */}
      {/* Edit Payout Modal */}
      {editPayoutId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "600", color: "#f0f0f0" }}>Edit Payout</h2>
              <button onClick={() => setEditPayoutId(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#777", display: "block", marginBottom: "6px" }}>Amount (₹)</label>
                  <input type="number" value={editPayoutForm.amount} onChange={(e) => setEditPayoutForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "10px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#777", display: "block", marginBottom: "6px" }}>Date</label>
                  <input type="date" value={editPayoutForm.date} onChange={(e) => setEditPayoutForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "10px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", colorScheme: "dark", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#777", display: "block", marginBottom: "6px" }}>Method</label>
                  <select value={editPayoutForm.method} onChange={(e) => setEditPayoutForm(f => ({ ...f, method: e.target.value }))}
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "10px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", colorScheme: "dark", boxSizing: "border-box" }}>
                    {["Cash", "UPI", "Bank Transfer", "Other"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#777", display: "block", marginBottom: "6px" }}>Notes</label>
                  <input value={editPayoutForm.notes} onChange={(e) => setEditPayoutForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional..."
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "7px", padding: "10px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button onClick={() => setEditPayoutId(null)} style={{ padding: "10px 18px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#888", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
                <button onClick={handleEditPayout} disabled={editPayoutSaving || !editPayoutForm.amount}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "linear-gradient(135deg,#6366f1,#818cf8)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600", fontSize: "14px", cursor: "pointer", opacity: !editPayoutForm.amount ? 0.5 : 1 }}>
                  <Check size={15} />{editPayoutSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Payout Confirm */}
      {deletePayoutId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "14px", padding: "24px", maxWidth: "340px", width: "90%" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#f0f0f0", marginBottom: "10px" }}>Delete Payout Record?</h2>
            <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setDeletePayoutId(null)} style={{ padding: "9px 16px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#888", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
              <button onClick={async () => { await deleteOwnerPayout(deletePayoutId); setDeletePayoutId(null); }}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "#ef4444", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
