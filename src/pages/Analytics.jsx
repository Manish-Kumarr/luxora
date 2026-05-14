import { useApp } from "../context/AppContext";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ["#008080", "#00a0a0", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export default function Analytics() {
  const { expenses } = useApp();

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  // Category totals
  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.totalAmount;
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Per person
  const personData = [
    { name: "Nikhil", amount: expenses.reduce((s, e) => s + (e.nikhilPaid || 0), 0) },
    { name: "Manish", amount: expenses.reduce((s, e) => s + (e.manishPaid || 0), 0) },
    { name: "Keshaw", amount: expenses.reduce((s, e) => s + (e.keshawPaid || 0), 0) },
  ];

  // Monthly breakdown
  const monthMap = {};
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  expenses.forEach((e) => {
    const [y, m] = e.date.split("-");
    const key = `${MONTHS[parseInt(m)-1]} ${y}`;
    monthMap[key] = (monthMap[key] || 0) + e.totalAmount;
  });
  const monthData = Object.entries(monthMap).map(([month, amount]) => ({ month, amount }));

  // Status breakdown
  const doneCount = expenses.filter((e) => e.status === "Done").length;
  const pendingCount = expenses.filter((e) => e.status === "Pending").length;
  const statusData = [
    { name: "Done", value: doneCount },
    { name: "Pending", value: pendingCount },
  ];

  const total = expenses.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Analytics</h1>
        <p style={styles.sub}>Detailed spending breakdown</p>
      </div>

      {/* Category Breakdown Table */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Category-wise Spending</h2>
        <div style={styles.tableCard}>
          {categoryData.map((cat, i) => {
            const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0;
            return (
              <div key={cat.name} style={styles.catRow}>
                <div style={styles.catLeft}>
                  <div style={{ ...styles.catColor, background: COLORS[i % COLORS.length] }} />
                  <span style={styles.catName}>{cat.name}</span>
                </div>
                <div style={styles.catRight}>
                  <div style={styles.progressWrap}>
                    <div style={{ ...styles.progressBar, width: pct + "%", background: COLORS[i % COLORS.length] }} />
                  </div>
                  <span style={styles.catPct}>{pct}%</span>
                  <span style={styles.catAmt}>{fmt(cat.value)}</span>
                </div>
              </div>
            );
          })}
          <div style={styles.catTotal}>
            <span style={{ color: "#888" }}>Total</span>
            <span style={{ color: "#33b5b5", fontWeight: "700", fontSize: "16px" }}>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Category Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
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
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Member-wise Payment</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={personData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
              <XAxis type="number" stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
              <YAxis type="category" dataKey="name" stroke="#444" tick={{ fontSize: 13 }} width={60} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                labelStyle={{ color: "#aaa" }}
                itemStyle={{ color: "#e0e0e0" }}
                formatter={(v) => [fmt(v), "Paid"]}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                {personData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Monthly Expenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="month" stroke="#444" tick={{ fontSize: 12 }} />
              <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                labelStyle={{ color: "#aaa" }}
                itemStyle={{ color: "#e0e0e0" }}
                formatter={(v) => [fmt(v), "Total"]}
              />
              <Bar dataKey="amount" fill="#008080" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Payment Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                labelStyle={{ color: "#aaa" }}
                itemStyle={{ color: "#e0e0e0" }}
                formatter={(v) => [v + " entries", "Count"]}
              />
              <Legend wrapperStyle={{ fontSize: 13, color: "#888" }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "8px" }}>
            <span style={{ fontSize: "13px", color: "#34d399" }}>Done: {doneCount}</span>
            <span style={{ fontSize: "13px", color: "#fbbf24" }}>Pending: {pendingCount}</span>
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
  section: {},
  sectionTitle: { fontSize: "16px", fontWeight: "600", color: "#e0e0e0", marginBottom: "14px" },
  tableCard: {
    background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "6px 0",
  },
  catRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 20px", borderBottom: "1px solid #161616",
  },
  catLeft: { display: "flex", alignItems: "center", gap: "10px", minWidth: "140px" },
  catColor: { width: "10px", height: "10px", borderRadius: "50%" },
  catName: { fontSize: "14px", color: "#ccc", fontWeight: "500" },
  catRight: { display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: "flex-end" },
  progressWrap: { width: "120px", height: "6px", background: "#1e1e1e", borderRadius: "3px", overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: "3px", transition: "width 0.3s" },
  catPct: { fontSize: "12px", color: "#666", minWidth: "36px", textAlign: "right" },
  catAmt: { fontSize: "14px", fontWeight: "600", color: "#f0f0f0", minWidth: "90px", textAlign: "right" },
  catTotal: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 20px", background: "rgba(0,128,128,0.06)",
  },
  chartsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  chartCard: {
    background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "20px",
  },
  chartTitle: { fontSize: "15px", fontWeight: "600", color: "#e0e0e0", marginBottom: "16px" },
};
