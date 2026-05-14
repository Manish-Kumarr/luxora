import { useApp } from "../context/AppContext";
import { ArrowRight, ArrowDown, CheckCircle2, IndianRupee } from "lucide-react";

const MEMBER_COLORS = {
  Nikhil: "#008080",
  Manish: "#06b6d4",
  Keshaw: "#f59e0b",
};

const MEMBER_INITIALS = {
  Nikhil: "N",
  Manish: "M",
  Keshaw: "K",
};

// Minimum transactions settlement algorithm
function calcSettlement(balances) {
  const people = Object.keys(balances);
  const bal = people.map((p) => ({ name: p, amount: balances[p] }));

  const transactions = [];

  // sort: debtors (negative) first, creditors (positive) last
  const sorted = () => bal.sort((a, b) => a.amount - b.amount);

  for (let i = 0; i < people.length * 2; i++) {
    sorted();
    const debtor = bal[0];   // owes most (most negative)
    const creditor = bal[bal.length - 1]; // is owed most (most positive)

    if (Math.abs(debtor.amount) < 1 || Math.abs(creditor.amount) < 1) break;

    const settle = Math.min(-debtor.amount, creditor.amount);
    transactions.push({ from: debtor.name, to: creditor.name, amount: Math.round(settle) });

    debtor.amount += settle;
    creditor.amount -= settle;
  }

  return transactions;
}

export default function Settlement({ isMobile }) {
  const { expenses } = useApp();

  const fmt = (n) => "₹" + Number(Math.abs(n)).toLocaleString("en-IN");

  // Total paid by each person
  const paid = {
    Nikhil: expenses.reduce((s, e) => s + (e.nikhilPaid || 0), 0),
    Manish: expenses.reduce((s, e) => s + (e.manishPaid || 0), 0),
    Keshaw: expenses.reduce((s, e) => s + (e.keshawPaid || 0), 0),
  };

  const total = Object.values(paid).reduce((s, v) => s + v, 0);
  const fairShare = total / 3;

  // Net balance = paid - fairShare
  // positive → others owe them
  // negative → they owe others
  const balances = {
    Nikhil: paid.Nikhil - fairShare,
    Manish: paid.Manish - fairShare,
    Keshaw: paid.Keshaw - fairShare,
  };

  const transactions = calcSettlement({ ...balances });
  const allSettled = transactions.length === 0;

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "20px";

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Settlement</h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Clear outstanding payments between all three members</p>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? "10px" : "16px" }}>
        {["Nikhil", "Manish", "Keshaw"].map((name) => {
          const bal = balances[name];
          const isPositive = bal >= 0;
          return (
            <div key={name} style={{
              background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px",
              padding: isMobile ? "16px" : "20px",
            }}>
              {/* Avatar + Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "12px",
                  background: MEMBER_COLORS[name] + "22",
                  border: `1.5px solid ${MEMBER_COLORS[name]}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", fontWeight: "700", color: MEMBER_COLORS[name],
                }}>
                  {MEMBER_INITIALS[name]}
                </div>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{name}</p>
                  <p style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>Member</p>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={styles.statRow}>
                  <span style={styles.statKey}>Total Paid</span>
                  <span style={{ ...styles.statVal, color: "#f0f0f0" }}>{fmt(paid[name])}</span>
                </div>
                <div style={styles.statRow}>
                  <span style={styles.statKey}>Fair Share</span>
                  <span style={{ ...styles.statVal, color: "#888" }}>{fmt(fairShare)}</span>
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

              {/* Badge */}
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
          <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>
            Who Pays Whom?
          </h2>
          {allSettled && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34d399", fontSize: "13px", fontWeight: "600" }}>
              <CheckCircle2 size={16} />
              All Settled
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
            {transactions.map((t, i) => (
              <div key={i} style={{
                padding: isMobile ? "16px" : "16px 20px",
                borderBottom: i < transactions.length - 1 ? "1px solid #161616" : "none",
              }}>
                {isMobile ? (
                  /* Mobile: vertical stack */
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    {/* From person */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", alignSelf: "stretch", background: "#1a1a1a", borderRadius: "10px", padding: "12px 14px" }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                        background: MEMBER_COLORS[t.from] + "22",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "15px", fontWeight: "700", color: MEMBER_COLORS[t.from],
                      }}>
                        {MEMBER_INITIALS[t.from]}
                      </div>
                      <div>
                        <p style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{t.from}</p>
                        <p style={{ fontSize: "11px", color: "#f87171", marginTop: "1px" }}>Pays</p>
                      </div>
                    </div>

                    {/* Amount + arrow down */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <ArrowDown size={14} color="#444" />
                      <div style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        padding: "5px 14px", borderRadius: "20px",
                        background: "rgba(0,128,128,0.12)",
                        border: "1px solid rgba(0,128,128,0.25)",
                      }}>
                        <IndianRupee size={12} color="#33b5b5" />
                        <span style={{ fontSize: "15px", fontWeight: "700", color: "#33b5b5" }}>
                          {Number(t.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <ArrowDown size={14} color="#444" />
                    </div>

                    {/* To person */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", alignSelf: "stretch", background: "#1a1a1a", borderRadius: "10px", padding: "12px 14px" }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                        background: MEMBER_COLORS[t.to] + "22",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "15px", fontWeight: "700", color: MEMBER_COLORS[t.to],
                      }}>
                        {MEMBER_INITIALS[t.to]}
                      </div>
                      <div>
                        <p style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{t.to}</p>
                        <p style={{ fontSize: "11px", color: "#34d399", marginTop: "1px" }}>Receives</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Desktop: horizontal layout */
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "10px",
                        background: MEMBER_COLORS[t.from] + "22",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "15px", fontWeight: "700", color: MEMBER_COLORS[t.from],
                      }}>
                        {MEMBER_INITIALS[t.from]}
                      </div>
                      <span style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{t.from}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, justifyContent: "center" }}>
                      <div style={{ height: "1px", flex: 1, background: "#2a2a2a", maxWidth: "40px" }} />
                      <div style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        padding: "5px 14px", borderRadius: "20px",
                        background: "rgba(0,128,128,0.12)",
                        border: "1px solid rgba(0,128,128,0.25)",
                      }}>
                        <IndianRupee size={12} color="#33b5b5" />
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#33b5b5" }}>
                          {Number(t.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <ArrowRight size={16} color="#444" />
                      <div style={{ height: "1px", flex: 1, background: "#2a2a2a", maxWidth: "40px" }} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "10px",
                        background: MEMBER_COLORS[t.to] + "22",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "15px", fontWeight: "700", color: MEMBER_COLORS[t.to],
                      }}>
                        {MEMBER_INITIALS[t.to]}
                      </div>
                      <span style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0" }}>{t.to}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
    </div>
  );
}

const styles = {
  statRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  statKey: { fontSize: "13px", color: "#666" },
  statVal: { fontSize: "14px", fontWeight: "600" },
};
