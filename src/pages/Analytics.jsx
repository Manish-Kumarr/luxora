import { useApp } from "../context/AppContext";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ["#008080", "#00a0a0", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export default function Analytics({ isMobile }) {
  const { expenses } = useApp();

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.totalAmount;
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const personData = [
    { name: "Nikhil", amount: expenses.reduce((s, e) => s + (e.nikhilPaid || 0), 0) },
    { name: "Manish", amount: expenses.reduce((s, e) => s + (e.manishPaid || 0), 0) },
    { name: "Keshaw", amount: expenses.reduce((s, e) => s + (e.keshawPaid || 0), 0) },
  ];

  const monthMap = {};
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  expenses.forEach((e) => {
    const [y, m] = e.date.split("-");
    const key = `${MONTHS[parseInt(m)-1]} ${y}`;
    monthMap[key] = (monthMap[key] || 0) + e.totalAmount;
  });
  const monthData = Object.entries(monthMap).map(([month, amount]) => ({ month, amount }));

  const doneCount = expenses.filter((e) => e.status === "Done").length;
  const pendingCount = expenses.filter((e) => e.status === "Pending").length;
  const statusData = [
    { name: "Done", value: doneCount },
    { name: "Pending", value: pendingCount },
  ];

  const total = expenses.reduce((s, e) => s + e.totalAmount, 0);
  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";
  const cols = isMobile ? "1fr" : "1fr 1fr";
  const chartH = isMobile ? 200 : 260;

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>
      <div>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Analytics</h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Detailed spending breakdown</p>
      </div>

      {/* Category Breakdown Table */}
      <div>
        <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0", marginBottom: "12px" }}>
          Category-wise Spending
        </h2>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "6px 0" }}>
          {categoryData.map((cat, i) => {
            const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0;
            return (
              <div key={cat.name} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: isMobile ? "12px 14px" : "14px 20px",
                borderBottom: "1px solid #161616",
                gap: "8px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                  <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "#ccc", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {!isMobile && (
                    <div style={{ width: "100px", height: "6px", background: "#1e1e1e", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: pct + "%", height: "100%", borderRadius: "3px", background: COLORS[i % COLORS.length] }} />
                    </div>
                  )}
                  <span style={{ fontSize: "12px", color: "#666", minWidth: "34px", textAlign: "right" }}>{pct}%</span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#f0f0f0", minWidth: isMobile ? "70px" : "90px", textAlign: "right" }}>{fmt(cat.value)}</span>
                </div>
              </div>
            );
          })}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: isMobile ? "12px 14px" : "14px 20px",
            background: "rgba(0,128,128,0.06)",
          }}>
            <span style={{ color: "#888" }}>Total</span>
            <span style={{ color: "#33b5b5", fontWeight: "700", fontSize: "16px" }}>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px" }}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Category Distribution</h3>
          <ResponsiveContainer width="100%" height={chartH}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%" cy="50%"
                outerRadius={isMobile ? 70 : 100}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                formatter={(v) => [fmt(v), "Amount"]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Member-wise Payment</h3>
          <ResponsiveContainer width="100%" height={chartH}>
            <BarChart data={personData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
              <XAxis type="number" stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
              <YAxis type="category" dataKey="name" stroke="#444" tick={{ fontSize: 13 }} width={55} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
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

      {/* Charts Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px" }}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Monthly Expenses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="month" stroke="#444" tick={{ fontSize: 11 }} />
              <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} width={45} />
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
                formatter={(v) => [fmt(v), "Total"]}
              />
              <Bar dataKey="amount" fill="#008080" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Payment Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
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
  chartCard: {
    background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "18px",
  },
  chartTitle: { fontSize: "14px", fontWeight: "600", color: "#e0e0e0", marginBottom: "14px" },
};
