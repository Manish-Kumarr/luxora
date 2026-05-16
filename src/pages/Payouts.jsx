import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
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
  const { bookings, payments, expenses, owners, markBrokerCommissionPaid, addExpense } = useApp();

  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [marking, setMarking] = useState(null);

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
    return matchStatus && matchDate;
  });

  const dateScopedBroker = brokerBookings.filter((b) =>
    b.broker_commission_paid ? inRange(b.broker_commission_paid_at) : !(dateRange.from || dateRange.to)
  );
  const totalPartnerPaid = dateScopedBroker.filter((b) => b.broker_commission_paid).reduce((s, b) => s + Number(b.broker_commission), 0);
  const totalPartnerPending = dateScopedBroker.filter((b) => !b.broker_commission_paid).reduce((s, b) => s + Number(b.broker_commission), 0);

  const handleToggle = async (b) => {
    setMarking(b.id);
    const markingPaid = !b.broker_commission_paid;
    await markBrokerCommissionPaid(b.id, markingPaid);
    if (markingPaid) {
      const today = new Date().toISOString().split("T")[0];
      await addExpense({
        date: today,
        category: "Miscellaneous",
        description: `Broker Commission – ${b.broker_name} (Guest: ${b.name})`,
        totalAmount: Number(b.broker_commission),
        paid_amounts: {},
        status: "Done",
        notes: `Auto-created on broker payout. Booking: ${b.check_in} to ${b.check_out}`,
      });
    }
    setMarking(null);
  };

  // Owner payout calculations (all-time, no date filter)
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const brokerPaidTotal = bookings
    .filter((b) => b.broker_commission_paid && Number(b.broker_commission) > 0)
    .reduce((s, b) => s + Number(b.broker_commission), 0);
  const netRevenue = totalRevenue - brokerPaidTotal;
  const totalExpenses = expenses.reduce((s, e) => s + (e.totalAmount || 0), 0);
  const profit = netRevenue - totalExpenses;
  const isProfit = profit >= 0;

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

        {/* Date filter */}
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

      {/* ── OWNER PAYOUT ── */}
      {owners.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "14px" }}>OWNER PAYOUT</p>
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

            {/* Per-owner rows */}
            <div>
              <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "10px" }}>
                DISTRIBUTION ({isProfit ? "PROFIT" : "LOSS"})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {owners.map((o, i) => {
                  const payout = profit * (Number(o.ownership_percent) / 100);
                  const color = o.color || COLORS[i % COLORS.length];
                  const initials = o.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#1a1a1a", borderRadius: "10px", border: `1px solid ${color}18` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color, overflow: "hidden", flexShrink: 0 }}>
                          {o.image_url ? <img src={o.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                        </div>
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: "600", color: "#e0e0e0" }}>{o.name}</p>
                          <p style={{ fontSize: "11px", color: "#555" }}>{Number(o.ownership_percent).toFixed(2)}% ownership</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "16px", fontWeight: "800", color: isProfit ? "#34d399" : "#f87171" }}>
                          {isProfit ? "+" : "-"}{fmt(Math.abs(payout))}
                        </p>
                        <p style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{isProfit ? "payout" : "share of loss"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {profit === 0 && (
                <p style={{ fontSize: "13px", color: "#444", textAlign: "center", marginTop: "12px" }}>Revenue equals expenses — no profit or loss.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
