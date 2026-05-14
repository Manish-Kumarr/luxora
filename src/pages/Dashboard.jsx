import { useApp } from "../context/AppContext";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Receipt, Users, IndianRupee } from "lucide-react";

const COLORS = ["#008080", "#00a0a0", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export default function Dashboard() {
  const { expenses } = useApp();

  const totalExpenses = expenses.reduce((s, e) => s + e.totalAmount, 0);
  const nikhilTotal = expenses.reduce((s, e) => s + (e.nikhilPaid || 0), 0);
  const manishTotal = expenses.reduce((s, e) => s + (e.manishPaid || 0), 0);
  const keshawTotal = expenses.reduce((s, e) => s + (e.keshawPaid || 0), 0);

  // Category wise data
  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.totalAmount;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // Per person data
  const personData = [
    { name: "Nikhil", amount: nikhilTotal },
    { name: "Manish", amount: manishTotal },
    { name: "Keshaw", amount: keshawTotal },
  ];

  // Date wise data
  const dateMap = {};
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const sortedExpenses = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  sortedExpenses.forEach((e) => {
    const [, m, d] = e.date.split("-");
    const d2 = `${parseInt(d)} ${MONTHS[parseInt(m)-1]}`;
    dateMap[d2] = (dateMap[d2] || 0) + e.totalAmount;
  });
  const dateData = Object.entries(dateMap).map(([date, amount]) => ({ date, amount }));

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  const statCards = [
    { label: "Total Expenses", value: fmt(totalExpenses), icon: IndianRupee, color: "#008080" },
    { label: "Total Entries", value: expenses.length, icon: Receipt, color: "#06b6d4" },
    { label: "Categories", value: categoryData.length, icon: TrendingUp, color: "#10b981" },
    { label: "Members", value: 3, icon: Users, color: "#f59e0b" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <p style={styles.sub}>Luxora expense overview</p>
      </div>

      {/* Stat Cards */}
      <div style={styles.statsGrid}>
        {statCards.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: s.color + "22" }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <p style={styles.statValue}>{s.value}</p>
              <p style={styles.statLabel}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Expenses Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dateData}>
              <defs>
                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008080" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#008080" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" stroke="#444" tick={{ fontSize: 12 }} />
              <YAxis stroke="#444" tick={{ fontSize: 12 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                labelStyle={{ color: "#aaa" }}
                itemStyle={{ color: "#e0e0e0" }}
                formatter={(v) => [fmt(v), "Amount"]}
              />
              <Area type="monotone" dataKey="amount" stroke="#008080" fill="url(#colorAmt)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                labelStyle={{ color: "#aaa" }}
                itemStyle={{ color: "#e0e0e0" }}
                formatter={(v) => [fmt(v), "Amount"]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCardFull}>
          <h3 style={styles.chartTitle}>Per Member Spending</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={personData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="name" stroke="#444" tick={{ fontSize: 13 }} />
              <YAxis stroke="#444" tick={{ fontSize: 12 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                labelStyle={{ color: "#aaa" }}
                itemStyle={{ color: "#e0e0e0" }}
                formatter={(v) => [fmt(v), "Paid"]}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {personData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member Summary */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Member Summary</h3>
          <div style={styles.memberList}>
            {[
              { name: "Nikhil", paid: nikhilTotal, color: "#008080" },
              { name: "Manish", paid: manishTotal, color: "#00a0a0" },
              { name: "Keshaw", paid: keshawTotal, color: "#06b6d4" },
            ].map((m) => (
              <div key={m.name} style={styles.memberRow}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ ...styles.memberDot, background: m.color }} />
                  <span style={styles.memberName}>{m.name}</span>
                </div>
                <span style={styles.memberAmt}>{fmt(m.paid)}</span>
              </div>
            ))}
            <div style={styles.memberTotal}>
              <span style={{ color: "#888", fontSize: "13px" }}>Total</span>
              <span style={{ color: "#33b5b5", fontWeight: "700" }}>{fmt(totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "32px", display: "flex", flexDirection: "column", gap: "24px" },
  header: { marginBottom: "4px" },
  title: { fontSize: "26px", fontWeight: "700", color: "#f0f0f0" },
  sub: { color: "#555", fontSize: "14px", marginTop: "4px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" },
  statCard: {
    background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px",
    padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px",
  },
  statIcon: { width: "44px", height: "44px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: "22px", fontWeight: "700", color: "#f0f0f0" },
  statLabel: { fontSize: "12px", color: "#555", marginTop: "2px" },
  chartsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  chartCard: {
    background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "20px",
  },
  chartCardFull: {
    background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "20px",
  },
  chartTitle: { fontSize: "15px", fontWeight: "600", color: "#e0e0e0", marginBottom: "16px" },
  memberList: { display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" },
  memberRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", background: "#1a1a1a", borderRadius: "8px",
  },
  memberDot: { width: "10px", height: "10px", borderRadius: "50%" },
  memberName: { fontSize: "14px", color: "#ccc" },
  memberAmt: { fontSize: "15px", fontWeight: "600", color: "#f0f0f0" },
  memberTotal: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", background: "rgba(0,128,128,0.1)", borderRadius: "8px",
    border: "1px solid rgba(0,128,128,0.2)",
  },
};
