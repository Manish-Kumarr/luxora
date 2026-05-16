import { useApp } from "../context/AppContext";
import { ArrowRight, ArrowDown, CheckCircle2, IndianRupee } from "lucide-react";

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

export default function Settlement({ isMobile }) {
  const { expenses, owners, bookings, markBrokerCommissionPaid, addExpense } = useApp();

  const fmt = (n) => "₹" + Number(Math.abs(n)).toLocaleString("en-IN");

  if (owners.length === 0) {
    return (
      <div style={{ padding: isMobile ? "16px" : "32px" }}>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0", marginBottom: "8px" }}>Settlement</h1>
        <p style={{ color: "#444", fontSize: "14px" }}>Add owners first to see settlement calculations.</p>
      </div>
    );
  }

  // Total paid by each owner
  const paid = {};
  owners.forEach((o) => {
    paid[o.id] = expenses.reduce((s, e) => s + (Number((e.paid_amounts || {})[o.id]) || 0), 0);
  });

  const total = Object.values(paid).reduce((s, v) => s + v, 0);

  // Fair share = ownership % based (not equal split)
  const fairShares = {};
  owners.forEach((o) => {
    fairShares[o.id] = total * (Number(o.ownership_percent) / 100);
  });

  const balances = {};
  owners.forEach((o) => {
    balances[o.id] = paid[o.id] - fairShares[o.id];
  });

  // Build settlement using owner IDs, then map to names for display
  const transactions = calcSettlement({ ...balances });
  const allSettled = transactions.length === 0;

  const ownerById = (id) => owners.find((o) => o.id === id);

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "20px";

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Settlement</h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Clear outstanding payments between all members</p>
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
              {/* Avatar + Name */}
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

              {/* Stats */}
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total summary */}
      <div style={{
        background: "rgba(0,128,128,0.07)", border: "1px solid rgba(0,128,128,0.15)",
        borderRadius: "12px", padding: "16px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "8px",
      }}>
        <span style={{ color: "#888", fontSize: "14px" }}>Total Expenses</span>
        <span style={{ color: "#33b5b5", fontWeight: "700", fontSize: "20px" }}>
          ₹{Number(total).toLocaleString("en-IN")}
        </span>
      </div>

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
                            notes: `Auto-created on broker commission payout. Booking: ${b.check_in} to ${b.check_out}`,
                          });
                        }
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
    </div>
  );
}

const styles = {
  statRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statKey: { fontSize: "13px", color: "#666" },
  statVal: { fontSize: "14px", fontWeight: "600" },
};
